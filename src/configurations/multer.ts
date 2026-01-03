import path from "path";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
const storage = multer.memoryStorage();

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../public/avatars"));
  },
  filename: (req, file, cb) => {
    const uniqueName = uuidv4() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../public/images"));
  },
  filename: (req, file, cb) => {
    const uniqueName = uuidv4() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../public/files"));
  },
  filename: (req, file, cb) => {
    const uniqueName = uuidv4() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../public/videos"));
  },
  filename: (req, file, cb) => {
    const uniqueName = uuidv4() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

export const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: function (req, file, cb) {
    if (
      file.mimetype == "image/bmp" ||
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpeg" ||
      file.mimetype == "image/jpg" ||
      file.mimetype == "image/gif"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ được sử dụng hình ảnh cho tính năng này"));
    }
  },
});

export const imageUpload = multer({
  storage: imageStorage,
  fileFilter: function (req, file, cb) {
    if (
      file.mimetype == "image/bmp" ||
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpeg" ||
      file.mimetype == "image/jpg" ||
      file.mimetype == "image/gif"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ được sử dụng hình ảnh cho tính năng này"));
    }
  },
});

export const documentUpload = multer({
  storage: documentStorage,
});

export const videoUpload = multer({
  storage: videoStorage,
  fileFilter: function (req, file, cb) {
    if (
      file.mimetype === "video/mp4" ||
      file.mimetype === "video/avi" ||
      file.mimetype === "video/mkv" ||
      file.mimetype === "video/mov" ||
      file.mimetype === "video/wmv"
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Chỉ được phép upload file video có định dạng .mp4, .avi, .mkv, .mov, hoặc .wmv"
        )
      );
    }
  },
});

export const uploadExcell = multer({ storage: storage });
