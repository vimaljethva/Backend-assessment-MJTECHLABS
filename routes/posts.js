const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { authenticate, optionalAuth } = require('../middleware/auth');
const wrapAsync = require('../middleware/wrapAsync');
const ExpressError = require('../utils/ExpressError');
const { postSchema } = require('../utils/validation');
const upload = require('../config/multer');
const fs = require('fs');
const path = require('path');

// Get all published posts with pagination, sorting, and search
router.get('/', optionalAuth, wrapAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 6;
  const sort = req.query.sort || '-createdAt';
  const search = req.query.search || '';

  const skip = (page - 1) * limit;

  // Build query
  let query = { isDeleted: false, status: 'published' };

  // Add search if provided
  if (search) {
    query.$text = { $search: search };
  }

  // Get total count
  const total = await Post.countDocuments(query);

  // Get posts
  const posts = await Post.find(query)
    .populate('author', 'username')
    .sort(sort)
    .skip(skip)
    .limit(limit);

  const totalPages = Math.ceil(total / limit);

  res.render('posts/index', { 
    posts, 
    title: 'All Posts',
    currentPage: page,
    totalPages,
    sort,
    search
  });
}));

// Render new post form
router.get('/new', authenticate, (req, res) => {
  res.render('posts/new', { title: 'Create New Post' });
});

// Create new post with image upload
router.post('/', authenticate, upload.single('image'), wrapAsync(async (req, res) => {
  // Validate input
  const { error } = postSchema.validate(req.body);
  if (error) {
    // Delete uploaded file if validation fails
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    req.flash('error', error.details[0].message);
    return res.redirect('/posts/new');
  }

  const { title, content, tags, status } = req.body;
  
  // Process tags
  const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

  const post = new Post({
    title,
    content,
    tags: tagArray,
    status,
    author: req.user._id,
    image: req.file ? `/uploads/${req.file.filename}` : null
  });

  await post.save();
  req.flash('success', 'Post created successfully!');
  res.redirect(`/posts/${post.slug}`);
}));

// Get single post by slug
router.get('/:slug', optionalAuth, wrapAsync(async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug, isDeleted: false })
    .populate('author', 'username');

  if (!post) {
    req.flash('error', 'Post not found');
    return res.redirect('/posts');
  }

  // Only show published posts unless user is the author
  if (post.status === 'draft' && (!req.user || !post.author._id.equals(req.user._id))) {
    req.flash('error', 'Post not found');
    return res.redirect('/posts');
  }

  // Increment views
  post.views += 1;
  await post.save();

  // Get comments for this post
  const comments = await Comment.find({ 
    post: post._id, 
    isDeleted: false,
    parentComment: null 
  })
    .populate('author', 'username')
    .populate('likes', 'username')
    .populate('dislikes', 'username')
    .sort({ createdAt: -1 });

  // Get replies for each comment
  for (let comment of comments) {
    comment.replies = await Comment.find({
      parentComment: comment._id,
      isDeleted: false
    })
      .populate('author', 'username')
      .populate('likes', 'username')
      .populate('dislikes', 'username')
      .sort({ createdAt: 1 });
  }

  res.render('posts/show', { post, comments, title: post.title });
}));

// Render edit post form
router.get('/:slug/edit', authenticate, wrapAsync(async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug, isDeleted: false });

  if (!post) {
    req.flash('error', 'Post not found');
    return res.redirect('/posts');
  }

  // Check if user is the author
  if (!post.author.equals(req.user._id)) {
    req.flash('error', 'You do not have permission to edit this post');
    return res.redirect(`/posts/${post.slug}`);
  }

  res.render('posts/edit', { post, title: 'Edit Post' });
}));

// Update post
router.put('/:slug', authenticate, upload.single('image'), wrapAsync(async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug, isDeleted: false });

  if (!post) {
    if (req.file) fs.unlinkSync(req.file.path);
    req.flash('error', 'Post not found');
    return res.redirect('/posts');
  }

  // Check if user is the author
  if (!post.author.equals(req.user._id)) {
    if (req.file) fs.unlinkSync(req.file.path);
    req.flash('error', 'You do not have permission to update this post');
    return res.redirect(`/posts/${post.slug}`);
  }

  // Validate input
  const { error } = postSchema.validate(req.body);
  if (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    req.flash('error', error.details[0].message);
    return res.redirect(`/posts/${post.slug}/edit`);
  }

  const { title, content, tags, status } = req.body;
  const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

  post.title = title;
  post.content = content;
  post.tags = tagArray;
  post.status = status;

  // Update image if new one uploaded
  if (req.file) {
    // Delete old image
    if (post.image) {
      const oldImagePath = path.join(__dirname, '..', 'public', post.image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
    post.image = `/uploads/${req.file.filename}`;
  }
  
  await post.save();
  req.flash('success', 'Post updated successfully!');
  res.redirect(`/posts/${post.slug}`);
}));

// Delete post (soft delete)
router.delete('/:slug', authenticate, wrapAsync(async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug, isDeleted: false });

  if (!post) {
    req.flash('error', 'Post not found');
    return res.redirect('/posts');
  }

  // Check if user is the author
  if (!post.author.equals(req.user._id)) {
    req.flash('error', 'You do not have permission to delete this post');
    return res.redirect(`/posts/${post.slug}`);
  }

  post.isDeleted = true;
  await post.save();

  req.flash('success', 'Post deleted successfully');
  res.redirect('/posts');
}));

module.exports = router;