import e, { Request, Response } from "express";

import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { imageUpload } from "../configurations/multer";

import { convertString } from "../helpers/convertToSlug";
import Topic from "../models/Topic.Model";
import Course from "../models/Course.Model";
import Student from "../models/Student.Model";
import CourseSub from "../models/CourseSub.Model";
import CourseLesson from "../models/Course_Lessons.Models";
import { col, fn, Op } from "sequelize";
import { changeTime } from "../helpers/formatTime";
import Lesson from "../models/Lesson.Model";
import { createLessonInternal } from "./Material.controller";
import LessonProgress from "../models/Lesson_progress.Model";
import dayjs from "dayjs";
// --- CREATE COURSE ---
export const CreateCourse = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      topic_id,
      type,
      thumbnail,
      start_date,
      end_date,
      price, // 👇 Lấy thêm giá tiền
      status,
    } = req.body;

    if (!name || !topic_id) {
      return res
        .status(400)
        .json({ message: "Tên khóa học và chủ đề là bắt buộc" });
    }

    const exist = await Course.findOne({ where: { name } });
    if (exist) {
      return res.status(409).json({ message: "Khoá học đã tồn tại!" });
    }

    // Xử lý ngày tháng
    const newStartDate = start_date ? start_date : null;
    const newEndDate = end_date ? end_date : null;

    const slug = convertString(name);

    const newCourse = await Course.create({
      name,
      description,
      slug,
      topic_id,
      type,
      thumbnail: thumbnail || "course.png",
      start_date: newStartDate,
      end_date: newEndDate,
      price: price || 0, // 👇 Lưu giá tiền (mặc định 0)
      status: status || "active",
    });

    return res.status(201).json({
      message: "Tạo khóa học thành công!",
      data: newCourse,
    });
  } catch (error: any) {
    console.error("❌ Lỗi CreateCourse:", error);
    return res.status(500).json({ message: error.message });
  }
};

// --- UPDATE COURSE ---
export const UpdateCourse = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const course = await Course.findByPk(parseInt(id));
    if (!course) {
      return res.status(404).json("Khóa học không tồn tại!");
    }

    const {
      name,
      description,
      type,
      topic_id,
      start_date,
      end_date,
      price, // 👇 Lấy thêm giá tiền
      status,
    } = req.body;

    // Xử lý ngày tháng
    const newStartDate =
      start_date === "" ? null : start_date || course.start_date;
    const newEndDate = end_date === "" ? null : end_date || course.end_date;

    const newName = name || course.name;
    const slug = convertString(newName);

    await course.update({
      name: newName,
      description: description || course.description,
      type: type || course.type,
      topic_id: topic_id || course.topic_id,
      slug,
      start_date: newStartDate,
      end_date: newEndDate,
      price: price !== undefined ? price : course.price, // 👇 Cập nhật giá tiền
      status: status || course.status,
    });

    return res.json({
      status: true,
      message: "Cập nhật thông tin khóa học thành công!",
      data: course,
    });
  } catch (error: any) {
    console.error("Lỗi UpdateCourse:", error);
    return res.status(500).json(error.message);
  }
};

