import { Request, Response } from "express";
import Survey from "../models/Survey.Model";
import SurveyQuestion from "../models/SurveyQuestion.Model";
import SurveyQuestionBank from "../models/SurveyQuestionBank.Model"; // Import mới
import SurveyAnswer from "../models/SurveyAnswer.Model"; // Import mới
import SurveyAttend from "../models/SurveyAttend.Model";
import Student from "../models/Student.Model";
import { Op } from "sequelize";
import { convertString } from "../helpers/convertToSlug";
import { changeTime } from "../helpers/formatTime";

// --- GET LIST SURVEY (Giữ nguyên logic cũ, chỉ clean code) ---
export const GetListSurvey = async (req: Request, res: Response) => {
  try {
    let { limit = 10, page = 1, key_name = "" } = req.query;
    const user = (req as any).user;
    page = parseInt(page as string);
    limit = parseInt(limit as string);
    const offset = (page - 1) * limit;

    let includeOptions: any[] = [];
    if (user.role === 0) {
      includeOptions.push({
        model: SurveyAttend,
        as: "attend",
        required: false,
        where: { student_id: user.id },
        attributes: ["id"],
      });
    }

    const whereCondition: any = {
      name: { [Op.like]: `%${key_name}%` },
    };

    if (user.role === 0) {
      whereCondition.status = { [Op.in]: ["active", "locked"] };
      whereCondition.dueAt = {
        [Op.gt]: new Date(), // Op.gt = Greater Than (Lớn hơn)
      };
    }

    const { count, rows: surveys } = await Survey.findAndCountAll({
      limit,
      offset,
      where: whereCondition,
      attributes: ["id", "name", "slug", "dueAt", "createdAt", "status",],
      include: includeOptions,
      distinct: true, // Quan trọng để đếm đúng khi join
    });

    // Map data
    const survey_detail = await Promise.all(
      surveys.map(async (survey: any) => {
        const plainSurvey = survey.get({ plain: true }); // Sequelize helper
        const attended = plainSurvey.attend && plainSurvey.attend.length > 0;

        const studentCount = await SurveyAttend.count({
          where: { survey_id: survey.id },
        });
        const isExpired = new Date(plainSurvey.dueAt).getTime() < Date.now();

        return {
          ...plainSurvey,
          attend: attended ? plainSurvey.attend[0].id : null,
          isExpired,
          participated: studentCount,
          createdAt: changeTime(plainSurvey.createdAt),
          dueAt: changeTime(plainSurvey.dueAt),
        };
      })
    );
    return res.json({ count, surveys: survey_detail });
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

// --- DETAIL SURVEY (SỬA NHIỀU: Cần Join với QuestionBank để lấy tên câu hỏi) ---
export const DetailSurvey = async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug;
    const survey = await Survey.findOne({ where: { slug }, raw: true });

    if (!survey)
      return res.status(404).json({ error: "Bài khảo sát không tồn tại!" });

    const participated = await SurveyAttend.count({
      where: { survey_id: survey.id },
    });

    // Lấy danh sách câu hỏi KÈM nội dung từ Bank
    const questions = await SurveyQuestion.findAll({
      where: { survey_id: survey.id },
      include: [
        {
          model: SurveyQuestionBank,
          as: "question_data", // Alias đã đặt trong Model
          attributes: ["id", "content", "type"],
        },
      ],
      attributes: ["id"], // Chỉ lấy ID của bảng trung gian
    });

    // Format lại dữ liệu trả về cho gọn
    const formattedQuestions = questions.map((q: any) => ({
      survey_question_id: q.id,
      bank_id: q.question_data.id,
      content: q.question_data.content,
      type: q.question_data.type,
    }));

    return res.json({
      survey: {
        ...survey,
        dueAt: changeTime(survey.dueAt.toString()),
        createdAt: changeTime(survey.createdAt.toString()),
        numberQuestion: questions.length,
        participated,
      },
      questions: formattedQuestions,
    });
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

// --- TAKE SURVEY (SỬA NHIỀU: Lưu vào bảng SurveyAnswer) ---
export const TakeSurvey = async (req: Request, res: Response) => {
  try {
    const survey_id = req.params.survey_id;
    const user = (req as any).user;

    // answers format: [{ bank_id: 1, value: 5, text: "" }, ...]
    const { answers } = req.body;

    const survey = await Survey.findByPk(survey_id);
    if (!survey) return res.status(404).json("Khảo sát không tồn tại!");

    // Kiểm tra đã làm chưa
    const hadAttended = await SurveyAttend.findOne({
      where: { student_id: user.id, survey_id },
    });
    if (hadAttended)
      return res.status(401).json("Bạn đã thực hiện bài khảo sát này rồi!");

    // 1. Tạo lượt tham gia (Attend)
    const newAttend = await SurveyAttend.create({
      student_id: user.id,
      survey_id: survey_id,
    });

    // 2. Tạo chi tiết câu trả lời (Answer)
    if (answers && answers.length > 0) {
      const answerRecords = answers.map((ans: any) => ({
        survey_attend_id: newAttend.id,
        question_bank_id: ans.bank_id, // ID của câu hỏi trong Bank
        score: typeof ans.value === "number" ? ans.value : null, // Nếu là rating
        text_answer: typeof ans.value === "string" ? ans.value : null, // Nếu là text
      }));

      await SurveyAnswer.bulkCreate(answerRecords);
    }

    return res.json("Nộp bài khảo sát thành công!");
  } catch (error: any) {
    console.error(error);
    return res.status(500).json(error.message);
  }
};

// --- CREATE SURVEY ---
export const CreateSurvey = async (req: Request, res: Response) => {
  try {
    const {
      name,
      // Mặc định status là active nếu không gửi lên
      status = "active", 
      dueAt = new Date(new Date().setDate(new Date().getDate() + 7)),
      list_question_ids,
    } = req.body;

    const exist = await Survey.findOne({ where: { name } });
    if (exist)
      return res.status(409).json({ error: "Tên khảo sát đã tồn tại!" });

    const slug = convertString(name);

    // 1. Tạo Survey (Thêm trường status vào đây)
    const survey = await Survey.create({ name, slug, dueAt, status });

    // 2. Link câu hỏi từ Bank vào Survey
    if (list_question_ids && list_question_ids.length > 0) {
      const questionRecords = list_question_ids.map((bankId: number) => ({
        survey_id: survey.id,
        question_bank_id: bankId,
      }));
      await SurveyQuestion.bulkCreate(questionRecords);
    }

    return res.json("Thêm khảo sát thành công!");
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

// --- DELETE SURVEY (Giữ nguyên) ---
export const DeleteSurvey = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const survey = await Survey.findByPk(id);
    if (!survey) return res.status(404).json("Khảo sát không tồn tại!");

    // Cascade delete trong DB sẽ tự xóa attend và question liên quan
    await survey.destroy();
    return res.json("Khảo sát được xóa thành công!");
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

// --- GET LIST ATTEND (Giữ nguyên, chỉ optimize query) ---
export const GetListAttendSurvey = async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug;
    const survey = await Survey.findOne({ where: { slug } });
    if (!survey) return res.status(404).json("Khảo sát không tồn tại!");

    const { count, rows: participates } = await SurveyAttend.findAndCountAll({
      where: { survey_id: survey.id },
      attributes: ["id", "createdAt"],
      include: [{ model: Student, as: "student", attributes: ["fullName"] }],
      order: [["createdAt", "DESC"]],
    });

    const reformat = participates.map((item: any) => {
      // Vì dùng findAndCountAll của Sequelize nên cần .get() hoặc cấu hình raw:true cẩn thận
      // Ở đây giả sử item là instance
      const plain = item.get({ plain: true });
      return {
        id: plain.id,
        name: plain.student?.fullName,
        createdAt: changeTime(plain.createdAt),
      };
    });

    return res.json({ count, participates: reformat });
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

// Chèn vào Survey.controller.ts

export const UpdateSurvey = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { 
      name, 
      dueAt, 
      status,
      list_question_ids // Mảng chứa ID các câu hỏi từ Bank: [1, 5, 8...]
    } = req.body;

    // 1. Kiểm tra khảo sát có tồn tại không
    const survey = await Survey.findByPk(id);
    if (!survey) {
      return res.status(404).json("Khảo sát không tồn tại!");
    }

    // 2. Cập nhật thông tin cơ bản (Nếu có gửi lên)
    if (name) {
      // Kiểm tra trùng tên với khảo sát khác (nếu cần)
      const exist = await Survey.findOne({ 
        where: { 
          name, 
          id: { [Op.ne]: id } // id khác id hiện tại
        } 
      });
      if (exist) return res.status(409).json({ error: "Tên khảo sát đã tồn tại!" });

      survey.name = name;
      survey.slug = convertString(name); // Cập nhật lại slug theo tên mới
    }

    if (dueAt) {
      survey.dueAt = dueAt;
    }

    if (status) survey.status = status;

    await survey.save();

    // 3. Cập nhật danh sách câu hỏi (Nếu có gửi danh sách mới)
    // Logic: Xóa hết liên kết cũ -> Tạo liên kết mới (Sync)
    if (list_question_ids && Array.isArray(list_question_ids)) {
      
      // B1: Xóa toàn bộ câu hỏi đang gán cho Survey này
      await SurveyQuestion.destroy({
        where: { survey_id: id }
      });

      // B2: Tạo lại liên kết với danh sách ID mới
      if (list_question_ids.length > 0) {
        const questionRecords = list_question_ids.map((bankId: number) => ({
          survey_id: id,
          question_bank_id: bankId
        }));
        
        await SurveyQuestion.bulkCreate(questionRecords);
      }
    }

    return res.json("Cập nhật khảo sát thành công!");
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

// Thêm 1 câu hỏi vào khảo sát
export const AddQuestionToSurvey = async (req: Request, res: Response) => {
  try {
    const survey_id = req.params.id;
    const { question_bank_id } = req.body;

    // Kiểm tra xem đã tồn tại chưa để tránh trùng
    const exists = await SurveyQuestion.findOne({
      where: { survey_id, question_bank_id }
    });

    if (exists) {
      return res.status(400).json("Câu hỏi này đã có trong bài khảo sát rồi!");
    }

    await SurveyQuestion.create({ survey_id, question_bank_id });
    return res.json("Thêm câu hỏi thành công!");
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

// Xóa 1 câu hỏi khỏi khảo sát
export const RemoveQuestionFromSurvey = async (req: Request, res: Response) => {
  try {
    const survey_id = req.params.id;
    const { question_bank_id } = req.body; // Hoặc lấy từ params tùy bạn

    await SurveyQuestion.destroy({
      where: { survey_id, question_bank_id }
    });
    
    return res.json("Đã xóa câu hỏi khỏi khảo sát!");
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

// Thêm hàm này vào Survey.controller.ts

export const SubmitSurvey = async (req: Request, res: Response) => {
  try {
    const survey_id = req.params.survey_id;
    const user = (req as any).user;
    const { answers } = req.body;

    // 1. Debug: In ra xem Frontend gửi gì lên
    console.log(">>> Payload nhận được:", JSON.stringify(req.body, null, 2));

    // 2. Validate dữ liệu đầu vào
    if (!answers || !Array.isArray(answers)) {
      return res
        .status(400)
        .json("Dữ liệu câu trả lời không hợp lệ (phải là mảng)!");
    }

    const survey = await Survey.findByPk(survey_id);
    if (!survey) return res.status(404).json("Khảo sát không tồn tại!");
    if (survey.status === "hidden") {
      return res.status(403).json("Bài khảo sát này hiện không khả dụng.");
    }
    if (survey.status === "locked") {
      return res
        .status(403)
        .json("Bài khảo sát đã bị khóa, không thể nộp bài.");
    }

    // 3. Kiểm tra đã nộp chưa
    const hadAttended = await SurveyAttend.findOne({
      where: { student_id: user.id, survey_id },
    });
    if (hadAttended) return res.status(401).json("Bạn đã nộp bài rồi!");

    // 4. Tạo lượt nộp (Chú ý: Model SurveyAttend phải có cột submittedAt)
    const newAttend = await SurveyAttend.create({
      student_id: user.id,
      survey_id: survey_id,
      submittedAt: new Date(),
    });

    // 5. Lưu câu trả lời
    if (answers.length > 0) {
      const answerRecords = answers.map((ans: any) => ({
        survey_attend_id: newAttend.id,
        question_bank_id: ans.bank_id,
        score: typeof ans.value === "number" ? ans.value : null,
        text_answer: typeof ans.value === "string" ? ans.value : null,
      }));

      await SurveyAnswer.bulkCreate(answerRecords);
    }

    return res.json("Nộp bài thành công!");
  } catch (error: any) {
    // QUAN TRỌNG: In lỗi chi tiết ra Terminal để bạn đọc
    console.error(">>> LỖI 500 TẠI SUBMIT SURVEY:", error);
    return res.status(500).json(error.message);
  }
};

export const GetAttendDetail = async (req: Request, res: Response) => {
  try {
    const attend_id = req.params.id;

    // 1. Lấy thông tin lượt làm bài
    const attend = await SurveyAttend.findByPk(attend_id, {
      include: [
        { model: Student, as: "student", attributes: ["fullName", "email"] },
      ],
    });

    if (!attend) return res.status(404).json("Không tìm thấy bài làm!");

    // 2. Lấy danh sách câu trả lời
    const answers = await SurveyAnswer.findAll({
      where: { survey_attend_id: attend_id },
      include: [
        {
          model: SurveyQuestionBank,
          as: "question_data", // Alias đã đặt trong Model
          attributes: ["content", "type"],
        },
      ],
    });

    return res.json({ attend, answers });
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

export const GetSurveyAnalytics = async (req: Request, res: Response) => {
  try {
    const survey_id = req.params.id;

    // 1. Kiểm tra khảo sát tồn tại
    const survey = await Survey.findByPk(survey_id);
    if (!survey) return res.status(404).json("Khảo sát không tồn tại!");

    // 2. Lấy danh sách câu hỏi thuộc khảo sát này
    const questions = await SurveyQuestion.findAll({
      where: { survey_id },
      include: [
        {
          model: SurveyQuestionBank,
          as: "question_data",
          attributes: ["id", "content", "type"],
        },
      ],
    });

    // 3. Tính toán thống kê cho từng câu hỏi
    const analytics = await Promise.all(
      questions.map(async (q: any) => {
        const bankId = q.question_data.id;
        const type = q.question_data.type;

        // Query lấy tất cả câu trả lời cho câu hỏi này TRONG khảo sát này
        const answers = await SurveyAnswer.findAll({
          where: { question_bank_id: bankId },
          include: [
            {
              model: SurveyAttend,
              as: "attend", // Đảm bảo model SurveyAnswer có belongsTo SurveyAttend
              where: { survey_id: survey_id },
              attributes: [], // Không cần lấy dữ liệu attend, chỉ cần để lọc
            },
          ],
          attributes: ["score", "text_answer"],
        });

        let stats: any = null;
        const total = answers.length;

        // --- LOGIC TÍNH TOÁN ---
        if (type === "rating") {
          const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
          answers.forEach((ans: any) => {
            if (ans.score && ans.score >= 1 && ans.score <= 5) {
              distribution[ans.score as keyof typeof distribution]++;
            }
          });
          stats = { total, distribution };
        } else if (type === "choice") {
          const distribution = { yes: 0, no: 0 };
          answers.forEach((ans: any) => {
            // Kiểm tra text lưu trong DB (khớp với file LamBaiKhaoSat.vue)
            if (ans.text_answer && ans.text_answer.includes("Có")) {
              distribution.yes++;
            } else {
              distribution.no++;
            }
          });
          stats = { total, distribution };
        } else {
          // Dạng Text: Trả về danh sách các câu trả lời (lọc bỏ rỗng)
          stats = answers
            .map((ans: any) => ans.text_answer)
            .filter((t: string) => t);
        }

        return {
          id: q.id, // ID bảng trung gian
          content: q.question_data.content,
          type: type,
          stats: stats,
        };
      })
    );

    return res.json({ survey_name: survey.name, analytics });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json(error.message);
  }
};