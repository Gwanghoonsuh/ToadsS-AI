const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Default error
    let error = {
        message: err.message || 'Internal Server Error',
        status: err.status || 500
    };

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        error.message = 'Invalid token';
        error.status = 401;
    }

    if (err.name === 'TokenExpiredError') {
        error.message = 'Token expired';
        error.status = 401;
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        error.message = Object.values(err.errors).map(val => val.message).join(', ');
        error.status = 400;
    }

    // Multer errors (file upload)
    if (err.code === 'LIMIT_FILE_SIZE') {
        error.message = 'File too large';
        error.status = 400;
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        error.message = 'Unexpected file field';
        error.status = 400;
    }

    // Google Cloud errors
    if (err.code && err.code >= 400) {
        error.message = err.message || 'Google Cloud service error';
        error.status = err.code;
    }

    // Don't leak error details in production
    if (process.env.NODE_ENV === 'production' && error.status === 500) {
        error.message = 'Internal Server Error';
    }

    res.status(error.status).json({
        error: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;
