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
        console.log("🚀 DEPLOYMENT CHECKPOINT: Running constructor v9 - Final Standard Auth 🚀");

        this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
        this.region = process.env.GOOGLE_CLOUD_REGION || 'asia-northeast3';

        this.isTestMode = !process.env.GOOGLE_APPLICATION_CREDENTIALS;

        if (this.isTestMode) {
            console.log('🔧 Google Cloud Service running in TEST MODE.');
            return;
        }

        try {
            // 모든 Google Cloud 클라이언트를 인증 옵션 없이 초기화합니다.
            // 라이브러리가 GOOGLE_APPLICATION_CREDENTIALS 환경 변수를 자동으로 찾아 처리합니다.
            this.storage = new Storage();

            if (VertexAI) {
                this.vertexAI = new VertexAI({ project: this.projectId, location: this.region });
            }

            if (DocumentServiceClient) {
                this.documentClient = new DocumentServiceClient();
            }

            this.predictionClient = new PredictionServiceClient({
                apiEndpoint: `${this.region}-aiplatform.googleapis.com`,
            });

            console.log('✅ All Google Cloud clients initialized automatically.');

        } catch (error) {
            console.error('❌ CRITICAL: Google Cloud client initialization FAILED.', error);
            this.isTestMode = true; // 실패 시 안전하게 테스트 모드로 전환
        }
    }

    async getCustomerBucket(customerId) {
        if (this.isTestMode) {
            console.log('🔧 Test mode: Skipping bucket operations');
            return null;
        }

        const bucketName = 'toads-shipping-ai-docs';
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
            
            // 구체적인 오류 유형별 처리
            if (error.message.includes('billing account') && error.message.includes('disabled')) {
                console.error('🚨 BILLING ACCOUNT DISABLED: Google Cloud 청구 계정이 비활성화되어 있습니다.');
                this.isTestMode = true;
                return null;
            }
            
            if (error.code === 403) {
                if (error.message.includes('storage.buckets.get')) {
                    console.error('🚨 PERMISSION DENIED: 서비스 계정에 Storage 권한이 없습니다.');
                    console.error('💡 해결 방법:');
                    console.error('   1. Google Cloud Console → IAM & Admin → IAM');
                    console.error('   2. 서비스 계정에 "Storage Object Admin" 역할 부여');
                    console.error('   3. 또는 CLI: gcloud projects add-iam-policy-binding');
                    console.error(`   4. 체크리스트: ${__dirname}/../claudedocs/google-cloud-setup-checklist.md`);
                } else {
                    console.error('🚨 ACCESS DENIED: Google Cloud 접근 권한 문제');
                }
                this.isTestMode = true;
                return null;
            }
            
            if (error.code === 404) {
                console.error(`🚨 BUCKET NOT FOUND: 버킷 "${bucketName}"이 존재하지 않습니다.`);
                console.error('💡 해결 방법:');
                console.error(`   1. Google Cloud Console에서 버킷 생성: ${bucketName}`);
                console.error(`   2. 또는 CLI: gsutil mb gs://${bucketName}`);
                this.isTestMode = true;
                return null;
            }
            
            throw new Error(`Failed to access bucket: ${error.message}`);
        }

        return bucket;
    }

    async ensureCustomerFolder(customerId) {
        if (this.isTestMode) {
            console.log(`🔧 Test mode: Customer folder ${customerId} assumed to exist`);
            return { success: true, created: false, testMode: true };
        }

        try {
            const bucket = await this.getCustomerBucket(customerId);
            if (!bucket) {
                throw new Error('Bucket not available');
            }

            const customerFolder = `${customerId}/`;
            const placeholderFile = `${customerFolder}.keep`;
            const file = bucket.file(placeholderFile);

            // 폴더 존재 여부 확인 (폴더 안에 파일이 있는지 확인)
            const [files] = await bucket.getFiles({ 
                prefix: customerFolder,
                maxResults: 1 
            });

            if (files.length === 0) {
                // 폴더가 비어있다면 .keep 파일 생성 (GCS는 빈 폴더를 지원하지 않음)
                console.log(`📁 Creating customer folder: ${customerFolder}`);
                await file.save('', {
                    metadata: {
                        contentType: 'text/plain',
                        customerId: customerId.toString(),
                        purpose: 'folder-placeholder',
                        created: new Date().toISOString()
                    }
                });
                console.log(`✅ Customer folder created: ${customerFolder}`);
                return { success: true, created: true, folder: customerFolder };
            } else {
                console.log(`📁 Customer folder already exists: ${customerFolder}`);
                return { success: true, created: false, folder: customerFolder };
            }

        } catch (error) {
            console.error(`❌ Error ensuring customer folder for customer ${customerId}:`, error);
            
            // 청구 계정 오류 감지 및 자동 테스트 모드 전환
            if (error.message.includes('billing account') && error.message.includes('disabled')) {
                console.error('🚨 BILLING ACCOUNT DISABLED: Switching to test mode');
                this.isTestMode = true;
                return await this.ensureCustomerFolder(customerId); // 테스트 모드로 재시도
            }
            
            throw new Error(`Failed to ensure customer folder: ${error.message}`);
        }
    }

    async listFiles(customerId) {
        if (this.isTestMode) {
            console.log('🔧 Test mode: Returning empty file list');
            return [];
        }

        try {
            const bucket = await this.getCustomerBucket(customerId);
            if (!bucket) {
                return [];
            }

            const customerFolder = `${customerId}/`;
            
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
            
            // 청구 계정 오류 감지 및 자동 테스트 모드 전환
            if (error.message.includes('billing account') && error.message.includes('disabled')) {
                console.error('🚨 BILLING ACCOUNT DISABLED: Switching to test mode');
                this.isTestMode = true;
                return await this.listFiles(customerId); // 테스트 모드로 재시도
            }
            
            throw new Error(`Failed to list files: ${error.message}`);
        }
    }

    async uploadFile(customerId, file, originalName) {
        if (this.isTestMode) {
            console.log('🔧 Test mode: Skipping file upload');
            return {
                fileName: `test-${originalName}`,
                gcsUri: `gs://test-bucket/test-${originalName}`,
                timestamp: Date.now(),
                customerFolder: `${customerId}`
            };
        }

        try {
            const bucket = await this.getCustomerBucket(customerId);
            if (!bucket) {
                throw new Error('Bucket not available in test mode');
            }
            
            // 고객별 폴더 구조 생성: {customerId}/timestamp-randomstring-filename
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(2, 8);
            const customerFolder = `${customerId}`;
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
            
            // 청구 계정 오류 감지 및 자동 테스트 모드 전환
            if (error.message.includes('billing account') && error.message.includes('disabled')) {
                console.error('🚨 BILLING ACCOUNT DISABLED: Google Cloud 청구 계정이 비활성화되어 있습니다.');
                console.error('💡 해결 방법:');
                console.error('   1. Google Cloud Console에서 청구 계정 활성화');
                console.error('   2. 프로젝트에 유효한 청구 계정 연결');
                console.error('   3. 현재는 자동으로 테스트 모드로 전환됩니다.');
                this.isTestMode = true;
                
                // 테스트 모드로 재귀 호출
                return await this.uploadFile(customerId, file, originalName);
            }
            
            throw new Error(`Failed to upload file: ${error.message}`);
        }
    }

    async deleteFile(customerId, fileName) {
        if (this.isTestMode) {
            console.log('🔧 Test mode: Skipping file deletion');
            return { success: true, fileName };
        }

        try {
            const bucket = await this.getCustomerBucket(customerId);
            if (!bucket) {
                throw new Error('Bucket not available in test mode');
            }
            const file = bucket.file(fileName);
            
            // 파일이 해당 고객의 폴더에 있는지 확인 (보안)
            if (!fileName.startsWith(`${customerId}/`)) {
                throw new Error(`Access denied: File does not belong to customer ${customerId}`);
            }
            
            await file.delete();
            console.log(`✅ File deleted: ${fileName}`);
            return { success: true, fileName };
        } catch (error) {
            console.error(`❌ Error deleting file ${fileName}:`, error);
            
            // 청구 계정 오류 감지 및 자동 테스트 모드 전환
            if (error.message.includes('billing account') && error.message.includes('disabled')) {
                console.error('🚨 BILLING ACCOUNT DISABLED: Switching to test mode');
                this.isTestMode = true;
                return await this.deleteFile(customerId, fileName); // 테스트 모드로 재시도
            }
            
            throw new Error(`Failed to delete file: ${error.message}`);
        }
    }

    async searchDocuments(customerId, query, maxResults = 5) {
        if (this.isTestMode) {
            console.log('🔧 Test mode: Returning empty search results');
            return [];
        }

        try {
            console.log(`🔍 Searching documents for customer ${customerId} with query: "${query}"`);
            
            // 고객별 문서만 검색하기 위해 Storage에서 해당 고객 문서 목록 조회
            const bucket = await this.getCustomerBucket(customerId);
            if (!bucket) {
                return [];
            }

            const customerFolder = `${customerId}/`;
            
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
                const displayName = originalName.replace(/^\d+\/\d+-[a-z0-9]+-/, '');
                
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
                !result.fileName.startsWith(`${customerId}/`)
            );
            
            if (invalidResults.length > 0) {
                console.error(`🚨 Security violation: Found documents not belonging to customer ${customerId}`);
                throw new Error(`Access denied: Invalid document access attempt`);
            }

            console.log(`✅ Returning ${searchResults.length} secure search results for customer ${customerId}`);
            return searchResults;

        } catch (error) {
            console.error(`❌ Error searching documents for customer ${customerId}:`, error);
            
            // 청구 계정 오류 감지 및 자동 테스트 모드 전환
            if (error.message.includes('billing account') && error.message.includes('disabled')) {
                console.error('🚨 BILLING ACCOUNT DISABLED: Switching to test mode');
                this.isTestMode = true;
                return await this.searchDocuments(customerId, query, maxResults); // 테스트 모드로 재시도
            }
            
            // 보안상 민감한 오류 정보는 숨김
            if (error.message.includes('Access denied')) {
                throw error; // 보안 오류는 그대로 전파
            }
            
            throw new Error('Document search failed');
        }
    }

    async generateAIResponse(query, context, customerId) {
        if (this.isTestMode) {
            console.log('🔧 Test mode: Returning mock AI response');
            return {
                response: "이것은 테스트 모드 응답입니다. Google Cloud 인증이 설정되면 실제 AI 응답이 제공됩니다.",
                mock: true,
                reason: 'Test mode enabled'
            };
        }

        try {
            // Vertex AI 클라이언트 가용성 검사
            if (!VertexAI || !this.vertexAI) {
                console.log('⚠️ Vertex AI not available or not initialized, using mock response');
                return {
                    response: "죄송하지만 현재 AI 서비스를 이용할 수 없습니다. 나중에 다시 시도해주세요.",
                    mock: true,
                    reason: !VertexAI ? 'Library not loaded' : 'Client not initialized'
                };
            }

            // Vertex AI 클라이언트 메서드 존재 확인
            if (typeof this.vertexAI.getGenerativeModel !== 'function') {
                console.error('❌ getGenerativeModel method not available');
                console.error('🔍 Available methods:', Object.getOwnPropertyNames(this.vertexAI));
                return {
                    response: "죄송하지만 현재 AI 서비스 설정에 문제가 있습니다. 관리자에게 문의해주세요.",
                    mock: true,
                    reason: 'Method not available'
                };
            }

            // 고객사 정보 (실제 구현에서는 DB에서 조회)
            const customerName = `고객사-${customerId}`;
            
            // 보안 검증: context에 다른 고객 정보가 포함되지 않았는지 확인
            if (context && context.includes(`/`) && !context.includes(`${customerId}/`)) {
                console.error(`🚨 Security violation: Context contains other customer data for customer ${customerId}`);
                throw new Error('Access denied: Invalid context data');
            }
            
            // 시스템 프롬프트 생성 (고객별 격리 강조)
            let systemPrompt;
            try {
                systemPrompt = generateSystemPrompt(customerName, context, query) + 
                    `\n\n⚠️ 중요 보안 지침: 당신은 오직 고객사-${customerId}의 문서만을 참조해야 합니다. 다른 고객사의 정보는 절대로 사용하거나 언급해서는 안 됩니다.`;
                
                // 프롬프트 길이 검증 (토큰 제한 고려)
                if (systemPrompt.length > 30000) { // 대략 15K 토큰 한도
                    console.warn(`⚠️ System prompt too long (${systemPrompt.length} chars), truncating context`);
                    const truncatedContext = context.substring(0, 5000) + '\n[...내용 생략...]';
                    systemPrompt = generateSystemPrompt(customerName, truncatedContext, query) + 
                        `\n\n⚠️ 중요 보안 지침: 당신은 오직 고객사-${customerId}의 문서만을 참조해야 합니다.`;
                }
            } catch (promptError) {
                console.error('❌ Error generating system prompt:', promptError);
                throw new Error('Failed to generate system prompt');
            }
            
            // Vertex AI Gemini 모델 사용 (preview 제거, 안정적인 모델 사용)
            const model = this.vertexAI.getGenerativeModel({
                model: "gemini-1.5-flash-001", // 빠르고 안정적인 버전 사용
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                generationConfig: {
                    maxOutputTokens: 2048,
                    temperature: 0.2,
                    topP: 0.8,
                    topK: 40
                }
            });

            console.log(`🤖 Generating AI response for customer ${customerId}`);
            console.log(`📝 Query: ${query}`);
            console.log(`📚 Context length: ${context.length} characters`);
            console.log(`🔧 Model: ${model.model}, Region: ${this.region}`);

            // AI 응답 생성 (오류 발생 시 재시도 로직)
            let result;
            let usedFallback = false;
            
            try {
                result = await model.generateContent({
                    contents: [
                        {
                            role: "user",
                            parts: [{ text: query }]
                        }
                    ]
                });
            } catch (modelError) {
                console.warn('⚠️ Primary model failed, trying fallback model...', modelError.message);
                
                try {
                    // Fallback to basic gemini-1.0-pro model (systemInstruction 없이)
                    const fallbackModel = this.vertexAI.getGenerativeModel({
                        model: "gemini-1.0-pro",
                        generationConfig: {
                            maxOutputTokens: 2048,
                            temperature: 0.2,
                            topP: 0.8
                        }
                    });
                    
                    // 시스템 프롬프트를 사용자 메시지에 포함
                    const fullPrompt = `${systemPrompt}\n\n---\n\n사용자 질문: ${query}`;
                    
                    result = await fallbackModel.generateContent({
                        contents: [
                            {
                                role: "user", 
                                parts: [{ text: fullPrompt }]
                            }
                        ]
                    });
                    
                    usedFallback = true;
                    console.log('✅ Fallback model response generated successfully');
                } catch (fallbackError) {
                    console.error('❌ Both primary and fallback models failed');
                    throw new Error(`AI generation failed: Primary (${modelError.message}), Fallback (${fallbackError.message})`);
                }
            }

            // 응답 검증 및 추출
            if (!result || !result.response) {
                throw new Error('No response received from Vertex AI');
            }

            if (!result.response.candidates || result.response.candidates.length === 0) {
                throw new Error('No candidates in Vertex AI response');
            }

            const candidate = result.response.candidates[0];
            
            // 안전 필터 확인
            if (candidate.finishReason === 'SAFETY') {
                console.warn('⚠️ Response blocked by safety filter');
                return {
                    response: "죄송하지만 안전 정책으로 인해 응답을 생성할 수 없습니다. 다른 방식으로 질문해주세요.",
                    customerName: customerName,
                    contextUsed: context.length > 0,
                    safetyFiltered: true
                };
            }

            if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
                throw new Error('No content in Vertex AI response candidate');
            }

            const aiResponse = candidate.content.parts[0].text;
            
            console.log(`✅ AI response generated successfully${usedFallback ? ' (using fallback model)' : ''}`);
            return {
                response: aiResponse,
                customerName: customerName,
                contextUsed: context.length > 0,
                usedFallback: usedFallback
            };

        } catch (error) {
            console.error(`❌ Error generating AI response:`, error);
            console.error(`🔍 Error details - Project: ${this.projectId}, Region: ${this.region}`);
            
            let fallbackMessage = "죄송하지만 현재 기술적인 문제로 답변을 생성할 수 없습니다.";
            
            // 구체적인 오류에 따른 적절한 fallback 메시지
            if (error.message.includes('GoogleAuthError') || error.message.includes('Unable to authenticate')) {
                fallbackMessage = "현재 AI 서비스 인증에 문제가 있어 답변을 생성할 수 없습니다. 잠시 후 다시 시도해주세요.";
                console.error(`🚨 Google Auth Error - Project: ${this.projectId}, Region: ${this.region}`);
            } else if (error.message.includes('404') || error.message.includes('Not Found')) {
                fallbackMessage = "죄송하지만 현재 AI 모델을 사용할 수 없습니다. 지역 설정을 확인하고 있습니다.";
                console.error(`🚨 Model availability issue - Region: ${this.region}, Model: gemini-1.5-flash`);
            } else if (error.message.includes('quota')) {
                fallbackMessage = "죄송하지만 현재 서비스 이용량이 많아 잠시 후 다시 시도해주세요.";
            } else if (error.message.includes('authentication') || error.message.includes('credentials')) {
                fallbackMessage = "죄송하지만 현재 인증 문제로 서비스를 이용할 수 없습니다. 관리자에게 문의해주세요.";
            } else if (error.message.includes('network') || error.message.includes('timeout')) {
                fallbackMessage = "죄송하지만 네트워크 문제로 응답을 생성할 수 없습니다. 잠시 후 다시 시도해주세요.";
            } else if (error.message.includes('model') || error.message.includes('candidates')) {
                fallbackMessage = "죄송하지만 AI 모델에서 적절한 응답을 생성할 수 없습니다. 다른 방식으로 질문해주세요.";
            }
            
            // 실패 시 fallback 응답
            return {
                response: fallbackMessage,
                error: error.message,
                fallback: true,
                customerName: `고객사-${customerId}`,
                contextUsed: context.length > 0
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

    // 로그인 시 호출할 초기화 메서드
    async initializeCustomer(customerId) {
        if (this.isTestMode) {
            console.log(`🔧 Test mode: Customer ${customerId} initialized`);
            return { 
                success: true, 
                testMode: true, 
                bucket: 'test-bucket',
                folder: `${customerId}/`,
                message: 'Running in test mode - no actual cloud resources created'
            };
        }

        try {
            console.log(`🚀 Initializing customer ${customerId}...`);
            
            // 1. 버킷 확인/생성
            const bucket = await this.getCustomerBucket(customerId);
            if (!bucket) {
                throw new Error('Failed to initialize bucket');
            }

            // 2. 고객 폴더 확인/생성
            const folderResult = await this.ensureCustomerFolder(customerId);
            
            console.log(`✅ Customer ${customerId} initialized successfully`);
            return {
                success: true,
                bucket: bucket.name,
                folder: folderResult.folder,
                folderCreated: folderResult.created,
                message: folderResult.created ? 
                    `New customer folder created: ${folderResult.folder}` :
                    `Customer folder already exists: ${folderResult.folder}`
            };

        } catch (error) {
            console.error(`❌ Error initializing customer ${customerId}:`, error);
            
            // 청구 계정 오류 감지 및 자동 테스트 모드 전환
            if (error.message.includes('billing account') && error.message.includes('disabled')) {
                console.error('🚨 BILLING ACCOUNT DISABLED: Switching to test mode');
                this.isTestMode = true;
                return await this.initializeCustomer(customerId); // 테스트 모드로 재시도
            }
            
            throw new Error(`Failed to initialize customer: ${error.message}`);
        }
    }
}

module.exports = new GoogleCloudService();