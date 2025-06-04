const express = require("express");
const mongoose = require("mongoose");
const Photo = require("../db/photoModel");
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const {photo_id} = req.body;
    if (!mongoose.Types.ObjectId.isValid(photo_id)) {
      return res.status(400).json({ error: "ID ảnh không hợp lệ" });
    }
    const { comment } = req.body;
    if (!comment || comment.trim() === "") {
      return res.status(400).json({ error: "Bình luận không được để trống" });
    }

    const photo = await Photo.findById(photo_id);
    if (!photo) {
      return res.status(400).json({ error: "Không tìm thấy ảnh" });
    }

    photo.comments.push({
      comment,
      date_time: new Date(),
      user_id: req.session.userId,
    });

    await photo.save();
    res.json({ message: "Thêm bình luận thành công" });
  } catch (error) {
    console.error("Lỗi khi thêm bình luận:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
});

module.exports = router;