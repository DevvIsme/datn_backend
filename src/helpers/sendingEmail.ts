import Transporter from "../configurations/mailTransporter";

export const sendResetEmail = async (
  origin: string,
  email: string,
  resetString: string
) => {
  try {
    // ⚠️ LƯU Ý: Hãy đảm bảo đường dẫn này khớp với router trong Frontend (Vue) của bạn
    // Ví dụ: nếu router bạn đặt là /lay-lai-mat-khau/:token thì sửa dòng bên dưới tương ứng
    const link = `${origin}/lay-lai-mat-khau/${resetString}`;

    const mailOptions = {
      to: email,
      from: '"Hệ Thống Đào Tạo" <no-reply@education.com>', // Tên người gửi hiển thị đẹp hơn
      subject: "Yêu cầu khôi phục mật khẩu", // Tiêu đề tiếng Việt
      html: `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Khôi phục mật khẩu</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f4f4f4;
                    margin: 0;
                    padding: 0;
                    color: #333;
                }
                a { color: white; text-decoration: none; }
                .container {
                    max-width: 600px;
                    margin: 30px auto;
                    padding: 30px;
                    background: #ffffff;
                    border-radius: 8px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                }
                h1 {
                    color: #2c3e50;
                    font-size: 24px;
                    margin-bottom: 20px;
                    text-align: center;
                }
                p {
                    font-size: 16px;
                    line-height: 1.6;
                    margin: 10px 0;
                    color: #555;
                }
                .button {
                    display: inline-block;
                    padding: 12px 25px;
                    margin: 25px auto;
                    background-color: #007bff; /* Màu xanh chủ đạo */
                    color: white !important;
                    font-weight: bold;
                    border-radius: 5px;
                    font-size: 16px;
                    text-align: center;
                    display: block;
                    width: fit-content;
                    transition: background-color 0.3s;
                }
                .button:hover {
                    background-color: #0056b3;
                }
                .footer {
                    font-size: 13px;
                    color: #999;
                    text-align: center;
                    margin-top: 30px;
                    border-top: 1px solid #eee;
                    padding-top: 20px;
                }
                .note {
                    font-style: italic;
                    font-size: 14px;
                    color: #777;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Yêu Cầu Khôi Phục Mật Khẩu</h1>
                <p>Xin chào,</p>
                <p>Hệ thống vừa nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với email này.</p>
                <p>Để tạo mật khẩu mới, vui lòng nhấn vào nút bên dưới:</p>
                
                <a href="${link}" class="button">Đặt lại mật khẩu ngay</a>
                
                <p class="note">Vì lý do bảo mật, liên kết này sẽ hết hạn sau <strong>60 phút</strong>. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này và mật khẩu của bạn sẽ không thay đổi.</p>
                
                <div class="footer">
                    <p>Trân trọng,<br><strong>Đội ngũ Quản trị Hệ thống</strong></p>
                    <p style="margin-top: 5px;">Đây là email tự động, vui lòng không trả lời email này.</p>
                </div>
            </div>
        </body>
        </html>
      `,
    };

    await Transporter.sendMail(mailOptions);
    console.log("Email sent successfully to:", email);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Không thể gửi email, vui lòng kiểm tra lại cấu hình.");
  }
};
