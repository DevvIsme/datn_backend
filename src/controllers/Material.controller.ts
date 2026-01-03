import { Request, Response } from "express";

import { videoUpload, documentUpload } from "../configurations/multer";
import multer from "multer";
import fs from "fs/promises";

import {
  AddLessonContinue,
  InsertLesson,
 // UpdateLessonOrder,
} from "../services/Lesson.service";

import Course from "../models/Course.Model";
import Lesson from "../models/Lesson.Model";
import Document from "../models/Documents.Model";
import path from "path";
import fsnew from "fs";
import CourseSub from "../models/CourseSub.Model";
import { changeTime } from "../helpers/formatTime";
import  CourseLesson  from "../models/Course_Lessons.Models";
import LessonProgress from "../models/Lesson_progress.Model";

export const ListLesson = async (req: Request, res: Response) => {
  try {
    const { course_slug } = req.params;
    const user = (req as any).user; // Lấy user từ token

    // 1. Tìm khóa học
    const course = await Course.findOne({ 
        where: { slug: course_slug },
        attributes: ["id", "name", "slug"] 
    });

    if (!course) return res.status(404).json("Khóa học không tồn tại!");

    // 2. Lấy danh sách bài học theo thứ tự (như cũ)
    const courseLessons = await CourseLesson.findAll({
      where: { course_id: course.id },
      order: [["position", "ASC"]],
      attributes: ["lesson_id", "position"],
      raw: true,
    });

    if (!courseLessons || courseLessons.length === 0) {
        return res.json({ course, totalLesson: 0, lessons: [] });
    }

    const lessonIds = courseLessons.map((item: any) => item.lesson_id);

    // 3. Query chi tiết bài học (như cũ)
    const lessonsData = await Lesson.findAll({
      where: { id: lessonIds },
      attributes: ["id", "name", "description", "type", "context", "file_path"],
      raw: true,
    });

    // 4. 👇 QUAN TRỌNG: Lấy danh sách các bài ĐÃ HỌC của user này trong khóa này
    let completedLessonIds: number[] = [];
    
    if (user && user.id) {
        const progressRecords = await LessonProgress.findAll({
            where: { 
                student_id: user.id, 
                course_id: course.id,
                is_completed: true 
            },
            attributes: ["lesson_id"],
            raw: true
        });
        // Tạo mảng chứa các ID đã học: [1, 5, 8...]
        completedLessonIds = progressRecords.map((r: any) => r.lesson_id);
    }

    // 5. Sắp xếp lại và GÁN TRẠNG THÁI `is_completed`
    const sortedLessons = lessonIds.map((id: number) => {
        const lesson = lessonsData.find((l: any) => l.id === id);
        if (lesson) {
            return {
                ...lesson,
                // Kiểm tra xem ID bài học có nằm trong danh sách đã học không
                is_completed: completedLessonIds.includes(lesson.id) 
            };
        }
        return null;
    }).filter((item: any) => item);

    return res.json({
      course,
      totalLesson: sortedLessons.length,
      lessons: sortedLessons, // Danh sách này giờ đã có thuộc tính is_completed
    });

  } catch (error: any) {
    console.error("Lỗi ListLesson:", error);
    return res.status(500).json(error.message);
  }
};

