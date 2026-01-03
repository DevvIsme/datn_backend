import { Request, Response } from "express";

import { avatarUpload, uploadExcell } from "../configurations/multer";
import multer from "multer";
import XLSX from "xlsx";
import fs from "fs/promises";

import { bcryptDecrypt, bcryptEncrypt } from "../helpers/bcryptHash";
import { decryptString, encryptString } from "../helpers/cryptHash";
import { sendResetEmail } from "../helpers/sendingEmail";
import Student from "../models/Student.Model";
import { Op } from "sequelize";
import path from "path";
import { OAuth2Client } from "google-auth-library";
import { tokenGenerate } from "../helpers/tokenHandle";

let ResetPasswordlist: string[] = [];

export const GetListStudent = async (req: Request, res: Response) => {
  try {
    let { limit = 10, page = 1, key_name = "", order = "true" } = req.query;
    page = parseInt(page as string);
    limit = parseInt(limit as string);
    const offset = (page - 1) * limit;

    const whereCondition: any = {
      [Op.or]: [{ fullName: { [Op.like]: `%${key_name}%` } }],
    };

    // Nếu bạn muốn giữ logic "true/false" từ client gửi lên để đảo chiều:
    // order = "true" (mặc định) -> DESC (Mới nhất)
    // order = "false" -> ASC (Cũ nhất)
    // Bạn có thể sửa logic dòng này:
    const orderDirection = order === "true" ? "DESC" : "ASC";

    const { count, rows: students } = await Student.findAndCountAll({
      limit,
      offset,
      where: whereCondition,
      attributes: [
        "id",
        "fullName",
        "email",
        "gender",
        "status",
        "phone",
        "birthday",
        "avatar",
        "createdAt", // Đảm bảo trường này có trong database
      ],
      // Sửa dòng này: Sắp xếp theo createdAt
      order: [["createdAt", orderDirection]],
    });

    return res.json({ count, students });
  } catch (error: any) {
    return res.json(error.message);
  }
};

export const DetailInfo = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const student = await Student.findByPk(id, {
      attributes: ["id", "fullName", "email", "gender", "status","phone", "birthday", "avatar", "createdAt"],
      raw: true,
    });
    if (!student) {
      return res.status(404).json("Sinh Viên không tồn tại!");
    }
    return res.json({ ...student });
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

export const CreateStudent = async (req: Request, res: Response) => {
  avatarUpload.single("avatar")(req, res, async (err: any) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    const avatar = req.file?.filename || "avatar.png";
    try {
      const { fullName, email, password, gender, birthday, phone } = req.body;
      const exist = await Student.findOne({ where: { email } });
      if (exist) {
        return res.status(409).json("Email đã tồn tại!");
      }
      const hashPassword = await bcryptEncrypt(password);
      await Student.create({ fullName, email, hashPassword, avatar, gender, birthday, phone  });
      return res.json("Create new student successfully!");
    } catch (error: any) {
      return res.status(500).json(error.message);
    }
  });
};

