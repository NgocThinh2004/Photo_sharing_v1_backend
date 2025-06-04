const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../db/userModel");
const router = express.Router();





router.post("/admin/login", async (req, res) => {
  try {
    console.log("Đăng nhập với dữ liệu:", req.body);
    const { login_name, password } = req.body;
    if (!login_name || !password) {
      return res.status(400).json({ error: "Tên đăng nhập và mật khẩu không được để trống" });
    }
    const user = await User.findOne({ login_name });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: "Tên đăng nhập hoặc mật khẩu không đúng" });
    }
    req.session.userId = user._id;
    res.json({ _id: user._id, first_name: user.first_name, last_name: user.last_name });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    res.status(400).json({ error: "Đăng nhập thất bại" });
  }
});


router.post("/admin/logout", (req, res) => {
  if (!req.session.userId) {
    return res.status(400).json({ error: "Chưa đăng nhập" });
  }
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Đăng xuất thất bại" });
    }
    res.json({ message: "Đăng xuất thành công" });
  });
});


router.post("/", async (req, res) => {
  try {
    const { login_name, password, first_name, last_name, location, description, occupation } = req.body;
    if (!login_name || !password || !first_name || !last_name) {
      return res.status(400).json({ error: "Tên đăng nhập, mật khẩu, họ và tên là bắt buộc" });
    }
    const existingUser = await User.findOne({ login_name });
    if (existingUser) {
      return res.status(400).json({ error: "Tên đăng nhập đã tồn tại" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      login_name,
      password: hashedPassword,
      first_name,
      last_name,
      location,
      description,
      occupation,
    });
    await user.save();
    res.json({ login_name });
  } catch (error) {
    console.error("Lỗi đăng ký người dùng:", error);
    res.status(400).json({ error: "Đăng ký thất bại" });
  }
});

const requireLogin = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized: Vui lòng đăng nhập" });
  }
  next();
};

router.get("/list", requireLogin, async (req, res) => {
  try {
    const users = await User.find({}, "_id first_name last_name").exec();
    res.json(users);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách người dùng:", error);
    res.status(500).send("Lỗi server");
  }
});


router.get("/:id", requireLogin, async (req, res) => {
  try {
    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send("ID người dùng không hợp lệ");
    }
    const user = await User.findById(userId, "_id first_name last_name location description occupation").exec();
    if (!user) {
      return res.status(400).send("Không tìm thấy người dùng");
    }
    res.json(user);
  } catch (error) {
    console.error("Lỗi khi lấy người dùng:", error);
    res.status(500).send("Lỗi server");
  }
});

module.exports = router;