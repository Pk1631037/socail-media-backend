const dotenv = require('dotenv')
dotenv.config()
var app = require('./src/routes');
const InitiateMongoServer = require("./src/config/db");

InitiateMongoServer();

var port = process.env.PORT || 3333;

app.listen(port, () => {
    console.log('Social Media API is listening on port ' + port);
});

