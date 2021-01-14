var express = require('express');
var router = express.Router();
let cookieParser = require('cookie-parser');
router.use(cookieParser());
var bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json({ limit: "50mb" }))
router.use(bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }))
var jwtToken = require('../auth/jwtToken');
const shortid = require('shortid');
const { check, validationResult } = require("express-validator");
var jwt = require('jsonwebtoken');
var bcrypt = require('bcryptjs');
var validator = require('email-validator');
const dotenv = require('dotenv')
dotenv.config()
var cors = require('cors');
router.use(cors());
const User = require("../model/user");
const Post = require("../model/post");
const user = require('../model/user');
const isValidPhoneNumber = (phoneNumber) => {
  const regEx = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
  return regEx.test(phoneNumber);
};

router.post('/register', [
  check("userName", "Please Enter a Valid Username")
    .not()
    .isEmpty(),
  check("profileImage", "Please choose Profile Image")
    .not()
    .isEmpty(),
  check("email", "Please enter a valid email").isEmail(),
  check("password", "Please enter a valid password").isLength({
    min: 6
  }),

], async function (req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).send({
      errors: errors.array()
    });
  }
  if (!req.body.email || !req.body.userName || !req.body.password || !req.body.mobileNumber || !req.body.profileImage) {
    return res.status(403).send({
      msg: "Bad payload"
    });
  }

  if (!validator.validate(req.body.email)) {
    return res.status(404).send({
      auth: false,
      token: null,
      msg: "Email badly formatted"
    });
  }

  if (!isValidPhoneNumber(req.body.mobileNumber)) {
    return res.status(404).send({
      auth: false,
      token: null,
      msg: "Mobile Number badly formatted"
    });
  }


  const { userName, email, password, mobileNumber, profileImage } = req.body;
  let userId = shortid.generate();
  try {
    let user = await User.findOne({
      email
    });

    if (user) {
      return res.status(400).json({
        msg: "User Already Exists"
      });
    }


    user = new User({
      userName,
      email,
      password,
      mobileNumber,
      userId,
      profileImage
    });

    user.password = await bcrypt.hashSync(password, 10);
    await user.save();

    const payload = {
      user: {
        id: user.id
      }
    };
    return res.status(200).send({
      message: 'User registered successfully',
      data: payload
    })
  } catch (err) {
    console.log(err.message);
    res.status(500).send({
      message: "Error in Saving"
    });
  }
});


router.post('/login', [
  check("email", "Please enter a valid email").isEmail(),
  check("password", "Please enter a valid password").isLength({
    min: 6
  })
], async function (req, res) {

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array()
    });
  }

  if (req.body.email === '' || req.body.password === '') {
    return res.status(403).send({
      auth: false,
      token: null,
      msg: "Bad payload"
    });
  }
  const { email, password } = req.body;
  try {
    let user = await User.findOne({
      email
    });
    if (!user)
      return res.status(400).json({
        message: "User Not Exist"
      });

    const isMatch = await bcrypt.compareSync(password, user.password);
    if (!isMatch)
      return res.status(400).json({
        message: "Incorrect Password !"
      });

    const data = {
      user: {
        id: user.userId,
        userName: user.userName,
        email: user.email,
        profileImage: user.profileImage,
        friendsList: user.friendsList
      }
    };
    const payload = {
      user: {
        id: user.userId,

      }
    };
    await jwt.sign(
      payload,
      process.env.jwtSecret, {
      expiresIn: 86400000 * 15
    },
      async (err, token) => {
        if (err) throw err;
        await res.status(200).json({
          token: token,
          message: 'Login success :)',
          data: data
        });
      }
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({
      message: "Server Error"
    });
  }
});

router.post('/profile', jwtToken, async function (req, res) {
  if (!req.body.userId) {
    return res.status(403).send({
      msg: "Bad payload"
    });
  }
  const { userId } = req.body;
  try {
    let user = await User.findOne({
      userId
    });
    if (!user)
      return res.status(400).json({
        message: "User Not Exist"
      });

    const payload = {
      user: {
        id: user.userId,
        userName: user.userName,
        email: user.email,
        profileImage: user.profileImage,
        mobileNumber: user.mobileNumber,
        friendsList: user.friendsList
      }
    };
    res.status(200).send({
      auth: true,
      message: "Profile details got successfully",
      data: payload
    });
  } catch (e) {
    console.error(e);
    res.status(500).send({
      message: "Server Error"
    });
  }
})


