
const { Storage } = require('@google-cloud/storage');
const { PredictionServiceClient } = require('@google-cloud/aiplatform');
const { generateSystemPrompt, MARITIME_CONTEXT } = require('../prompts/system-prompt');

// Discovery Engine 클라이언트는 조건부로 로드
let DocumentServiceClient, SearchServiceClient;
try {
    const { DocumentServiceClient: DiscoveryDocumentServiceClient, SearchServiceClient: DiscoverySearchServiceClient } = require('@google-cloud/discoveryengine').v1;
    DocumentServiceClient = DiscoveryDocumentServiceClient;
    SearchServiceClient = DiscoverySearchServiceClient;
} catch (error) {
    console.warn('⚠️ Discovery Engine clients not available:', error.message);
    DocumentServiceClient = null;
    SearchServiceClient = null;
}

// Vertex AI 클라이언트는 조건부로 로드
let VertexAI;
try {
    const vertexai = require('@google-cloud/vertexai');
    VertexAI = vertexai.VertexAI;
} catch (error) {
    console.warn('⚠️ Vertex AI client not available:', error.message);
    VertexAI = null;
}

class GoogleCloudService {
    constructor() {
        console.log("🚀 DEPLOYMENT CHECKPOINT: Running constructor v33 - Fixed Discovery Engine Project ID");

        // *** HARDCODED FINAL CONFIGURATION ***
        this.projectId = 'ai-agent-new-471314';
        this.region = 'us-central1'; 
        this.dataStoreId = 'new-maritime-docs-store';
        this.bucketName = 'maritime-ai-bucket-471314';
        
        console.log(`🌏 Google Cloud Region: ${this.region}`);
        console.log(`🏗️ Project ID: ${this.projectId}`);
        console.log(`🔍 Data Store ID: ${this.dataStoreId}`);
        console.log(`📦 Storage Bucket: ${this.bucketName}`);

        this.isTestMode = !process.env.GOOGLE_APPLICATION_CREDENTIALS;

        if (this.isTestMode) {
            console.log('🔧 Google Cloud Service running in TEST MODE.');
            return;
        }

        try {
            let credentials = null;
            const credentialsValue = process.env.GOOGLE_APPLICATION_CREDENTIALS;
            
            if (credentialsValue && credentialsValue.startsWith('{')) {
                try {
                    credentials = JSON.parse(credentialsValue);
                    if (credentials.private_key && typeof credentials.private_key === 'string') {
                        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
                    }
                } catch (parseError) {
                    console.error('❌ Failed to parse JSON credentials:', parseError.message);
                    throw parseError;
                }
            } 

            const clientConfig = credentials ? 
                { credentials, projectId: this.projectId } : 
                { projectId: this.projectId };

            const discoveryClientConfig = credentials ? 
                { credentials, projectId: this.projectId, apiEndpoint: 'global-discoveryengine.googleapis.com' } :
                { projectId: this.projectId, apiEndpoint: 'global-discoveryengine.googleapis.com' };

            this.storage = new Storage(clientConfig);
            if (VertexAI) {
                this.vertexAI = new VertexAI({ project: this.projectId, location: this.region, googleAuthOptions: credentials ? { credentials } : {} });
            }
            if (DocumentServiceClient) {
                this.documentAdminClient = new DocumentServiceClient(discoveryClientConfig);
            }
            if (SearchServiceClient) {
                this.searchClient = new SearchServiceClient(discoveryClientConfig);
            }
            this.predictionClient = new PredictionServiceClient({ apiEndpoint: `${this.region}-aiplatform.googleapis.com`, ...clientConfig });

            console.log(`✅ All Google Cloud clients initialized using ${credentials ? 'JSON credentials' : 'file path or ADC'}.`);
            if (credentials) {
                 console.log(`   - Service account email: ${credentials.client_email}`);
            }

        } catch (error) {
            console.error('❌ CRITICAL: Google Cloud client initialization FAILED.', error);
            this.isTestMode = true;
        }
    }