export const CreateLesson = async (req: Request, res: Response) => {
  documentUpload.single("file")(req, res, async (err: any) => {
    // 1. Giữ nguyên phần xử lý lỗi Multer
    if (err instanceof multer.MulterError) {
      return res.status(400).json(err.message);
    } else if (err) {
      return res.status(400).json(err.message);
    }

    try {
      const course_id = parseInt(req.params.course_id);
      const course = await Course.findByPk(course_id);

      if (!course) {
        return res.status(404).json("Khóa học không tồn tại!");
      }

      // Giữ nguyên logic lấy inCourse mặc định = 1 (không tính toán position phức tạp nữa)
      const { name, description, type, context, inCourse = 1 } = req.body;

      if (!name || !type) {
        return res.status(400).json("Thiếu tên hoặc loại học liệu!");
      }

      // 🧩 Chuẩn bị dữ liệu để lưu
      let lessonContext = context || "";
      let file_path: string | null = null;

      // 👇 SỬA ĐÚNG ĐOẠN NÀY: Gộp các loại cần upload file vào chung
      // Cũ: if (type === "file" && req.file)
      // Mới: Thêm upload_video và pdf vào danh sách kiểm tra
      if (["file", "upload_video", "pdf"].includes(type)) {
        if (req.file) {
          file_path = req.file.filename;
          // Nếu là video hoặc pdf thì context để rỗng (không cần text)
          lessonContext = "";
        } else {
          return res.status(400).json("Vui lòng chọn file để upload!");
        }
      }

      // 🧩 Giữ nguyên kiểm tra link YouTube
      if (type === "video") {
        const youtubeRegex =
          /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
        if (!youtubeRegex.test(lessonContext)) {
          return res.status(400).json("Link YouTube không hợp lệ!");
        }
      }

      // Lưu vào DB (Giữ nguyên cấu trúc bảng Lesson cũ của bạn)
      await Lesson.create({
        course_id,
        inCourse,
        name,
        description,
        type,
        context: lessonContext,
        file_path,
      });

      return res.json("Thêm bài học thành công!");
    } catch (error: any) {
      return res.status(500).json(error.message);
    }
  });
};

export const UpdateLesson = async (req: Request, res: Response) => {
  videoUpload.single("video")(req, res, async (err: any) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json(err.message);
    } else if (err) {
      return res.status(400).json(err.message);
    }

    const id = req.params.lesson_id;
    const lesson = await Lesson.findByPk(parseInt(id));
    if (!lesson) {
      return res.status(404).json("Lesson không tồn tại !");
    }
    const oldVideoPath = path.join(
      __dirname,
      "../../public/videos",
      lesson.context || ""
    );
    const context = req.file?.filename || lesson.context;
    try {
      let {
        name = lesson.name,
        description = lesson.description,
        inCourse,
      } = req.body;

      // if (inCourse == 0) {
      //   inCourse = lesson.inCourse;
      // }

      await lesson.update({ name, description, context });

    //  await UpdateLessonOrder(lesson, inCourse);

      if (req.file?.filename) {
        try {
          await fs.unlink(oldVideoPath);
        } catch (error: any) {
          console.error("Failed to delete old avatar:", error.message);
        }
      }
      return res.json("Sửa bài học thành công!");
    } catch (error: any) {
      return res.status(500).json(error.message);
    }
  });
};

// export const DeleteLesson = async (req: Request, res: Response) => {
//   try {
//     const id = req.params.lesson_id;
//     const lesson = await Lesson.findByPk(parseInt(id));
//     if (!lesson) {
//       return res.status(404).json("Bài học không tồn tại");
//     }
//   //  const courseId = lesson.course_id;

//     // Xóa bài học
//     await lesson.destroy();

//     const remainingLessons = await Lesson.findAll({
//       where: { course_id: courseId },
//       order: [["inCourse", "ASC"]],
//     });

//     for (let i = 0; i < remainingLessons.length; i++) {
//       await remainingLessons[i].update({ inCourse: i + 1 });
//     }
//     return res.json("Xóa bài học thành công!");
//   } catch (error: any) {
//     return res.status(500).json(error.message);
//   }
// };

