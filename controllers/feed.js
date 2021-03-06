const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

const io = require('../socket');
const Post = require('../models/post');
const User = require('../models/user');

exports.getPosts = async (req, res, next) => {
    const currentPage = req.query.page || 1;
    const perPage = 2;
    try {
        const totalItems = await Post.find().countDocuments();
        const posts = await Post.find()
            .populate('creator')
            .sort({ createdAt: -1 })
            .skip((currentPage - 1) * perPage)
            .limit(perPage);

        res.status(200).json({
            message: 'Fetched posts successfully.',
            posts: posts,
            totalItems: totalItems
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getAllPosts = async (req, res, next) => {
    try {
        const totalItems = await Post.find().countDocuments();
        const posts = await Post.find()
            .populate('creator')
            .sort({ createdAt: -1 });

        res.status(200).json({
            message: 'Fetched posts successfully.',
            posts: posts,
            totalItems: totalItems
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.createPost = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect.');
        error.statusCode = 422;
        throw error;
    }
    if (!req.file) {
        const error = new Error('No image provided.');
        error.statusCode = 422;
        throw error;
    }
    const imageUrl = req.file.path;
    const title = req.body.title;
    const content = req.body.content;
    const taken_date = req.body.taken_date;
    const location = JSON.parse(req.body.location);
    const iso = req.body.ISO;
    const shutspeed = req.body.shutter_speed;
    const ap = req.body.aperture;
    const cam = req.body.camera;
    const lens = req.body.lens;
    const equip = req.body.equipment;
    const soft = req.body.edit_soft;
    const user_rate = req.body.user_rate;

    const post = new Post({
        title: title,
        content: content,
        imageUrl: imageUrl,
        taken_date: taken_date,
        location: location,
        ISO: iso,
        shutter_speed: shutspeed,
        aperture: ap,
        camera: cam,
        lens: lens,
        equipment: equip,
        edit_soft: soft,
        creator: req.userId,
        bucket_num: 0,
        user_rate: user_rate,
        rating: 0,
        rating_num: 0
    });

    try {
        await post.save();
        const user = await User.findById(req.userId);
        user.posts.push(post);
        await user.save();
        io.getIO().emit('posts', {
            action: 'create',
            post: { ...post._doc, creator: { _id: req.userId, name: user.name } }
        });
        res.status(201).json({
            message: 'Post created successfully!',
            post: post,
            creator: { _id: user._id, name: user.name }
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getPost = (req, res, next) => {
    const postId = req.params.postId;
    Post.findById(postId).populate('creator')
        .then(post => {
            if (!post) {
                const error = new Error('Could not find post');
                error.statusCode = 404;
                throw error;
            }
            res.status(200).json({
                message: 'Post fetched.',
                post: post
            })
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        });
}

exports.updatePost = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is invalid.');
        error.statusCode = 422;
        throw error;
    }
    const postId = req.params.postId;
    const title = req.body.title;
    const content = req.body.content;
    const taken_date = req.body.taken_date;
    const location = JSON.parse(req.body.location);
    const iso = req.body.ISO;
    const shutspeed = req.body.shutter_speed;
    const ap = req.body.aperture;
    const cam = req.body.camera;
    const lens = req.body.lens;
    const equip = req.body.equipment;
    const soft = req.body.edit_soft;
    const user_rate = req.body.user_rate;

    try {
        let post_temp = await Post.findById(postId)
        let imageUrl = post_temp.imageUrl
        if (req.file) {
            imageUrl = req.file.path;
        }
        if (!imageUrl) {
            const error = new Error('No file picked.');
            error.statusCode = 422;
            throw error;
        }
        const post = await Post.findById(postId).populate('creator');
        if (!post) {
            const error = new Error('Could not find post');
            error.statusCode = 404;
            throw error;
        }
        if (post.creator._id.toString() !== req.userId) {
            const error = new Error('Not authorized');
            error.status(403);
            throw error;
        }
        if (imageUrl !== post.imageUrl) {
            clearImage(post.imageUrl);
        }
        post.title = title;
        post.imageUrl = imageUrl;
        post.content = content;
        post.taken_date = taken_date;
        post.location = location;
        post.ISO = iso;
        post.shutter_speed = shutspeed;
        post.aperture = ap;
        post.camera = cam;
        post.lens = lens;
        post.equipment = equip;
        post.edit_soft = soft;
        post.user_rate = user_rate;
        const result = await post.save();
        io.getIO().emit('posts', {
            action: 'update',
            post: result
        })
        res.status(200).json({
            message: 'Post updated!',
            post: result
        })
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.deletePost = async (req, res, next) => {
    const postId = req.params.postId;
    try {
        post = await Post.findById(postId)
        if (!post) {
            const error = new Error('Could not find post');
            error.statusCode = 404;
            throw error;
        }
        if (post.creator.toString() !== req.userId) {
            const error = new Error('Not authorized');
            error.status(403);
            throw error;
        }
        clearImage(post.imageUrl);
        const result = await Post.findByIdAndRemove(postId);
        const user = await User.findById(req.userId);
        user.posts.pull(postId);
        await user.save();
        const users = await User.find();
        for (var i = 0; i < users.length; i++){
            if (users[i].bucket.includes(postId)){
                users[i].bucket.pull(postId);
                await users[i].save();
            }
            for (var j = 0; j < users[i].ratings.length; j++){
                if (users[i].ratings[j].post.equals(postId)){
                    users[i].ratings.pull(users[i].ratings[j]);
                   await users[i].save();
                }
            }
        }
        io.getIO().emit('posts', {
            action: 'delete',
            post: postId
        })
        res.status(200).json({
            message: 'Deleted post.'
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

const clearImage = filePath => {
    filePath = path.join(__dirname, '..', filePath);
    fs.unlink(filePath, err => console.log(err));
}

exports.getBucketNum = async (req, res, next) => {
    postId = req.params.postId;
    try {
        post = await Post.findById(postId)
        if (!post) {
            const error = new Error('Could not find post');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            message: 'Fetched posts successfully.',
            bucketNum: post.bucket_num
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.updateBucketNum = async (req, res, next) => {
    postId = req.params.postId;
    const newBucketNum = req.body.newBucketNum;
    try{
        post = await Post.findById(postId)
        if (!post) {
            const error = new Error('Could not find post');
            error.statusCode = 404;
            throw error;
        }
        post.bucket_num = newBucketNum;
        await post.save();
        io.getIO().emit('bucket', {
            action: 'update',
            newBucketNum: newBucketNum
        })
        res.status(200).json({
            message: 'Bucket Number updated!!'
          });
    }catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
  };

  exports.getRating = async (req, res, next) => {
    postId = req.params.postId;
    try {
        post = await Post.findById(postId);
        if (!post) {
            const error = new Error('Could not find post');
            error.statusCode = 404;
            throw error;
        }
        var post_ratings = []
        for (var i = 0; i < post.ratings.length; i++){
            curUser = await User.findOne({ _id: post.ratings[i].userId });
            for (var j = 0; j < curUser.ratings.length; j++){
                if (curUser.ratings[j]._id.equals(post.ratings[i].rating)){
                    post_ratings.push({
                        user: curUser.name,
                        rating: curUser.ratings[j].rating,
                        comment: curUser.ratings[j].comment});
                }
            }
        }       
        res.status(200).json({
            message: 'Fetched post rating successfully.',
            ratings: post_ratings
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.updateRating = async (req, res, next) => {
    postId = req.params.postId;
    const userId = req.body.userId;
    const newRatingId = req.body.ratingId;
    const isNewRating = req.body.newRating;
    const ratingValue = req.body.value;
    const oldRatingValue = req.body.oldRating;
    var changed = false;
    try{
        post = await Post.findById(postId)
        if (!post) {
            const error = new Error('Could not find post');
            error.statusCode = 404;
            throw error;
        }
        for (var i = 0; i < post.ratings.length; i++){
            if (post.ratings[i].userId.equals(userId)){
                post.ratings[i].rating = newRatingId;
                await post.save();
                changed = true;
                break;
            }
        }
        if (!changed){
            const newRating = {
                userId: userId,
                rating: newRatingId
            }
            post.ratings.push(newRating);
            await post.save();
        }
        if (isNewRating){
            const sum = (post.rating) * (post.rating_num) + Number(ratingValue);
            post.rating_num += 1;
            post.rating = sum/(post.rating_num);
            await post.save();
        } else {
            const sum = (post.rating) * (post.rating_num) - Number(oldRatingValue) + Number(ratingValue);
            post.rating = sum/(post.rating_num);
            await post.save();
        }
        io.getIO().emit('bucket', {
            action: 'update',
            newRating: {
                userId: userId,
                rating: newRatingId
            }
        });
        res.status(200).json({
            message: 'Post rating updated!!'
          });
    }catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
  };