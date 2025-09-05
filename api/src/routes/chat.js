const express = require('express');
const Joi = require('joi');
const { authenticateToken, requireCustomerId } = require('../middleware/auth');
const googleCloudService = require('../services/googleCloudService');
const router = express.Router();

// Validation schema
const chatSchema = Joi.object({
    query: Joi.string().min(1).max(1000).required(),
    maxResults: Joi.number().integer().min(1).max(10).default(5)
});

/**
 * POST /api/chat
 * AI chat endpoint
 */
router.post('/', authenticateToken, requireCustomerId, async (req, res, next) => {
    try {
        const { error, value } = chatSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { query, maxResults } = value;
        const customerId = req.user.customerId;

        console.log(`Chat request from customer ${customerId}: ${query}`);

        // Search relevant documents
        const searchResults = await googleCloudService.searchDocuments(
            customerId,
            query,
            maxResults
        );

        // 검색 결과를 컨텍스트로 변환
        const context = searchResults.length > 0 
            ? searchResults.map(result => `${result.title}: ${result.content}`).join('\n\n')
            : '';

        // Generate AI response (문서가 없어도 AI가 적절히 답변)
        const aiResult = await googleCloudService.generateAIResponse(
            query,
            context,
            customerId
        );

        // 검색 결과가 없을 때 특별 처리
        if (searchResults.length === 0 && !aiResult.mock && !aiResult.fallback) {
            // AI가 문서 없음을 인지하고 적절한 답변을 생성
            console.log(`No documents found for customer ${customerId} query: ${query}`);
        }

        // Extract references from search results (내부 점수 정보 제거)
        const references = searchResults.map((result, index) => ({
            id: index + 1,
            name: result.title || `문서 ${index + 1}`,
            uri: result.uri
        }));

        res.json({
            success: true,
            answer: aiResult.response,
            references,
            searchResults: searchResults.map(result => ({
                title: result.title,
                content: result.content ? result.content.substring(0, 200) + '...' : '내용 없음'
            })),
            metadata: {
                contextUsed: aiResult.contextUsed || false,
                customerName: aiResult.customerName,
                mock: aiResult.mock || false,
                fallback: aiResult.fallback || false
            }
        });

    } catch (error) {
        console.error('Chat error:', error);
        next(error);
    }
});



module.exports = router;
