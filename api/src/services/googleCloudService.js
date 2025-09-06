const { Storage } = require('@google-cloud/storage');
const { PredictionServiceClient } = require('@google-cloud/aiplatform');
const { generateSystemPrompt, MARITIME_CONTEXT } = require('../prompts/system-prompt');

// Discovery Engine 클라이언트는 조건부로 로드
let DocumentServiceClient;
try {
    const { DocumentServiceClient: DiscoveryDocumentServiceClient } = require('@google-cloud/discoveryengine').v1;
    DocumentServiceClient = DiscoveryDocumentServiceClient;
} catch (error) {
    console.warn('⚠️ Discovery Engine client not available:', error.message);
    DocumentServiceClient = null;
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
        console.log("🚀 DEPLOYMENT CHECKPOINT: Running constructor v21 - Final Model Name Change 🚀");

        this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
        this.region = process.env.GOOGLE_CLOUD_REGION || 'us-central1';
        this.dataStoreId = process.env.VERTEX_AI_DATA_STORE_ID;
        
        console.log(`🌏 Google Cloud Region: ${this.region}`);
        console.log(`🏗️ Project ID: ${this.projectId}`);
        
        this.isTestMode = !process.env.GOOGLE_APPLICATION_CREDENTIALS;

        if (this.isTestMode) {
            console.log('🔧 Google Cloud Service running in TEST MODE.');
            return;
        }

        try {
            let credentials = null;
            const credentialsValue = process.env.GOOGLE_APPLICATION_CREDENTIALS;
            
            if (credentialsValue.startsWith('{')) {
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

            this.storage = new Storage(clientConfig);
            if (VertexAI) {
                this.vertexAI = new VertexAI({ project: this.projectId, location: this.region, googleAuthOptions: credentials ? { credentials } : {} });
            }
            if (DocumentServiceClient) {
                this.documentClient = new DocumentServiceClient(clientConfig);
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

        const bucketName = 'toads-shipping-ai-doc';
        const bucket = this.storage.bucket(bucketName);

        try {
            const [exists] = await bucket.exists();
            if (!exists) {
                console.log(`📦 Creating shared bucket: ${bucketName}`);
                await bucket.create({
                    location: this.region,
                    storageClass: 'STANDARD'
                });
                console.log(`✅ Shared bucket created: ${bucketName}`);
            } else {
                console.log(`📁 Using shared bucket: ${bucketName} for customer ${customerId}`);
            }
        } catch (error) {
            console.error(`❌ Error managing shared bucket ${bucketName}:`, error);
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

    async searchDocuments(customerId, query, maxResults = 5) {
        if (this.isTestMode) return [];
        const bucket = await this.getCustomerBucket(customerId);
        if (!bucket) return [];
        const [files] = await bucket.getFiles({ prefix: `customer-${customerId}/` });
        if (files.length === 0) return [];

        // Dummy search logic
        const searchResults = files.map((file, index) => ({
            id: `${customerId}-${index}`,
            title: file.metadata.originalName || file.name,
            content: `Content from ${file.metadata.originalName || file.name}. (This is a placeholder).`,
            uri: `gs://${bucket.name}/${file.name}`,
            fileName: file.name,
        })).slice(0, maxResults);

        console.log(`✅ Returning ${searchResults.length} secure search results for customer ${customerId}`);
        return searchResults;
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

        const modelName = "gemini-1.0-pro"; // 최종 모델 이름

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
                fallbackMessage = "The specified AI model is unavailable in the current region. Please check project billing and API status.";
                 console.error(`🚨 Model availability issue - This is often caused by a missing billing account on the project.`);
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
        const bucketName = 'toads-shipping-ai-doc';
        const bucket = this.storage.bucket(bucketName);
        const [bucketExists] = await bucket.exists();
        if (!bucketExists) {
            await bucket.create({ location: this.region, storageClass: 'STANDARD' });
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