export const ChangeStatus = async (req: Request, res: Response) => {
  try {
    const id = req.params.student_id;
    const student = await Student.findByPk(parseInt(id));
    const { status } = req.body;
    if (!student) {
      return res.status(404).json("Student không tồn tại!");
    }
    await student.update({ status });
    return res.json("Thay đổi trạng thái student thành công!");
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

// File: Student.controller.ts

export const MyInfo = async (req: Request, res: Response) => {
  try {
    console.log("========== BẮT ĐẦU DEBUG MY_INFO ==========");
    
    // 1. Kiểm tra xem Middleware có gắn user vào req không
    const user = (req as any).user;
    console.log("STEP 1 - User từ Token:", user);

    if (!user) {
      throw new Error("Lỗi: Không tìm thấy thông tin User trong Request (Middleware chưa chạy hoặc Token sai).");
    }

    if (!user.id) {
      throw new Error("Lỗi: Token hợp lệ nhưng không có ID.");
    }

    console.log("STEP 2 - Chuẩn bị tìm ID:", user.id);

    // 2. Thử truy vấn Database
    const student = await Student.findByPk(parseInt(user.id), {
      attributes: ["fullName", "gender", "email", "phone", "birthday", "avatar", "createdAt"],
    });

    console.log("STEP 3 - Kết quả tìm trong DB:", student ? "Tìm thấy User" : "User là NULL");

    // 3. Xử lý dữ liệu
    const studentData = student ? student.get({ plain: true }) : null;
    console.log("STEP 4 - Dữ liệu cuối cùng:", studentData);

    // 4. Trả về
    return res.json(studentData);

  } catch (error: any) {
    // IN LỖI CHI TIẾT RA TERMINAL
    console.error("!!! LỖI CHẾT NGƯỜI TẠI MY_INFO !!!");
    console.error("Tên lỗi:", error.name);
    console.error("Nội dung:", error.message);
    console.error("Vị trí code hỏng (Stack):", error.stack);
    
    return res.status(500).json({
      message: "Lỗi Server rồi",
      detail: error.message // Trả về frontend để bạn đọc được luôn
    });
  }
};

export const UpdateMyAcc = async (req: Request, res: Response) => {
  avatarUpload.single("avatar")(req, res, async (err: any) => {
    if (err) {
      const statusCode = err instanceof multer.MulterError ? 400 : 500;
      return res.status(statusCode).json({ message: err.message });
    }

    const user = (req as any).user;
    const student = await Student.findByPk(parseInt(user.id));

    if (!student) {
      return res.status(500).json({ message: "Server đang bị lỗi!" });
    }
    const oldAvatarPath = path.join(
      __dirname,
      "../../public/avatars",
      student.avatar
    );
    const newAvatar = req.file?.filename || student.avatar;

    try {
      const { email, fullName, phone, gender, birthday } = req.body;

      await student.update({
        email,
        fullName,
        phone,
        gender,
        birthday, // Sequelize thường tự handle string 'YYYY-MM-DD' thành Date
        avatar: newAvatar,
      });

      if (req.file?.filename) {
        try {
await fs.access(oldAvatarPath); 
          await fs.unlink(oldAvatarPath);        } catch (error: any) {
          console.error("Failed to delete old avatar:", error.message);
        }
      }
      return res.json({ message: "Cập nhật thông tin thành công!" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });
};

export const ChangePassword = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { current_password, new_password, confirm_password } = req.body;
    if (new_password !== confirm_password) {
      return res.status(401).json("Xác nhận mật khẩu không đúng!");
    }
    const student = await Student.findByPk(parseInt(user.id));
    if (!student) {
      return res.status(500).json("Server đang bị lỗi!");
    }
    const isPass = await bcryptDecrypt(current_password, student.hashPassword);
    if (!isPass) {
      return res.status(401).json("Mật khẩu hiện tại của bạn không đúng!");
    }
    const hashPassword = await bcryptEncrypt(new_password);
    await student.update({ hashPassword });
    return res.json("Cập nhật mật khẩu thành công!");
  } catch (error: any) {
    return res.json(error.message);
  }
};

export const ForgotPassword = async (req: Request, res: Response) => {
  try {
    const { origin, email } = req.body;
    const student = await Student.findOne({ where: { email } });
    if (!student) {
      return res.status(404).json("Email này chưa được đăng ký!");
    }
    const data = { email: email, expired: new Date(Date.now() + 3600000) };
    const dataString = JSON.stringify(data);
    const resetString = encryptString(dataString);
    ResetPasswordlist.push(resetString);
    await sendResetEmail(origin, email, resetString);
    return res.status(200).json("Kiểm tra email để thay dổi mật khẩu!");
  } catch (error) {
    return res
      .status(500)
      .json("Có lỗi xảy ra trong quá trình xử lý quên mật khẩu");
  }
};

export const ResetPassword = async (req: Request, res: Response) => {
  try {
    const resetString = req.params.id;
    const { new_password, confirm_password } = req.body;
    if (new_password !== confirm_password) {
      return res.status(401).json("Xác nhận mật khẩu không thành công!");
    }
    if (!ResetPasswordlist.includes(resetString)) {
      return res.status(403).json("Reset string không đúng!");
    }
    const { email, expired } = decryptString(resetString);
    if (new Date() > new Date(expired)) {
      return res.status(400).json("Reset string đã hết hạn!");
    }
    const student = await Student.findOne({ where: { email } });
    if (!student) {
      return res.status(500).json("Lỗi server");
    }
    const newPassword = await bcryptEncrypt(new_password);
    await student.update({
      hashPassword: newPassword,
    });
    ResetPasswordlist = ResetPasswordlist.filter(
      (token) => token !== resetString
    );
    return res.json("Password được cập nhật thành công!");
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

export const DeleteStudent = async (req: Request, res: Response) => {
  try {
    const id = req.params.student_id;
    const student = await Student.findByPk(parseInt(id));
    if (!student) {
      return res.status(404).json("Student không tồn tại!");
    }
    await student.destroy();
    return res.json("Xóa student thành công!");
  } catch (error: any) {
    return res.json(error.message);
  }
};

export const VerifyResetstring = async (req: Request, res: Response) => {
  try {
    const resetString = req.params.reset;
    if (!ResetPasswordlist.includes(resetString)) {
      return res.status(403).json("Yêu cầu làm mới bị lỗi!");
    }
    const { email, expired } = decryptString(resetString);
    if (new Date() > new Date(expired)) {
      ResetPasswordlist = ResetPasswordlist.filter(
        (token) => token !== resetString
      );
      return res.status(400).json("Yêu cầu làm mới đã hết hạn!");
    }
    return res.json(email);
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

export const CreateStudentBulk = async (req: Request, res: Response) => {
  // 1. Gọi wrapper của Multer để xử lý file upload
  uploadExcell.single("file")(req, res, async (err: any) => {
    // Xử lý lỗi từ Multer (VD: file quá lớn, sai định dạng)
    if (err) {
      return res
        .status(400)
        .json({ message: "Lỗi upload file: " + err.message });
    }

    // 2. Kiểm tra file có tồn tại không
    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng chọn file Excel!" });
    }

    try {
      let workbook;

      // --- KHẮC PHỤC CHÍNH: Ưu tiên đọc từ đường dẫn file (DiskStorage) ---
      // Logic này giống với phần import câu hỏi: đọc file từ thư mục uploads
      if (req.file.path) {
        workbook = XLSX.readFile(req.file.path);
      } else if (req.file.buffer) {
        // Fallback: Nếu cấu hình là MemoryStorage thì đọc buffer
        workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      } else {
        throw new Error("Không tìm thấy dữ liệu file.");
      }
      // --------------------------------------------------------------------

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      // Chuyển Excel thành JSON
      const students: any[] = XLSX.utils.sheet_to_json(sheet);

      let addedStudents: any[] = [];
      let skippedStudents: any[] = [];

      // 3. Duyệt qua từng dòng
      for (const studentData of students) {
        const { fullName, email, gender, phone, birthday } =
          studentData;

        // Validate cơ bản
        if (!fullName || !email ) {
          skippedStudents.push({
            email: email || "N/A",
            reason: "Thiếu Tên, Email hoặc Password",
          });
          continue;
        }

        try {
          // Kiểm tra email trùng
          const exist = await Student.findOne({ where: { email } });
          if (exist) {
            throw new Error("Email đã tồn tại trong hệ thống");
          }

         const defaultPassword = "123456Aa@";
         const hashPassword = await bcryptEncrypt(defaultPassword);
          // Xử lý giới tính
          let fmtGender = "other";
          if (gender) {
            const g = gender.toString().toLowerCase().trim();
            if (g === "nam" || g === "male") fmtGender = "male";
            else if (g === "nữ" || g === "female") fmtGender = "female";
          }

          // Xử lý ngày sinh (Chấp nhận cả chuỗi text và định dạng Date của Excel)
          let fmtBirthday = null;
          if (birthday) {
            // Thử parse ngày
            const d = new Date(birthday);
            if (!isNaN(d.getTime())) {
              fmtBirthday = d;
            }
          }

          await Student.create({
            fullName,
            email,
            hashPassword,
            avatar: "avatar.png",
            gender: fmtGender,
            phone: phone ? phone.toString() : null,
            birthday: fmtBirthday,
            status: true, // Mặc định kích hoạt
          });

          addedStudents.push(email);
        } catch (rowError: any) {
          skippedStudents.push({
            email: email,
            reason: rowError.message,
          });
        }
      }

      // 4. Quan trọng: Xóa file tạm sau khi xử lý xong (Clean up)
   if (req.file.path) {
     try {
       await fs.unlink(req.file.path);
     } catch (unlinkErr) {
       console.error("Lỗi xóa file tạm:", unlinkErr);
     }
   }

      return res.status(200).json({
        message: "Import hoàn tất",
        data: {
          added: addedStudents,
          skipped: skippedStudents,
          count: addedStudents.length,
        },
      });
    } catch (error: any) {
      // Nếu lỗi hệ thống, vẫn cố gắng xóa file tạm
      if (req.file && req.file.path) {
     try {
       await fs.unlink(req.file.path);
     } catch (e) {}
      }
      return res.status(500).json({ message: "Lỗi Server: " + error.message });
    }
  });
};

export const UpdateStudent = async (req: Request, res: Response) => {
  // 1. Sử dụng middleware upload giống như khi tạo mới
  avatarUpload.single("avatar")(req, res, async (err: any) => {
    if (err) {
      const statusCode = err instanceof multer.MulterError ? 400 : 500;
      return res.status(statusCode).json({ message: err.message });
    }

    try {
      const id = req.params.student_id;
      const student = await Student.findByPk(id);

      if (!student) {
        return res.status(404).json({ message: "Học sinh không tồn tại!" });
      }

      const { fullName, email, password, gender, phone, birthday } = req.body;

      // 2. Kiểm tra nếu đổi email thì email mới có bị trùng không
      if (email && email !== student.email) {
        const existEmail = await Student.findOne({ where: { email } });
        if (existEmail) {
          return res
            .status(409)
            .json({ message: "Email này đã được sử dụng bởi học sinh khác!" });
        }
      }

      // 3. Chuẩn bị dữ liệu cập nhật
      let updateData: any = {
        fullName,
        email,
        gender,
        phone,
        birthday, // Sequelize tự convert string 'YYYY-MM-DD' sang Date
      };

      // 4. Nếu có nhập mật khẩu mới thì hash và update
      if (password && password.trim() !== "") {
        updateData.hashPassword = await bcryptEncrypt(password);
      }

      // 5. Xử lý Avatar: Nếu có file mới thì update và xóa file cũ
      if (req.file?.filename) {
        updateData.avatar = req.file.filename;

        // Logic xóa ảnh cũ (trừ ảnh mặc định)
        if (student.avatar && student.avatar !== "avatar.png") {
          const oldAvatarPath = path.join(
            __dirname,
            "../../public/avatars",
            student.avatar
          );
          try {
            await fs.access(oldAvatarPath);
            await fs.unlink(oldAvatarPath);
          } catch (e) {
            console.log("Không tìm thấy ảnh cũ hoặc lỗi xóa ảnh:", e);
          }
        }
      }

      // 6. Thực hiện update vào DB
      await student.update(updateData);

      return res.json({ message: "Cập nhật thông tin học sinh thành công!" });
    } catch (error: any) {
      return res.status(500).json({ message: "Lỗi Server: " + error.message });
    }
  });
};
