import multer from "multer";
import path from "path";
import * as Auth from "../controllers/Auth.controller";
import express, { Router } from "express";

const router: Router = express.Router();

// Cấu hình nơi lưu file avatar
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/avatars"); // thư mục uploads nằm trong thư mục gốc backend
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// 🔹 Route đăng ký có upload avatar
router.post("/student/register", upload.single("avatar"), Auth.RegisterStudent);

router.post("/student/", Auth.LoginStudent);
router.post("/admin/", Auth.LoginAdmin);
router.post("/refresh/", Auth.RefreshToken);
router.post("/logout/", Auth.Logout);
router.post("/student/google-login", Auth.LoginGoogle);
export default router;