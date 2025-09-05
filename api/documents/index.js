const { authenticateToken, requireCustomerId } = require('../../server/src/middleware/auth');
const googleCloudService = require('../../server/src/services/googleCloudService');

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default async function handler(req, res) {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'GET') {
        try {
            // 인증 확인
            const authResult = await authenticateToken(req, res);
            if (!authResult) return;

            const customerId = authResult.customerId;
            console.log(`Listing documents for customer: ${customerId}`);

            const documents = await googleCloudService.listFiles(customerId);
            console.log(`Found ${documents.length} documents for customer ${customerId}`);

            const formattedDocuments = documents.map(doc => {
                // 타임스탬프를 고유 ID로 추출
                const timestampMatch = doc.storedName.match(/(\d+)-[a-z0-9]+-/);
                const uniqueId = timestampMatch ? timestampMatch[1] : doc.storedName;

                return {
                    id: uniqueId, // Use timestamp as unique ID for download
                    name: doc.name, // Use original name for display
                    size: doc.size,
                    uploadedAt: doc.timeCreated || new Date().toISOString(), // Use timeCreated or fallback
                    contentType: doc.contentType,
                    sizeFormatted: formatFileSize(doc.size),
                    storedName: doc.storedName // Keep stored name for reference
                };
            });

            console.log('Formatted documents:', formattedDocuments);

            res.json({
                success: true,
                documents: formattedDocuments
            });
        } catch (error) {
            console.error('Error listing documents:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
