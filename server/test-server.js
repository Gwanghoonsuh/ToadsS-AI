const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5001;

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'ToadsAI Agent Server' });
});

// Mock login endpoint
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    console.log('Login attempt:', { email, password });
    
    if (email === 'admin@maritime1.com' && password === 'password') {
        res.json({
            success: true,
            token: 'mock-jwt-token-12345',
            user: {
                id: 1,
                email: 'admin@maritime1.com',
                name: 'Maritime Admin',
                customerId: 'maritime1',
                companyName: 'Maritime Company 1',
                role: 'admin'
            }
        });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Mock chat endpoint
app.post('/api/chat', (req, res) => {
    const { query } = req.body;
    
    console.log('Chat query:', query);
    
    res.json({
        success: true,
        answer: `테스트 모드에서 생성된 AI 응답입니다.\n\n질문: ${query}\n\n이것은 데모용 응답입니다.`,
        references: [
            {
                id: 1,
                name: 'test-document.pdf',
                score: 0.95,
                page: 1
            }
        ]
    });
});

// Mock documents endpoints
app.get('/api/documents', (req, res) => {
    res.json({
        success: true,
        documents: [
            {
                id: '1',
                name: 'test-document.pdf',
                size: 1024,
                uploadedAt: new Date().toISOString(),
                type: 'application/pdf'
            }
        ]
    });
});

app.post('/api/documents', (req, res) => {
    res.json({
        success: true,
        message: 'File uploaded successfully (test mode)',
        documents: [
            {
                id: '2',
                name: 'uploaded-file.pdf',
                size: 2048,
                uploadedAt: new Date().toISOString(),
                type: 'application/pdf'
            }
        ]
    });
});

app.delete('/api/documents/:id', (req, res) => {
    res.json({
        success: true,
        message: 'Document deleted successfully (test mode)'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Simple test server running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
