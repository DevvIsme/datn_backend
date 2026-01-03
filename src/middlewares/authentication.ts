import { NextFunction, Request, Response } from "express";
import { tokenVerify } from "../helpers/tokenHandle";
import {
  coursePermission,
  examPermission,
  studentPermission,
} from "../services/Admin.service";


export const verifyAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json("Token không tồn tại !");
    }
    const user = await tokenVerify(token, "access");
    if (!user) {
      return res.status(401).json("Token bị lỗi!");
    }
    (req as any).user = user;
    next();
  } catch (error: any) {
    if (error.message === "jwt expired") {
      return res.status(401).json("Token hết hạn!");
    }
    res.status(500).json(error.message);
  }
};

const verifyPermission = async (
  req: Request,
  res: Response,
  next: NextFunction,
  permissionCheck: (userId: number) => Promise<boolean | undefined>
) => {
  try {
    await verifyAccessToken(req, res, async () => {
      const user = (req as any).user;
      if (user.role == 0) {
        return res
          .status(401)
          .json("Đăng nhập với vai trò là Admin để sử dụng chức năng này!");
      }
      if (user.role == 1) {
        const hasPermission = await permissionCheck(user.id);
        if (!hasPermission) {
          return res
            .status(401)
            .json("Không được phân quyền để thực hiện nhiệm vụ này!");
        }
      }
      next();
    });
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

export const verifyStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await verifyAccessToken(req, res, async () => {
      const user = (req as any).user;
      if (user && user.role == 0) {
        return next();
      } else {
        return res
          .status(403)
          .json("Không được cấp quyền để thực hiện hành động này!");
      }
    });
  } catch (error: any) {
    return res.json(error.message);
  }
};

export const verifyAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  await verifyAccessToken(req, res, async () => {
    const user = (req as any).user;
    if (user.role == 0) {
      return res
        .status(403)
        .json("Không được cấp quyền để thực hiện hành động này!");
    }
    return next();
  });
};

export const verifyCanCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  return verifyPermission(req, res, next, coursePermission);
};

export const verifyCanStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  return verifyPermission(req, res, next, studentPermission);
};

export const verifyCanExam = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  return verifyPermission(req, res, next, examPermission);
};

export const verifySupadmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await verifyAccessToken(req, res, async () => {
      const user = (req as any).user;
      if (user.role != 2) {
        return res
          .status(401)
          .json("Bạn không được cấp phép để thực hiện hành động này");
      }
      next();
    });
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }
    const accessToken = authHeader.split(" ")[1];
    if (!accessToken) {
      return next();
    }
    const data = await tokenVerify(accessToken, "access");

    (req as any).user = data;
    next();
  } catch (error: any) {
    if (error.message === "jwt expired") {
      res.status(401).json("Access token expired");
    } else {
      res.status(500).json(error.message);
    }
  }
};

