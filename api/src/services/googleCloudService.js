const { Storage } = require('@google-cloud/storage');
const { PredictionServiceClient } = require('@google-cloud/aiplatform');
const { generateSystemPrompt, MARITIME_CONTEXT } = require('../prompts/system-prompt');
const path = require('path');

// Discovery Engine 클라이언트는 조건부로 로드
let DocumentServiceClient;
try {
    const { DocumentServiceClient: DiscoveryDocumentServiceClient } = require('@google-cloud/discoveryengine').v1;
    DocumentServiceClient = DiscoveryDocumentServiceClient;
    console.log('✅ Discovery Engine client loaded successfully');
} catch (error) {
    console.warn('⚠️ Discovery Engine client not available:', error.message);
    DocumentServiceClient = null;
}

// Vertex AI 클라이언트는 조건부로 로드
let VertexAI;
try {
    const vertexai = require('@google-cloud/vertexai');
    VertexAI = vertexai.VertexAI;
    console.log('✅ Vertex AI client loaded successfully');
} catch (error) {
    console.warn('⚠️ Vertex AI client not available:', error.message);
    VertexAI = null;
}

class GoogleCloudService {
    constructor() {
        // 이 로그는 새 코드가 실행되고 있다는 증거입니다.
        console.log("🚀 DEPLOYMENT VERSION: v4 - FINAL (AUTO AUTH) 🚀");

        this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
        this.region = process.env.GOOGLE_CLOUD_REGION || 'asia-northeast3';
        this.dataStoreId = process.env.VERTEX_AI_DATA_STORE_ID;

        this.isTestMode = !process.env.GOOGLE_APPLICATION_CREDENTIALS;

        // In-memory storage for test mode
        this.testStorage = new Map(); // customerId -> files array

        if (this.isTestMode) {
            console.log('🔧 Google Cloud Service running in TEST MODE.');
            return;
        }

        try {
            // GOOGLE_APPLICATION_CREDENTIALS가 JSON 문자열인 경우 처리
            let credentials = null;
            if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
                try {
                    // JSON 문자열인지 확인
                    credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
                    console.log('✅ Using JSON credentials from environment variable');
                } catch (e) {
                    // 파일 경로인 경우
                    console.log('✅ Using file path credentials from environment variable');
                }
            }

            // Storage 클라이언트 초기화
            if (credentials) {
                this.storage = new Storage({ credentials });
            } else {
                this.storage = new Storage();
            }

            if (VertexAI) {
                if (credentials) {
                    this.vertexAI = new VertexAI({
                        project: this.projectId,
                        location: this.region,
                        credentials
                    });
                } else {
                    this.vertexAI = new VertexAI({
                        project: this.projectId,
                        location: this.region
                    });
                }
            }

            if (DocumentServiceClient) {
                if (credentials) {
                    this.documentClient = new DocumentServiceClient({ credentials });
                } else {
                    this.documentClient = new DocumentServiceClient();
                }
            }

            if (credentials) {
                this.predictionClient = new PredictionServiceClient({
                    apiEndpoint: `${this.region}-aiplatform.googleapis.com`,
                    credentials
                });
            } else {
                this.predictionClient = new PredictionServiceClient({
                    apiEndpoint: `${this.region}-aiplatform.googleapis.com`,
                });
            }

            console.log('✅ All Google Cloud clients initialized with proper credentials.');

        } catch (error) {
            console.error('❌ CRITICAL: Google Cloud client initialization FAILED.', error);
            this.isTestMode = true; // 실패 시 테스트 모드로 전환
        }
    }

    /**
     * Get or create customer-specific storage bucket
     */
    async getCustomerBucket(customerId) {
        if (this.isTestMode) {
            console.log(`🔧 TEST MODE: Getting bucket for customer ${customerId}`);
            return { name: `test-bucket-${customerId}` };
        }

        if (!this.storage) {
            console.error('❌ Google Cloud Storage client not initialized');
            console.log('🔧 Switching to TEST MODE due to missing storage client');
            this.isTestMode = true;
            return { name: `test-bucket-${customerId}` };
        }

        const bucketName = `toads-ai-agent-${customerId}`;
        console.log(`🪣 Getting bucket: ${bucketName}`);
        console.log(`📋 Project ID: ${this.projectId}`);
        console.log(`🌏 Region: ${this.region}`);
        console.log(`👤 Customer ID: ${customerId}`);

        try {
            const bucket = this.storage.bucket(bucketName);
            const [exists] = await bucket.exists();

            if (!exists) {
                console.log(`📦 Creating new bucket: ${bucketName}`);
                await bucket.create({
                    location: this.region,
                    storageClass: 'STANDARD',
                    uniformBucketLevelAccess: true,
                });

                console.log(`✅ Created bucket: ${bucketName}`);
            } else {
                console.log(`✅ Bucket exists: ${bucketName}`);
            }

            return bucket;
        } catch (error) {
            console.error('❌ Error getting customer bucket:', error);
            console.error('❌ Error details:', {
                name: error.name,
                message: error.message,
                code: error.code,
                status: error.status,
                details: error.details,
                stack: error.stack
            });
            console.error('❌ Context details:', {
                customerId,
                bucketName,
                projectId: this.projectId,
                region: this.region,
                isTestMode: this.isTestMode
            });

            // Check for specific error types
            if (error.code === 403) {
                console.error('❌ PERMISSION DENIED: Service account lacks storage.objects.create permission');
                console.error('❌ Please check IAM roles for the service account');
            } else if (error.code === 404) {
                console.error('❌ BUCKET NOT FOUND: Bucket does not exist or project ID is incorrect');
                console.error('❌ Please verify project ID and bucket naming');
            } else if (error.code === 400) {
                console.error('❌ BAD REQUEST: Invalid bucket name or configuration');
                console.error('❌ Please check bucket name format and region');
            }

            throw new Error(`Failed to access storage bucket for customer ${customerId}: ${error.message}`);
        }
    }

    /**
     * Upload file to customer bucket
     */
    // Helper function to create URL-safe filename
    createSafeFileName(originalName) {
        // Extract file extension
        const lastDotIndex = originalName.lastIndexOf('.');
        const nameWithoutExt = lastDotIndex > 0 ? originalName.substring(0, lastDotIndex) : originalName;
        const extension = lastDotIndex > 0 ? originalName.substring(lastDotIndex) : '';

        // Create URL-safe filename with timestamp and random suffix to prevent conflicts
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8); // 6-character random string

        // Use the original Korean filename directly (no more Base64 encoding)
        // Google Cloud Storage now supports Korean filenames properly
        const safeName = `${timestamp}-${randomSuffix}-${nameWithoutExt}${extension}`;

        console.log('📁 Creating safe filename:', {
            originalName,
            nameWithoutExt,
            extension,
            timestamp,
            randomSuffix,
            safeName
        });

        return safeName;
    }

    async uploadFile(customerId, file, originalName) {
        if (this.isTestMode) {
            console.log(`🔧 TEST MODE: Uploading file ${originalName} for customer ${customerId}`);
            const fileName = this.createSafeFileName(originalName);

            // Store file info in memory
            if (!this.testStorage.has(customerId)) {
                this.testStorage.set(customerId, []);
            }

            const fileInfo = {
                name: fileName,
                originalName: originalName, // Keep original name for display
                size: file.size,
                timeCreated: new Date().toISOString(),
                contentType: file.mimetype
            };

            this.testStorage.get(customerId).push(fileInfo);
            console.log(`🔧 TEST MODE: File stored in memory. Total files for ${customerId}: ${this.testStorage.get(customerId).length}`);

            return {
                fileName,
                gcsUri: `gs://test-bucket-${customerId}/${fileName}`,
                bucketName: `test-bucket-${customerId}`
            };
        }

        try {
            const bucket = await this.getCustomerBucket(customerId);

            // Create safe filename with timestamp and random suffix
            const timestamp = Date.now();
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            const ext = path.extname(originalName);
            const nameWithoutExt = path.basename(originalName, ext);
            const fileName = `${timestamp}-${randomSuffix}-${nameWithoutExt}${ext}`;

            // Create customer-specific folder path
            const customerFolder = `customer-${customerId}`;
            const filePath = `${customerFolder}/${fileName}`;
            const fileUpload = bucket.file(filePath);

            console.log('📁 File upload path:', {
                customerId,
                customerFolder,
                fileName,
                fullPath: filePath,
                originalName: originalName
            });

            // Use memory buffer for binary data integrity
            if (!file.buffer) {
                throw new Error('No file buffer available - memory storage required for binary files');
            }

            const uploadData = file.buffer;
            console.log('📤 Uploading from memory buffer, size:', uploadData.length, 'bytes');

            // 메모리 사용량 모니터링
            const memoryUsage = process.memoryUsage();
            console.log('🧠 Memory usage:', {
                rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
                heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
                heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
                external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB'
            });

            await fileUpload.save(uploadData, {
                metadata: {
                    contentType: file.mimetype,
                    metadata: {
                        originalName: originalName,
                        customerId: customerId,
                        uploadedAt: new Date().toISOString()
                    }
                }
            });

            const gcsUri = `gs://${bucket.name}/${filePath}`;
            console.log(`✅ File uploaded successfully: ${gcsUri}`);
            console.log(`📊 Upload stats: ${uploadData.length} bytes, ${file.mimetype}`);

            return {
                fileName: filePath, // Return full path including customer folder
                originalFileName: fileName, // Return just the filename without folder
                gcsUri,
                bucketName: bucket.name,
                customerFolder
            };
        } catch (error) {
            console.error('❌ Error uploading file:', error);

            // Clean up temporary file on error
            if (file.path) {
                try {
                    const fs = require('fs');
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                        console.log('🗑️ Temporary file cleaned up after error:', file.path);
                    }
                } catch (cleanupError) {
                    console.warn('⚠️ Failed to clean up temporary file after error:', cleanupError.message);
                }
            }

            // Provide more specific error messages
            if (error.code === 403) {
                throw new Error('Permission denied: Check Google Cloud Storage permissions');
            } else if (error.code === 404) {
                throw new Error('Bucket not found: Check bucket configuration');
            } else if (error.message.includes('ENOENT')) {
                throw new Error('File not found: Check file path');
            } else {
                throw new Error(`Failed to upload file: ${error.message}`);
            }
        }
    }

    /**
     * Delete file from customer bucket
     */
    async deleteFile(customerId, fileName) {
        if (this.isTestMode) {
            console.log(`🔧 TEST MODE: Deleting file ${fileName} for customer ${customerId}`);

            // Remove file from memory storage
            if (this.testStorage.has(customerId)) {
                const files = this.testStorage.get(customerId);
                const index = files.findIndex(file => file.name === fileName);
                if (index !== -1) {
                    files.splice(index, 1);
                    console.log(`🔧 TEST MODE: File deleted from memory. Remaining files for ${customerId}: ${files.length}`);
                }
            }

            return { success: true };
        }

        try {
            const bucket = await this.getCustomerBucket(customerId);

            // If fileName doesn't include customer folder, add it
            let fullPath = fileName;
            if (!fileName.startsWith(`customer-${customerId}/`)) {
                const customerFolder = `customer-${customerId}`;
                fullPath = `${customerFolder}/${fileName}`;
            }

            const file = bucket.file(fullPath);
            await file.delete();
            console.log(`File deleted: ${fullPath}`);
            return { success: true };
        } catch (error) {
            console.error('Error deleting file:', error);
            throw new Error(`Failed to delete file: ${error.message}`);
        }
    }

    /**
     * List files in customer bucket
     */
    async listFiles(customerId) {
        if (this.isTestMode) {
            console.log(`🔧 TEST MODE: Listing files for customer ${customerId}`);

            // Return files from memory storage
            const files = this.testStorage.get(customerId) || [];
            console.log(`🔧 TEST MODE: Found ${files.length} files in memory for customer ${customerId}`);

            // Return files with original names for display
            return files.map(file => ({
                name: file.originalName || file.name,
                storedName: file.name, // 실제 저장된 파일명
                size: file.size,
                timeCreated: file.timeCreated,
                contentType: file.contentType
            }));
        }

        try {
            console.log(`📋 Listing files for customer: ${customerId}`);
            const bucket = await this.getCustomerBucket(customerId);
            console.log(`📁 Bucket retrieved: ${bucket.name}`);

            // List files in customer-specific folder
            const customerFolder = `customer-${customerId}`;
            const [files] = await bucket.getFiles({
                prefix: `${customerFolder}/`
            });
            console.log(`📄 Found ${files.length} files in customer folder: ${customerFolder}`);

            const fileList = await Promise.all(files.map(async (file) => {
                try {
                    // Get full metadata for each file
                    const [metadata] = await file.getMetadata();
                    console.log(`📄 File metadata for ${file.name}:`, {
                        name: metadata.name,
                        size: metadata.size,
                        contentType: metadata.contentType,
                        timeCreated: metadata.timeCreated,
                        originalName: metadata.metadata?.originalName
                    });

                    // 파일 메타데이터에서 원본 파일명을 가져와서 디코딩
                    let displayName = file.name; // 기본값은 GCS 파일명

                    if (metadata.metadata?.originalName) {
                        try {
                            // 조건 없이 항상 디코딩을 시도 (다국어 지원)
                            const decodedMetadataName = Buffer.from(metadata.metadata.originalName, 'latin1').toString('utf-8');

                            console.log('🔍 Decoding check:', {
                                original: metadata.metadata.originalName,
                                decoded: decodedMetadataName,
                                hasKorean: /[가-힣]/.test(decodedMetadataName),
                                hasChinese: /[\u4e00-\u9fff]/.test(decodedMetadataName),
                                hasJapanese: /[\u3040-\u309f\u30a0-\u30ff]/.test(decodedMetadataName),
                                hasCyrillic: /[\u0400-\u04ff]/.test(decodedMetadataName),
                                hasArabic: /[\u0600-\u06ff]/.test(decodedMetadataName)
                            });

                            // 디코딩된 결과를 항상 사용 (조건문 제거)
                            displayName = decodedMetadataName;
                            console.log('✅ Using decoded metadata originalName:', decodedMetadataName);

                        } catch (decodeError) {
                            console.warn('⚠️ Failed to decode metadata originalName:', decodeError.message);
                        }
                    }

                    // 최종 displayName 확인
                    console.log('🔍 Final displayName check:', {
                        displayName: displayName,
                        isKorean: /[가-힣]/.test(displayName),
                        isMultilingual: /[가-힣\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\u0400-\u04ff\u0600-\u06ff]/.test(displayName)
                    });

                    console.log(`📄 File name processing:`, {
                        gcsFileName: file.name,
                        metadataOriginalName: metadata.metadata?.originalName,
                        decodedMetadataName: metadata.metadata?.originalName ? Buffer.from(metadata.metadata.originalName, 'latin1').toString('utf-8') : null,
                        finalDisplayName: displayName,
                        displayNameType: typeof displayName,
                        displayNameLength: displayName ? displayName.length : 0
                    });

                    return {
                        name: displayName,
                        storedName: file.name, // 실제 저장된 파일명 (GCS에서 가져온 이름)
                        size: metadata.size,
                        timeCreated: metadata.timeCreated,
                        contentType: metadata.contentType
                    };
                } catch (fileError) {
                    console.error(`❌ Error getting metadata for ${file.name}:`, fileError);
                    return {
                        name: file.name,
                        storedName: file.name,
                        size: 0,
                        timeCreated: new Date().toISOString(),
                        contentType: 'application/octet-stream'
                    };
                }
            }));

            console.log(`✅ Successfully processed ${fileList.length} files`);
            return fileList;
        } catch (error) {
            console.error('❌ Error listing files:', error);
            console.error('Error details:', {
                customerId,
                errorMessage: error.message,
                errorCode: error.code,
                stack: error.stack
            });
            throw new Error(`Failed to list files: ${error.message}`);
        }
    }

    /**
     * Get file download URL
     */
    async getFileDownloadUrl(customerId, fileName) {
        if (this.isTestMode) {
            console.log(`🔧 TEST MODE: Getting download URL for ${fileName}`);
            return `https://test-storage.googleapis.com/test-bucket-${customerId}/${fileName}`;
        }

        try {
            const bucket = await this.getCustomerBucket(customerId);
            const file = bucket.file(fileName);
            const [signedUrl] = await file.getSignedUrl({
                action: 'read',
                expires: Date.now() + 15 * 60 * 1000, // 15 minutes
            });
            return signedUrl;
        } catch (error) {
            console.error('Error getting download URL:', error);
            throw new Error(`Failed to get download URL: ${error.message}`);
        }
    }

    /**
     * Generate AI response using Gemini (Test Mode)
     */
    async generateAIResponse(query, context, customerId) {
        if (this.isTestMode) {
            console.log(`🔧 TEST MODE: Generating AI response for customer ${customerId}`);
            return {
                answer: `테스트 모드에서 생성된 AI 응답입니다.\n\n질문: ${query}\n\n이것은 데모용 응답이며, 실제 Google Cloud 서비스가 설정되면 정확한 AI 응답을 제공합니다.`,
                references: [
                    {
                        id: 1,
                        name: 'test-document.pdf',
                        score: 0.95,
                        page: 1
                    }
                ]
            };
        }

        // 실제 Google Cloud AI 서비스 구현은 여기에 추가
        throw new Error('Google Cloud AI service not implemented in production mode');
    }

    /**
     * Add document to Discovery Engine data store
     */
    async addDocumentToDataStore(customerId, gcsUri, fileName) {
        if (this.isTestMode) {
            console.log(`🔧 TEST MODE: Adding document ${fileName} to data store for customer ${customerId}`);
            console.log(`🔧 TEST MODE: GCS URI: ${gcsUri}`);
            return { success: true, message: 'Document added to data store (test mode)' };
        }

        if (!this.documentClient) {
            console.warn(`⚠️ Discovery Engine client not available - skipping document indexing for ${fileName}`);
            return { success: false, message: 'Discovery Engine client not available' };
        }

        try {
            console.log(`📚 Adding document ${fileName} to Discovery Engine data store for customer ${customerId}`);
            console.log(`📚 GCS URI: ${gcsUri}`);

            // Vertex AI Search에 문서 인덱싱 요청
            const request = {
                parent: this.documentClient.dataStorePath(
                    this.projectId,    // GCP 프로젝트 ID
                    'global',          // 데이터 스토어 위치 (보통 global)
                    this.dataStoreId   // 데이터 스토어 ID
                ),
                gcsSource: {
                    inputUris: [gcsUri], // 방금 업로드한 파일의 GCS 경로
                    dataSchema: 'content',
                },
                // 중요: 기존 문서는 그대로 두고 새로 추가만 하라는 의미
                reconciliationMode: 'INCREMENTAL',
            };

            console.log(`📚 Starting document import operation for: ${fileName}`);
            console.log(`📚 Data store path: ${request.parent}`);

            // API를 호출하여 문서 가져오기(인덱싱) 작업을 시작
            const [operation] = await this.documentClient.importDocuments(request);
            console.log(`✅ Document import operation started: ${operation.name}`);
            console.log(`✅ Operation metadata:`, operation.metadata);

            // 실제 작업 완료를 기다릴 필요는 없습니다. 백그라운드에서 진행됩니다.
            return {
                success: true,
                message: 'Document indexing started successfully',
                operationName: operation.name,
                fileName: fileName
            };

        } catch (error) {
            console.error('❌ Error adding document to Discovery Engine:', error);
            console.error('❌ Error details:', {
                message: error.message,
                code: error.code,
                details: error.details
            });

            // 인덱싱 실패해도 업로드는 성공으로 처리 (사용자 경험 고려)
            return {
                success: false,
                message: `Document indexing failed: ${error.message}`,
                fileName: fileName
            };
        }
    }

    /**
     * Remove document from Discovery Engine data store
     */
    async removeDocumentFromDataStore(customerId, fileName) {
        if (this.isTestMode) {
            console.log(`🔧 TEST MODE: Removing document ${fileName} from data store for customer ${customerId}`);
            return { success: true, message: 'Document removed from data store (test mode)' };
        }

        if (!this.documentClient) {
            console.warn(`⚠️ Discovery Engine client not available - skipping document removal for ${fileName}`);
            return { success: false, message: 'Discovery Engine client not available' };
        }

        try {
            console.log(`🗑️ Removing document ${fileName} from Discovery Engine data store for customer ${customerId}`);

            // 파일명에서 문서 ID 추출 (타임스탬프 부분)
            const timestampMatch = fileName.match(/(\d+)-[a-z0-9]+-/);
            if (!timestampMatch) {
                console.warn(`⚠️ Could not extract document ID from filename: ${fileName}`);
                return { success: false, message: 'Could not extract document ID from filename' };
            }

            const documentId = timestampMatch[1];
            console.log(`🗑️ Extracted document ID: ${documentId}`);

            // 문서 삭제 요청
            const request = {
                name: this.documentClient.documentPath(
                    this.projectId,    // GCP 프로젝트 ID
                    'global',          // 데이터 스토어 위치
                    this.dataStoreId,  // 데이터 스토어 ID
                    documentId         // 문서 ID
                ),
            };

            console.log(`🗑️ Deleting document: ${request.name}`);
            await this.documentClient.deleteDocument(request);

            console.log(`✅ Document successfully removed from Discovery Engine: ${fileName}`);
            return {
                success: true,
                message: 'Document removed from data store successfully',
                fileName: fileName
            };

        } catch (error) {
            console.error('❌ Error removing document from Discovery Engine:', error);
            console.error('❌ Error details:', {
                message: error.message,
                code: error.code,
                details: error.details
            });

            // 삭제 실패해도 파일 삭제는 성공으로 처리 (사용자 경험 고려)
            return {
                success: false,
                message: `Document removal from data store failed: ${error.message}`,
                fileName: fileName
            };
        }
    }

    /**
     * Search documents using Vertex AI Search
     */
    async searchDocuments(customerId, query, maxResults = 5) {
        if (this.isTestMode) {
            console.log(`🔧 TEST MODE: Searching documents for customer ${customerId}`);
            return [
                {
                    title: '테스트 문서',
                    content: '테스트 문서에서 찾은 관련 내용입니다. 실제 Vertex AI Search가 연결되면 더 정확한 결과를 제공할 수 있습니다.',
                    uri: 'gs://test-bucket/test-document.pdf',
                    score: 0.95
                }
            ];
        }

        try {
            console.log(`🔍 Searching documents for customer ${customerId} with query: ${query}`);

            // TODO: 실제 Vertex AI Search API 호출 구현
            // 현재는 프로덕션 모드에서도 테스트 응답 반환
            console.log('⚠️ Vertex AI Search not fully implemented yet, returning test response');

            return [
                {
                    title: '프로덕션 테스트 문서',
                    content: `프로덕션 모드에서 "${query}"에 대한 검색 결과입니다. Vertex AI Search가 완전히 구현되면 실제 문서에서 검색된 내용을 제공할 수 있습니다.`,
                    uri: 'gs://toads-bucket/production-test-document.pdf',
                    score: 0.90
                }
            ];
        } catch (error) {
            console.error('Error searching documents:', error);
            throw new Error(`Failed to search documents: ${error.message}`);
        }
    }

    /**
     * Generate AI response using Vertex AI with system prompt
     */
    async generateAIResponse(query, searchResults, customerId, companyName = '토즈') {
        if (this.isTestMode) {
            console.log(`🔧 TEST MODE: Generating AI response for customer ${customerId}`);

            // 테스트 모드에서도 시스템 프롬프트 구조 사용
            const contextInfo = searchResults.map((result, index) =>
                `${index + 1}. ${result.title}: ${result.content.substring(0, 200)}...`
            ).join('\n');

            const systemPrompt = generateSystemPrompt(
                companyName, // 동적 고객사명
                contextInfo,
                query
            );

            console.log('📝 Generated system prompt for test mode');
            console.log('System prompt preview:', systemPrompt.substring(0, 500) + '...');

            return `테스트 모드: "${query}"에 대한 AI 응답입니다.\n\n검색된 문서 ${searchResults.length}개를 참고하여 답변을 생성했습니다.\n\n시스템 프롬프트가 적용되어 실제 Vertex AI 연결 시 전문적인 답변을 제공할 수 있습니다.`;
        }

        if (!this.vertexAI) {
            console.warn('⚠️ Vertex AI client not available - returning fallback response');
            return `죄송합니다. 현재 AI 서비스가 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.`;
        }

        try {
            console.log(`🤖 Generating AI response for customer ${customerId} with ${searchResults.length} search results`);

            // 검색 결과를 컨텍스트로 변환
            const contextInfo = searchResults.map((result, index) =>
                `문서 ${index + 1}: ${result.title}\n내용: ${result.content}\n출처: ${result.uri}\n점수: ${result.score}\n---`
            ).join('\n');

            // 시스템 프롬프트 생성
            const systemPrompt = generateSystemPrompt(
                companyName, // 동적 고객사명
                contextInfo,
                query
            );

            console.log('📝 Generated system prompt for production mode');
            console.log('System prompt length:', systemPrompt.length);

            // 실제 Vertex AI API 호출
            const generativeModel = this.vertexAI.getGenerativeModel({
                model: 'gemini-1.5-pro',
                generationConfig: {
                    maxOutputTokens: 2048,
                    temperature: 0.7,
                    topP: 0.8,
                    topK: 40
                }
            });

            console.log('🚀 Calling Vertex AI API...');
            const result = await generativeModel.generateContent(systemPrompt);
            const response = result.response;

            if (response.candidates && response.candidates.length > 0) {
                const aiResponse = response.candidates[0].content.parts[0].text;
                console.log('✅ Vertex AI response generated successfully');
                console.log('Response length:', aiResponse.length);
                return aiResponse;
            } else {
                console.warn('⚠️ No candidates in Vertex AI response');
                return `죄송합니다. AI 응답을 생성하는 중 문제가 발생했습니다. 다시 시도해 주세요.`;
            }

        } catch (error) {
            console.error('❌ Error generating AI response:', error);
            console.error('❌ Error details:', {
                message: error.message,
                code: error.code,
                details: error.details
            });

            // AI 응답 생성 실패 시 fallback 응답
            return `죄송합니다. AI 응답을 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.\n\n오류: ${error.message}`;
        }
    }
}

module.exports = new GoogleCloudService();