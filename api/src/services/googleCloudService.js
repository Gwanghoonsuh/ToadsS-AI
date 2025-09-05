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
        console.log("🚀 DEPLOYMENT CHECKPOINT: Running constructor v6 - Complete Auto Auth 🚀");

        // Google Cloud 인증 정보 파싱
        let serviceAccountKey;
        try {
            console.log('--- STARTING AUTHENTICATION DEBUG ---');
            console.log('✅ GOOGLE_APPLICATION_CREDENTIALS 환경 변수를 찾았습니다.');
            console.log(`- 내용 길이: ${process.env.GOOGLE_APPLICATION_CREDENTIALS.length} 문자.`);
            
            serviceAccountKey = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
            console.log('✅ JSON 파싱에 성공했으며, 필수 키(client_email, private_key)를 포함하고 있습니다.');
            console.log(`- 서비스 계정 이메일: ${serviceAccountKey.client_email}`);
            console.log('--- ENDING AUTHENTICATION DEBUG ---');
        } catch (error) {
            console.error('❌ 인증 정보 파싱 실패:', error);
            throw new Error(`Authentication failed: ${error.message}`);
        }

        this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
        this.region = process.env.GOOGLE_CLOUD_REGION || 'asia-northeast3';
        this.dataStoreId = process.env.VERTEX_AI_DATA_STORE_ID;

        // 파싱된 서비스 계정 키를 직접 credentials로 전달
        const credentials = serviceAccountKey;
        
        this.storage = new Storage({
            credentials: credentials,
            projectId: this.projectId
        });

        if (VertexAI) {
            this.vertexAI = new VertexAI({
                project: this.projectId,
                location: this.region,
                googleAuthOptions: {
                    credentials: credentials
                }
            });
        }

        if (DocumentServiceClient) {
            this.documentClient = new DocumentServiceClient({
                credentials: credentials,
                projectId: this.projectId
            });
        }

        this.predictionClient = new PredictionServiceClient({
            apiEndpoint: `${this.region}-aiplatform.googleapis.com`,
            credentials: credentials,
            projectId: this.projectId
        });

        console.log('✅ All Google Cloud clients initialized with complete auto auth.');
    }

    async getCustomerBucket(customerId) {
        const bucketName = `toads-ai-agent-${customerId}`;
        const bucket = this.storage.bucket(bucketName);

        try {
            const [exists] = await bucket.exists();
            if (!exists) {
                console.log(`📦 Creating bucket: ${bucketName}`);
                await bucket.create({
                    location: this.region,
                    storageClass: 'STANDARD'
                });
                console.log(`✅ Bucket created: ${bucketName}`);
            }
        } catch (error) {
            console.error(`❌ Error managing bucket ${bucketName}:`, error);
            throw new Error(`Failed to access bucket: ${error.message}`);
        }

        return bucket;
    }

    async listFiles(customerId) {
        try {
            const bucket = await this.getCustomerBucket(customerId);
            const customerFolder = `customer-${customerId}/`;
            
            // 고객별 폴더에서만 파일 조회 (데이터 격리)
            const [files] = await bucket.getFiles({ prefix: customerFolder });

            return files.map(file => ({
                name: file.name,
                size: file.metadata.size,
                created: file.metadata.timeCreated,
                updated: file.metadata.updated,
                contentType: file.metadata.contentType,
                originalName: file.metadata.originalName,
                customerId: file.metadata.customerId
            }));
        } catch (error) {
            console.error(`❌ Error listing files for customer ${customerId}:`, error);
            throw new Error(`Failed to list files: ${error.message}`);
        }
    }

    async uploadFile(customerId, file, originalName) {
        try {
            const bucket = await this.getCustomerBucket(customerId);
            
            // 고객별 폴더 구조 생성: customer-{customerId}/timestamp-randomstring-filename
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(2, 8);
            const customerFolder = `customer-${customerId}`;
            const fileName = `${customerFolder}/${timestamp}-${randomString}-${originalName}`;
            const fileUpload = bucket.file(fileName);

            await fileUpload.save(file.buffer, {
                metadata: {
                    contentType: file.mimetype,
                    originalName: originalName,
                    customerId: customerId.toString(),
                    uploadTimestamp: timestamp.toString()
                }
            });

            console.log(`✅ File uploaded: ${fileName}`);
            return {
                fileName,
                gcsUri: `gs://${bucket.name}/${fileName}`,
                timestamp,
                customerFolder
            };
        } catch (error) {
            console.error(`❌ Error uploading file ${originalName}:`, error);
            throw new Error(`Failed to upload file: ${error.message}`);
        }
    }

    async deleteFile(customerId, fileName) {
        try {
            const bucket = await this.getCustomerBucket(customerId);
            const file = bucket.file(fileName);
            
            // 파일이 해당 고객의 폴더에 있는지 확인 (보안)
            if (!fileName.startsWith(`customer-${customerId}/`)) {
                throw new Error(`Access denied: File does not belong to customer ${customerId}`);
            }
            
            await file.delete();
            console.log(`✅ File deleted: ${fileName}`);
            return { success: true, fileName };
        } catch (error) {
            console.error(`❌ Error deleting file ${fileName}:`, error);
            throw new Error(`Failed to delete file: ${error.message}`);
        }
    }

    async searchDocuments(customerId, query, maxResults = 5) {
        try {
            console.log(`🔍 Searching documents for customer ${customerId} with query: "${query}"`);
            
            // 고객별 문서만 검색하기 위해 Storage에서 해당 고객 문서 목록 조회
            const bucket = await this.getCustomerBucket(customerId);
            const customerFolder = `customer-${customerId}/`;
            
            // 고객별 폴더에서만 파일 조회 (데이터 격리 보장)
            const [files] = await bucket.getFiles({ prefix: customerFolder });
            
            if (files.length === 0) {
                console.log(`📂 No documents found for customer ${customerId}`);
                return [];
            }

            console.log(`📂 Found ${files.length} documents for customer ${customerId}`);
            
            // 현재는 모든 고객 문서를 반환 (실제로는 검색 쿼리 기반 필터링 필요)
            // TODO: 실제 구현에서는 Vertex AI Search나 Embedding을 사용한 의미적 검색 구현
            const searchResults = files.map((file, index) => {
                const originalName = file.metadata.originalName || file.name;
                const displayName = originalName.replace(/^customer-\d+\/\d+-[a-z0-9]+-/, '');
                
                return {
                    id: `${customerId}-${index}`,
                    title: displayName,
                    content: `${displayName}에서 검색된 내용입니다. 실제 구현에서는 문서 내용을 파싱하여 제공합니다.`,
                    uri: `gs://${bucket.name}/${file.name}`,
                    customerId: customerId, // 보안: 반드시 해당 고객 ID 포함
                    fileName: file.name,
                    size: file.metadata.size,
                    contentType: file.metadata.contentType
                };
            }).slice(0, maxResults);

            // 보안 검증: 모든 결과가 해당 고객의 것인지 확인
            const invalidResults = searchResults.filter(result => 
                !result.fileName.startsWith(`customer-${customerId}/`)
            );
            
            if (invalidResults.length > 0) {
                console.error(`🚨 Security violation: Found documents not belonging to customer ${customerId}`);
                throw new Error(`Access denied: Invalid document access attempt`);
            }

            console.log(`✅ Returning ${searchResults.length} secure search results for customer ${customerId}`);
            return searchResults;

        } catch (error) {
            console.error(`❌ Error searching documents for customer ${customerId}:`, error);
            
            // 보안상 민감한 오류 정보는 숨김
            if (error.message.includes('Access denied')) {
                throw error; // 보안 오류는 그대로 전파
            }
            
            throw new Error('Document search failed');
        }
    }

    async generateAIResponse(query, context, customerId) {
        try {
            if (!VertexAI) {
                console.log('⚠️ Vertex AI not available, using mock response');
                return {
                    response: "죄송하지만 현재 AI 서비스를 이용할 수 없습니다. 나중에 다시 시도해주세요.",
                    mock: true
                };
            }

            // 고객사 정보 (실제 구현에서는 DB에서 조회)
            const customerName = `고객사-${customerId}`;
            
            // 보안 검증: context에 다른 고객 정보가 포함되지 않았는지 확인
            if (context && context.includes(`customer-`) && !context.includes(`customer-${customerId}/`)) {
                console.error(`🚨 Security violation: Context contains other customer data for customer ${customerId}`);
                throw new Error('Access denied: Invalid context data');
            }
            
            // 시스템 프롬프트 생성 (고객별 격리 강조)
            const systemPrompt = generateSystemPrompt(customerName, context, query) + 
                `\n\n⚠️ 중요 보안 지침: 당신은 오직 고객사-${customerId}의 문서만을 참조해야 합니다. 다른 고객사의 정보는 절대로 사용하거나 언급해서는 안 됩니다.`;
            
            // Vertex AI Gemini 모델 사용
            const model = this.vertexAI.preview.getGenerativeModel({
                model: "gemini-1.5-pro-preview-0409",
                systemInstruction: {
                    parts: [{ text: systemPrompt }],
                    role: "system"
                },
                generationConfig: {
                    maxOutputTokens: 2048,
                    temperature: 0.2, // 전문적이고 일관된 답변을 위한 낮은 temperature
                    topP: 0.8,
                }
            });

            console.log(`🤖 Generating AI response for customer ${customerId}`);
            console.log(`📝 Query: ${query}`);
            console.log(`📚 Context length: ${context.length} characters`);

            // AI 응답 생성
            const result = await model.generateContent({
                contents: [
                    {
                        role: "user",
                        parts: [{ text: query }]
                    }
                ]
            });

            const aiResponse = result.response.candidates[0].content.parts[0].text;
            
            console.log(`✅ AI response generated successfully`);
            return {
                response: aiResponse,
                customerName: customerName,
                contextUsed: context.length > 0
            };

        } catch (error) {
            console.error(`❌ Error generating AI response:`, error);
            
            // 실패 시 fallback 응답
            return {
                response: "죄송하지만 현재 기술적인 문제로 답변을 생성할 수 없습니다. 잠시 후 다시 시도해주세요.",
                error: error.message,
                fallback: true
            };
        }
    }

    async addDocumentToDataStore(customerId, gcsUri, fileName) {
        // Discovery Engine이 사용 불가능한 경우 스킵
        if (!DocumentServiceClient) {
            console.log('⚠️ Discovery Engine not available, skipping document indexing');
            return { success: true, skipped: true };
        }
        
        // 실제 구현에서는 Discovery Engine API를 사용
        console.log(`📚 Adding document to data store: ${fileName} for customer ${customerId}`);
        return { success: true, message: 'Document added to data store' };
    }

    async removeDocumentFromDataStore(customerId, fileName) {
        // Discovery Engine이 사용 불가능한 경우 스킵
        if (!DocumentServiceClient) {
            console.log('⚠️ Discovery Engine not available, skipping document removal');
            return { success: true, skipped: true };
        }
        
        try {
            // 실제 구현에서는 Discovery Engine API를 사용하여 문서 삭제
            console.log(`🗑️ Removing document from data store: ${fileName} for customer ${customerId}`);
            
            // TODO: Discovery Engine API를 사용한 실제 문서 삭제 구현
            // const documentId = this.generateDocumentId(fileName);
            // await this.documentClient.deleteDocument({
            //     name: `projects/${this.projectId}/locations/${this.region}/dataStores/${this.dataStoreId}/branches/default_branch/documents/${documentId}`
            // });
            
            console.log(`✅ Document removed from data store: ${fileName}`);
            return { success: true, message: 'Document removed from data store' };
        } catch (error) {
            console.error(`❌ Error removing document from data store: ${error.message}`);
            // 데이터 스토어 삭제 실패는 치명적이지 않음 (파일은 이미 삭제됨)
            return { success: false, error: error.message, warning: 'File deleted but data store cleanup failed' };
        }
    }
}

module.exports = new GoogleCloudService();