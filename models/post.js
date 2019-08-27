const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const postSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    taken_date: {
        type: String,
        required: true
    },
    location: {
        type: Object,
        required: true
    },
    
    ISO: {
        type: Number,
        required: true
    },
    shutter_speed: {
        type: String,
        required: true
    },
    aperture: {
        type: String,
        required: true
    },
    camera: {
        type: String,
        required: true
    },
    lens: {
        type: String,
        required: true
    },
    equipment: {
        type: String,
        required: true
    },
    edit_soft: {
        type: String,
        required: true
    },
    creator: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    bucket_num: {
        type: Number
    },
    user_rate: {
        type: Number, 
        requred: true
    },
    ratings: {
        type: [{
            rating: {
                type: Schema.Types.ObjectId
            },
            userId: {
                type: Schema.Types.ObjectId
            }
        }]
    }
}, {timestamps: true});

module.exports = mongoose.model('Post', postSchema);