router.post('/update', [
  check("userName", "Please Enter a Valid Username")
    .not()
    .isEmpty(),
  check("userId", "Please provide User Id")
    .not()
    .isEmpty(),
  check("profileImage", "Please choose Profile Image")
    .not()
    .isEmpty(),


], jwtToken, async function (req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).send({
      errors: errors.array()
    });
  }
  if (!req.body.userName || !req.body.mobileNumber || !req.body.profileImage || !req.body.userId) {
    return res.status(403).send({
      msg: "Bad payload"
    });
  }



  if (!isValidPhoneNumber(req.body.mobileNumber)) {
    return res.status(404).send({
      auth: false,
      token: null,
      msg: "Mobile Number badly formatted"
    });
  }


  const { userName, mobileNumber, profileImage, userId } = req.body;
  const query = { userId: userId };
  try {
    let user = await User.findOneAndUpdate(query, {
      $set: {
        userName: userName,
        mobileNumber: mobileNumber,
        profileImage: profileImage
      }
    });

    if (user) {
      return res.status(200).send({
        msg: "User updated successfully"
      });
    }
    else {
      return res.status(400).send({
        msg: " User cannot be updated"
      });
    }
  } catch (err) {
    console.log(err.message);
    res.status(500).send({
      message: "Error in updating"
    });
  }
});



router.post('/follow', [
  check("userId", "Please provide User Id")
    .not()
    .isEmpty(),
  check("friendsId", "Please provide friends Id")
    .not()
    .isEmpty(),

], jwtToken, async function (req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).send({
      errors: errors.array()
    });
  }
  if (!req.body.friendsId || !req.body.userId) {
    return res.status(403).send({
      msg: "Bad payload"
    });
  }


  const { friendsId, userId } = req.body;
  const query = { userId: userId };
  try {

    User.findOneAndUpdate(
      {
        userId: userId
      },
      { $push: { friendsList: friendsId } }

      , { upsert: true, new: true }, (err, doc) => {
        if (!err) {
          return res.status(200).send({
            auth: true,
            msg: 'Friends added'
          })
        } else {
          return res.status(500).send({
            auth: true,
            msg: 'Friends cannot be added'
          })
        }
      })
  } catch (err) {
    console.log(err.message);
    res.status(500).send({
      message: "Error"
    });
  }
});


router.post('/getUsers', jwtToken, async function (req, res) {
  if (!req.body.userId) {
    return res.status(403).send({
      msg: "Bad payload"
    });
  }
  // console.log(req.body.userId)
  const { userId } = req.body;


  try {
    let user = await User.findOne({
      userId
    });
    if (!user)
      return res.status(400).json({
        message: "User Not Exist"
      });

    User.find({ userId: { $nin: user.friendsList } }, function (err, users) {
      if (!err) {
        return res.status(200).send({
          auth: true,
          msg: 'Got successfully',
          data: users
        })
      } else {
        return res.status(500).send({
          auth: true,
          msg: 'Something went wrong'
        })
      }
    }
    )
  }
  catch (e) {
    console.error(e);
    res.status(500).json({
      message: "Server Error"
    });
  }

});


router.post('/getUsername', jwtToken, async function (req, res) {
  if (!req.body.userId) {
    return res.status(403).send({
      msg: "Bad payload"
    });
  }
  const { userId } = req.body;


  try {
    let user = await User.find({ userId: userId });
    if (!user) {
      return res.status(400).json({
        message: "User Not Exist"
      });
    }
    else {
      res.status(200).send({
        auth: true,
        msg: 'Got successfully',
        data: user
      })
    }
  }
  catch (e) {
    console.error(e);
    res.status(500).json({
      message: "Server Error"
    });
  }

});

module.exports = router;
