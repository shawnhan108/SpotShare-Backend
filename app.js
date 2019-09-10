const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');

const path = require('path');

const app = express();

const feedRoutes = require('./routes/feed');
const authRoutes = require('./routes/auth');

const MONGODBKEY = `mongodb+srv://${process.env.npm_package_env_MONGO_USER}:${process.env.npm_package_env_MONGO_PASSWORD}@spotshare-vdna7.mongodb.net/${process.env.npm_package_env_MONGO_DEFAULT_DB}?retryWrites=true&w=majority` ;

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images');
    },
    filename: (req, file, cb) => {
        cb(null, new Date().toISOString() + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/png' ||
        file.mimetype === 'image/jpg' ||
        file.mimetype === 'image/jpeg' ||
        file.mimetype === 'image/PNG' ||
        file.mimetype === 'image/JPG' ||
        file.mimetype === 'image/JPEG') {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

app.use(helmet());

app.use(bodyParser.json());
app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single('image'));
app.use('/images', express.static(path.join(__dirname, 'images')));

// CORS - Pre-flight req
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
        res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE");
        return res.status(200).json({});
    }
    next();
});

app.options('*', cors());
app.use(cors());

app.use('/feed', feedRoutes);
app.use('/auth', authRoutes);

app.use((error, req, res, next) => {
    console.log(error);
    const status = error.statusCode || 500;
    const mes = error.message;
    const data = error.data;
    res.status(status).json({ message: mes, data: data });
});

mongoose.connect(MONGODBKEY)
    .then(result => {
    const server = app.listen(process.env.PORT || 8080);
    const io = require('./socket').init(server);
    io.on('connection', socket => {
      console.log('Client connected');
    });
  })
    .catch(
        err => {
            console.log(err);
        }
    );
