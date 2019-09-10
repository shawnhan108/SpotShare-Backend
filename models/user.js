const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    email: {
        type: String,
        required: true
    },
    password: {
        type: String, 
        required: true
    },
    name: {
        type: String,
        required: true
    },
    status: {
        type: String,
        default: ''
    },
    posts: [{
        type: Schema.Types.ObjectId,
        ref: 'Post'
    }],
    bucket: [{
        type: Schema.Types.ObjectId,
        ref: 'Bucket'
    }],
    ratings: {
        type:[{
        post: {
            type: Schema.Types.ObjectId
        },
        rating: {
            type: Number
        }, 
        comment: {
            type: String
        }
    }]}
});

module.exports = mongoose.model('User', userSchema);