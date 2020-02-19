'use-strict';

require('dotenv').config();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const cors = require('cors');
var port = process.env.PORT || 8000;

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGOLAB_URI || 'mongodb://localhost/exercise-track', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

var Schema = mongoose.Schema;

var userSchema = new Schema({
    username: { type: String, required: true }
});

var exerciseSchema = new Schema({
    userId: { type: String, required: true },
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    date: { type: String },
});

var User = new mongoose.model("User", userSchema);
var Exercise = new mongoose.model("Exercise", exerciseSchema);

app.use(express.static(__dirname));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/api/exercise/new-user', async (req, res, next) => {
    const { username } = req.body;
    const user = new User({ username: username });

    try {
        const newUser = await user.save();
        res.json({ username: newUser.username, _id: newUser._id });
    } catch (error) {
        next({ message: error });
    }
});

app.post('/api/exercise/add', async (req, res, next) => {
    let { userId, description, duration, date } = req.body;
    if (date === '') {
        const actualDate = new Date();
        date = `${actualDate.getUTCFullYear()}-${actualDate.getUTCMonth() + 1}-${actualDate.getUTCDate()}`;
    }

    const exercise = new Exercise({
        userId: userId,
        description: description,
        duration: Number.parseInt(duration),
        date: date
    });

    try {
        const newExercise = await exercise.save();

        res.json({
            _id: newExercise._id,
            description: newExercise.description,
            duration: newExercise.duration,
            date: newExercise.date,
            userId: newExercise.userId
        });
    } catch (error) {
        next({ message: error });
    }
});

app.get('/api/exercise/log', (req, res) => {
    User.findOne({ _id: req.query.userId }, (err, usr) => {
        const limitValue = Number(req.query.limit);
        Exercise.find({ userId: req.query.userId }, (err1, exercises) => {
            const totalAmountOfExersice = exercises.reduce((acc, el) => acc + el.duration, 0);
            res.json({
                userName: usr.username,
                count: exercises.length,
                totalAmountOfTime: totalAmountOfExersice
            });
        }).limit(limitValue);
    });
});

app.get('/api/exercise/users', (req, res) => {
    User.find({}, function (err, users) {
        var usersResponse = users.map((usr) => ({ _id: usr._id, username: usr.username }));
        res.json(usersResponse);
    });
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html')
});

// Not found middleware
app.use((req, res, next) => {
    return next({ status: 404, message: 'not found' })
});

// Error Handling middleware
app.use((err, req, res, next) => {
    let errCode, errMessage;

    if (err.errors) {
        // mongoose validation error
        errCode = 400 // bad request
        const keys = Object.keys(err.errors);
        // report the first validation error
        errMessage = err.errors[keys[0]].message;
    } else {
        // generic or custom error
        errCode = err.status || 500;
        errMessage = err.message || 'Internal Server Error';
    }
    res.status(errCode).type('txt').send(errMessage);
});

app.listen(port, function () {
    console.log(`Listening to requests on http://localhost:${port}`);
});