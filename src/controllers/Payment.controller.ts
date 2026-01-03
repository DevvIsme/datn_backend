import { Request, Response } from "express";
import axios from "axios";
import CryptoJS from "crypto-js";
import moment from "moment";
//import { Payment, CourseSub, Course } from "../models"; // Import các model

import Payment from "../models/Payment.Model";
import CourseSub from "../models/CourseSub.Model";
import Course from "../models/Course.Model";

const config = {
  app_id: "2553",
  key1: "PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL",
  key2: "kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz",
  endpoint: "https://sb-openapi.zalopay.vn/v2/create",
  query_endpoint: "https://sb-openapi.zalopay.vn/v2/query",
};

export const CreatePaymentUrl = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { course_id } = req.body;

    const course = await Course.findByPk(course_id);
    if (!course)
      return res.status(404).json({ message: "Khóa học không tồn tại" });

    // 1. Tạo mã đơn hàng
    const transID = Math.floor(Math.random() * 1000000);
    const app_trans_id = `${moment().format("YYMMDD")}_${transID}`;

    // 2. Chuẩn bị dữ liệu JSON (item & embed_data phải là chuỗi JSON)
    const embed_data = {
      redirecturl: `http://localhost:5173/thanh-toan-thanh-cong?slug=${course.slug}`,
    };

    const items = [
      {
        itemid: course.id,
        itemname: course.name,
        itemprice: course.price,
        itemquantity: 1,
      },
    ];

    // 3. Tạo Object đơn hàng
    const order: any = {
      app_id: parseInt(config.app_id), // Ép kiểu số cho chắc
      app_trans_id: app_trans_id,
      app_user: user.fullName || "user",
      app_time: Date.now(),
      item: JSON.stringify(items),
      embed_data: JSON.stringify(embed_data),
      // ⚠️ QUAN TRỌNG: Ép về số nguyên, ZaloPay không nhận số thập phân
      amount: Math.round(course.price),
      description: `Thanh toan: ${course.name}`,
      bank_code: "",
      callback_url: "",
    };

    // 4. Tạo chữ ký (MAC)
    // Chuỗi ký phải đúng thứ tự: app_id|app_trans_id|app_user|amount|app_time|embed_data|item
    const data =
      config.app_id +
      "|" +
      order.app_trans_id +
      "|" +
      order.app_user +
      "|" +
      order.amount +
      "|" +
      order.app_time +
      "|" +
      order.embed_data +
      "|" +
      order.item;
    order.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

    console.log("📤 Sending to ZaloPay:", order);

    // 5. Gửi request (Dùng POST BODY)
    const result = await axios.post(config.endpoint, order, {
      headers: { "Content-Type": "application/json" }, // Đảm bảo header là JSON
    });

    console.log("📥 ZaloPay Response:", result.data);

    if (result.data.return_code === 1) {
      // Lưu DB
      await Payment.create({
        app_trans_id: app_trans_id,
        student_id: user.id,
        course_id: course.id,
        amount: course.price,
        status: "pending",
      });

      return res.json({
        status: true,
        order_url: result.data.order_url,
        app_trans_id: app_trans_id,
      });
    } else {
      return res.status(400).json({
        message: "Tạo giao dịch thất bại",
        error: result.data,
      });
    }
  } catch (error: any) {
    console.error("Lỗi Server Payment:", error);
    return res.status(500).json({ message: error.message });
  }
};
// API Kiểm tra trạng thái đơn hàng (Frontend sẽ gọi cái này sau khi ZaloPay redirect về)
export const CheckPaymentStatus = async (req: Request, res: Response) => {
  try {
    const { app_trans_id } = req.body;

    const postData = {
      app_id: config.app_id,
      app_trans_id: app_trans_id,
      mac: "",
    };

    const data =
      postData.app_id + "|" + postData.app_trans_id + "|" + config.key1;
    postData.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

    const postConfig = {
      method: "post",
      url: config.query_endpoint,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: new URLSearchParams(postData as any).toString(),
    };

    const result = await axios(postConfig);

    // return_code = 1 nghĩa là thanh toán thành công
    if (result.data.return_code === 1) {
      // 1. Cập nhật bảng Payment
      const payment = await Payment.findOne({ where: { app_trans_id } });
      if (payment) {
        await payment.update({ status: "success" });

        // 2. KÍCH HOẠT KHÓA HỌC (Tạo CourseSub)
        // Kiểm tra xem đã có chưa để tránh trùng
        await CourseSub.findOrCreate({
          where: {
            student_id: payment.student_id,
            course_id: payment.course_id,
          },
          defaults: { process: 0 },
        });

        return res.json({
          status: true,
          message: "Thanh toán thành công! Khóa học đã được kích hoạt.",
        });
      }
    }

    return res.json({
      status: false,
      message: "Giao dịch chưa hoàn tất hoặc thất bại.",
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};
