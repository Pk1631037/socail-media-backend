var express = require('express');
var app = express();

const cors = require('cors');
app.use(cors());

app.get('/', (req, res) => {
    res.send('Welcome to Social Media API')
})

app.use('/auth', require('./auth/authController'));
app.use('/post', require('./post/userPost'));
module.exports = app;
