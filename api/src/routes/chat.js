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

        if (searchResults.length === 0) {
            return res.json({
                success: true,
                answer: '죄송합니다. 관련 문서를 찾을 수 없습니다. 문서 관리 페이지에서 관련 문서를 업로드해 주세요.',
                references: [],
                searchResults: []
            });
        }

        // Generate AI response with company name
        const companyName = req.user.companyName || '토즈';
        const aiResponse = await googleCloudService.generateAIResponse(
            query,
            searchResults,
            customerId,
            companyName
        );

        // Extract references from search results
        const references = searchResults.map((result, index) => ({
            id: index + 1,
            name: result.title,
            uri: result.uri,
            score: result.score
        }));

        res.json({
            success: true,
            answer: aiResponse,
            references,
            searchResults: searchResults.map(result => ({
                title: result.title,
                content: result.content.substring(0, 200) + '...',
                score: result.score
            }))
        });

    } catch (error) {
        console.error('Chat error:', error);
        next(error);
    }
});



module.exports = router;
