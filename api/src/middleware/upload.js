const multer = require('multer');
const path = require('path');

// Allowed file types for maritime documents
const ALLOWED_FILE_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.hancom.hwp',
    'application/vnd.hancom.hwpx',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'application/dwg',
    'application/vnd.dwg',
    'text/plain',
    'application/rtf'
];

// File size limit (50MB) - 메모리 스토리지 사용 시 중요
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Configure multer for memory storage to preserve binary data integrity
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // Check file type
    if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`File type ${file.mimetype} is not allowed. Supported types: PDF, DOC, DOCX, HWP, HWPX, JPG, PNG, TIFF, DWG, TXT, RTF`), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE, // 50MB per file
        files: 5, // Maximum 5 files per request (메모리 사용량 고려)
        fieldSize: 10 * 1024 * 1024, // 10MB for field data
        fieldNameSize: 100, // Max field name size
        parts: 20 // Max number of parts (fields + files)
    }
});

// Middleware for single file upload
const uploadSingle = upload.single('document');

// Middleware for multiple file upload (메모리 사용량 고려하여 5개로 제한)
const uploadMultiple = upload.array('documents', 5);

// Korean filename encoding is now handled in multer diskStorage configuration above

// Error handling wrapper
const handleUploadError = (uploadMiddleware) => {
    return (req, res, next) => {
        uploadMiddleware(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: '파일이 너무 큽니다. 최대 크기는 50MB입니다.' });
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return res.status(400).json({ error: '파일이 너무 많습니다. 최대 5개 파일까지 업로드 가능합니다.' });
                }
                if (err.code === 'LIMIT_FIELD_SIZE') {
                    return res.status(400).json({ error: '필드 데이터가 너무 큽니다. 최대 10MB까지 가능합니다.' });
                }
                if (err.code === 'LIMIT_FIELD_NAME_SIZE') {
                    return res.status(400).json({ error: '필드 이름이 너무 깁니다.' });
                }
                if (err.code === 'LIMIT_PART_COUNT') {
                    return res.status(400).json({ error: '요청 부분이 너무 많습니다.' });
                }
                if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                    return res.status(400).json({ error: '예상치 못한 파일 필드입니다.' });
                }
                return res.status(400).json({ error: err.message });
            } else if (err) {
                return res.status(400).json({ error: err.message });
            }
            next();
        });
    };
};

module.exports = {
    uploadSingle: handleUploadError(uploadSingle),
    uploadMultiple: handleUploadError(uploadMultiple),
    ALLOWED_FILE_TYPES,
    MAX_FILE_SIZE
};
