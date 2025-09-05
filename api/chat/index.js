const Joi = require('joi');
const { authenticateToken, requireCustomerId } = require('../../server/src/middleware/auth');
const googleCloudService = require('../../server/src/services/googleCloudService');

// Validation schema
const chatSchema = Joi.object({
    query: Joi.string().min(1).max(1000).required(),
    maxResults: Joi.number().integer().min(1).max(10).default(5)
});

export default async function handler(req, res) {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { error, value } = chatSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { query, maxResults } = value;

        // 인증 확인
        const authResult = await authenticateToken(req, res);
        if (!authResult) return;

        const customerId = authResult.customerId;

        console.log(`Chat request from customer ${customerId}: ${query}`);

        // Search relevant documents
        const searchResults = await googleCloudService.searchDocuments(
            customerId,
            query,
            maxResults
        );

        if (searchResults.length === 0) {
            return res.json({
                success: true,
                answer: '죄송합니다. 관련 문서를 찾을 수 없습니다. 문서 관리 페이지에서 관련 문서를 업로드해 주세요.',
                references: [],
                searchResults: []
            });
        }

        // Generate AI response with company name
        const companyName = authResult.companyName || '토즈';
        const aiResponse = await googleCloudService.generateAIResponse(
            query,
            searchResults,
            customerId,
            companyName
        );

        // Format references for response
        const references = searchResults.map((result, index) => ({
            id: index + 1,
            name: result.title || '문서',
            score: result.score || 0.8,
            page: 1 // Default page number
        }));

        console.log(`Chat response generated for customer ${customerId}`);

        res.json({
            success: true,
            answer: aiResponse,
            references,
            searchResults
        });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