    async getCustomerBucket(customerId) {
        if (this.isTestMode) {
            console.log('🔧 Test mode: Skipping bucket operations');
            return null;
        }

        const bucket = this.storage.bucket(this.bucketName);

        try {
            const [exists] = await bucket.exists();
            if (!exists) {
                console.error(`❌ CRITICAL: Bucket ${this.bucketName} does not exist! Please create it manually.`);
                // In production, we might throw an error, but for resilience we log and continue
                return null;
            } else {
                 console.log(`📁 Using existing bucket: ${this.bucketName} for customer ${customerId}`);
            }
        } catch (error) {
            console.error(`❌ Error checking bucket ${this.bucketName}:`, error);
            throw new Error(`Failed to access bucket: ${error.message}`);
        }

        return bucket;
    }

    async listFiles(customerId) {
        if (this.isTestMode) return [];
        const bucket = await this.getCustomerBucket(customerId);
        if (!bucket) return [];
        const [files] = await bucket.getFiles({ prefix: `customer-${customerId}/` });
        return files.map(file => ({ name: file.name, size: file.metadata.size, created: file.metadata.timeCreated }));
    }

    async uploadFile(customerId, file, originalName) {
        if (this.isTestMode) return { fileName: `test-${originalName}` };
        const bucket = await this.getCustomerBucket(customerId);
        if (!bucket) throw new Error('Bucket not available');
        const fileName = `customer-${customerId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${originalName}`;
        await bucket.file(fileName).save(file.buffer, { metadata: { contentType: file.mimetype, originalName, customerId: customerId.toString() } });
        return { fileName, gcsUri: `gs://${bucket.name}/${fileName}` };
    }

    async addDocumentToDataStore(customerId, fileName) {
        if (this.isTestMode) {
            return { success: true, warning: null };
        }
        console.log(`ℹ️ Document ${fileName} was uploaded to Cloud Storage.`);
        console.log(`   - It will be added to the search index automatically. This may take some time.`);
        return {
            success: true,
            warning: '문서가 스토리지에 업로드되었습니다. 검색에 반영되기까지 다소 시간이 걸릴 수 있습니다.'
        };
    }

    async deleteFile(customerId, fileName) {
        if (this.isTestMode) return { success: true };
        const bucket = await this.getCustomerBucket(customerId);
        if (!bucket) throw new Error('Bucket not available');
        if (!fileName.startsWith(`customer-${customerId}/`)) {
            throw new Error(`Access denied: File does not belong to customer ${customerId}`);
        }
        await bucket.file(fileName).delete();
        return { success: true, fileName };
    }

    async removeDocumentFromDataStore(customerId, fileName) {
        if (this.isTestMode) {
            return { success: true, warning: null };
        }
        console.log(`ℹ️ Document ${fileName} was deleted from Cloud Storage.`);
        console.log(`   - It will be removed from the search index automatically. This may take some time.`);
        return {
            success: true,
            warning: '문서가 스토리지에서 삭제되었습니다. 검색 결과에서 사라지기까지 다소 시간이 걸릴 수 있습니다.'
        };
    }

    async searchDocuments(customerId, query, maxResults = 5) {
        if (this.isTestMode || !this.searchClient || !this.dataStoreId) {
            console.log('🔧 Test mode or missing configuration for document search. Returning empty results.');
            return [];
        }
    
        console.log(`🔍 Starting document search in data store: ${this.dataStoreId} for query: "${query}"`);
    
        const servingConfig = `projects/${this.projectId}/locations/global/collections/default_collection/dataStores/${this.dataStoreId}/servingConfigs/default_serving_config`;
    
        try {
            const request = {
                servingConfig: servingConfig,
                query: query,
                pageSize: maxResults,
                contentSearchSpec: {
                    snippetSpec: {
                        returnSnippet: true,
                    },
                    summarySpec: {
                        summaryResultCount: 3,
                        ignoreAdversarialQuery: true,
                        includeCitations: false,
                    },
                },
            };

            const [response] = await this.searchClient.search(request);
    
            if (!response || !response.results) {
                console.log('🟡 Search returned no results from Vertex AI Search.');
                return [];
            }
    
            const searchResults = response.results.map(result => {
                const doc = result.document;
                const snippet = doc.derivedStructData?.extractive_answers?.[0]?.content || 
                                doc.derivedStructData?.snippets?.[0]?.snippet || 
                                'No relevant snippet found.';
                
                return {
                    id: doc.id,
                    title: doc.derivedStructData?.title || doc.name.split('/').pop(),
                    content: snippet,
                    uri: doc.uri,
                    fileName: doc.name.split('/').pop(),
                };
            });
    
            console.log(`✅ Returning ${searchResults.length} secure search results from Vertex AI Search.`);
            return searchResults;
    
        } catch (error) {
            console.error('❌ Error during Vertex AI Search:', error);
            return [];
        }
    }

