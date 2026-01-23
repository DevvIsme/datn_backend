import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

// Log xem biến môi trường có nhận không
console.log("--- CLOUDINARY CONFIG ---");
console.log(
  "Cloud Name:",
  process.env.CLOUDINARY_CLOUD_NAME ? "OK" : "MISSING"
);
console.log("API Key:", process.env.CLOUDINARY_API_KEY ? "OK" : "MISSING");
console.log(
  "API Secret:",
  process.env.CLOUDINARY_API_SECRET ? "OK" : "MISSING"
);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req: any, file: { originalname: any; mimetype: string; size: any; }) => {
    // 👇 LOG QUAN TRỌNG: Xem file server nhận được là gì
    console.log("🔥 [Cloudinary] Đang xử lý file:", {
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    let resourceType = "image";
    let folderName = "datn_courses/images";
    let publicId = `img_${Date.now()}`;

    if (file.mimetype.startsWith("video")) {
      resourceType = "video";
      folderName = "datn_courses/videos";
    } else if (file.mimetype === "application/pdf") {
      resourceType = "raw";
      folderName = "datn_courses/documents";
      publicId = `doc_${Date.now()}.pdf`;
    }

    return {
      folder: folderName,
      resource_type: resourceType,
      public_id: publicId,
    };
  },
});

export const uploadCloud = multer({ storage });
