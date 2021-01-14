var express = require('express');
var router = express.Router();
let cookieParser = require('cookie-parser');
router.use(cookieParser());
var bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: false }));
var cors = require('cors');
router.use(cors());
router.use(bodyParser.json({ limit: "50mb" }))
router.use(bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }))
var jwtToken = require('../auth/jwtToken');
const shortid = require('shortid');
const { check, validationResult } = require("express-validator");
const dotenv = require('dotenv')
dotenv.config()
const User = require("../model/user");
const Post = require("../model/post");


//Upload Post
router.post('/uploadPost', [
  check("userPostTitle", "Please provide post title")
    .not()
    .isEmpty(),
  check("userPostDescription", "Please provide post description")
    .not()
    .isEmpty(),
  check("userId", "Please provide userId")
    .not()
    .isEmpty(),
  check("userPostImage", "Please choose post Image")
    .not()
    .isEmpty(),
  check("postedAt", "Please provide Posted Date")
    .not()
    .isEmpty(),
  check("userName", "Please provide User Name")
    .not()
    .isEmpty(),


], jwtToken, async function (req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).send({
      errors: errors.array()
    });
  }
  if (!req.body.userPostTitle || !req.body.userPostDescription || !req.body.userId || !req.body.userPostImage || !req.body.postedAt || !req.body.userName) {
    return res.status(403).send({
      msg: "Bad payload"
    });
  }


  const { userPostTitle, userPostDescription, userId, userPostImage, postedAt, userName, private } = req.body;
  let postId = await shortid.generate();
  try {
    post = new Post({
      userPostTitle,
      userPostDescription,
      userPostImage,
      postId,
      userId,
      postedAt,
      userName,
      private
    });
    await post.save();
    return res.status(200).send({
      message: 'User uploaded post',

    })
  } catch (err) {
    console.log(err.message);
    res.status(500).send({
      message: "Error in Saving"
    });
  }
});

//Like Post
router.post('/like', [
  check("postId", "Please provide post ID")
    .not()
    .isEmpty(),
  check("userId", "Please provide User ID")
    .not()
    .isEmpty(),
], jwtToken, async function (req, res) {

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array()
    });
  }

  if (req.body.postId === '' || req.body.userId === '') {
    return res.status(403).send({
      auth: false,
      token: null,
      msg: "Bad payload"
    });
  }
  const { postId, userId } = req.body;
  const query = { postId: postId };
  try {


    Post.findOneAndUpdate(
      {
        postId: postId
      },
      { $push: { likedUsersId: userId } }, { upsert: true, new: true }, (err, doc) => {
        if (!err) {
          return res.status(200).send({
            auth: true,
            msg: 'Liked'
          })
        } else {
          return res.status(500).send({
            auth: true,
            msg: 'Something went wrong'
          })
        }
      })
  } catch (e) {
    console.error(e);
    res.status(500).json({
      message: "Server Error"
    });
  }

});

//Unlike Post
router.post('/unlike', [
  check("postId", "Please provide post ID")
    .not()
    .isEmpty(),
  check("userId", "Please provide User ID")
    .not()
    .isEmpty(),
], jwtToken, async function (req, res) {

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array()
    });
  }

  if (req.body.postId === '' || req.body.userId === '') {
    return res.status(403).send({
      auth: false,
      token: null,
      msg: "Bad payload"
    });
  }
  const { postId, userId } = req.body;

  try {

    await Post.findOne({ postId: postId }, async (err, doc) => {
      if (!err) {

        var newArr = [];
        newArr = doc.likedUsersId.filter(function (ele) {
          return ele != userId;
        });
        Post.findOneAndUpdate(
          {
            postId: postId
          },
          { $set: { likedUsersId: newArr } }, { upsert: true, new: true }, (err, doc) => {

            if (!err) {
              return res.status(200).send({
                auth: true,
                msg: 'UnLiked'
              })
            } else {
              return res.status(500).send({
                auth: true,
                msg: 'Something went wrong'
              })
            }
          })


      } else {
        return res.status(500).send({
          auth: true,
          msg: 'DB error'
        })
      }
    })


  } catch (e) {
    console.error(e);
    res.status(500).json({
      message: "Server Error"
    });
  }

});


//Get Profile
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
        mobileNumber: user.mobileNumber
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

//Update Profile
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
  // TODO: check whether all are mandatory
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

//Get all Posts
router.get('/getPosts', jwtToken, async function (req, res) {

  try {

    Post.find({ private: false }, function (err, users) {
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
    })


  } catch (e) {
    console.error(e);
    res.status(500).json({
      message: "Server Error"
    });
  }

});

