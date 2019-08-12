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
    const location = req.body.location;
    const iso = req.body.ISO;
    const shutspeed = req.body.shutter_speed;
    const ap = req.body.aperture;
    const cam = req.body.camera;
    const lens = req.body.lens;
    const equip = req.body.equipment;
    const soft = req.body.edit_soft;

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
        creator: req.userId
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