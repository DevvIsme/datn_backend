import express from "express";
import { uploadCloud } from "../configurations/cloudinary"; // Sửa lại đường dẫn import nếu cần

const router = express.Router();

router.post(
  "/",
  (req, res, next) => {
    console.log("🚀 [API Upload] Bắt đầu nhận request...");
    next();
  },
  uploadCloud.single("file"),
  (req, res) => {
    // 👇 LOG KẾT QUẢ UPLOAD
    if (!req.file) {
      console.error(
        "❌ [API Upload] Lỗi: Không có req.file trả về từ Cloudinary"
      );
      return res.status(400).json({
        success: false,
        message: "Upload thất bại (Không thấy file)",
      });
    }

    console.log("✅ [API Upload] Thành công! URL:", req.file.path);

    return res.status(200).json({
      success: true,
      message: "Upload thành công!",
      data: {
        url: req.file.path,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
      },
    });
  }
);

export default router;
