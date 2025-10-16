const ExpressError = require('../utils/ExpressError');

const errorHandler = (err, req, res, next) => {
  let { statusCode = 500, message = 'Something went wrong!' } = err;

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    //specific error
    message = Object.values(err.errors).map(e => e.message).join(', ');
  }

  // Mongoose duplicate key error due to register existing user
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyPattern)[0];
    message = `${field} already exists`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  console.error('Error:', err);

  // Send custom err response
  res.status(statusCode).render('error', { 
    error: { message, statusCode },
    title: 'Error'
  });
};

module.exports = { errorHandler };