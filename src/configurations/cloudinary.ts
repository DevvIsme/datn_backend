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

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req: any, file: { mimetype: string; }) => {
    console.log("Đang upload file:", file.mimetype); // Log để debug xem file là gì

    // 1. Cấu hình cho file VIDEO
    if (file.mimetype.startsWith("video")) {
      return {
        folder: "datn_courses/videos",
        resource_type: "video", // BẮT BUỘC: Phải báo là video
        allowed_formats: ["mp4", "webm", "mkv"],
        public_id: `video_${Date.now()}`,
      };
    }

    // 2. Cấu hình cho file PDF (Cloudinary gọi là 'raw')
    if (file.mimetype === "application/pdf") {
      return {
        folder: "datn_courses/documents",
        resource_type: "raw", // BẮT BUỘC: PDF dùng 'raw' hoặc 'auto' (raw an toàn hơn)
        format: "pdf", // Ép đuôi pdf
        public_id: `doc_${Date.now()}`,
      };
    }

    // 3. Mặc định là ẢNH (Image)
    return {
      folder: "datn_courses/images",
      resource_type: "image",
      allowed_formats: ["jpg", "png", "jpeg", "webp"],
      public_id: `img_${Date.now()}`,
    };
  },
});

export const uploadCloud = multer({ storage });
