// src/configs/cloudinary.config.ts
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cấu hình nơi lưu trữ
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (_req: any, _file: any) => {
    return {
      folder: "datn_courses", // Tên thư mục trên Cloudinary
      allowed_formats: ["jpg", "png", "jpeg", "webp"], // Định dạng cho phép
      public_id: `course_${Date.now()}`, // Tên file
    };
  },
});

export const uploadCloud = multer({ storage });
