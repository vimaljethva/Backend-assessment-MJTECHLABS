const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const mongoSanitize = require('express-mongo-sanitize');
const Post = require('./models/Post');
const wrapAsync = require('./middleware/wrapAsync');
const { optionalAuth } = require('./middleware/auth');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');

// Import error handler
const { errorHandler } = require('./middleware/errorHandler');
const ExpressError = require('./utils/ExpressError');

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log(' MongoDB Connected Successfully'))
  .catch(err => console.error(' MongoDB Connection Error:', err));

// View engine setup for ejs files
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware express + parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(mongoSanitize()); //will help in prevent inject attacks

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 1 week
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

app.use(flash());

// Global variables for views in middleware for all
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.currentUser = req.user || null;
  next();
});


// Routes
app.get('/', optionalAuth, wrapAsync(async (req, res) => {
  const search = req.query.search || '';
  
  let query = { isDeleted: false, status: 'published' };
  
  if (search) {
    query.$text = { $search: search };
  }
  
  const recentPosts = await Post.find(query)
    .populate('author', 'username')
    .sort({ createdAt: -1 })
    .limit(6);
  
  res.render('home', { 
    title: 'Home',
    recentPosts,
    search
  });
}));



app.use('/auth', authRoutes);
app.use('/posts', postRoutes);
app.use('/posts/:postId/comments', commentRoutes);

// 404 handler
app.all('*', (req, res, next) => {
  next(new ExpressError('Page Not Found', 404));
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
});