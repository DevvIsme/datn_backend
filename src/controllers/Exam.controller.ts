import { Request, Response } from "express";
import Topic from "../models/Topic.Model";
import Exam from "../models/Exam.Model";
import ExamQuestion from "../models/ExamQuestion.Model"; // Model đại diện cho bảng 'question'
import ExamQuestionLink from "../models/ExamQuestionLink.Model"; // BẠN CẦN TẠO MODEL NÀY đại diện bảng 'exam_questions'
import { Order } from "sequelize";
import { uploadExcell } from "../configurations/multer";
import XLSX from "xlsx";
import { Op, Sequelize } from "sequelize";
import ExamResult from "../models/ExamResult.Model";
import { changeTime } from "../helpers/formatTime";
import Student from "../models/Student.Model";
import _ from "lodash";
import { convertString } from "../helpers/convertToSlug";
import { isEqualArrays } from "../helpers/checkCorrect";
import { bcryptEncrypt } from "../helpers/bcryptHash";
import { AnalyzeExamImage, ExplainQuestion, GenerateQuiz } from "../services/Gemini.service";
import ViolationHistory from "../models/ViolationHistory.Model";
import path from "path";
import fs from "fs"; // <--- Thêm dòng này


// ... (Các hàm ListExam giữ nguyên vì bảng Exam thay đổi ít) ...
// File: controllers/Exam.controller.ts

export const ListExam = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // --- DEBUG: Bật lên để xem User là ai, Role gì ---
    // console.log("User đang request:", user);
    // -----------------------------------------------

    let {
      limit = 10,
      page = 1,
      key_name = "",
      topic_id = null,
      exclude_taken = "false",
    } = req.query;

    page = parseInt(page as string);
    limit = parseInt(limit as string);
    const offset = (page - 1) * limit;

    const topicCondition = topic_id ? { id: topic_id } : {};

    const whereCondition: any = {
      [Op.or]: [{ name: { [Op.like]: `%${key_name}%` } }],
    };

    // [FIX 1]: Ép kiểu user.role sang Number để so sánh chuẩn xác
    // [FIX 2]: Đảm bảo logic này chỉ chạy khi có User
    if (user && Number(user.role) === 0) {
      // Chỉ lấy bài Hoạt động (1) hoặc Khóa (2).
      // Bài Ẩn (0) hoặc NULL sẽ bị loại bỏ.
      whereCondition.status = { [Op.in]: [1, 2] };
    }

    // Logic lọc bài đã thi
    if (user && Number(user.role) === 0 && exclude_taken === "true") {
      const takenExams = await ExamResult.findAll({
        where: { student_id: user.id },
        attributes: ["exam_id"],
        raw: true,
      });

      const takenExamIds = takenExams.map((item: any) => item.exam_id);

      if (takenExamIds.length > 0) {
        // Kết hợp điều kiện ID vào object whereCondition hiện tại
        whereCondition.id = { [Op.notIn]: takenExamIds };
      }
    }

    const { count, rows: exams } = await Exam.findAndCountAll({
      limit,
      offset,
      // Đảm bảo lấy đủ các trường cần thiết
      attributes: [
        "id",
        "name",
        "slug",
        "passingScore",
        "numberQuestion",
        "reDoTime",
        "submitTime",
        "studentDid",
        "createdAt",
        "shuffle_questions",
        "shuffle_answers",
        "status",
        "start_date",
        "end_date",
      ],
      where: whereCondition,
      include: [
        {
          model: Topic,
          as: "topic",
          attributes: ["id", "slug", "name"],
          where: topicCondition,
        },
      ],
      order: [["updatedAt", "DESC"]],
      nest: true,
      raw: true,
    });

    let format = exams.map((item: any) => {
      let { createdAt, id, ...rest } = item;
      createdAt = changeTime(createdAt);
      return { id, ...rest, createdAt };
    });

    return res.json({ count, exams: format });
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

// CẬP NHẬT: Lấy câu hỏi phải thông qua bảng trung gian hoặc lấy list ID trước
export const AllQuestionOnExam = async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug;
    const exam = await Exam.findOne({ where: { slug: slug } });
    if (!exam) {
      return res.status(404).json("Exam không tồn tại");
    }

    let { limit = 15, page = 1, key_name = "" } = req.query;
    page = parseInt(page as string);
    limit = parseInt(limit as string);
    const offset = (page - 1) * limit;

    // Bước 1: Lấy danh sách question_id từ bảng trung gian exam_questions
    const examQuestionsLinks = await ExamQuestionLink.findAll({
      where: { exam_id: exam.id },
      attributes: ["question_id"],
      raw: true,
    });

    const questionIds = examQuestionsLinks.map((link: any) => link.question_id);

    if (questionIds.length === 0) {
      return res.json({ count: 0, questions: [] });
    }

    // Bước 2: Lấy thông tin câu hỏi từ bảng question
    const whereCondition: any = {
      id: { [Op.in]: questionIds }, // Lọc theo list ID đã lấy
      [Op.or]: [{ name: { [Op.like]: `%${key_name}%` } }],
    };

    const { count, rows: questions } = await ExamQuestion.findAndCountAll({
      limit,
      offset,
      where: whereCondition,
      attributes: ["id", "name", "type", "choice", "correctAns"],
      order: [["id", "DESC"]],
      raw: true,
    });

    const format = questions.map((question: any) => {
      let { choice, correctAns, ...rest } = question;
      choice = typeof choice === "string" ? JSON.parse(choice) : choice;
      correctAns =
        typeof correctAns === "string" ? JSON.parse(correctAns) : correctAns;
      return { ...rest, choice, correctAns };
    });
    return res.json({ count, questions: format });
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

// ... (ListStudentAttend, AllExamResult, DetailResultExam, DetailExam, CreateExam, UpdateExam, DeleteExam giữ nguyên logic chính, chỉ cần đảm bảo import đúng) ...

