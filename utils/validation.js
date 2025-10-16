const Joi = require('joi');

// for User registration validation schema
const registerSchema = Joi.object({

  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()

});

// for User login validation schema
const loginSchema = Joi.object({

  email: Joi.string().email().required(),
  password: Joi.string().required()

});

// for Post validation schema
const postSchema = Joi.object({

  title: Joi.string().max(200).required(),
  content: Joi.string().required(),
  tags: Joi.string().allow(''),
  status: Joi.string().valid('draft', 'published').required()

});

// fornComment validation schema
const commentSchema = Joi.object({

  content: Joi.string().max(1000).required()

});

module.exports = {

  registerSchema,
  loginSchema,
  postSchema,
  commentSchema

};