    async generateAIResponse(query, context, customerId) {
        if (this.isTestMode) {
            return { response: "This is a test mode response.", mock: true };
        }
        if (!this.vertexAI) {
            return { response: "AI service is not available.", mock: true };
        }

        const customerName = `고객사-${customerId}`;
        const systemPrompt = generateSystemPrompt(customerName, context, query);

        const modelName = "gemini-1.0-pro"; 

        try {
            const model = this.vertexAI.getGenerativeModel({
                model: modelName,
                systemInstruction: { parts: [{ text: systemPrompt }] },
                generationConfig: { maxOutputTokens: 2048, temperature: 0.2, topP: 0.8, topK: 40 }
            });

            console.log(`🤖 Generating AI response for customer ${customerId}`);
            console.log(`📝 Query: ${query}`);
            console.log(`📚 Context length: ${context.length} characters`);
            console.log(`🔧 Model: ${modelName}, Region: ${this.region}`);

            const result = await model.generateContent({ contents: [{ role: "user", parts: [{ text: query }] }] });

            if (!result || !result.response || !result.response.candidates || result.response.candidates.length === 0) {
                throw new Error('No valid response or candidates from Vertex AI');
            }
            if (result.response.candidates[0].finishReason === 'SAFETY') {
                return { response: "Response blocked by safety filter.", safetyFiltered: true };
            }
            if (!result.response.candidates[0].content || !result.response.candidates[0].content.parts || result.response.candidates[0].content.parts.length === 0) {
                 throw new Error('No content in Vertex AI response candidate');
            }
            const aiResponse = result.response.candidates[0].content.parts[0].text;
            console.log(`✅ AI response generated successfully`);
            return { response: aiResponse, contextUsed: context.length > 0 };

        } catch (error) {
            console.error(`❌ Error generating AI response:`, error);
            console.error(`🔍 Error details - Project: ${this.projectId}, Region: ${this.region}, Model: ${modelName}`);
            
            let fallbackMessage = "An unexpected error occurred while generating the AI response.";
            if (error.message.includes('404') || error.message.includes('Not Found')) {
                fallbackMessage = "The specified AI model is unavailable. Please ensure the project has billing enabled and the Vertex AI API is enabled.";
                 console.error(`🚨 Model availability issue - This is often caused by a missing billing account on the project or the Vertex AI API not being enabled.`);
            } else if (error.message.includes('quota')) {
                fallbackMessage = "The service is currently busy due to high demand. Please try again later.";
            } else if (error.message.includes('authentication') || error.message.includes('credentials')) {
                fallbackMessage = "Authentication failed. Please check service account credentials.";
            }
            
            throw new Error(`AI generation failed: ${error.message}`);
        }
    }

    async initializeCustomer(customerId) {
        console.log(`📁 Initializing customer folder for customer ${customerId}...`);
        if (this.isTestMode) return { success: true };
        const bucket = await this.getCustomerBucket(customerId);
        if (!bucket) {
             console.log(`-> Bucket not found, skipping folder initialization.`);
             return { success: false, message: 'Bucket not found' };
        }
        const initFile = `customer-${customerId}/.init`;
        const [fileExists] = await bucket.file(initFile).exists();
        if (!fileExists) {
            await bucket.file(initFile).save('');
        }
        return { success: true, message: `Customer folder initialized for ${customerId}` };
    }
}

module.exports = new GoogleCloudService();
