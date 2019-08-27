const express = require('express');

const { body } = require('express-validator');

const User = require('../models/user');
const isAuth = require('../middleware/is-auth');

const authController = require('../controllers/auth');

const router = express.Router();

router.put(
    '/signup', 
    [body('email')
            .isEmail()
            .withMessage('Please enter a valid email.')
            .custom((value, { req }) => {
                return User.findOne({ email: value }).then(userDoc => {
                    if (userDoc) {
                        return Promise.reject('Sorry, the email address already exists.');
                    }
                })
            })
            .normalizeEmail(),
        body('password').trim().isLength({ min: 5 }),
        body('name').trim().not().isEmpty()
    ],
    authController.signup);

router.post('/login', authController.login);

router.get('/user/:userId', isAuth, authController.getUserObj);

router.get('/status', isAuth, authController.getUserStatus);

router.patch('/status', isAuth, [
    body('status').trim().not().isEmpty()
], authController.updateUserStatus);

router.get('/bucket', isAuth, authController.getUserBucket);

router.post('/bucket/:postId', isAuth, authController.updateUserBucket);

router.delete('/bucket/:postId', isAuth, authController.deleteBucket);

router.get('/ratings/:userId', isAuth, authController.getUserRatings);

router.post('/ratings/:userId', isAuth, authController.updateUserRating);

module.exports = router;