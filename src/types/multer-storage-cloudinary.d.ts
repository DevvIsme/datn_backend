// src/types/multer-storage-cloudinary.d.ts
declare module "multer-storage-cloudinary" {
  import { StorageEngine } from "multer";
  import { v2 as cloudinary } from "cloudinary";

  interface Options {
    cloudinary: typeof cloudinary;
    params?: any; // Dùng any để linh hoạt các tham số folder, format...
  }

  export class CloudinaryStorage implements StorageEngine {
    constructor(options: Options);
    _handleFile(req: any, file: any, cb: any): void;
    _removeFile(req: any, file: any, cb: any): void;
  }
}
