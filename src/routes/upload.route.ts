import express from "express";
import { uploadCloud } from "../configurations/cloudinary"; // Import middleware vừa tạo

const router = express.Router();

// Route: POST /api/upload
// uploadCloud.single('file'): 'file' là key mà Frontend phải gửi đúng tên
router.post("/", uploadCloud.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Không có file nào được gửi lên!",
    });
  }

  // Nếu vào được đây tức là Cloudinary đã upload xong và trả về thông tin trong req.file
  return res.status(200).json({
    success: true,
    message: "Upload thành công!",
    data: {
      url: req.file.path, // ✨ Đây là link ảnh online (quan trọng nhất)
      filename: req.file.filename,
    },
  });
});

export default router;
