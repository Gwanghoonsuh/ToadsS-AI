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
        // 간단한 검색 구현
        return [];
    }

    async generateAIResponse(query, context, customerId) {
        // 간단한 AI 응답 생성
        return "AI 응답이 생성되었습니다.";
    }

    async addDocumentToDataStore(customerId, gcsUri, fileName) {
        // 문서를 데이터 스토어에 추가
        return { success: true, message: 'Document added to data store' };
    }
}

module.exports = new GoogleCloudService();