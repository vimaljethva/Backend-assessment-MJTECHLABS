const jwt = require('jsonwebtoken');
const ExpressError = require('../utils/ExpressError');
const User = require('../models/User');

// middleware to verify JWT token of user
const authenticate = async (req, res, next) => {
  try {
    // get token from cookie or header bearer <token>
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      req.flash('error', 'Please login to access this page');
      return res.redirect('/auth/login');
    }

    // verify token with jwt
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
     // console.log(decoded)
    
    // get user from database via jwt usrid
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/auth/login');
    }

    // Attach user to request.user for furute usages and verify
    req.user = user;
    res.locals.currentUser = user;
    next();
  } catch (error) {
    req.flash('error', 'Invalid or expired token. Please login again');
    return res.redirect('/auth/login');
  }
};

// Optional authentication (doesn't redirect if not authenticated)
const optionalAuth = async (req, res, next) => {
  try {

                                        //either from bearer <token>
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (user) {
        req.user = user;
        res.locals.currentUser = user;
      }
    }
  } catch (error) {
    // Silently fail 
  }
  next();
};

module.exports = { authenticate, optionalAuth };