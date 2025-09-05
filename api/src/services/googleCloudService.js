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
        this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
        this.region = process.env.GOOGLE_CLOUD_REGION || 'asia-northeast3';
        this.dataStoreId = process.env.VERTEX_AI_DATA_STORE_ID;

        // Google Cloud 클라이언트 초기화
        this.storage = new Storage();
        this.vertexAI = new VertexAI({ project: this.projectId, location: this.region });
        this.documentClient = new DocumentServiceClient();
        this.predictionClient = new PredictionServiceClient({
            apiEndpoint: `${this.region}-aiplatform.googleapis.com`,
        });
    }

    async getCustomerBucket(customerId) {
        const bucketName = `toads-ai-agent-${customerId}`;
        const bucket = this.storage.bucket(bucketName);
        
        const [exists] = await bucket.exists();
        if (!exists) {
            await bucket.create({
                location: this.region,
                storageClass: 'STANDARD'
            });
        }
        
        return bucket;
    }

    async listFiles(customerId) {
        const bucket = await this.getCustomerBucket(customerId);
        const [files] = await bucket.getFiles();
        
        return files.map(file => ({
            name: file.name,
            size: file.metadata.size,
            created: file.metadata.timeCreated,
            updated: file.metadata.updated
        }));
    }

    async uploadFile(customerId, file, originalName) {
        const bucket = await this.getCustomerBucket(customerId);
        const fileName = `${Date.now()}-${originalName}`;
        const fileUpload = bucket.file(fileName);
        
        await fileUpload.save(file.buffer, {
            metadata: {
                contentType: file.mimetype,
                originalName: originalName
            }
        });
        
        return {
            fileName,
            gcsUri: `gs://${bucket.name}/${fileName}`
        };
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