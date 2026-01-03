import { Request, Response } from "express";
import Lesson from "../models/Lesson.Model"; 
// import CourseLesson from "../models/CourseLesson.Model";
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
      return res.status(404).json({ status: false, message: "Lesson not found" });

    return res.json({ status: true, data: lesson });
  } catch (error) {
    console.error("Lesson detail error:", error);
    return res.status(500).json({ status: false, message: "Server error" });
  }
}

  // POST /lesson/create
  async create(req: Request, res: Response) {
    try {
      const { name, description, context, type } = req.body;

      let file_path = null;
      if (req.file) file_path = req.file.filename;

      const lesson = await Lesson.create({
        name,
        description,
        context,
        type,
        file_path,
      });

      // if (course_id) {
      //   await CourseLesson.create({
      //     course_id,
      //     lesson_id: lesson.id,
      //     position: position || 1,
      //   });
      // }

      return res.json({
        status: true,
        message: "Lesson created successfully",
        data: lesson,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ status: false, message: "Server error" });
    }
  }

  // PUT /lesson/update/:id
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, context, type, } = req.body;

      const lesson = await Lesson.findByPk(id);
      if (!lesson)
        return res.status(404).json({ status: false, message: "Lesson not found" });

      let file_path = lesson.file_path;
      if (req.file) file_path = req.file.filename;

      await lesson.update({
        name,
        description,
        context,
        type,
        file_path,
      });

      // if (course_id) {
      //   await CourseLesson.upsert({
      //     course_id,
      //     lesson_id: id,
      //     position: position || 1,
      //   });
      // }

      return res.json({
        status: true,
        message: "Lesson updated successfully",
        data: lesson,
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ status: false, message: "Server error" });
    }
  }

  // DELETE /lesson/delete/:id
async delete(req: Request, res: Response) {
    try {
        const { id } = req.params;
        console.log("--- Bắt đầu xóa Lesson ---");
        console.log("ID nhận được:", id);

        // 1. Kiểm tra xem Lesson có tồn tại không trước
        const lesson = await Lesson.findOne({ where: { id } });
        
        if (!lesson) {
            console.log("Tìm không thấy lesson trong DB");
            return res.status(404).json({ status: false, message: "Lesson not found (Check ID or Soft Delete)" });
        }

        // 2. Thực hiện xóa
        // Nếu dùng Soft Delete mà muốn xóa hẳn thì thêm force: true
        await lesson.destroy(); 

        console.log("Đã xóa thành công");
        return res.json({ status: true, message: "Lesson deleted successfully" });

    } catch (error) {
        console.error("Lỗi Server:", error); // Log lỗi chi tiết ra terminal
        return res.status(500).json({ status: false, message: "Server error", error: 'ERROR' });
    }
}
}

export default new LessonController();
