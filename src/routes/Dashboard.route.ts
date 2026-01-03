import express from "express";
// Import controller mà mình đã viết ở bước trước
import { getDashboardStats } from "../controllers/Dashboard.controller";

// (Tùy chọn) Import middleware kiểm tra quyền Admin nếu bạn đã có
// import { verifyAdmin } from '../middlewares/authMiddleware';

const router = express.Router();

// Định nghĩa route GET /stats
// Đường dẫn đầy đủ sẽ là: /api/dashboard/stats
router.get("/stats", getDashboardStats);

// Nếu muốn bảo mật chỉ admin mới xem được (khuyên dùng):
// router.get('/stats', verifyAdmin, getDashboardStats);

export default router;