export const ListStudentAttend = async (req: Request, res: Response) => {
  // ... (Code giữ nguyên như cũ)
  try {
    const slug = req.params.slug;
    const exam = await Exam.findOne({ where: { slug } });
    if (!exam) {
      return res.status(404).json("Exam khong ton taji");
    }
    let { limit = 10, page = 1, key_name = "" } = req.query;
    page = parseInt(page as string);
    limit = parseInt(limit as string);
    const offset = (page - 1) * limit;

    const { count, rows: students } = await ExamResult.findAndCountAll({
      limit,
      offset,
      attributes: [
        [Sequelize.fn("COUNT", Sequelize.col("student_id")), "attempt_count"],
        [Sequelize.fn("MAX", Sequelize.col("correctAns")), "highest_score"],
      ],
      where: { exam_id: exam.id },
      include: [
        {
          model: Student,
          as: "student",
          attributes: ["id", "fullName"],
          where: { fullName: { [Op.like]: `%${key_name}%` } },
        },
      ],
      group: ["student_id"],
      nest: true,
      raw: true,
    });

    const format = students.map((item: any) => {
      let { highest_score, ...rest } = item;
      highest_score = (highest_score * 10) / exam.numberQuestion;
      return { highest_score, ...rest };
    });

    return res.json({ count: count.length, students: format });
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};
export const AllExamResult = async (req: Request, res: Response) => {
  // ... (Code giữ nguyên như cũ)
  try {
    const slug = req.params.slug;
    let { limit = 10, page = 1, key_name = "", student_id } = req.query;
    page = parseInt(page as string);
    limit = parseInt(limit as string);
    const offset = (page - 1) * limit;

    const exam = await Exam.findOne({ where: { slug } });

    if (!exam) {
      return res.status(404).json("Bài kiểm tra không tồn tại");
    }

    const user = (req as any).user;
    let whereCondition: any = {
      exam_id: exam.id,
    };

    // Kiểm tra role của người dùng
    if (user.role === 0) {
      // Sinh viên chỉ được xem kết quả của chính mình
      whereCondition.student_id = user.id;
    } else if (user.role !== 0) {
      // Nếu không phải sinh viên và có student_id trong query, lọc theo student_id
      if (student_id) {
        whereCondition.student_id = student_id;
      }
    }

    // Lấy kết quả thi kèm theo thông tin sinh viên
    const { count, rows: results } = await ExamResult.findAndCountAll({
      limit,
      offset,
      where: whereCondition,
      attributes: [
        "id",
        "isPass",
        "point",
        "correctAns",
        "createdAt",
        "submitAt",
      ],
      order: [["id", "DESC"]],
      include: [
        {
          model: Student,
          as: "student", // alias cho bảng Student
          attributes: ["id", "fullName"], // lấy thuộc tính 'name' của Student
          where: {
            fullName: { [Op.like]: `%${key_name}%` },
          },
        },
      ],
      nest: true,
      raw: true,
    });

    const currentTime = Date.now();
    const examDurationMs = exam.submitTime * 60 * 1000;

    // Dùng Promise.all để đợi tất cả các lệnh update chạy xong
    const processedResults = await Promise.all(
      results.map(async (result: any) => {
        // Chỉ check những bài chưa nộp
        if (!result.submitAt) {
          const startTime = new Date(result.createdAt).getTime();
          // Cho phép trễ 1 phút
          const endTime = startTime + examDurationMs + 60000;

          // Nếu đã quá hạn
          if (currentTime > endTime) {
            // 1. Cập nhật vào DB ngay lập tức
            await ExamResult.update(
              {
                submitAt: new Date(endTime), // Gán thời gian nộp bằng lúc hết hạn
                point: 0,
                isPass: false,
              },
              { where: { id: result.id } }
            );

            // 2. Sửa lại dữ liệu bộ nhớ để trả về Frontend luôn (đỡ phải F5 lần nữa)
            result.submitAt = new Date(endTime);
            result.point = 0;
            result.isPass = false;
          }
        }
        return result;
      })
    );

    const format = results.map((result: any) => {
      let { createdAt, submitAt, ...rest } = result;
      createdAt = changeTime(createdAt); // Định dạng lại thời gian
      submitAt = submitAt ? changeTime(submitAt) : "";
      return { ...rest, createdAt, submitAt };
    });

    return res.json({ count, results: format });
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};
// File: controllers/Exam.controller.ts

export const DetailResultExam = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const result_id = req.params.result_id;

    // 1. Lấy dữ liệu từ DB
    const result: any = await ExamResult.findByPk(result_id, {
      attributes: [
        "id",
        "correctAns",
        "point",
        "isPass",
        "detailResult",
        "createdAt",
        "submitAt",
      ],
      include: [
        { model: Student, as: "student", attributes: ["id", "fullName"] },
        {
          model: Exam,
          as: "exam",
          attributes: ["id", "name", "slug", "submitTime", "is_ai_proctoring"],
        },
      ],
      raw: true,
      nest: true,
    });

    if (!result) return res.status(404).json("Kết quả không tồn tại!");

    // 2. TÍNH TOÁN THỜI GIAN CÒN LẠI (QUAN TRỌNG NHẤT)
    // Phải dùng result.createdAt GỐC từ DB, chưa qua chỉnh sửa
    const now = Date.now();
    const startTime = new Date(result.createdAt).getTime();
    const durationMs = result.exam.submitTime * 60 * 1000;
    const endTime = startTime + durationMs;

    // Tính số giây còn lại: (Lúc kết thúc - Lúc hiện tại) / 1000
    let remainingSeconds = Math.floor((endTime - now) / 1000);

    // Nếu đã quá giờ (số âm) thì trả về 0
    if (remainingSeconds < 0) remainingSeconds = 0;

    // 3. Xử lý các dữ liệu khác (Format ngày tháng, parse JSON...)
    let { detailResult, submitAt, createdAt, ...rest } = result;

    try {
      // 1. Cố gắng Parse JSON nếu nó là chuỗi
      detailResult =
        typeof detailResult === "string"
          ? JSON.parse(detailResult)
          : detailResult;
    } catch (e) {
      detailResult = []; // Nếu JSON lỗi -> Gán mảng rỗng
    }
    if (!Array.isArray(detailResult)) {
      detailResult = [];
    }
    // Ẩn đáp án đúng nếu đang làm bài
    if (!submitAt) {
      detailResult = detailResult?.map((item: any) => {
        let { correctAns, ...r } = item;
        return r;
      });
    }

    // Format ngày tháng để hiển thị đẹp (Chỉ làm việc này SAU KHI đã tính remainingSeconds)
    createdAt = changeTime(createdAt);
    submitAt = submitAt ? changeTime(submitAt) : "";

    // 4. Trả về kết quả kèm remainingSeconds
    return res.json({
      ...rest,
      detailResult,
      createdAt,
      submitAt,
      remainingSeconds, // <--- Frontend chỉ cần dùng số này
    });
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

export const DetailExam = async (req: Request, res: Response) => {
  // ... (Code giữ nguyên như cũ)
  try {
    const slug = req.params.slug;
    const exam = await Exam.findOne({
      attributes: [
        "id",
        "name",
        "slug",
        "numberQuestion",
        "passingScore",
        "submitTime",
        "reDoTime",
        "studentDid",
        "createdAt",
        "updatedAt",
        "shuffle_questions",
        "shuffle_answers",
        "status",
        "start_date",
        "end_date",
        "is_ai_proctoring",
      ],
      where: { slug },
      include: [
        {
          model: Topic,
          as: "topic",
          attributes: ["id", "name", "slug"],
        },
      ],
      nest: true,
      raw: true,
    });
    if (!exam) {
      return res.status(404).json("Bài kiểm tra không tồn tại!");
    }
    let { createdAt, updatedAt, ...rest } = exam as any;
    createdAt = changeTime(createdAt);
    updatedAt = changeTime(updatedAt);
    return res.json({ ...rest, createdAt, updatedAt });
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};
export const CreateExam = async (req: Request, res: Response) => {
  // ... (Code giữ nguyên như cũ)
  try {
    let {
      name,
      numberQuestion,
      passingScore,
      submitTime,
      reDoTime,
      topic_id,
      shuffle_questions = 0,
      shuffle_answers = 0,
      status = 1,
      start_date,
      end_date,
      is_ai_proctoring,
    } = req.body;
    if (numberQuestion <= 0) {
      return res.status(400).json("Số lượng câu hỏi không hợp lệ!");
    }
    if (passingScore < 0 || passingScore > 10) {
      return res
        .status(400)
        .json("Điểm đạt phải nằm trong khoảng từ 0 đến 10!");
    }
    submitTime <= 1 ? 1 : submitTime;
    reDoTime < 0 ? 0 : reDoTime;
    const slug = convertString(name);

    await Exam.create({
      name,
      numberQuestion,
      passingScore,
      submitTime,
      reDoTime,
      topic_id,
      slug,
      shuffle_questions,
      shuffle_answers,
      status,
      start_date: start_date || null,
      end_date: end_date || null,
      is_ai_proctoring,
    });
    return res.json("Tạo bài kiểm tra thành công!");
  } catch (error: any) {
    if (error?.errors[0].message == "name must be unique") {
      return res.status(409).json("Tên bài kiểm tra đã tồn tại!");
    }
    return res.status(500).json(error.message);
  }
};
export const UpdateExam = async (req: Request, res: Response) => {
  // ... (Code giữ nguyên như cũ)
  try {
    const { exam_id } = req.params;
    const exam = await Exam.findByPk(exam_id);
    if (!exam) {
      return res.status(404).json("Bài kiểm tra không tồn tại!");
    }
    let {
      name = exam.name,
      numberQuestion = exam.numberQuestion,
      passingScore = exam.passingScore,
      submitTime = exam.submitTime,
      topic_id = exam.topic_id,
      reDoTime = exam.reDoTime,
      shuffle_questions = exam.shuffle_questions,
      shuffle_answers = exam.shuffle_answers,
      status = exam.status,
      start_date = exam.start_date,
      end_date = exam.end_date,
      is_ai_proctoring = exam.is_ai_proctoring,
    } = req.body;
    if (numberQuestion <= 0) {
      return res.status(400).json("Số lượng câu hỏi không hợp lệ!");
    }
    if (passingScore < 0 || passingScore > 10) {
      return res
        .status(400)
        .json("Điểm đạt phải nằm trong khoảng từ 0 đến 10!");
    }
    submitTime < 10 ? 10 : submitTime;
    reDoTime < 0 ? 0 : reDoTime;
    const slug = convertString(name);
    await exam.update({
      name,
      numberQuestion,
      passingScore,
      submitTime,
      topic_id,
      reDoTime,
      slug,
      shuffle_questions,
      shuffle_answers,
      status,
      start_date: start_date || null,
      end_date: end_date || null,
      is_ai_proctoring,
    });
    return res.json("Sửa thông tin bài kiểm tra thành công!");
  } catch (error: any) {
    if (error?.errors[0].message == "name must be unique") {
      return res.status(409).json("Tên bài kiểm tra đã tồn tại!");
    }
    return res.status(500).json(error.message);
  }
};
export const DeleteExam = async (req: Request, res: Response) => {
  // ... (Code giữ nguyên như cũ)
  try {
    const { exam_id } = req.params;
    const exam = await Exam.findByPk(exam_id);
    if (!exam) {
      return res.status(404).json("Bài kiểm tra không tồn tại!");
    }
    await exam.destroy();
    return res.json("Xóa bài kiểm tra thành công!");
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

// CẬP NHẬT: Thêm 1 câu hỏi cũng cần tạo liên kết
export const AddQuestion = async (req: Request, res: Response) => {
  try {
    const exam_id = req.params.exam_id;
    const exam = await Exam.findOne({ where: { slug: exam_id } });

    if (!exam) {
      return res.status(404).json("Exam không tồn tại");
    }

    const { name, type, choice, correctAns } = req.body;

    if (
      !name ||
      !type ||
      !Array.isArray(choice) ||
      !Array.isArray(correctAns)
    ) {
      return res.status(400).json("Dữ liệu không hợp lệ");
    }

    if (type === "radio") {
      if (correctAns.length !== 1) {
        return res
          .status(400)
          .json("Câu hỏi loại radio chỉ được phép có 1 đáp án đúng");
      }
      if (!choice.includes(correctAns[0])) {
        return res
          .status(400)
          .json("Đáp án đúng không nằm trong danh sách các lựa chọn");
      }
    }

    if (type === "checkbox") {
      const isValidAnswers = correctAns.every((ans: string) =>
        choice.includes(ans)
      );
      if (!isValidAnswers) {
        return res
          .status(400)
          .json("Tất cả đáp án đúng phải nằm trong danh sách các lựa chọn");
      }
    }

    // 1. Tạo câu hỏi
    const newQuestion = await ExamQuestion.create({
      name,
      type,
      choice,
      correctAns,
      topic_id: exam.topic_id, // Gán topic
    });

    // 2. Tạo liên kết
    await ExamQuestionLink.create({
      exam_id: exam.id,
      question_id: newQuestion.id,
      point: 0,
    });

    return res.json("Tạo câu hỏi thành công");
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

// DetailQuestion không đổi (vì query theo question_id)
export const DetailQuestion = async (req: Request, res: Response) => {
  try {
    const question_id = req.params.question_id;

    const question = await ExamQuestion.findByPk(question_id, {
      raw: true,
    });
    if (!question) {
      return res.status(404).json("Câu hỏi không tồn tại");
    }
    const parsedQuestion = {
      ...question,
      choice:
        typeof question.choice === "string"
          ? JSON.parse(question.choice)
          : question.choice,
      correctAns:
        typeof question.correctAns === "string"
          ? JSON.parse(question.correctAns)
          : question.correctAns,
    };

    return res.json(parsedQuestion);
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

// UpdateQuestion không đổi (logic chỉ update nội dung câu hỏi)
export const UpdateQuestion = async (req: Request, res: Response) => {
  try {
    const question_id = req.params.question_id;
    const question = await ExamQuestion.findByPk(question_id);

    if (!question) {
      return res.status(404).json("Câu hỏi không tồn tại");
    }

    // 1. CHUẨN BỊ DỮ LIỆU ĐỂ XỬ LÝ (Dạng Mảng/Biến chuẩn)
    // Nếu req.body có gửi lên thì dùng, không thì dùng cái cũ trong DB
    let newName = req.body.name || question.name;
    let newType = req.body.type || question.type;
    const { topic_id } = req.body;
    // Xử lý choice: Lấy từ body hoặc DB. Đảm bảo luôn là Mảng để validate
    let rawChoice =
      req.body.choice !== undefined ? req.body.choice : question.choice;
    let listChoice =
      typeof rawChoice === "string" ? JSON.parse(rawChoice) : rawChoice;

    // Xử lý correctAns: Tương tự
    let rawCorrect =
      req.body.correctAns !== undefined
        ? req.body.correctAns
        : question.correctAns;
    let listCorrect =
      typeof rawCorrect === "string" ? JSON.parse(rawCorrect) : rawCorrect;

    // 2. VALIDATION (Logic giữ nguyên, thao tác trên Mảng)
    // Kiểm tra nếu loại câu hỏi là radio
    if (newType === "radio") {
      if (listCorrect.length !== 1) {
        return res
          .status(400)
          .json(`Câu hỏi loại radio chỉ được phép có 1 đáp án đúng`);
      }

      if (!listChoice.includes(listCorrect[0])) {
        return res
          .status(400)
          .json(`Đáp án đúng không nằm trong danh sách các lựa chọn`);
      }
    }

    // Kiểm tra nếu loại câu hỏi là checkbox
    if (newType === "checkbox") {
      const isValidAnswers = listCorrect.every((ans: string) =>
        listChoice.includes(ans)
      );
      if (!isValidAnswers) {
        return res
          .status(400)
          .json(`Tất cả đáp án đúng phải nằm trong danh sách các lựa chọn`);
      }
    }

    // 3. CẬP NHẬT VÀO DB (Quan trọng: Phải Stringify mảng)
    await question.update({
      name: newName,
      type: newType,
      // Nếu là mảng thì chuyển thành string, nếu là string rồi thì giữ nguyên
      choice: Array.isArray(listChoice)
        ? JSON.stringify(listChoice)
        : listChoice,
      correctAns: Array.isArray(listCorrect)
        ? JSON.stringify(listCorrect)
        : listCorrect,
      topic_id: topic_id, // <== THÊM DÒNG NÀY
    });

    return res.json("Cập nhật câu hỏi thành công");
  } catch (error: any) {
    console.error("Lỗi UpdateQuestion:", error); // In lỗi ra terminal để dễ debug
    return res.status(500).json(error.message);
  }
};

// DeleteQuestion: Xóa câu hỏi trong bảng question (DB có cascade nên tự xóa link)
export const DeleteQuestion = async (req: Request, res: Response) => {
  try {
    const question_id = req.params.question_id;
    const question = await ExamQuestion.findByPk(question_id);
    if (!question) {
      return res.status(404).json("Question khong ton tai");
    }
    await question.destroy();
    return res.json("Xoa cau hoi thanh cong");
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

// CẬP NHẬT: AttendExam lấy câu hỏi qua bảng trung gian
// File: controllers/Exam.controller.ts
export const AttendExam = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const slug = req.params.slug;
    const exam = await Exam.findOne({ where: { slug } });
    if (!exam) return res.status(404).json("Bài kiểm tra không tồn tại");
    const now = new Date();

    // 1. Chưa đến giờ mở đề
    if (exam.start_date && now < new Date(exam.start_date)) {
      return res.status(403).json(`Bài thi chưa mở. Vui lòng quay lại sau`);
    }

    // 2. Đã quá hạn truy cập
    if (exam.end_date && now > new Date(exam.end_date)) {
      return res.status(403).json("Bài thi đã kết thúc (Hết hạn truy cập).");
    }
    if (exam.status === 0) {
      return res.status(404).json("Bài thi này hiện đang bị ẩn.");
    }
    if (exam.status === 2) {
      return res
        .status(403)
        .json("Bài thi này đang bị KHOÁ. Bạn không thể tham gia lúc này.");
    }

    // 1. TÌM & XỬ LÝ BÀI LÀM DỞ
    const ongoingExam = await ExamResult.findOne({
      where: { student_id: user.id, exam_id: exam.id, submitAt: null },
    });

    if (ongoingExam) {
      const now = new Date().getTime();
      const startTime = new Date(ongoingExam.createdAt).getTime();
      const durationMs = exam.submitTime * 60 * 1000;
      const endTime = startTime + durationMs + 60000; // Buffer 1 phút

      // Nếu quá hạn -> Đóng bài cũ
      if (now > endTime) {
        await ongoingExam.update({
          submitAt: new Date(),
          point: 0,
          isPass: false,
        });
        // Chạy tiếp xuống dưới để tạo bài mới
      } else {
        // Còn hạn -> Trả về làm tiếp
        let detailResult: any[] = [];
        try {
          detailResult =
            typeof ongoingExam.detailResult === "string"
              ? JSON.parse(ongoingExam.detailResult)
              : ongoingExam.detailResult;
        } catch (e) {}
        if (!Array.isArray(detailResult)) detailResult = [];

        const safeData = detailResult.map((q: any) => {
          if (!q) return {};
          const { correctAns, isCorrect, ...rest } = q;
          return rest;
        });

        return res.json({
          test: ongoingExam.id,
          dataQuestion: safeData,
          isResume: true,
          createdAt: ongoingExam.createdAt,
        });
      }
    }

    // 2. TẠO BÀI MỚI (Logic Create)
    const countDoing = await ExamResult.count({
      where: { exam_id: exam.id, student_id: user.id },
    });
    if (exam.reDoTime > 0 && countDoing >= exam.reDoTime) {
      return res.status(403).json("Bạn đã hết lượt làm bài kiểm tra này!");
    }
    if (countDoing == 0) {
      await exam.update({ studentDid: exam.studentDid + 1 });
    }

    // --- SỬA ĐOẠN LẤY CÂU HỎI TẠI ĐÂY ---

    // Bước 1: Thử tìm trong bảng liên kết (ExamQuestionLink)
    let questionIds: number[] = [];
    try {
      const examQuestionsLinks = await ExamQuestionLink.findAll({
        where: { exam_id: exam.id },
        attributes: ["question_id"],
        raw: true,
      });
      questionIds = examQuestionsLinks.map((link: any) => link.question_id);
    } catch (e) {
      console.log("⚠️ Bảng ExamQuestionLink chưa sẵn sàng, bỏ qua.");
    }

    // Bước 2: Xây dựng điều kiện lọc (QUAN TRỌNG)
    let whereCondition: any = {};

    if (questionIds.length > 0) {
      // TRƯỜNG HỢP 1: Có gán câu hỏi cụ thể -> Lấy đúng câu đó
      console.log(`Lấy ${questionIds.length} câu hỏi được gán.`);
      whereCondition = { id: { [Op.in]: questionIds } };
    } else {
      // TRƯỜNG HỢP 2 (CƠ CHẾ CŨ): Không gán câu nào -> Lấy theo Topic của bài thi
      console.log(
        `Không gán câu hỏi. Lấy tự động theo Topic ID: ${exam.topic_id}`
      );
      whereCondition = { topic_id: exam.topic_id };
    }

    // [LOGIC MỚI]: Kiểm tra cấu hình đảo câu hỏi
    const orderQuery: any = (exam as any).shuffle_questions
      ? Sequelize.literal("RAND()")
      : [["id", "ASC"]];

    const questions = await ExamQuestion.findAll({
      order: orderQuery, // <--- Áp dụng order
      limit: exam.numberQuestion, // Giới hạn số câu theo cấu hình đề thi
      where: whereCondition, // <--- Dùng biến điều kiện linh hoạt này
      attributes: ["id", "name", "type", "choice", "correctAns"],
      raw: true,
    });

    if (!questions || questions.length === 0) {
      return res
        .status(400)
        .json("Bài thi này chưa có câu hỏi nào (Kho câu hỏi trống).");
    }

    // Chuẩn bị dữ liệu lưu (Có đảo đáp án nếu cần)
    const saveQuestion = questions.map((question: any) => {
      let { choice, correctAns, ...rest } = question;
      choice = typeof choice === "string" ? JSON.parse(choice) : choice;
      correctAns =
        typeof correctAns === "string" ? JSON.parse(correctAns) : correctAns;

      // [LOGIC MỚI]: Kiểm tra cấu hình đảo đáp án
      if ((exam as any).shuffle_answers) {
        choice = _.shuffle(choice); // Đảo trộn thứ tự đáp án (A, B, C, D)
      }

      return { ...rest, choice, correctAns, answer: [], isCorrect: false };
    });

    // Dữ liệu trả về (Ẩn đáp án đúng)
    const dataQuestion = saveQuestion.map((q: any) => {
      const { correctAns, isCorrect, ...rest } = q;
      return rest;
    });

    const subimt = await ExamResult.create({
      student_id: user.id,
      exam_id: exam.id,
      detailResult: saveQuestion,
    });

    return res.json({ test: subimt.id, dataQuestion });
  } catch (error: any) {
    console.error("Lỗi AttendExam:", error);
    return res.status(500).json(error.message);
  }
};
// ... (SubmitExam, ExamHaveDone giữ nguyên logic chính) ...
// File: controllers/Exam.controller.ts

export const SubmitExam = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const result_id = req.params.result_id;
    const { answers } = req.body; // Lấy đáp án gửi lên

    const result = await ExamResult.findOne({
      where: { id: result_id, student_id: user.id },
    });

    if (!result) return res.status(400).json("Bài làm không hợp lệ!");
    if (result.submitAt) return res.status(403).json("Bài đã nộp rồi!");

    const exam = await Exam.findByPk(result.exam_id);
    if (!exam) return res.status(404).json("Bài thi không tồn tại!");

    // --- LOGIC CHẤM ĐIỂM (Chạy luôn dù quá giờ hay không) ---
    // (Bỏ qua đoạn check grace period trả về lỗi, cứ chấm điểm bình thường)
    
    let detailResult: any[] = [];
    try {
        detailResult = typeof result.detailResult === "string" 
            ? JSON.parse(result.detailResult) 
            : result.detailResult || [];
    } catch (e) { detailResult = [] }

    if (!Array.isArray(detailResult)) detailResult = [];

    let correctCount = 0;

    // Chấm điểm từng câu
    const newDetail = detailResult.map((check: any) => {
        // Tìm câu trả lời tương ứng từ frontend gửi lên
        // answers có dạng: [{id: 1, selectedAns: [...]}, ...]
        const userSubmit = answers?.find((a: any) => a.id === check.id);
        const userAns = userSubmit ? userSubmit.selectedAns : [];

        let isCorrect = false;
        if (userAns && userAns.length > 0) {
            // So sánh đáp án
            if (isEqualArrays(userAns, check.correctAns)) {
                correctCount++;
                isCorrect = true;
            }
        }

        // QUAN TRỌNG: Lưu lại đáp án người dùng đã chọn
        return { 
            ...check, 
            answer: userAns, // <--- LƯU CÁI NÀY
            isCorrect: isCorrect 
        };
    });

    // Tính điểm
    let finalPoint = 0;
    if (exam.numberQuestion > 0) {
        finalPoint = (correctCount / exam.numberQuestion) * 10;
        finalPoint = Math.round(finalPoint * 100) / 100;
    }

    // Check pass/fail (Cần ép kiểu any nếu TS báo lỗi passingScore)
    const isPass = finalPoint >= (exam as any).passingScore;

    // Cập nhật DB
    await result.update({
        point: finalPoint,
        isPass: isPass,
        correctAns: correctCount,
        detailResult: newDetail, // Lưu chi tiết chấm điểm
        submitAt: new Date(), // Thời gian nộp hiện tại
    });

    // Trả về kết quả
    let { createdAt, submitAt, ...rest } = result.dataValues as any;
    createdAt = changeTime(createdAt);
    submitAt = changeTime(submitAt);

    return res.json({ 
        ...rest, 
        detailResult: newDetail, // Trả về mảng đã chấm
        createdAt, 
        submitAt 
    });

  } catch (error: any) {
    console.error("Lỗi Submit:", error);
    return res.status(500).json(error.message);
  }
};
export const ExamHaveDone = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    let {
      limit = 10,
      page = 1,
      key_name = "",
      topic_id = null,
      student_id,
    } = req.query;

    page = parseInt(page as string);
    limit = parseInt(limit as string);
    const offset = (page - 1) * limit;

    // 1. Xác định student_id
    if (user.role === 0) {
      student_id = user.id;
    } else {
      if (!student_id) {
        return res.status(400).json("Chọn sinh viên muốn xem");
      }
    }

    // ===> LOGIC 1: QUÉT VÀ ĐÓNG BÀI THI HẾT HẠN (LAZY UPDATE) <===
    // Trước khi lấy danh sách, phải dọn dẹp các bài "Zombie" của học viên này
    if (student_id) {
      const unfinishedResults = await ExamResult.findAll({
        where: {
          student_id: student_id,
          submitAt: null, // Tìm bài chưa nộp
        },
        include: [{ model: Exam, as: "exam", attributes: ["submitTime"] }],
      });

      const currentTime = Date.now();

      await Promise.all(
        unfinishedResults.map(async (result: any) => {
          if (result.exam) {
            const examDurationMs = result.exam.submitTime * 60 * 1000;
            const startTime = new Date(result.createdAt).getTime();

            // Cho phép trễ 1 phút
            const endTime = startTime + examDurationMs + 60000;

            // Nếu thực tế đã quá hạn -> Đóng ngay lập tức
            if (currentTime > endTime) {
              await result.update({
                submitAt: new Date(endTime),
                point: 0,
                isPass: false,
                // Lưu ý: Không cần update detailResult ở đây vì để nguyên vẫn xem được lịch sử
              });
            }
          }
        })
      );
    }
    // =============================================================

    // Điều kiện tìm kiếm
    const whereCondition: any = {
      [Op.or]: [{ name: { [Op.like]: `%${key_name}%` } }],
    };

    if (topic_id) {
      whereCondition.topic_id = topic_id;
    }

    // ===> LOGIC 2: CHECK TRẠNG THÁI BÀI THI <===
    // Nếu là học viên, không hiển thị bài thi bị Ẩn (status = 0)
    if (user && user.role === 0) {
      whereCondition.status = { [Op.in]: [1, 2] }; // Chỉ lấy Active (1) hoặc Locked (2)
    }
    // ===========================================

    // Query chính
    const { count, rows: exams } = await Exam.findAndCountAll({
      limit,
      offset,
      where: whereCondition,
      include: [
        {
          model: ExamResult,
          as: "result",
          where: { student_id },
          attributes: [], // Chỉ filter, không select
        },
        {
          model: Topic,
          as: "topic",
          attributes: ["id", "name", "slug"],
        },
      ],
      attributes: [
        "id",
        "name",
        "slug",
        "passingScore",
        "numberQuestion",
        "submitTime",
        "reDoTime",
        "studentDid",
        "createdAt",
        "updatedAt",
        "status", // Thêm status
        "start_date", // Thêm ngày bắt đầu
        "end_date", // Thêm ngày kết thúc
      ],
      group: ["Exam.id"],
    });

    let format = exams.map((item: any) => {
      let { createdAt, updatedAt, ...rest } = item.get({ plain: true });
      createdAt = changeTime(createdAt);
      updatedAt = changeTime(updatedAt);
      return { ...rest, createdAt, updatedAt };
    });

    return res.json({ count: count.length, exams: format });
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

export const ListQuestionBank = async (req: Request, res: Response) => {
  try {
    let {
      limit = 10,
      page = 1,
      key_name = "",
      topic_id = null,
      type = null,
    } = req.query;

    // Chuyển đổi kiểu dữ liệu
    page = parseInt(page as string);
    limit = parseInt(limit as string);
    const offset = (page - 1) * limit;

    // Xây dựng điều kiện lọc (Where clause)
    const whereCondition: any = {
      // Tìm kiếm theo tên câu hỏi (dùng like)
      name: { [Op.like]: `%${key_name}%` },
    };

    // Nếu có lọc theo chủ đề
    if (topic_id && topic_id !== "null" && topic_id !== "") {
      whereCondition.topic_id = topic_id;
    }
    // Nếu có lọc theo loại (radio/checkbox)
    if (type) {
      whereCondition.type = type;
    }

    // Query DB bảng question
    const { count, rows: questions } = await ExamQuestion.findAndCountAll({
      limit,
      offset,
      where: whereCondition,
      attributes: ["id", "name", "type", "choice", "correctAns", "topic_id"],
      include: [{ model: Topic, as: "topic", attributes: ["id", "name"] }],
      order: [["id", "DESC"]], // Câu mới nhất lên đầu
      raw: true,
      nest: true, // Để gom dữ liệu topic vào object con
    });

    // Parse JSON cho các trường choice và correctAns (vì lưu chuỗi trong DB)
    const format = questions.map((question: any) => {
      let { choice, correctAns, ...rest } = question;
      try {
        choice = typeof choice === "string" ? JSON.parse(choice) : choice;
        correctAns =
          typeof correctAns === "string" ? JSON.parse(correctAns) : correctAns;
      } catch (e) {
        // Fallback nếu dữ liệu không phải JSON chuẩn
        choice = [];
        correctAns = [];
      }
      return { ...rest, choice, correctAns };
    });

    return res.json({ count, questions: format });
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

export const CreateQuestionBank = async (req: Request, res: Response) => {
  try {
    const { name, type, choice, correctAns, topic_id } = req.body;

    // 1. Validate dữ liệu
    if (!name || !type) {
      return res.status(400).json("Thiếu thông tin bắt buộc");
    }

    // 2. Chuyển đổi Array -> JSON String trước khi lưu
    // Nếu choice là mảng thì stringify, nếu là string rồi thì giữ nguyên
    const choiceData = Array.isArray(choice) ? JSON.stringify(choice) : choice;
    const correctAnsData = Array.isArray(correctAns)
      ? JSON.stringify(correctAns)
      : correctAns;

    // 3. Tạo câu hỏi
    await ExamQuestion.create({
      name,
      type,
      choice: choiceData, // Lưu dạng chuỗi JSON
      correctAns: correctAnsData, // Lưu dạng chuỗi JSON
      topic_id: topic_id || null,
    });

    return res.json("Tạo câu hỏi thành công!");
  } catch (error: any) {
    // QUAN TRỌNG: In lỗi ra Terminal để debug xem nó bị gì
    console.error("LỖI CREATE QUESTION:", error);
    return res.status(500).json(error.message);
  }
};

export const AddExistingQuestionsToExam = async (
  req: Request,
  res: Response
) => {
  try {
    // 1. Lấy slug bài thi từ URL và danh sách ID câu hỏi từ Body
    const examSlug = req.params.exam_id;
    const { question_ids } = req.body; // Frontend gửi lên: { question_ids: [1, 5, 10] }

    // 2. Tìm bài thi để lấy ID thực (exam.id)
    const exam = await Exam.findOne({ where: { slug: examSlug } });
    if (!exam) {
      return res.status(404).json("Bài thi không tồn tại");
    }

    // 3. Validate dữ liệu đầu vào
    if (
      !question_ids ||
      !Array.isArray(question_ids) ||
      question_ids.length === 0
    ) {
      return res.status(400).json("Vui lòng chọn ít nhất một câu hỏi");
    }

    // 4. Chuẩn bị dữ liệu để chèn vào bảng trung gian (exam_questions)
    const dataToInsert = question_ids.map((qId: number) => ({
      exam_id: exam.id,
      question_id: qId,
      point: 0, // Điểm mặc định, có thể sửa sau
    }));

    // 5. Chèn vào DB
    // ignoreDuplicates: true -> Nếu câu hỏi đã có trong bài thi rồi thì bỏ qua, không báo lỗi
    await ExamQuestionLink.bulkCreate(dataToInsert, { ignoreDuplicates: true });

    return res.json("Đã thêm câu hỏi vào bài thi thành công!");
  } catch (error: any) {
    console.error("Lỗi thêm câu hỏi vào bài thi:", error);
    return res.status(500).json(error.message);
  }
};

export const SaveDraft = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const result_id = req.params.result_id;
    const { answers } = req.body;

    // 1. VALIDATE INPUT (Chặn ngay nếu input rác)
    if (!answers || !Array.isArray(answers)) {
      return res
        .status(400)
        .json("Dữ liệu gửi lên không hợp lệ (answers phải là mảng)");
    }

    const result: any = await ExamResult.findOne({
      where: { id: result_id, student_id: user.id },
    });

    if (!result) return res.status(404).json("Bài làm không tồn tại");
    if (result.submitAt) {
      return res.status(403).json("Bài đã nộp, không thể lưu nháp");
    }

    // 2. PARSE DATA TỪ DB
    let currentDetail = [];
    try {
      currentDetail =
        typeof result.detailResult === "string"
          ? JSON.parse(result.detailResult)
          : result.detailResult || [];
    } catch (e) {
      currentDetail = [];
    }

    if (!Array.isArray(currentDetail)) {
      currentDetail = [];
    }

    // 3. LOGIC CẬP NHẬT (AN TOÀN TUYỆT ĐỐI)
    const updatedDetail = currentDetail.map((item: any) => {
      // [FIX QUAN TRỌNG 1]: Nếu item trong DB bị null/undefined -> Bỏ qua, trả về nguyên bản (hoặc null) để không crash
      if (!item || typeof item !== "object") return item;

      // [FIX QUAN TRỌNG 2]: Tìm trong mảng answers gửi lên
      // Phải kiểm tra (a) tồn tại trước khi đọc (a.id)
      const newAns = answers.find((a: any) => a && a.id === item.id);

      if (newAns) {
        // Cập nhật câu trả lời
        return { ...item, answer: newAns.selectedAns || [] };
      }

      return item; // Không có thay đổi
    });

    // 4. LƯU LẠI VÀO DB
    await result.update({
      detailResult: updatedDetail,
    });

    return res.json("Lưu nháp thành công");
  } catch (error: any) {
    console.error("LỖI SAVE DRAFT:", error); // Log ra server để debug nếu cần
    return res.status(500).json({
      message: "Lỗi Server khi lưu nháp",
      error: error.message,
    });
  }
};

// File: controllers/Exam.controller.ts

// 1. Thêm học viên vào bài thi (bằng Email)
export const AddStudentToExam = async (req: Request, res: Response) => {
  try {
    const { exam_id } = req.params; // Đây là slug hoặc id của bài thi
    const { email } = req.body;

    // Tìm bài thi
    const exam = await Exam.findOne({ where: { slug: exam_id } });
    if (!exam) return res.status(404).json("Bài thi không tồn tại");

    // Tìm học viên
    const student = await Student.findOne({ where: { email } });
    if (!student) return res.status(404).json("Không tìm thấy học viên với email này");

    // Tạo lượt thi mới (Coi như đăng ký)
    await ExamResult.create({
      exam_id: exam.id,
      student_id: student.id,
      point: 0,
      isPass: false,
      detailResult: [], // Mảng rỗng
      // submitAt: null -> Nghĩa là đang làm/chưa nộp
    });

    return res.json("Thêm học viên vào bài thi thành công!");
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

// 2. Xóa học viên khỏi bài thi (Xóa lượt thi)
export const RemoveStudentFromExam = async (req: Request, res: Response) => {
  try {
    const { result_id } = req.params;

    const result = await ExamResult.findByPk(result_id);
    if (!result) return res.status(404).json("Dữ liệu không tồn tại");

    await result.destroy();

    return res.json("Đã xóa học viên khỏi bài thi");
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

// File: controllers/Exam.controller.ts

// Lấy danh sách học viên (Unique) trong bài thi
// File: controllers/Exam.controller.ts

export const GetUniqueStudentsInExam = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    let { limit = 10, page = 1, key_name = "" } = req.query;
    
    page = parseInt(page as string);
    limit = parseInt(limit as string);
    const offset = (page - 1) * limit;

    const exam = await Exam.findOne({ where: { slug } });
    if (!exam) return res.status(404).json("Bài thi không tồn tại");

    // Query lấy danh sách học viên
    const { count, rows } = await ExamResult.findAndCountAll({
      where: { exam_id: exam.id },
      attributes: [
        "student_id",
        // ===> SỬA Ở ĐÂY: Thêm tên bảng 'ExamResult' trước dấu chấm <===
        [
          Sequelize.literal(
            "SUM(CASE WHEN submitAt IS NOT NULL THEN 1 ELSE 0 END)"
          ),
          "total_attempts",
        ],
        [Sequelize.fn("MAX", Sequelize.col("submitAt")), "last_submit"],
      ],
      include: [
        {
          model: Student,
          as: "student",
          attributes: ["id", "fullName", "email"],
          where: {
            fullName: { [Op.like]: `%${key_name}%` },
          },
        },
      ],
      group: ["student_id"],
      limit,
      offset,
      nest: true,
      raw: true,
    });

    // Fix lỗi count khi dùng group by (Sequelize trả về mảng object count thay vì số)
    const totalCount = Array.isArray(count) ? count.length : count;

    return res.json({ count: totalCount, students: rows });
  } catch (error: any) {
    console.error("Lỗi lấy danh sách học viên:", error);
    return res.status(500).json(error.message);
  }
};

// Cập nhật API Xóa: Xóa TẤT CẢ lần thi của học viên đó khỏi bài thi này
export const RemoveStudentAllAttempts = async (req: Request, res: Response) => {
    try {
      const { exam_id, student_id } = req.params;
  
      // Tìm ID bài thi
      const exam = await Exam.findOne({ where: { slug: exam_id } });
      if(!exam) return res.status(404).json("Exam not found");

      // Xóa tất cả record của học viên này trong bài thi này
      await ExamResult.destroy({
          where: {
              exam_id: exam.id,
              student_id: student_id
          }
      });
  
      return res.json("Đã xóa học viên ra khỏi bài thi (bao gồm mọi lịch sử làm bài)");
    } catch (error: any) {
      return res.status(500).json(error.message);
    }
  };
// File: controllers/Exam.controller.ts

// API Tìm kiếm học viên để thêm vào lớp
export const SearchStudentToAdd = async (req: Request, res: Response) => {
  try {
    const { key_name = "" } = req.query;

    // Tìm trong bảng Student
    // Điều kiện: Tên chứa key_name HOẶC Email chứa key_name
    const students = await Student.findAll({
      where: {
        [Op.or]: [
          { fullName: { [Op.like]: `%${key_name}%` } },
          { email: { [Op.like]: `%${key_name}%` } }
        ]
      },
      attributes: ['id', 'fullName', 'email', 'avatar'], // Chỉ lấy thông tin cần thiết
      limit: 5 // Giới hạn 5 kết quả để hiển thị cho gọn
    });

    return res.json({ students });
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

// File: controllers/Exam.controller.ts
// Bạn cần import Model Topic ở đầu file để check dữ liệu
// import { Topic } from '../models'; 

export const ImportQuestions = async (req: Request, res: Response) => {
  const file = req.file; 
  if (!file) return res.status(400).json("Vui lòng tải lên file Excel!");

  try {
    // 1. Đọc file từ buffer
    const workbook = XLSX.read(file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0]; 
    const worksheet = workbook.Sheets[sheetName];
    
    // 2. Chuyển đổi sang JSON
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);

    if (rawData.length === 0) {
        return res.status(400).json("File Excel rỗng!");
    }

    // 3. Chuẩn hóa & Validate dữ liệu
    const questionsToCreate: any[] = [];
    const errors: string[] = [];

    rawData.forEach((row: any, index: number) => {
        const name = row["Câu hỏi"];
        const typeRaw = row["Loại"] || "radio"; 
        
        // Lấy Topic ID từ Excel, nếu rỗng thì là null
        let topicId = row["ID Chủ đề"] ? parseInt(row["ID Chủ đề"]) : null;
        
        const choices: string[] = [];
        if (row["A"]) choices.push(String(row["A"]));
        if (row["B"]) choices.push(String(row["B"]));
        if (row["C"]) choices.push(String(row["C"]));
        if (row["D"]) choices.push(String(row["D"]));
        if (row["E"]) choices.push(String(row["E"]));

        const correctRaw = row["Đáp án đúng"] ? String(row["Đáp án đúng"]) : ""; 
        
        // --- Validate cơ bản ---
        if (!name || choices.length < 2 || !correctRaw) {
            errors.push(`Dòng ${index + 2}: Thiếu thông tin bắt buộc.`);
            return;
        }

        // Xử lý đáp án đúng
        const correctArr = correctRaw.split(',').map(s => s.trim().toUpperCase());
        const correctValues: string[] = [];
        
        correctArr.forEach(char => {
            let idx = -1;
            if (char === 'A') idx = 0;
            else if (char === 'B') idx = 1;
            else if (char === 'C') idx = 2;
            else if (char === 'D') idx = 3;
            else if (char === 'E') idx = 4;

            if (idx !== -1 && choices[idx]) {
                correctValues.push(choices[idx]);
            }
        });

        if (correctValues.length === 0) {
            errors.push(`Dòng ${index + 2}: Đáp án đúng không hợp lệ.`);
            return;
        }

        questionsToCreate.push({
            name,
            type: typeRaw.toLowerCase() === 'nhiều' ? 'checkbox' : 'radio',
            choice: JSON.stringify(choices),
            correctAns: JSON.stringify(correctValues),
            topic_id: topicId // Tạm thời lưu ID lấy từ Excel
        });
    });

    if (errors.length > 0) {
        return res.status(400).json({ message: "Lỗi dữ liệu", errors });
    }

    // ============================================================
    // 3.5. BƯỚC MỚI: KIỂM TRA & XỬ LÝ TOPIC ID KHÔNG TỒN TẠI
    // ============================================================
    
    // Lấy danh sách tất cả topic_id có trong file Excel (loại bỏ null/undefined)
    const distinctTopicIds = [...new Set(questionsToCreate
        .map(q => q.topic_id)
        .filter(id => id !== null && id !== undefined && !isNaN(id))
    )];

    if (distinctTopicIds.length > 0) {
        // Tìm trong DB xem những ID nào THỰC SỰ tồn tại
        // Giả sử Model của bạn tên là Topic
        const existingTopics = await Topic.findAll({
            where: {
                id: distinctTopicIds
            },
            attributes: ['id'],
            raw: true
        });

        const validIds = existingTopics.map((t: any) => t.id);

        // Duyệt lại danh sách câu hỏi, nếu topic_id không nằm trong validIds -> Set về NULL
        questionsToCreate.forEach(q => {
            if (q.topic_id && !validIds.includes(q.topic_id)) {
                // Topic ID này có trong Excel nhưng không có trong DB -> Gán NULL để tránh lỗi 500
                q.topic_id = null; 
            }
        });
    }
    // ============================================================

    // 4. Lưu vào DB (Bulk Create)
    await ExamQuestion.bulkCreate(questionsToCreate);

    return res.json({ 
        message: "Import thành công!", 
        count: questionsToCreate.length 
    });

  } catch (error: any) {
    console.error("Lỗi Import:", error);
    return res.status(500).json("Lỗi server khi đọc file.");
  }
};



export const PreviewVariations = async (req: Request, res: Response) => {
  try {
    // Client gửi lên: { originalQuestion: {...}, quantity: 3 }
    const { originalQuestion, quantity } = req.body;

    // Validate dữ liệu đầu vào
    if (!originalQuestion || !originalQuestion.name) {
      return res.status(400).json({ message: "Thiếu thông tin câu hỏi gốc!" });
    }

    // Parse choice và correctAns nếu client gửi dạng Stringified JSON
    // (Vì DB của bạn lưu dạng chuỗi "[...]", nên cần check để parse ra Array cho AI dễ đọc)
    let cleanQuestion = { ...originalQuestion };

    if (typeof cleanQuestion.choice === "string") {
      try {
        cleanQuestion.choice = JSON.parse(cleanQuestion.choice);
      } catch (e) {}
    }
    if (typeof cleanQuestion.correctAns === "string") {
      try {
        cleanQuestion.correctAns = JSON.parse(cleanQuestion.correctAns);
      } catch (e) {}
    }

    // Gọi AI Service
    const variations = await GenerateQuiz(cleanQuestion, quantity || 3);

    if (!variations) {
      return res
        .status(500)
        .json({ message: "Không thể tạo câu hỏi lúc này. Thử lại sau." });
    }

    // Trả về kết quả cho Frontend Preview
    return res.json({
      message: "Sinh câu hỏi thành công!",
      data: variations,
    });
  } catch (error) {
    console.error("Preview Controller Error:", error);
    return res.status(500).json({ message: "Lỗi Server" });
  }
};

export const GetExplanation = async (req: Request, res: Response) => {
  try {
    // Client gửi lên toàn bộ object câu hỏi để đỡ phải query lại DB
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ message: "Thiếu dữ liệu câu hỏi" });
    }

    const result = await ExplainQuestion(question);

    if (!result)
      return res.status(500).json({ message: "AI đang bận, thử lại sau." });

    return res.status(200).json({ data: result });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi Server" });
  }
};

export const MonitorExamSession = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { image, examId } = req.body;

    if (!user || !user.id)
      return res.status(401).json({ message: "Unauthorized" });
    if (!image) return res.status(400).json({ message: "Thiếu ảnh" });

    // 1. Chuẩn bị ảnh Base64
    const cleanBase64 = image.replace(
      /^data:image\/(png|jpeg|jpg);base64,/,
      ""
    );

    // 2. Gọi AI phân tích
    const analysis = await AnalyzeExamImage(cleanBase64);

    // 3. Nếu VI PHẠM -> Lưu ảnh và Ghi vào DB
    if (analysis.is_suspicious) {
      try {
        // --- XỬ LÝ LƯU ẢNH RA FILE ---

        // Tạo tên file duy nhất: studentId_thời-gian.jpg
        const fileName = `violation_${user.id}_${Date.now()}.jpg`;

        // Đường dẫn thư mục lưu (Ví dụ: lưu vào folder 'uploads/violations' ở root dự án)
        const uploadDir = path.join(__dirname, "../../uploads/violations"); // Tuỳ chỉnh đường dẫn cho đúng folder dự án

        // Kiểm tra nếu chưa có thư mục thì tạo mới
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Ghi file ảnh
        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, cleanBase64, "base64");

        // Đường dẫn web để xem ảnh (Lưu cái này vào DB)
        // Ví dụ frontend truy cập: http://localhost:3000/uploads/violations/ten_file.jpg
        const evidenceUrl = `/uploads/violations/${fileName}`;

        // -----------------------------

        // Tìm Exam ID thật (như code trước)
        let realExamId = null;
        if (examId) {
          const resultRecord = await ExamResult.findByPk(examId);
          if (resultRecord) realExamId = resultRecord.exam_id;
          else {
            const examRecord = await Exam.findByPk(examId);
            if (examRecord) realExamId = examId;
          }
        }

        // Map loại lỗi
        const validTypes = [
          "cheating_tab_switch",
          "face_missing",
          "multiple_faces",
          "detect_phone",
          "rude_comment",
          "other",
        ];
        let dbType = analysis.violation_type;
        if (!validTypes.includes(dbType)) dbType = "other";

        // Lưu vào DB kèm LINK ẢNH
        await ViolationHistory.create({
          student_id: user.id,
          exam_id: realExamId,
          type: dbType,
          description: analysis.message,
          severity: "warning",
          detectedAt: new Date(),
          evidence_image: evidenceUrl, // <--- ĐÃ LƯU ĐƯỢC ẢNH
        });

        console.log(`✅ Đã lưu bằng chứng vi phạm: ${evidenceUrl}`);
      } catch (dbError: any) {
        console.error("❌ Lỗi lưu dữ liệu:", dbError.message);
      }
    }

    return res.status(200).json({ data: analysis });
  } catch (error) {
    console.error("Lỗi Server:", error);
    return res.status(500).json({ message: "Lỗi Server" });
  }
};

export const GetExamViolations = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params; // Lấy slug từ URL

    // 1. Tìm bài thi theo slug để lấy ID
    const exam = await Exam.findOne({ where: { slug } });
    if (!exam) return res.status(404).json("Bài thi không tồn tại");

    // 2. Query bảng violation_history kèm thông tin sinh viên
    const violations = await ViolationHistory.findAll({
      where: { exam_id: exam.id },
      include: [
        {
          model: Student,
          as: "student",
          attributes: ["id", "fullName", "email", "avatar"], // Lấy thông tin cần thiết
        },
      ],
      order: [["detectedAt", "DESC"]], // Mới nhất lên đầu
    });

    return res.json({
      count: violations.length,
      data: violations,
    });
  } catch (error: any) {
    console.error("Lỗi lấy lịch sử vi phạm:", error);
    return res.status(500).json(error.message);
  }
};