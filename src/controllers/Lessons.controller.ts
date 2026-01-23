import { Request, Response } from "express";
import Lesson from "../models/Lesson.Model";
import { Op } from "sequelize";

class LessonController {
  // GET /lesson/list
  async list(req: Request, res: Response) {
    try {
      const limit = Number(req.query.limit) || 10;
      const page = Number(req.query.page) || 1;
      const search = (req.query.key_name as string) || "";
      const offset = (page - 1) * limit;

      const where: any = {};
      if (search) {
        where.name = { [Op.substring]: search };
      }

      const { count, rows } = await Lesson.findAndCountAll({
        where,
        limit,
        offset,
        order: [["createdAt", "DESC"]],
      });

      return res.json({
        status: true,
        data: { lessons: rows, count },
      });
    } catch (error: any) {
      console.error("List lessons error:", error);
      return res.status(500).json({ status: false, message: error.message });
    }
  }

  // GET /lesson/:id
  async detail(req: Request, res: Response) {
    try {
      const lesson = await Lesson.findByPk(req.params.id);

      if (!lesson)
        return res
          .status(404)
          .json({ status: false, message: "Lesson not found" });

      return res.json({ status: true, data: lesson });
    } catch (error) {
      console.error("Lesson detail error:", error);
      return res.status(500).json({ status: false, message: "Server error" });
    }
  }

  // POST /lesson/create
  async create(req: Request, res: Response) {
    try {
      // Frontend gửi: { name, type, context (chứa URL hoặc Text) }
      const { name, description, context, type } = req.body;

      // Logic mới: Không kiểm tra req.file nữa vì Frontend đã upload rồi.
      // context bây giờ chính là URL (nếu là video/pdf) hoặc nội dung text.

      // Tùy vào Model DB của bạn, nếu bạn có cột file_path riêng:
      // const file_path = ['upload_video', 'pdf'].includes(type) ? context : null;

      const lesson = await Lesson.create({
        name,
        description,
        context, // Lưu URL hoặc Text vào đây
        type,
        // Nếu DB bắt buộc có file_path, bạn có thể gán nó bằng context luôn
        file_path: ["upload_video", "pdf"].includes(type) ? context : null,
      });

      return res.json({
        status: true,
        message: "Lesson created successfully",
        data: lesson,
      });
    } catch (error: any) {
      console.error("Create lesson error:", error);
      return res
        .status(500)
        .json({ status: false, message: error.message || "Server error" });
    }
  }

  // PUT /lesson/update/:id
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, context, type } = req.body;

      const lesson = await Lesson.findByPk(id);
      if (!lesson)
        return res
          .status(404)
          .json({ status: false, message: "Lesson not found" });

      // Logic mới: Cập nhật trực tiếp từ req.body
      // Frontend đã gửi URL mới nhất trong biến 'context'

      await lesson.update({
        name,
        description,
        context, // Cập nhật URL mới hoặc Text mới
        type,
        file_path: ["upload_video", "pdf"].includes(type)
          ? context
          : lesson.file_path,
      });

      return res.json({
        status: true,
        message: "Lesson updated successfully",
        data: lesson,
      });
    } catch (e: any) {
      console.error("Update lesson error:", e);
      return res
        .status(500)
        .json({ status: false, message: e.message || "Server error" });
    }
  }

  // DELETE /lesson/delete/:id
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      console.log("--- Bắt đầu xóa Lesson --- ID:", id);

      const lesson = await Lesson.findOne({ where: { id } });

      if (!lesson) {
        return res.status(404).json({
          status: false,
          message: "Lesson not found",
        });
      }

      await lesson.destroy();

      return res.json({
        status: true,
        message: "Lesson deleted successfully",
      });
    } catch (error) {
      console.error("Lỗi Server:", error);
      return res
        .status(500)
        .json({ status: false, message: "Server error", error: "ERROR" });
    }
  }
}

export default new LessonController();
