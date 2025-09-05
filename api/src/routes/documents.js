const express = require('express');
const path = require('path');
const { authenticateToken, requireCustomerId } = require('../middleware/auth');
const { uploadSingle, uploadMultiple } = require('../middleware/upload');
const googleCloudService = require('../services/googleCloudService');
const router = express.Router();

/**
 * GET /api/documents
 * Get list of documents for the customer
 */
router.get('/', authenticateToken, requireCustomerId, async (req, res, next) => {
    try {
        const customerId = req.user.customerId;
        console.log(`Listing documents for customer: ${customerId}`);

        const documents = await googleCloudService.listFiles(customerId);
        console.log(`Found ${documents.length} documents for customer ${customerId}`);

        const formattedDocuments = documents.map(doc => {
            // 타임스탬프를 고유 ID로 추출 (customer-1/timestamp-random-filename 형태)
            const timestampMatch = doc.name ? doc.name.match(/customer-\d+\/(\d+)-[a-z0-9]+-/) : null;
            const uniqueId = timestampMatch ? timestampMatch[1] : (doc.name || 'unknown');
            
            // 원본 파일명 표시 (originalName이 있으면 사용, 없으면 파일명에서 추출)
            let displayName = doc.originalName || doc.name || 'Unknown File';
            if (!doc.originalName && doc.name) {
                // customer-1/timestamp-random-originalname.ext 형태에서 원본명 추출
                const nameMatch = doc.name.match(/customer-\d+\/\d+-[a-z0-9]+-(.+)$/);
                if (nameMatch) {
                    displayName = nameMatch[1];
                }
            }

            return {
                id: uniqueId, // Use timestamp as unique ID for download
                name: displayName, // Use original name for display
                size: doc.size || 0,
                uploadedAt: doc.created || new Date().toISOString(), // Use created or fallback
                contentType: doc.contentType,
                sizeFormatted: formatFileSize(doc.size),
                storedName: doc.name // Keep stored name for reference
            };
        });

        console.log('Formatted documents:', formattedDocuments);

        res.json({
            success: true,
            documents: formattedDocuments
        });
    } catch (error) {
        console.error('Error listing documents:', error);
        next(error);
    }
});

/**
 * POST /api/documents
 * Upload single document
 */
router.post('/', authenticateToken, requireCustomerId, uploadSingle, async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const customerId = req.user.customerId;
        const file = req.file;

        // 한글 파일명 인코딩 처리
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        console.log(`Uploading file for customer ${customerId}: ${originalName}`);
        console.log(`File size: ${file.size} bytes`);

        // Upload to Google Cloud Storage
        const uploadResult = await googleCloudService.uploadFile(
            customerId,
            file,
            originalName
        );

        // Add to Discovery Engine data store
        await googleCloudService.addDocumentToDataStore(
            customerId,
            uploadResult.gcsUri,
            file.originalname
        );

        res.status(201).json({
            success: true,
            message: '파일 업로드 및 색인 요청이 완료되었습니다.',
            document: {
                id: uploadResult.fileName,
                name: file.originalname,
                size: file.size,
                uploadedAt: new Date().toISOString(),
                contentType: file.mimetype,
                sizeFormatted: formatFileSize(file.size)
            }
        });
    } catch (error) {
        console.error('Error uploading document:', error);
        next(error);
    }
});

/**
 * POST /api/documents/batch
 * Upload multiple documents
 */
router.post('/batch', authenticateToken, requireCustomerId, uploadMultiple, async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const customerId = req.user.customerId;
        const files = req.files;

        console.log(`Uploading ${files.length} files for customer ${customerId}`);

        const uploadPromises = files.map(async (file) => {
            try {
                // 한글 파일명 인코딩 처리
                const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
                console.log(`Uploading file: ${originalName}`);
                console.log(`File size: ${file.size} bytes`);

                // Upload to Google Cloud Storage
                const uploadResult = await googleCloudService.uploadFile(
                    customerId,
                    file,
                    originalName
                );

                // Add to Discovery Engine data store
                await googleCloudService.addDocumentToDataStore(
                    customerId,
                    uploadResult.gcsUri,
                    file.originalname
                );

                return {
                    id: uploadResult.fileName,
                    name: file.originalname,
                    size: file.size,
                    uploadedAt: new Date().toISOString(),
                    contentType: file.mimetype,
                    sizeFormatted: formatFileSize(file.size),
                    success: true
                };
            } catch (error) {
                console.error(`Error uploading file ${file.originalname}:`, error);
                return {
                    name: file.originalname,
                    error: error.message,
                    success: false
                };
            }
        });

        const results = await Promise.all(uploadPromises);
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        res.status(201).json({
            success: true,
            message: `${successful.length}개 파일 업로드 완료${failed.length > 0 ? `, ${failed.length}개 실패` : ''}`,
            documents: successful,
            errors: failed
        });
    } catch (error) {
        console.error('Error uploading documents:', error);
        next(error);
    }
});

