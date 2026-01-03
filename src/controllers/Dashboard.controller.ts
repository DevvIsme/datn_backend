import { Request, Response } from "express";
import db from "../configurations/database";

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const { range } = req.query;

    // 1. Xử lý logic thời gian
    let dateCondition = "";
    // Mặc định lấy tất cả, nếu có range thì nối thêm chuỗi SQL
    // Lưu ý: Cách này an toàn vì chúng ta fix cứng chuỗi trong switch-case, không nối trực tiếp input của user.
    switch (range) {
      case "7d":
        dateCondition = "AND createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
        break;
      case "30d":
        dateCondition = "AND createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
        break;
      case "1y":
        dateCondition = "AND createdAt >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";
        break;
      default:
        dateCondition = ""; // Mặc định là 'all' (Tất cả thời gian)
        break;
    }

    // Helper để thay thế 'AND' bằng 'WHERE' nếu câu query chưa có WHERE
    // Nhưng để đơn giản, trong các query dưới tôi sẽ dùng thủ thuật "WHERE 1=1" để luôn có thể nối "AND..."

    // 2. Query Summary (Tổng quan)
    // Lưu ý: payment dùng 'updatedAt' hoặc 'createdAt' tùy vào lúc thanh toán thành công. Ở đây dùng createdAt.
    const [summaryData]: any = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM student WHERE status = 1 ${dateCondition}) as totalStudents,
        (SELECT COUNT(*) FROM course WHERE status = 'active' ${dateCondition}) as totalCourses,
        (SELECT COALESCE(SUM(amount), 0) FROM payment WHERE status = 'success' ${dateCondition}) as totalRevenue
    `);

    // 3. Query Phân bổ học viên (Pie Chart)
    const [courseDistribution]: any = await db.query(`
      SELECT 
        c.id, 
        c.name, 
        COUNT(cs.student_id) as students
      FROM course c
      LEFT JOIN course_subcribe cs ON c.id = cs.course_id
      WHERE 1=1 ${dateCondition.replace("createdAt", "cs.createdAt")} 
      GROUP BY c.id
      HAVING students > 0
    `);
    // Note: dateCondition ở trên dùng tên cột mặc định là createdAt,
    // nhưng trong bảng course_subcribe cần chỉ rõ là cs.createdAt để tránh lỗi ambiguous nếu join.
    // Ở đoạn replace trên tôi xử lý nhanh, hoặc bạn có thể viết switch case riêng cho từng query nếu muốn chặt chẽ.

    const totalStudentsInCourses = courseDistribution.reduce(
      (acc: number, cur: any) => acc + cur.students,
      0
    );
    const distributionWithPercent = courseDistribution.map((c: any) => ({
      ...c,
      percentage: totalStudentsInCourses
        ? ((c.students / totalStudentsInCourses) * 100).toFixed(1)
        : 0,
    }));

    // 4. Query Timeline (Biểu đồ cột)
    // Nếu chọn 7 ngày thì hiển thị theo Ngày (%d/%m), còn lại hiển thị theo Tháng (%m/%Y)
    const dateFormat = range === "7d" ? "%d/%m" : "%m/%Y";

    const [registrationTimeline]: any = await db.query(`
      SELECT 
        DATE_FORMAT(createdAt, '${dateFormat}') as time,
        COUNT(*) as count
      FROM student
      WHERE 1=1 ${dateCondition}
      GROUP BY time
      ORDER BY createdAt ASC
    `);

    // 5. Query Tiến độ & Top Doanh thu
    const [revenueByCourse]: any = await db.query(`
      SELECT 
        c.name,
        SUM(p.amount) as total
      FROM course c
      JOIN payment p ON c.id = p.course_id
      WHERE p.status = 'success' ${dateCondition.replace(
        "createdAt",
        "p.createdAt"
      )}
      GROUP BY c.id
      ORDER BY total DESC
      LIMIT 5
    `);

    // Tiến độ học tập (Lấy top 5 khóa có người học gần đây nhất)
    const [learningProgress]: any = await db.query(`
        SELECT 
          c.name,
          AVG(cs.process) as progress
        FROM course c
        JOIN course_subcribe cs ON c.id = cs.course_id
        WHERE 1=1 ${dateCondition.replace("createdAt", "cs.createdAt")}
        GROUP BY c.id
        LIMIT 5
      `);

    return res.status(200).json({
      success: true,
      data: {
        summary: summaryData[0],
        distribution: distributionWithPercent,
        timeline: registrationTimeline,
        progress: learningProgress,
        revenue: revenueByCourse,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server khi lấy thống kê" });
  }
};
