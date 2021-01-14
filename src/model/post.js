const mongoose = require("mongoose");

const PostSchema = mongoose.Schema({
  userPostTitle: {
    type: String,
    required: true
  },
  likedUsersId: {
    type: Array,
    "default": []
  },
  commentsUsersID: {
    type: Array,
    "default": []
  },
  userPostDescription: {
    type: String,
    required: true
  },
  postId: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  userPostImage: {
    type: String,
    required: true
  },
  postedAt: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  private: {
    type: Boolean,
    required: 'Required'
  },

});

module.exports = mongoose.model("post", PostSchema);