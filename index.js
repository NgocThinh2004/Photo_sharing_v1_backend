const express = require("express");
const app = express();
const cors = require("cors");
const dbConnect = require("./db/dbConnect");
const UserRouter = require("./routes/UserRouter");
const PhotoRouter = require("./routes/PhotoRouter");
const session = require("express-session");
const CommentRouter = require("./routes/CommentRouter");
const path = require("path");
app.use(express.json());
dbConnect();

app.use(cors({
  origin: "http://localhost:3000", 
  credentials: true, 
}));
app.use("/images", express.static(path.join(__dirname, "images")));
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Đặt true khi dùng HTTPS
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 ngày
    },
  })
);
const requireLogin = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized: Vui lòng đăng nhập" });
  }
  next();
};


app.use("/api/user", UserRouter);
app.use("/api/photo",requireLogin, PhotoRouter);
app.use("/api/comments", requireLogin, CommentRouter);

app.get("/", (request, response) => {
  response.send({ message: "Hello from photo-sharing app API!" });
});

app.listen(8081, () => {
  console.log("server listening on port 8081");
});
