import express, { Router } from "express";
import * as Survey from "../controllers/Survey.controller";
// 1. Import Controller quản lý ngân hàng câu hỏi (Mới)
import * as QuestionBank from "../controllers/Questions_survey.controller";

import {
  optionalAuth,
  verifyAccessToken,
  verifyStudent,
  verifyAdmin,
} from "../middlewares/authentication";

const router: Router = express.Router();

// ============================================================
// KHU VỰC 1: QUẢN LÝ NGÂN HÀNG CÂU HỎI (Admin) - MỚI
// (Đặt các route này lên TRƯỚC các route có tham số :slug)
// ============================================================
router.get("/questions/list",  QuestionBank.GetListQuestionBank);
router.post("/questions/create", verifyAdmin, QuestionBank.CreateQuestion);
router.put("/questions/update/:id", verifyAdmin, QuestionBank.UpdateQuestion);
router.delete(
  "/questions/delete/:id",
  verifyAdmin,
  QuestionBank.DeleteQuestion
);

// ============================================================
// KHU VỰC 2: QUẢN LÝ ĐỢT KHẢO SÁT (Survey) - CŨ & CẬP NHẬT
// ============================================================

// Lấy danh sách các đợt khảo sát
router.get("/list/", optionalAuth, Survey.GetListSurvey);

// Tạo đợt khảo sát mới (Admin sẽ gửi kèm danh sách ID câu hỏi từ kho)
router.post("/create/", verifyAdmin, Survey.CreateSurvey);

// Cập nhật đợt khảo sát
router.put("/update/:id", verifyAdmin, Survey.UpdateSurvey);

// Xóa đợt khảo sát
router.delete("/delete/:id", verifyAdmin, Survey.DeleteSurvey);

// Sinh viên nộp bài khảo sát (Lưu vào bảng SurveyAnswer)
router.post("/attend/:survey_id", verifyStudent, Survey.TakeSurvey);

// Xem danh sách sinh viên đã tham gia (Admin)
// Lưu ý: Route này có :slug nên cần cẩn thận thứ tự
router.get("/student-list/:slug", verifyAdmin, Survey.GetListAttendSurvey);

// Xem chi tiết một bài khảo sát (Dựa trên slug)
// QUAN TRỌNG: Route này nên để cuối cùng để tránh nó "bắt nhầm" các đường dẫn khác
router.get("/:slug/", verifyAccessToken, Survey.DetailSurvey);
router.post("/add-question/:id", verifyAdmin, Survey.AddQuestionToSurvey);
router.post(
  "/remove-question/:id",
  verifyAdmin,
  Survey.RemoveQuestionFromSurvey
);
router.post("/submit/:survey_id", verifyStudent, Survey.SubmitSurvey);
router.get("/attend-detail/:id", verifyAdmin, Survey.GetAttendDetail);
router.get("/analytics/:id", verifyAdmin, Survey.GetSurveyAnalytics);
export default router;
