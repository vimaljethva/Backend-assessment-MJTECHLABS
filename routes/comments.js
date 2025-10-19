const express = require('express');
const router = express.Router({ mergeParams: true });
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { authenticate } = require('../middleware/auth');
const wrapAsync = require('../middleware/wrapAsync');
const ExpressError = require('../utils/ExpressError');
const { commentSchema } = require('../utils/validation');

// Add comment to post
router.post('/', authenticate, wrapAsync(async (req, res) => {
  const { postId } = req.params;

  // Validate input
  const { error } = commentSchema.validate(req.body);
  if (error) {
    req.flash('error', error.details[0].message);
    return res.redirect(`/posts/${postId}`);
  }

  // Check if post exists
  const post = await Post.findOne({ _id: postId, isDeleted: false, status: 'published' });
  if (!post) {
    req.flash('error', 'Post not found');
    return res.redirect('/posts');
  }

  const { content } = req.body;

  const comment = new Comment({
    content,
    author: req.user._id,
    post: postId,
    level: 0
  });

  await comment.save();
  req.flash('success', 'Comment added successfully!');
  res.redirect(`/posts/${post.slug}`);
}));

// Reply to a comment
router.post('/:commentId/reply', authenticate, wrapAsync(async (req, res) => {
  const { postId, commentId } = req.params;

  // Validate input
  const { error } = commentSchema.validate(req.body);
  if (error) {
    req.flash('error', error.details[0].message);
    return res.redirect(`/posts/${postId}`);
  }

  const post = await Post.findById(postId);
  const parentComment = await Comment.findOne({ _id: commentId, isDeleted: false });
  
  if (!parentComment) {
    req.flash('error', 'Comment not found');
    return res.redirect(`/posts/${post.slug}`);
  }

  // Check nesting level
  if (parentComment.level >= 1) {
    req.flash('error', 'Cannot reply to this comment (max nesting level reached)');
    return res.redirect(`/posts/${post.slug}`);
  }

  const { content } = req.body;

  const reply = new Comment({
    content,
    author: req.user._id,
    post: postId,
    parentComment: commentId,
    level: parentComment.level + 1
  });

  await reply.save();
  req.flash('success', 'Reply added successfully!');
  res.redirect(`/posts/${post.slug}`);
}));

// Like comment
router.post('/:commentId/like', authenticate, wrapAsync(async (req, res) => {
  const { postId, commentId } = req.params;
  const comment = await Comment.findById(commentId);
  const post = await Post.findById(postId);

  if (!comment) {
    req.flash('error', 'Comment not found');
    return res.redirect(`/posts/${post.slug}`);
  }

  const userIdStr = req.user._id.toString();
  const likeIndex = comment.likes.findIndex(id => id.toString() === userIdStr);
  const dislikeIndex = comment.dislikes.findIndex(id => id.toString() === userIdStr);

  // Remove from dislikes if present
  if (dislikeIndex > -1) {
    comment.dislikes.splice(dislikeIndex, 1);
  }

  // Toggle like
  if (likeIndex > -1) {
    comment.likes.splice(likeIndex, 1);  // Unlike
  } else {
    comment.likes.push(req.user._id);    // Like
  }

  await comment.save();
  res.redirect(`/posts/${post.slug}`);
}));

// Dislike comment
router.post('/:commentId/dislike', authenticate, wrapAsync(async (req, res) => {
  const { postId, commentId } = req.params;
  const comment = await Comment.findById(commentId);
  const post = await Post.findById(postId);

  if (!comment) {
    req.flash('error', 'Comment not found');
    return res.redirect(`/posts/${post.slug}`);
  }

  const userIdStr = req.user._id.toString();
  const likeIndex = comment.likes.findIndex(id => id.toString() === userIdStr);
  const dislikeIndex = comment.dislikes.findIndex(id => id.toString() === userIdStr);

  // Remove from likes if present
  if (likeIndex > -1) {
    comment.likes.splice(likeIndex, 1);
  }

  // Toggle dislike
  if (dislikeIndex > -1) {
    comment.dislikes.splice(dislikeIndex, 1);  // Remove dislike
  } else {
    comment.dislikes.push(req.user._id);       // Dislike
  }

  await comment.save();
  res.redirect(`/posts/${post.slug}`);
}));

// Delete comment (soft delete)
router.delete('/:commentId', authenticate, wrapAsync(async (req, res) => {
  const { postId, commentId } = req.params;
  const comment = await Comment.findOne({ _id: commentId, isDeleted: false });
  const post = await Post.findById(postId);

  if (!comment) {
    req.flash('error', 'Comment not found');
    return res.redirect(`/posts/${post.slug}`);
  }

  // Check if user is the author
  if (!comment.author.equals(req.user._id)) {
    req.flash('error', 'You do not have permission to delete this comment');
    return res.redirect(`/posts/${post.slug}`);
  }

  comment.isDeleted = true;
  await comment.save();

  req.flash('success', 'Comment deleted successfully');
  res.redirect(`/posts/${post.slug}`);
}));

module.exports = router;