const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let status = err.status || 500;
  let message = err.message || 'Internal server error';

  // Specific error types
  if (err.name === 'ValidationError') {
    status = 400;
    message = err.message;
  }

  if (err.code === '23505') { // PostgreSQL unique violation
    status = 409;
    message = 'Resource already exists';
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    status = 400;
    message = 'Invalid reference';
  }

  // Send response
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

module.exports = { errorHandler };
