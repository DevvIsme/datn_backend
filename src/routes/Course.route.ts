import express, { Router } from "express";
import * as Course from "../controllers/Course.controller";
import {
  verifyAccessToken,
  verifyCanCourse,
  verifyStudent,
} from "../middlewares/authentication";

const router: Router = express.Router();

router.get("/list/", Course.GetListCourse);
router.get("/list-course-users/",verifyAccessToken, Course.GetListCourse);
router.get("/list-student/:id", Course.ListStudent);
router.get("/my-course/", verifyAccessToken, Course.MyCourse);
router.get("/:slug", verifyAccessToken, Course.DetailCourse);

router.post("/create/", verifyCanCourse, Course.CreateCourse);
router.post("/update-progress/", verifyStudent, Course.UpdateProgress);


router.put("/update/:id", verifyCanCourse, Course.UpdateCourse);
router.delete("/delete/:id", verifyCanCourse, Course.DeleteCourse);

router.post("/add-student/:id", verifyCanCourse, Course.AddToCourse);

router.get("/review/:course_slug", verifyAccessToken, Course.CourseReview);
router.post("/review/:course_slug", verifyStudent, Course.WriteReview);
router.post("/register/:course_slug", verifyStudent, Course.CourseRegister);

export default router;