// --- DETAIL COURSE (Quan trọng) ---
export const DetailCourse = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const user = (req as any).user;

    const course = await Course.findOne({
      where: { slug },
      attributes: [
        "id",
        "name",
        "slug",
        "description",
        "thumbnail",
        "type",
        "topic_id",
        "createdAt",
        "updatedAt",
        "start_date",
        "end_date",
        "price", // 👇 Trả về giá tiền cho Frontend hiển thị
        "status",
      ],
      include: [
        { model: Topic, as: "topic", attributes: ["id", "name", "slug"] },
      ],
      raw: true,
      nest: true,
    });

    if (!course) {
      return res
        .status(404)
        .json({ status: false, message: "Khóa học không tồn tại!" });
    }

    if (course.status === "hidden") {
      if (!user || user.role === 0) {
        return res.status(404).json({ message: "Khóa học không tồn tại!" });
      }
    }

    const totalLesson = await CourseLesson.count({
      where: { course_id: course.id },
    });

    let data: any = {
      ...course,
      totalLesson: totalLesson,
      is_registered: false,
      percent: 0,
      completed_lesson_ids: [],
      status_text: "Đang diễn ra",
      is_blocked: false,
    };
    
    if (course.status === "locked") {
      data.status_text = "Tạm khóa / Bảo trì";
      data.is_blocked = true; // Chặn nút vào học
    }
    // Nếu active thì chạy tiếp logic check ngày tháng cũ
    else {
      const now = dayjs();
      const start = course.start_date ? dayjs(course.start_date) : null;
      const end = course.end_date ? dayjs(course.end_date) : null;

      if (!start && !end) {
        data.status_text = "Vĩnh viễn";
      } else if (start && now.isBefore(start)) {
        data.status_text = "Sắp diễn ra";
        data.is_blocked = true;
      } else if (end && now.isAfter(end)) {
        data.status_text = "Đã kết thúc";
        data.is_blocked = true;
      } else {
        data.status_text = "Đang diễn ra";
      }
    }

    // Logic kiểm tra thời gian
   

    // Logic kiểm tra đăng ký
    if (user && user.id) {
      const subscription = await CourseSub.findOne({
        where: { course_id: course.id, student_id: user.id },
        raw: true,
      });

      if (subscription) {
        data.is_registered = true;

        // Lấy danh sách bài đã học
        const completedRecords = await LessonProgress.findAll({
          where: {
            student_id: user.id,
            course_id: course.id,
            is_completed: true,
          },
          attributes: ["lesson_id"],
          raw: true,
        });

        const completedIds = completedRecords.map((r: any) => r.lesson_id);
        data.completed_lesson_ids = completedIds;

        if (totalLesson > 0) {
          let percent = Math.round((completedIds.length / totalLesson) * 100);
          if (percent > 100) percent = 100;
          data.percent = percent;
        }
      }
    }

    return res.json({ status: true, data: data });
  } catch (error: any) {
    console.error("Lỗi DetailCourse:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

// --- COURSE REGISTER (Đăng ký miễn phí) ---
export const CourseRegister = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const slug = req.params.course_slug;

    const course = await Course.findOne({ where: { slug } });
    if (!course) {
      return res.status(404).json({ message: "Khóa học không tồn tại!" });
    }

    // 👇 Chặn nếu khóa học có tính phí
    if (course.price > 0) {
      return res
        .status(402)
        .json({ message: "Khóa học này có phí, vui lòng thanh toán!" });
    }

    // Chặn nếu khóa học đặc biệt (Admin only - logic cũ của bạn)
    if (course.type) {
      return res.status(403).json({ message: "Khóa học này cần cấp quyền!" });
    }

    // Kiểm tra trùng
    const existingSub = await CourseSub.findOne({
      where: { student_id: user.id, course_id: course.id },
    });

    if (existingSub) {
      return res
        .status(400)
        .json({ message: "Bạn đã đăng ký khóa học này rồi!" });
    }

    await CourseSub.create({
      student_id: user.id,
      course_id: course.id,
      process: 0,
    });

    return res.json({ message: "Đăng ký khóa học thành công!" });
  } catch (error: any) {
    console.error("Lỗi CourseRegister:", error);
    return res.status(500).json({ message: error.message });
  }
};

