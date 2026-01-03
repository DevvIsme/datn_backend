import express, { Router } from "express";
import {
  verifyAccessToken,
  verifyAdmin,
  verifyCanExam,
  verifyStudent,
} from "../middlewares/authentication";
import * as ExamController from "../controllers/Exam.controller";
import uploadExcell from "multer"; // Import cấu hình multer có sẵn của bạn

const router: Router = express.Router();

router.get("/list/",ExamController.ListExam);
router.get("/list-for-users/",verifyAccessToken, ExamController.ListExam);
router.get(
  "/list-question/:slug",
  verifyCanExam,
  ExamController.AllQuestionOnExam
);
router.get(
  "/list-student/:slug",
  verifyAdmin,
  ExamController.ListStudentAttend
);

router.get(
  "/list-attend/:slug",
  verifyAccessToken,
  ExamController.AllExamResult
);
router.get(
  "/detail-result/:result_id",
  verifyAccessToken,
  ExamController.DetailResultExam
);

router.get("/have-attend/", verifyAccessToken, ExamController.ExamHaveDone);

router.get("/attend/:slug", verifyStudent, ExamController.AttendExam);
router.post("/submit/:result_id", verifyStudent, ExamController.SubmitExam);

router.get("/detail/:slug", ExamController.DetailExam);
router.post("/create/", verifyCanExam, ExamController.CreateExam);
router.put("/update/:exam_id", verifyCanExam, ExamController.UpdateExam);
router.delete("/delete/:exam_id", verifyCanExam, ExamController.DeleteExam);

router.post(
  "/add-question/:exam_id",
  verifyCanExam,
  ExamController.AddQuestion
);
router.get(
  "/detail-question/:question_id",
  verifyCanExam,
  ExamController.DetailQuestion
);
router.put(
  "/update-question/:question_id",
  verifyCanExam,
  ExamController.UpdateQuestion
);
router.delete(
  "/delete-question/:question_id",
  verifyCanExam,
  ExamController.DeleteQuestion
);
router.get("/questions", ExamController.ListQuestionBank);

// 2. Thêm mới: POST /exam/question/create
router.post("/question/create", ExamController.CreateQuestionBank);

// 3. Sửa: PUT /exam/question/update/:question_id
router.put("/question/update/:question_id", ExamController.UpdateQuestion);

// 4. Xóa: DELETE /exam/question/delete/:question_id
router.delete("/question/delete/:question_id", ExamController.DeleteQuestion);
router.post(
  "/add-existing-questions/:exam_id",
  ExamController.AddExistingQuestionsToExam
);
router.put("/save-draft/:result_id",verifyAccessToken, ExamController.SaveDraft);

router.post("/add-student/:exam_id", ExamController.AddStudentToExam);
router.delete(
  "/remove-student/:result_id",
  ExamController.RemoveStudentFromExam
);
// 1. Lấy danh sách unique
router.get("/students-in-exam/:slug", ExamController.GetUniqueStudentsInExam);

// 2. Xóa học viên (Xóa hết mọi lần thi)
router.delete("/remove-student-all/:exam_id/:student_id", ExamController.RemoveStudentAllAttempts);
router.get("/search-student", ExamController.SearchStudentToAdd);
router.post(
  "/question/import",
  uploadExcell().single("file"),
  ExamController.ImportQuestions
);
router.post("/generate-variations", ExamController.PreviewVariations);
router.post("/explain", ExamController.GetExplanation);
router.post("/monitor",verifyAccessToken, ExamController.MonitorExamSession);
router.get(
  "/violations/:slug",
  verifyAccessToken,
  ExamController.GetExamViolations
);
export default router;
