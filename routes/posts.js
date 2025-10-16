const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { authenticate, optionalAuth } = require('../middleware/auth');
const wrapAsync = require('../middleware/wrapAsync');
const ExpressError = require('../utils/ExpressError');
const { postSchema } = require('../utils/validation');

// show all published posts
router.get('/', optionalAuth, wrapAsync(async (req, res) => {
  const posts = await Post.find({ isDeleted: false, status: 'published' })
    .populate('author', 'username')
    .sort({ createdAt: -1 });//-1 so descending so new post will appear first
    // console.log(posts)
    
  
  res.render('posts/index', { posts, title: 'All Posts' });
}));

// show new post form
router.get('/new', authenticate, (req, res) => {
  res.render('posts/new', { title: 'Create New Post' });
});

// Create new post
router.post('/', authenticate, wrapAsync(async (req, res) => {
  // Validate input is right or nto
  const { error } = postSchema.validate(req.body);
  if (error) {
    req.flash('error', error.details[0].message);
    return res.redirect('/posts/new');
  }

  const { title, content, tags, status } = req.body;
  
  // tags process of add like comma comma will separate the tags
  const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

  const post = new Post({
    title,
    content,
    tags: tagArray,
    status,
    author: req.user._id
  });


  await post.save();
  req.flash('success', 'Post created successfully!');
  res.redirect(`/posts/${post._id}`);
}));

// show single post
router.get('/:id', optionalAuth, wrapAsync(async (req, res) => {

  const post = await Post.findOne({ _id: req.params.id, isDeleted: false })
    .populate('author', 'username');
     // console.log(post)

  if (!post) {
    req.flash('error', 'Post not found');
    return res.redirect('/posts');
  }

  // Only show published posts unless user is the author
  if (post.status === 'draft' && (!req.user || !post.author._id.equals(req.user._id))) {
    req.flash('error', 'Post not found');
    return res.redirect('/posts');
  }

  // show comments for this post
  const comments = await Comment.find({ 
    post: req.params.id, 
    isDeleted: false,
    parentComment: null 
  })
    .populate('author', 'username')
    .sort({ createdAt: -1 });

    // console.log(comments);

  // show replies for each comment
  for (let comment of comments) {
    comment.replies = await Comment.find({
      parentComment: comment._id,
      isDeleted: false
    })
      .populate('author', 'username')
      .sort({ createdAt: 1 });
  }

  res.render('posts/show', { post, comments, title: post.title });
}));

// show edit post form
router.get('/:id/edit', authenticate, wrapAsync(async (req, res) => {
  const post = await Post.findOne({ _id: req.params.id, isDeleted: false });
   // console.log(post)

  if (!post) {
    req.flash('error', 'Post not found');
    return res.redirect('/posts');
  }

  // Check if user is the author
  if (!post.author.equals(req.user._id)) {
    req.flash('error', 'You do not have permission to edit this post');
    return res.redirect(`/posts/${post._id}`);
  }

  res.render('posts/edit', { post, title: 'Edit Post' });
}));

// backend Update post
router.put('/:id', authenticate, wrapAsync(async (req, res) => {
  const post = await Post.findOne({ _id: req.params.id, isDeleted: false });
   // console.log(post)

  if (!post) {
    req.flash('error', 'Post not found');
    return res.redirect('/posts');
  }

  // Check if user is the author
  if (!post.author.equals(req.user._id)) {
    req.flash('error', 'You do not have permission to update this post');
    return res.redirect(`/posts/${post._id}`);
  }

  // Validate input
  const { error } = postSchema.validate(req.body);
  if (error) {
    req.flash('error', error.details[0].message);
    return res.redirect(`/posts/${post._id}/edit`);
  }

  const { title, content, tags, status } = req.body;
  const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

  post.title = title;
  post.content = content;
  post.tags = tagArray;
  post.status = status;
  
  await post.save();
  req.flash('success', 'Post updated successfully!');
  res.redirect(`/posts/${post._id}`);
}));

// Delete post (soft delete)
router.delete('/:id', authenticate, wrapAsync(async (req, res) => {
  const post = await Post.findOne({ _id: req.params.id, isDeleted: false });
   // console.log(post)

  if (!post) {
    req.flash('error', 'Post not found');
    return res.redirect('/posts');
  }

  // Check if user is the author
  if (!post.author.equals(req.user._id)) {
    req.flash('error', 'You do not have permission to delete this post');
    return res.redirect(`/posts/${post._id}`);
  }

  post.isDeleted = true;
  await post.save();

  req.flash('success', 'Post deleted successfully');
  res.redirect('/posts');
}));

module.exports = router;