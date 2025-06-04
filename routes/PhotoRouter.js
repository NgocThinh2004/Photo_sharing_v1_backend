const express = require("express");
const Photo = require("../db/photoModel");
const User = require("../db/userModel");
const mongoose = require("mongoose");
const path = require("path");
const router = express.Router();
const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images/");
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

router.get("/photosOfUser/:id", async (request, response) => {
  try {
    const userId = request.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.status(400).json({ error: "ID người dùng không hợp lệ" });
    }
    const user = await User.findById(userId).exec();
    if (!user) {
      return response.status(400).json({ error: "Không tìm thấy người dùng" });
    }
    const photos = await Photo.find({ user_id: userId }, "_id user_id comments file_name date_time").exec();
    const formattedPhotos = photos.map((photo) => ({
      _id: photo._id,
      user_id: photo.user_id,
      file_name: photo.file_name,
      date_time: photo.date_time,
      comments: photo.comments.map((comment) => ({
        comment: comment.comment,
        date_time: comment.date_time,
        _id: comment._id,
        user_id: comment.user_id,
      })),
    }));
    const commentUserIds = photos
      .flatMap((photo) => photo.comments.map(comment => comment.user_id))
      .filter(userId => userId && mongoose.Types.ObjectId.isValid(userId));
    const commentUsers = await User.find({ _id: { $in: commentUserIds } }, "_id first_name last_name").exec();
    const userMap = new Map(commentUsers.map((u) => [u._id.toString(), u]));
    formattedPhotos.forEach((photo) => {
      photo.comments.forEach((comment) => {
        if (comment.user_id && mongoose.Types.ObjectId.isValid(comment.user_id)) {
          const user = userMap.get(comment.user_id.toString());
          if (user) {
            comment.user = {
              _id: user._id,
              first_name: user.first_name,
              last_name: user.last_name,
            };
          }
        }
      });
    });
    response.json(formattedPhotos);
  } catch (error) {
    console.error("Lỗi khi lấy ảnh người dùng:", error);
    response.status(500).json({ error: "Lỗi server" });
  }
});

router.post("/photos/new", upload.single("photo"), async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Vui lòng đăng nhập để tải ảnh" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Chưa chọn file ảnh" });
    }
    const photo = new Photo({
      file_name: req.file.filename,
      date_time: new Date(),
      user_id: req.session.userId,
      comments: [],
    });
    await photo.save();
    res.json({ message: "Tải ảnh lên thành công", photo });
  } catch (error) {
    console.error("Lỗi khi tải ảnh:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
});

module.exports = router;