export const ListDoc = async (req: Request, res: Response) => {
  try {
    const slug = req.params.course_slug;
    const user = (req as any).user;
    const course = await Course.findOne({ where: { slug } });
    if (!course) {
      return res.status(404).json("Khóa học không tồn tại!");
    }
    let attributes: string[] = ["id", "name", "createdAt"];
    if (user.role != 0) {
      attributes.push("context");
    } else {
      const sub = await CourseSub.findOne({
        where: {
          course_id: course.id,
          student_id: user.id,
        },
      });
      if (sub) {
        attributes.push("context");
      }
    }
    let { count: totalDocs, rows: docs } = await Document.findAndCountAll({
      where: { course_id: course.id },
      attributes: ["id", "name", "context", "createdAt"],
      order: [["createdAt", "ASC"]],
      raw: true,
    });
    docs = docs.map((item: any) => {
      let { createdAt, ...rest } = item;
      createdAt = changeTime(createdAt);
      return { ...rest, createdAt };
    });
    return res.json({ totalDocs, docs });
  } catch (error: any) {
    return res.json(error.message);
  }
};

export const CreateDoc = async (req: Request, res: Response) => {
  documentUpload.single("file")(req, res, async (err: any) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json(err.message);
    } else if (err) {
      return res.status(400).json(err.message);
    }
    if (!req.file) {
      return res.status(400).json("Vui lòng tải lên tài liệu!");
    }
    const context = req.file.filename;
    try {
      const id = req.params.course_id;
      const course = await Course.findByPk(parseInt(id));
      if (!course) {
        return res.status(404).json("Khóa học không tồn tại!");
      }
      const { name } = req.body;
      await Document.create({ course_id: id, name, context });
      return res.json("Tạo mới tài liệu thành công!");
    } catch (error: any) {
      return res.status(500).json(error.message);
    }
  });
};

export const UpdateDoc = async (req: Request, res: Response) => {
  documentUpload.single("file")(req, res, async (err: any) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json(err.message);
    } else if (err) {
      return res.status(400).json(err.message);
    }

    const id = req.params.doc_id;
    const doc = await Document.findByPk(parseInt(id));
    if (!doc) {
      return res.status(404).json("Tài liệu không tồn tại!");
    }
    const oldDocPath = path.join(__dirname, "../../public/files", doc.context);
    const context = req.file?.filename || doc.context;
    try {
      const { name = doc.name } = req.body;
      await doc.update({ name, context });
      if (req.file?.filename) {
        try {
          await fs.unlink(oldDocPath);
        } catch (error: any) {
          console.error("Failed to delete old avatar:", error.message);
        }
      }
      return res.json("Sửa tài liệu thành công!");
    } catch (error: any) {
      return res.status(500).json(error.message);
    }
  });
};