// --- UPDATE PROGRESS (Lưu tiến độ) ---
export const UpdateProgress = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { course_slug, lesson_id } = req.body;

    const course = await Course.findOne({ where: { slug: course_slug } });
    if (!course)
      return res.status(404).json({ message: "Khóa học không tồn tại!" });

    const link = await CourseLesson.findOne({
      where: { course_id: course.id, lesson_id: lesson_id },
    });
    if (!link)
      return res.status(404).json({ message: "Bài học không thuộc khóa này!" });

    const sub = await CourseSub.findOne({
      where: { student_id: user.id, course_id: course.id },
    });
    if (!sub)
      return res
        .status(403)
        .json({ message: "Bạn chưa đăng ký khóa học này!" });

    // Dùng upsert để đảm bảo dữ liệu chuẩn
    console.log(`💾 Đang lưu: User ${user.id} - Lesson ${lesson_id}`);
    await LessonProgress.upsert({
      student_id: user.id,
      lesson_id: lesson_id,
      course_id: course.id,
      is_completed: true,
    });

    // Tính lại %
    const totalLesson = await CourseLesson.count({
      where: { course_id: course.id },
    });
    const completedCount = await LessonProgress.count({
      where: {
        student_id: user.id,
        course_id: course.id,
        is_completed: true,
      },
    });

    let percent = 0;
    if (totalLesson > 0) {
      percent = Math.round((completedCount / totalLesson) * 100);
    }
    if (percent > 100) percent = 100;

    return res.json({
      status: true,
      message: "Đã lưu tiến độ!",
      percent: percent,
      completed_lessons_count: completedCount,
    });
  } catch (error: any) {
    console.error("❌ Lỗi UpdateProgress:", error);
    return res.status(500).json({ message: error.message });
  }
};

// --- GET LIST COURSE (Giữ nguyên hoặc update nếu cần) ---
export const GetListCourse = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // 1. Nhận tham số & Gán mặc định giống ListExam
    let {
      limit = 10,
      page = 1,
      key_name = "",
      topic_id,
      exclude_registered = "false", // 👈 Mặc định là chuỗi "false"
    } = req.query;

    page = parseInt(page as string);
    limit = parseInt(limit as string);
    const offset = (page - 1) * limit;

    // 2. Tạo điều kiện tìm kiếm tên
    const whereCondition: any = {
      [Op.or]: [{ name: { [Op.like]: `%${key_name}%` } }],
    };

    // 3. LOGIC LỌC (Bê nguyên xi từ ListExam sang)
    // Chỉ áp dụng filter nếu User TỒN TẠI và là HỌC VIÊN (role === 0)
    // -> Admin hoặc Khách (chưa login) sẽ không bị dính filter này -> Thấy được Hidden
    if (user && user.role === 0) {
      
      // Filter 1: Ẩn khóa học status "hidden"
      whereCondition.status = { [Op.ne]: "hidden" };

      // Filter 2: Nếu có yêu cầu lọc khóa đã đăng ký (exclude_registered="true")
      if (exclude_registered === "true") {
        const mySubs = await CourseSub.findAll({
          where: { student_id: user.id },
          attributes: ["course_id"],
          raw: true,
        });

        const myIds = mySubs.map((s: any) => s.course_id);

        if (myIds.length > 0) {
          whereCondition.id = { [Op.notIn]: myIds };
        }
      }
    }

    if (topic_id) {
      whereCondition.topic_id = topic_id;
    }

    // 4. Query Database
    let { count, rows: courses } = await Course.findAndCountAll({
      limit,
      offset,
      where: whereCondition,
      attributes: [
        "id",
        "name",
        "slug",
        "thumbnail",
        "type",
        "createdAt",
        "price",
        "status", // ✅ Giữ lại để hiển thị Badge
      ],
      include: [
        { model: Topic, as: "topic", attributes: ["id", "name", "slug"] },
      ],
      order: [["id", "DESC"]],
      raw: true,
      nest: true,
    });

    // 5. Format dữ liệu
    const coursesWithStudentCount = await Promise.all(
      courses.map(async (course: any) => {
        let { createdAt, ...rest } = course;
        createdAt = changeTime(createdAt);
        const studentCount = await CourseSub.count({
          where: { course_id: course.id },
        });
        return { ...rest, createdAt, studentCount };
      })
    );

    return res.json({ count, courses: coursesWithStudentCount });
  } catch (error: any) {
    console.error("❌ Lỗi Server:", error);
    return res.status(500).json(error.message);
  }
};
// ... (Giữ nguyên các hàm DeleteCourse, AddToCourse, WriteReview, CourseReview, MyCourse, ListStudent cũ) ...
export const DeleteCourse = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const course = await Course.findByPk(parseInt(id));
    if (!course) {
      return res.status(404).json("Khóa học không tồn tại!");
    }
    await course.destroy();
    return res.json({ message: "Xoá khóa học thành công!" });
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

