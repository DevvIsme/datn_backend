import express, { Router } from "express";
import * as Material from "../controllers/Material.controller";
import { verifyAccessToken, verifyCanCourse } from "../middlewares/authentication";


const router: Router = express.Router();

router.get("/list-lesson/:course_slug", verifyAccessToken, Material.ListLesson);
router.post("/create-lesson/:course_id", verifyCanCourse, Material.CreateLesson);
router.put("/update-lesson/:lesson_id", verifyCanCourse, Material.UpdateLesson);
//router.delete("/delete-lesson/:lesson_id", verifyCanCourse, Material.DeleteLesson);

router.get("/list-document/:course_slug", verifyAccessToken, Material.ListDoc);
router.post("/create-document/:course_id", verifyCanCourse, Material.CreateDoc);
router.put("/update-document/:doc_id", verifyCanCourse, Material.UpdateDoc);
router.delete("/delete-document/:doc_id", verifyCanCourse, Material.DeleteDoc);
router.post("/add-lessons-to-course", Material.AddLessonsToCourse);
router.get("/stream/:filename", Material.StreamVideo);

//router.get("/lesson/:course_slug/:lesson_id", verifyAccessToken, Material.DetailLesson)
//router.get("/document/detail/:course_slug/:lesson_id", verifyAccessToken, Material.DetailLesson)

export default router;
