import { Request, Response } from "express";
import SurveyQuestionBank from "../models/SurveyQuestionBank.Model";
import { Op } from "sequelize";

// Lấy danh sách câu hỏi trong kho
export const GetListQuestionBank = async (req: Request, res: Response) => {
  try {
    let { limit = 10, page = 1, search = "" } = req.query;
    page = parseInt(page as string);
    limit = parseInt(limit as string);
    const offset = (page - 1) * limit;

    const whereCondition = search
      ? { content: { [Op.like]: `%${search}%` } }
      : {};

    const { count, rows } = await SurveyQuestionBank.findAndCountAll({
      where: whereCondition,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    return res.json({ count, questions: rows });
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

// Tạo câu hỏi mới vào kho
export const CreateQuestion = async (req: Request, res: Response) => {
  try {
    const { content, type = "rating" } = req.body;
    if (!content) return res.status(400).json("Nội dung không được để trống");

    const newQuestion = await SurveyQuestionBank.create({ content, type });
    return res.json({
      message: "Thêm câu hỏi thành công",
      question: newQuestion,
    });
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

// Sửa câu hỏi
export const UpdateQuestion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, type } = req.body;

    const question = await SurveyQuestionBank.findByPk(id);
    if (!question) return res.status(404).json("Câu hỏi không tồn tại");

    await question.update({ content, type });
    return res.json("Cập nhật thành công");
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

// Xóa câu hỏi
export const DeleteQuestion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await SurveyQuestionBank.destroy({ where: { id } });
    if (!deleted) return res.status(404).json("Không tìm thấy câu hỏi");
    return res.json("Xóa thành công");
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};
