import { Router } from "express";
import LessonController from "../controllers/Lessons.controller";
import multer from "multer";

const router = Router();

// Cấu hình multer upload file
const upload = multer({
  storage: multer.diskStorage({
    destination: "uploads/lessons/",
    filename: (req, file, cb) => {
      cb(null, Date.now() + "-" + file.originalname);
    },
  }),
});

router.get("/list", LessonController.list);
router.get("/:id", LessonController.detail);

// Upload file nếu type = "file"
router.post("/create", upload.single("file"), LessonController.create);
router.put("/update/:id", upload.single("file"), LessonController.update);

router.delete("/delete/:id", LessonController.delete);

export default router;