/**
 * DELETE /api/documents/:id
 * Delete a document using unique ID (timestamp)
 */
router.delete('/:id', authenticateToken, requireCustomerId, async (req, res, next) => {
    try {
        const customerId = req.user.customerId;
        const documentId = req.params.id; // This is now the timestamp (unique ID)

        console.log(`🗑️ Delete request for unique ID: ${documentId} (customer: ${customerId})`);

        // Get file from Google Cloud Storage
        const bucket = await googleCloudService.getCustomerBucket(customerId);
        const customerFolder = `customer-${customerId}/`;
        
        // 고객별 폴더에서만 파일 검색 (데이터 격리)
        const [customerFiles] = await bucket.getFiles({ prefix: customerFolder });
        console.log(`🔍 Found ${customerFiles.length} files in customer ${customerId} folder`);
        
        // 파일 구조 디버깅
        customerFiles.forEach((file, index) => {
            console.log(`File ${index}: ${file.name}`);
        });

        // Find file that starts with the timestamp
        const targetFile = customerFiles.find(file => {
            // 파일명에서 타임스탬프 추출 (customer-1/timestamp-random-filename 형태)
            const match = file.name.match(/customer-\d+\/(\d+)-[a-z0-9]+-/);
            const timestamp = match ? match[1] : null;
            return timestamp === documentId;
        });

        if (!targetFile) {
            console.error(`❌ Document not found for deletion ID: ${documentId}`);
            return res.status(404).json({ error: 'Document not found' });
        }

        console.log(`✅ Found target file for deletion: ${targetFile.name}`);

        // Delete from Google Cloud Storage
        await googleCloudService.deleteFile(customerId, targetFile.name);

        // Remove from Discovery Engine data store
        await googleCloudService.removeDocumentFromDataStore(customerId, targetFile.name);

        res.json({
            success: true,
            message: '문서가 성공적으로 삭제되었습니다.'
        });
    } catch (error) {
        console.error('Error deleting document:', error);
        next(error);
    }
});

/**
 * GET /api/documents/:id/download
 * Download a document using unique ID (timestamp)
 */
router.get('/:id/download', authenticateToken, requireCustomerId, async (req, res, next) => {
    try {
        const customerId = req.user.customerId;
        const documentId = req.params.id; // This is now the timestamp (unique ID)

        console.log(`🔍 Download request for unique ID: ${documentId} (customer: ${customerId})`);

        // Get file from Google Cloud Storage
        const bucket = await googleCloudService.getCustomerBucket(customerId);
        const customerFolder = `customer-${customerId}`;

        // Find file by timestamp (unique ID)
        const [files] = await bucket.getFiles({ prefix: customerFolder });
        console.log(`🔍 Found ${files.length} files in customer folder`);

        // Find file that contains the timestamp
        const targetFile = files.find(file => file.name.includes(documentId));

        if (!targetFile) {
            console.error(`❌ Document not found for ID: ${documentId}`);
            return res.status(404).json({ error: 'Document not found' });
        }

        console.log(`✅ Found target file: ${targetFile.name}`);

        // Get file metadata
        const [metadata] = await targetFile.getMetadata();
        console.log(`📄 File metadata:`, {
            name: metadata.name,
            size: metadata.size,
            contentType: metadata.contentType,
            originalName: metadata.metadata?.originalName
        });

        // Set response headers
        const contentType = metadata.contentType || 'application/octet-stream';
        const originalName = metadata.metadata?.originalName || path.basename(metadata.name);

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
        res.setHeader('Content-Length', metadata.size);

        console.log(`📤 Starting download: ${originalName} (${metadata.size} bytes)`);

        // Create read stream with comprehensive error handling
        const readStream = targetFile.createReadStream();

        readStream.on('error', (streamError) => {
            console.error('❌ Stream error during download:', streamError);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to download file' });
            }
        });

        readStream.on('end', () => {
            console.log(`✅ Download completed: ${originalName}`);
        });

        // Pipe stream directly to response (preserves binary data)
        readStream.pipe(res);

    } catch (error) {
        console.error('❌ Error downloading document:', error);
        next(error);
    }
});

/**
 * Utility function to format file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = router;