export const AddToCourse = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const course = await Course.findByPk(parseInt(id));
    if (!course) {
      return res.status(404).json("Khóa học không tồn tại !");
    }
    const { list_student }: { list_student: number[] } = req.body;

    await Promise.all(
      list_student.map(async (studentId) => {
        const student = await Student.findByPk(studentId);
        if (!student) {
          return null;
        }
        const subscribe = await CourseSub.findOne({
          where: { student_id: studentId, course_id: id },
        });
        if (subscribe) {
          return null;
        }
        return CourseSub.create({ student_id: studentId, course_id: id });
      })
    );
    return res.status(200).json("Đã thêm học sinh vào khóa học thành công");
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

export const WriteReview = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const slug = req.params.course_slug;
    const { rate, comment } = req.body;

    const course = await Course.findOne({ where: { slug } });
    if (!course) {
      return res.status(404).json("Khoa hoc khong ton tai!");
    }
    const sub = await CourseSub.findOne({
      where: { course_id: course.id, student_id: user.id },
    });
    if (!sub) {
      return res.status(401).json("Ban can phai hoc truoc khi danh gia!");
    }
    await sub.update({ rate, comment });
    return res.json("Danh gia khoa hoc thanh cong!");
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

export const CourseReview = async (req: Request, res: Response) => {
  try {
    const slug = req.params.course_slug;
    const course = await Course.findOne({ where: { slug } });
    const user = (req as any).user;

    if (!course) {
      return res.status(404).json("Khóa học không tồn tại!");
    }

    // Lấy các đánh giá và bao gồm tên sinh viên
    const { count, rows: reviews } = await CourseSub.findAndCountAll({
      where: {
        course_id: course.id,
        rate: { [Op.ne]: null },
        comment: { [Op.ne]: null },
      },
      attributes: ["rate", "comment", "createdAt"],
      include: [
        {
          model: Student,
          as: "student",
          attributes: ["id", "fullName"],
        },
      ],
      order: [["rate", "DESC"]],
      nest: true,
      raw: true, // Chuyển kết quả thành plain object để tránh cấu trúc tuần hoàn
    });

    // Định dạng các đánh giá
    const formatReview = reviews.map((review: any) => {
      let { createdAt, ...rest } = review;
      createdAt = changeTime(createdAt);
      return { ...rest, createdAt };
    });

    // Tính trung bình cộng của rate
    const averageRate = await CourseSub.findOne({
      where: { course_id: course.id, rate: { [Op.ne]: null } },
      attributes: [[fn("AVG", col("rate")), "avgRate"]],
      raw: true, // Đảm bảo trả về plain object
    });

    // Chuẩn bị dữ liệu trả về
    let data: any = {
      count,
      avgRate: averageRate ? parseFloat((averageRate as any).avgRate) : 5,
      reviews: formatReview,
    };

    // Kiểm tra nếu người dùng là sinh viên và lấy đánh giá của họ
    if (user.role == 0) {
      const sub = await CourseSub.findOne({
        attributes: ["id", "rate", "comment"],
        where: { course_id: course.id, student_id: user.id },
        raw: true, // Tránh cấu trúc tuần hoàn
      });
      data.my_review = sub;
    }

    return res.json(data);
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

export const MyCourse = async (req: Request, res: Response) => {
  try {
    let {
      limit = 10,
      page = 1,
      key_name = "",
      topic_id,
      student_id,
    } = req.query;
    page = parseInt(page as string);
    limit = parseInt(limit as string);
    const offset = (page - 1) * limit;
    const whereCondition: any = {
      [Op.or]: [{ name: { [Op.like]: `%${key_name}%` } }],
    };
    const user = (req as any).user;
    if (user.role === 0) {
      student_id = user.id;
    } else {
      if (!student_id) {
        return res.status(400).json("Chọn sinh viên muốn xem");
      }
    }

    if (topic_id) {
      whereCondition.topic_id = topic_id;
    }
    let { count, rows: courses } = await Course.findAndCountAll({
      limit,
      offset,
      where: whereCondition,
      attributes: [
        "id",
        "name",
        "slug",
        "thumbnail",
        "type",
        "createdAt",
        "status",
      ],
      include: [
        {
          model: Topic,
          as: "topic",
          attributes: ["id", "name", "slug"],
        },
        {
          model: CourseSub,
          attributes: ["process"],
          as: "subscribed_course",
          where: {
            student_id,
          },
        },
      ],
      nest: true,
      raw: true,
    });
    const coursesWithStudentCount = await Promise.all(
      courses.map(async (course: any) => {
        let { createdAt, topic_id, subscribed_course, ...rest } = course;
        createdAt = changeTime(createdAt);
        const studentCount = await CourseSub.count({
          where: { course_id: course.id },
        });
        return {
          ...rest,
          process: subscribed_course.process,
          createdAt,
          studentCount,
        };
      })
    );
    return res.json({
      count,
      courses: coursesWithStudentCount,
    });
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};


// ... (các imports giữ nguyên)

export const ListStudent = async (req: Request, res: Response) => {
  try {
    let { limit = 10, page = 1, key_name = "" } = req.query;
    page = parseInt(page as string);
    limit = parseInt(limit as string);
    const offset = (page - 1) * limit;

    const whereCondition: any = {
      [Op.or]: [{ fullName: { [Op.like]: `%${key_name}%` } }],
    };

    const id = req.params.id;
    const course = await Course.findByPk(id);
    if (!course) {
      return res.status(404).json("Khóa học không tồn tại!");
    }

    // --- 1. SỬA LỖI TẠI ĐÂY ---
    // Lỗi cũ: as: "lesson" -> Sửa thành as: "Lesson" (Hoặc xóa dòng as đi)
    const allCourseLessons = await CourseLesson.findAll({
      where: { course_id: id },
      include: [
        {
          model: Lesson,
          as: "Lesson", // 👈 SỬA THÀNH 'Lesson' (viết hoa) cho khớp với báo lỗi
          attributes: ["id", "name"],
        },
      ],
      order: [["position", "ASC"]],
    });

    const listAllLessons = allCourseLessons.map((cl: any) => ({
      // Lưu ý: Nếu ở trên dùng as: "Lesson" thì ở dưới phải gọi .Lesson
      id: (cl as any).Lesson?.id, 
      name: (cl as any).Lesson?.name,
    }));

    // --- 2. ĐẾM TỔNG SỐ BÀI ---
    const totalLesson = listAllLessons.length;

    // --- 3. LẤY DANH SÁCH HỌC VIÊN ---
    const { count, rows: students } = await Student.findAndCountAll({
      limit,
      offset,
      attributes: ["id", "fullName", "email"],
      where: whereCondition,
      include: [
        {
          model: CourseSub,
          as: "subscribed_student",
          attributes: ["createdAt"],
          where: { course_id: id },
        },
      ],
    });

    // --- 4. TÍNH TIẾN ĐỘ ---
    const formatStudent = await Promise.all(
      students.map(async (item: any) => {
        const plainItem = item.get({ plain: true });
        const { subscribed_student, ...rest } = plainItem;
        let { createdAt } = subscribed_student[0];
        createdAt = changeTime(createdAt);

        const completedRecords = await LessonProgress.findAll({
          where: {
            student_id: plainItem.id,
            course_id: id,
            is_completed: true,
          },
          attributes: ["lesson_id"],
        });
        
        const completedLessonIds = completedRecords.map((r: any) => r.lesson_id);
        const completedCount = completedLessonIds.length;

        let percent = 0;
        if (totalLesson > 0) {
          percent = Math.round((completedCount / totalLesson) * 100);
        }
        if (percent > 100) percent = 100;

        return {
          ...rest,
          createdAt,
          process: percent,
          completed_lesson_ids: completedLessonIds,
        };
      })
    );

    return res.json({
      count,
      students: formatStudent,
      all_lessons: listAllLessons,
    });
  } catch (error: any) {
    console.error("Lỗi ListStudent:", error);
    return res.status(500).json(error.message);
  }
};