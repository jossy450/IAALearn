const errorHandler = (err, req, res, next) => {
  // Log error securely (don't expose sensitive info in logs)
  const errorLog = {
    timestamp: new Date().toISOString(),
    status: err.status || 500,
    name: err.name,
    code: err.code,
    message: process.env.NODE_ENV === 'production' ? '[Redacted]' : err.message
  };
  console.error('Error:', JSON.stringify(errorLog));

  // Default error
  let status = err.status || 500;
  let message = 'Internal server error';

  // Specific error types with safe messages
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Invalid input provided';
  }

  if (err.code === '23505') { // PostgreSQL unique violation
    status = 409;
    message = 'Resource already exists';
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    status = 400;
    message = 'Invalid reference';
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    message = 'File size exceeds maximum allowed';
  }

  // Don't expose file paths or stack traces in production
  const response = {
    error: message
  };

  // Only include stack traces in development
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    response.stack = err.stack;
  }

  res.status(status).json(response);
};

module.exports = { errorHandler };

