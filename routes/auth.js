const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const wrapAsync = require('../middleware/wrapAsync');
const ExpressError = require('../utils/ExpressError');
const { registerSchema, loginSchema } = require('../utils/validation');

// show register page
router.get('/register', (req, res) => {
    res.render('auth/register', { title: 'Register' });
});

// backend Register user
router.post('/register', wrapAsync(async (req, res) => {
    // Validate input
    const { error } = registerSchema.validate(req.body);
    if (error) {
        req.flash('error', error.details[0].message);
        return res.redirect('/auth/register');
    }

    const { username, email, password } = req.body;

    // Create user
    const user = new User({ username, email, password });
    
    await user.save();


    req.flash('success', 'Registration successful! Please login');
    res.redirect('/auth/login');
}));

// show login page
router.get('/login', (req, res) => {

    res.render('auth/login', { title: 'Login' });
});

// backend Login user
router.post('/login', wrapAsync(async (req, res) => {
    // Validate input
    const { error } = loginSchema.validate(req.body);
    if (error) {
        req.flash('error', error.details[0].message);
        return res.redirect('/auth/login');
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    // console.log(user);

    //checks hashed password stored in db
    if (!user || !(await user.comparePassword(password))) {
        req.flash('error', 'Invalid email or password');
        return res.redirect('/auth/login');
    }

    // Generate Jwt token
    const token = jwt.sign(

        //stores user_id of mongodb user to token to identify later which jwt token belongs to whom
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    // console.log(token);

    //set cookie in headerrr
    res.cookie('token', token, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    req.flash('success', `Welcome back, ${user.username}!`);
    res.redirect('/posts');
}));

// logout user
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    req.flash('success', 'Logged out successfully');
    res.redirect('/');
});

module.exports = router;