router.post('/username', jwtToken, async function (req, res) {

  if (!req.body.userId) {
    return res.status(403).send({
      msg: "Bad payload"
    });
  }
  const { userId } = req.body;
  try {
    let user = await User.find({
      userId
    });
    if (!user)
      return res.status(400).json({
        message: "User Not Exist"
      });
    res.status(200).send({
      auth: true,
      message: "Profile details got successfully",
      data: user
    });
  } catch (e) {
    console.error(e);
    res.status(500).send({
      message: "Server Error"
    });
  }
})
//Add Comment
router.post('/addComment', [
  check("postId", "Please provide post ID")
    .not()
    .isEmpty(),
  check("userId", "Please provide User ID")
    .not()
    .isEmpty(),
  check("comments", "Please provide comments")
    .not()
    .isEmpty(),
  check("userName", "Please provide User Name")
    .not()
    .isEmpty(),
  check("commentedAt", "Please provide Commented Time")
    .not()
    .isEmpty(),
  check("profileImage", "Please provide Commented Time")
    .not()
    .isEmpty()
], jwtToken, async function (req, res) {

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array()
    });
  }

  if (req.body.postId === '' || req.body.userId === '' || req.body.comments === '' || req.body.userName === '' || req.body.commentedAt === '' || req.body.profileImage === '') {
    return res.status(403).send({
      auth: false,
      token: null,
      msg: "Bad payload"
    });
  }
  const { postId, userId, comments, userName, commentedAt, profileImage } = req.body;
  const query = { postId: postId };
  try {


    Post.findOneAndUpdate(
      {
        postId: postId
      },
      {
        $push:
        {
          commentsUsersID: [{
            "userId": userId,
            "comments": comments,
            "userName": userName,
            "commentedAt": commentedAt,
            "profileImage": profileImage
          }
          ]
        }
      }, { upsert: true, new: true }, (err, doc) => {
        if (!err) {
          return res.status(200).send({
            auth: true,
            msg: 'Commented'
          })
        } else {
          return res.status(500).send({
            auth: true,
            msg: 'Something went wrong'
          })
        }
      })


  } catch (e) {
    console.error(e);
    res.status(500).json({
      message: "Server Error"
    });
  }

});


router.post('/friendsPosts', jwtToken, async function (req, res) {
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

    Post.find({ userId: user.friendsList }, function (err, users) {
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
      }})
  } catch (e) {
    console.error(e);
    res.status(500).json({
      message: "Server Error"
    });
  }
});


router.post('/myPosts', jwtToken, async function (req, res) {
  if (!req.body.userId) {
    return res.status(403).send({
      msg: "Bad payload"
    });
  }
  const { userId } = req.body;
  try {

    Post.find({ userId: userId }, function (err, users) {
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
    })


  } catch (e) {
    console.error(e);
    res.status(500).json({
      message: "Server Error"
    });
  }

});


router.post('/deletePosts', [
  check("postId", "Please provide post ID")
    .not()
    .isEmpty(),

], jwtToken, async function (req, res) {

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array()
    });
  }

  if (req.body.postId === '') {
    return res.status(403).send({
      auth: false,
      token: null,
      msg: "Bad payload"
    });
  }
  const { postId } = req.body;

  try {


    Post.findOneAndRemove({ postId: postId }, function (err, data) {
      if (!err) {
        return res.status(200).send({
          auth: true,
          msg: 'Deleted'
        })
      } else {
        return res.status(500).send({
          auth: true,
          msg: 'Something went wrong'
        })
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      message: "Server Error"
    });
  }

});

router.post('/editPosts', jwtToken, async function (req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).send({
      errors: errors.array()
    });
  }
  if (!req.body.postId || !req.body.userPostTitle || !req.body.userPostDescription || !req.body.private || !req.body.userId || !req.body.postedAt) {
    return res.status(403).send({
      msg: "Bad payload"
    });
  }
  const { postId, userPostTitle, userPostDescription, private, userId, postedAt } = req.body;
  const query = { postId: postId };
  try {
    let user = await Post.findOneAndUpdate(query, {
      $set: {
        userPostTitle: userPostTitle,
        userPostDescription: userPostDescription,
        private: private,
        userId: userId,
        postedAt: postedAt
      }
    });

    if (user) {
      return res.status(200).send({
        msg: "Post updated successfully"
      });
    }
    else {
      return res.status(400).send({
        msg: " Post cannot be updated"
      });
    }
  } catch (err) {
    console.log(err.message);
    res.status(500).send({
      message: "Error in updating"
    });
  }
});


router.post('/likesValue', async function (req, res) {
 
  if (!req.body.postId || !req.body.userId ) {
    return res.status(403).send({
      msg: "Bad payload"
    });
  }
  const { postId, userId } = req.body;
  const query = { postId: postId };
  try {
        Post.findOne({ postId: postId }, function (err, users) {
      if (!err) {
          // console.log(users.postId)
          for(var i=0;i<users.likedUsersId.length;i++){
            if(users.likedUsersId[i]===userId){
              return res.status(200).send({
                auth: true,
                data: false
              })
            }
          }
          return res.status(200).send({
            auth: true,
            data: true
          })
      
      } else {
        return res.status(500).send({
          auth: true,
          msg: 'Something went wrong'
        })
      }
    })
  } catch (err) {
    console.log(err.message);
    res.status(500).send({
      message: "Error in fetching"
    });
  }
});



module.exports = router;
