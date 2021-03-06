const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const io = require('../socket');
const Post = require('../models/post');
const User = require('../models/user');

exports.signup = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed.');
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }
  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;
  bcrypt
    .hash(password, 12)
    .then(hashedPw => {
      const user = new User({
        email: email,
        password: hashedPw,
        name: name
      });
      return user.save();
    })
    .then(result => {
      res.status(201).json({ message: 'User created!', userId: result._id });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.login = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let loadedUser;
  User.findOne({ email: email })
    .then(user => {
      if (!user) {
        const error = new Error('A user with this email could not be found.');
        error.statusCode = 401;
        throw error;
      }
      loadedUser = user;
      return bcrypt.compare(password, user.password);
    })
    .then(isEqual => {
      if (!isEqual) {
        const error = new Error('Wrong password!');
        error.statusCode = 401;
        throw error;
      }
      const token = jwt.sign(
        {
          email: loadedUser.email,
          userId: loadedUser._id.toString()
        },
        'somesupersecretsecret',
        { expiresIn: '1h' }
      );
      res.status(200).json({ token: token, userId: loadedUser._id.toString() });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getUserObj = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      const error = new Error('User not found!');
      error.statusCode = 404;
      throw error;
    }
    return res.status(200).json({
      userObj: user
    });
  }catch(err){
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
}

exports.getUserStatus = (req, res, next) => {
  User.findById(req.userId)
    .then(user => {
      if (!user) {
        const error = new Error('User not found!');
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({
        status: user.status
      })
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.updateUserStatus = (req, res, next) => {
  const newStatus = req.body.status;
  User.findById(req.userId)
    .then(user => {
      if (!user) {
        const error = new Error('User not found!');
        error.statusCode = 404;
        throw error;
      }
      user.status = newStatus;
      return user.save();
    })
    .then(result => {
      res.status(200).json({
        message: 'User updated!!'
      })
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getUserBucket = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error('User not found!');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      bucket: user.bucket
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updateUserBucket = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    newBucket = await Post.findById(postId)
    user = await User.findById(req.userId);
    if (!newBucket) {
      const error = new Error('Could not find post');
      error.statusCode = 404;
      throw error;
    }
    if (!user) {
      const error = new Error('User not found!');
      error.statusCode = 404;
      throw error;
    }
    user.bucket.addToSet(newBucket);
    await user.save();
    io.getIO().emit('bucket', {
      action: 'add',
      bucket: newBucket
    })
    res.status(201).json({
      message: 'Bucket added successfully!',
      bucket: newBucket
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deleteBucket = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    bucketToDelete = await Post.findById(postId)
    user = await User.findById(req.userId);
    if (!bucketToDelete) {
      const error = new Error('Could not find post');
      error.statusCode = 404;
      throw error;
    }
    if (!user) {
      const error = new Error('User not found!');
      error.statusCode = 404;
      throw error;
    }
    user.bucket.pull(postId);
    await user.save();
    io.getIO().emit('bucket', {
      action: 'delete',
      post: postId
    })
    res.status(200).json({
      message: 'Deleted post from bucket.'
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getUserRatings = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      const error = new Error('Ratings not found!');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      ratings: user.ratings
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updateUserRating = async (req, res, next) => {
  const postId = req.body.postId;
  const rating = req.body.rating;
  const comment = req.body.comment;
  var changed = false;
  try {
    user = await User.findById(req.params.userId);
    if (!user) {
      const error = new Error('User not found!');
      error.statusCode = 404;
      throw error;
    }
    for (i = 0; i < user.ratings.length; i++){
      if (user.ratings[i].post == postId){
        user.ratings[i].rating = rating;
        user.ratings[i].comment = comment;
        changed = true;
        await user.save();
        break;
      }
    }
    if (!changed){
      user.ratings.addToSet({
        post: postId,
        rating: rating,
        comment: comment
      });
      await user.save();
    }
    io.getIO().emit('bucket', {
      action: 'add',
      rating: {
        post: postId,
        rating: rating
      }
    })
    res.status(201).json({
      message: 'Rating updated successfully!',
      rating: {
        post: postId,
        rating: rating,
        comment: comment
      },
      old_rating: changed
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};