export const DeleteDoc = async (req: Request, res: Response) => {
  try {
    const id = req.params.doc_id;
    const doc = await Document.findByPk(parseInt(id));
    if (!doc) {
      return res.status(404).json("Tài liệu không tồn tại!");
    }
    await doc.destroy();
    return res.json("Xóa tài liệu thành công!");
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

// 👇 Nhớ import CourseLesson ở đầu file nếu chưa có
// import CourseLesson from "../models/CourseLesson.Model"; 

export const AddLessonsToCourse = async (req: Request, res: Response) => {
  try {
    const { course_id, lesson_ids } = req.body;

    // 1. Validate dữ liệu đầu vào
    if (!course_id || !lesson_ids || !Array.isArray(lesson_ids)) {
      return res.status(400).json({ 
          status: false, 
          message: "Dữ liệu không hợp lệ (cần course_id và mảng lesson_ids)" 
      });
    }

    // 2. Kiểm tra khóa học có tồn tại không
    const course = await Course.findByPk(course_id);
    if (!course) {
      return res.status(404).json({ 
          status: false, 
          message: "Khóa học không tồn tại!" 
      });
    }

    // 3. Tìm vị trí (position) lớn nhất hiện tại trong khóa học này
    // Để các bài học mới thêm vào sẽ nằm nối tiếp phía dưới
    const lastLesson = await CourseLesson.findOne({
      where: { course_id },
      order: [["position", "DESC"]], // Lấy thằng có position cao nhất
      attributes: ["position"],
    });

    let currentPosition = lastLesson ? lastLesson.position : 0;

    // 4. Chuẩn bị dữ liệu để Bulk Create (Thêm hàng loạt)
    const newLinks: any[] = [];

    for (const lessonId of lesson_ids) {
      // (Tùy chọn) Kiểm tra xem bài học này đã có trong khóa chưa để tránh trùng lặp
      const exists = await CourseLesson.findOne({
        where: { course_id, lesson_id: lessonId },
      });

      if (!exists) {
        currentPosition += 1; // Tăng vị trí lên 1
        newLinks.push({
          course_id: parseInt(course_id),
          lesson_id: lessonId,
          position: currentPosition,
        });
      }
    }

    if (newLinks.length === 0) {
      return res.json({ 
          status: true, 
          message: "Các bài học đã chọn đều đã tồn tại trong khóa học này." 
      });
    }

    // 5. Lưu vào DB bảng trung gian
    await CourseLesson.bulkCreate(newLinks);

    return res.json({ 
        status: true, 
        message: `Đã thêm thành công ${newLinks.length} bài học vào khóa học!` 
    });

  } catch (error: any) {
    console.error("Lỗi AddLessonsToCourse:", error);
    return res.status(500).json({ 
        status: false, 
        message: error.message 
    });
  }
};

export const StreamVideo = async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    // Đường dẫn tới folder chứa file upload
    const videoPath = path.join(__dirname, "../../uploads/lessons", filename);

    if (!fsnew.existsSync(videoPath)) {
      return res.status(404).send("Video not found");
    }

    const stat = fsnew.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Xử lý tua video (Range Request)
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fsnew.createReadStream(videoPath, { start, end });

      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": "video/mp4",
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        "Content-Length": fileSize,
        "Content-Type": "video/mp4",
      };
      res.writeHead(200, head);
      fsnew.createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Stream error");
  }
};

// export const DetailLesson = async (req: Request, res: Response) => {
//   try {
//     const user = (req as any).user;
//     const { course_slug, lesson_id } = req.params;
//     const course = await Course.findOne({ where: { slug: course_slug } });
//     if (!course) {
//       return res.status(404).json("Khoa hoc khong ton tai!");
//     }
//     const lesson = await Lesson.findOne({
//       where: { id: lesson_id, course_id: course.id },
//     });
//     if (!lesson) {
//       return res.status(404).json("Bai hoc khong ton tai");
//     }
//     if (user.role == 0) {
//       const sub = await CourseSub.findOne({
//         where: { course_id: course.id, student_id: user.id },
//       });
//       if (!sub) {
//         return res.status(401).json("Ban chua duoc dang ky khoa hoc nay!");
//       }
//       if (sub.process + 1 < lesson.inCourse) {
//         return res.status(401).json("Ban chua hoc bai hoc truoc do!");
//       }
//       if (sub.process + 1 === lesson.inCourse) {
//         await sub.update({ process: lesson.inCourse });
//       }
//     }
//     return res.json(lesson);
//   } catch (error: any) {
//     return res.status(500).json(error.message);
//   }
// };

// =================== HÀM DÙNG NỘI BỘ ===================
export const createLessonInternal = async (data: {
  course_id: number;
  name: string;
  description?: string;
  type: "text" | "video" | "file";
  context?: string;
  inCourse?: number;
  file_path?: string | null;
}) => {
   console.log("🟢 createLessonInternal được gọi với:", data);
  const { course_id, name, description, type, context, inCourse = 1, file_path = null } = data;

  const course = await Course.findByPk(course_id);
  if (!course) throw new Error("Khóa học không tồn tại!");

  if (!name || !type) throw new Error("Thiếu tên hoặc loại học liệu!");

  let lessonContext = context || "";

  if (type === "video") {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    if (!youtubeRegex.test(lessonContext)) {
      throw new Error("Link YouTube không hợp lệ!");
    }
  }


  await Lesson.create({
    course_id,
    inCourse,
    name,
    description: description || "",
    type,
    context: type === "file" ? "" : lessonContext,
    file_path,
  });
};

