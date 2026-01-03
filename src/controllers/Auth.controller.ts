import { Request, Response } from "express";
import Student from "../models/Student.Model";
import Admin from "../models/Admin.model";
import { bcryptDecrypt } from "../helpers/bcryptHash";
import { bcryptEncrypt } from "../helpers/bcryptHash";
import { tokenGenerate, tokenVerify } from "../helpers/tokenHandle";
import { OAuth2Client } from "google-auth-library";


let refreshTokenlist: string[] = [];


export const LoginStudent = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const isExist = await Student.findOne({ where: { email } });
    if (!isExist) {
      return res.status(404).json("Thông tin Email chưa chính xác!");
    }
    const isPassword = await bcryptDecrypt(password, isExist.hashPassword);
    if (!isPassword) {
      return res.status(400).json("Mật khẩu không đúng");
    }
    if (!isExist.status) {
      return res.status(403).json("Tài khoản của bạn đang bị khóa!");
    }
    let tokenData = { id: isExist.id, role: 0 };

    const accessToken = tokenGenerate(tokenData, "access");
    const refreshToken = tokenGenerate(tokenData, "refresh");
    refreshTokenlist.push(refreshToken);

    return res.json({ accessToken, refreshToken });
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

export const LoginAdmin = async (req: Request, res: Response) => {
  try {
    try {
      const { email, password } = req.body;
      const isExist = await Admin.findOne({ where: { email } });
      if (!isExist) {
        return res.status(404).json("Thông tin Email chưa chính xác!");
      }
      const isPassword = await bcryptDecrypt(password, isExist.hashPassword);
      if (!isPassword) {
        return res.status(400).json("Mật khẩu không đúng");
      }

      if (!isExist.status) {
        return res.status(403).json("Tài khoản của bạn đang bị khóa!");
      }
      let tokenData = { id: isExist.id, role: isExist.role };

      const accessToken = tokenGenerate(tokenData, "access");
      const refreshToken = tokenGenerate(tokenData, "refresh");
      refreshTokenlist.push(refreshToken);

      return res.json({ accessToken, refreshToken });
    } catch (error: any) {
      return res.status(500).json(error.message);
    }
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

export const RefreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshTokenlist.includes(refreshToken)) {
      return res.status(403).json("Refresh token không hợp lệ");
    }
    const data = await tokenVerify(refreshToken, "refresh");
    if (data && typeof data === "object") {
      const newAccessToken = tokenGenerate(data, "access");
      const newRefreshToken = tokenGenerate(data, "refresh");
      refreshTokenlist = refreshTokenlist.filter(
        (token) => token !== refreshToken
      );
      refreshTokenlist.push(newRefreshToken);
      return res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } else {
      return res.status(403).json("Dữ liệu token không hợp lệ");
    }
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

export const Logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (refreshTokenlist.includes(refreshToken)) {
      refreshTokenlist = refreshTokenlist.filter(
        (token) => token !== refreshToken
      );
      return res.status(200).json("Logged out successfully!");
    } else {
      return res.status(403).json("Refresh Token không hợp lệ!");
    }
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

export const RegisterStudent = async (req: Request, res: Response) => {
  try {
    const { fullName, email, password, gender, phone, birthday } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json("Vui lòng nhập đầy đủ thông tin bắt buộc!");
    }

    const exist = await Student.findOne({ where: { email } });
    if (exist) {
      return res.status(409).json("Email đã được đăng ký!");
    }

    // 🔹 Nếu có file upload, multer sẽ thêm req.file
    const avatarPath = req.file ? req.file.filename : "avatar.png";

    const hashPassword = await bcryptEncrypt(password);

    const newStudent = await Student.create({
      fullName,
      email,
      hashPassword,
      gender: gender || "other",
      phone: phone || null,
      birthday: birthday || null,
      avatar: avatarPath,
      status: true,
    });

    return res.status(201).json({
      message: "Đăng ký thành công!",
      student: {
        id: newStudent.id,
        fullName: newStudent.fullName,
        email: newStudent.email,
        gender: newStudent.gender,
        phone: newStudent.phone,
        birthday: newStudent.birthday,
        avatar: newStudent.avatar,
      },
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json(error.message);
  }
};

export const LoginGoogle = async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;
    const client = new OAuth2Client();
    // Không cần truyền ClientID vào constructor nếu chỉ verify token đơn giản

    // 1. Giải mã token từ Google gửi lên
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: "361072770018-idlrlon3k2j3up5tmuknps6t3qmmhmn6.apps.googleusercontent.com", // Paste Client ID vào đây để bảo mật
    });
    const payload = ticket.getPayload();

    if (!payload) return res.status(400).json("Token không hợp lệ");

    const { email, name, sub, picture } = payload;
    // sub chính là googleId duy nhất của user

    // 2. Tìm hoặc Tạo user
    let user = await Student.findOne({ where: { email } });

    if (!user) {
      // Nếu chưa có -> Tạo mới
      user = await Student.create({
        fullName: name || "Google User",
        email: email,
        googleId: sub,
        avatar: picture,
        status: true,
        hashPassword: null, // Không có pass
      });
    } else {
      // Nếu đã có email -> Cập nhật googleId nếu chưa có
      if (!user.googleId) {
        user.googleId = sub;
        await user.save();
      }
    }

    // 3. Tạo Token hệ thống (Copy từ hàm LoginStudent cũ)
    // Lưu ý: tokenGenerate cần import từ helpers
    const tokenData = { id: user.id, role: 0 };
    const accessToken = tokenGenerate(tokenData, "access");
    const refreshToken = tokenGenerate(tokenData, "refresh");

    // Đừng quên push refreshToken vào mảng lưu trữ (như code cũ)
    // refreshTokenlist.push(refreshToken);

    return res.status(200).json({ accessToken, refreshToken });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json("Lỗi server: " + error.message);
  }
};