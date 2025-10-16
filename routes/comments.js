const express = require('express');
const router = express.Router({ mergeParams: true });
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { authenticate } = require('../middleware/auth');
const wrapAsync = require('../middleware/wrapAsync');
const ExpressError = require('../utils/ExpressError');
const { commentSchema } = require('../utils/validation');

// add comment to post
router.post('/', authenticate, wrapAsync(async (req, res) => {
  const { postId } = req.params;

  // validate input checks
  const { error } = commentSchema.validate(req.body);
  if (error) {
    req.flash('error', error.details[0].message);
    return res.redirect(`/posts/${postId}`);
  }

  // Check if post exists or not
  const post = await Post.findOne({ _id: postId, isDeleted: false, status: 'published' });
   // console.log(post)
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
  res.redirect(`/posts/${postId}`);
}));

// Reply to a comment with auth middleware
router.post('/:commentId/reply', authenticate, wrapAsync(async (req, res) => {
  const { postId, commentId } = req.params;

  // will validate input and check if err
  const { error } = commentSchema.validate(req.body);
  if (error) {
    req.flash('error', error.details[0].message);
    return res.redirect(`/posts/${postId}`);
  }

  // check if parent comment exists or its parent comment
  const parentComment = await Comment.findOne({ _id: commentId, isDeleted: false });
  if (!parentComment) {
    req.flash('error', 'Comment not found');
    return res.redirect(`/posts/${postId}`);
  }
   // console.log(parentComment)

  // check nesting level (max 2 levels: 0 and 1)
  if (parentComment.level >= 1) {
    req.flash('error', 'Cannot reply to this comment (max nesting level reached)');
    return res.redirect(`/posts/${postId}`);
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
  res.redirect(`/posts/${postId}`);
}));

// delete comment (soft delete)
router.delete('/:commentId', authenticate, wrapAsync(async (req, res) => {
  const { postId, commentId } = req.params;

  const comment = await Comment.findOne({ _id: commentId, isDeleted: false });

  if (!comment) {
    req.flash('error', 'Comment not found');
    return res.redirect(`/posts/${postId}`);
  }

  // check if user is the author
  if (!comment.author.equals(req.user._id)) {
    req.flash('error', 'You do not have permission to delete this comment');
    return res.redirect(`/posts/${postId}`);
  }

  comment.isDeleted = true;
  await comment.save();

  req.flash('success', 'Comment deleted successfully');
  res.redirect(`/posts/${postId}`);
}));

module.exports = router;