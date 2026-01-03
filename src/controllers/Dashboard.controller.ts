import { Request, Response } from "express";
import db from "../configurations/database";

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const { range } = req.query;

    // 1. Xử lý logic thời gian
    let dateCondition = "";
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
        dateCondition = "";
        break;
    }

    // 2. Query Summary (Query này OK, giữ nguyên)
    const [summaryData]: any = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM student WHERE status = 1 ${dateCondition}) as totalStudents,
        (SELECT COUNT(*) FROM course WHERE status = 'active' ${dateCondition}) as totalCourses,
        (SELECT COALESCE(SUM(amount), 0) FROM payment WHERE status = 'success' ${dateCondition}) as totalRevenue
    `);

    // 3. Query Phân bổ học viên (SỬA LỖI GROUP BY)
    // Thêm c.name vào GROUP BY
    const [courseDistribution]: any = await db.query(`
      SELECT 
        c.id, 
        c.name, 
        COUNT(cs.student_id) as students
      FROM course c
      LEFT JOIN course_subcribe cs ON c.id = cs.course_id
      WHERE 1=1 ${dateCondition.replace(/createdAt/g, "cs.createdAt")} 
      GROUP BY c.id, c.name  
      HAVING students > 0
    `);

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

    // 4. Query Timeline (SỬA LỖI ORDER BY)
    const dateFormat = range === "7d" ? "%d/%m" : "%m/%Y";

    // Thay đổi: ORDER BY MIN(createdAt) để lấy thời gian đại diện đầu tiên của nhóm
    const [registrationTimeline]: any = await db.query(`
      SELECT 
        DATE_FORMAT(createdAt, '${dateFormat}') as time,
        COUNT(*) as count
      FROM student
      WHERE 1=1 ${dateCondition}
      GROUP BY time
      ORDER BY MIN(createdAt) ASC 
    `);

    // 5. Query Doanh thu (SỬA LỖI GROUP BY)
    const [revenueByCourse]: any = await db.query(`
      SELECT 
        c.name,
        SUM(p.amount) as total
      FROM course c
      JOIN payment p ON c.id = p.course_id
      WHERE p.status = 'success' ${dateCondition.replace(
        /createdAt/g,
        "p.createdAt"
      )}
      GROUP BY c.id, c.name
      ORDER BY total DESC
      LIMIT 5
    `);

    // 6. Query Tiến độ (SỬA LỖI GROUP BY)
    const [learningProgress]: any = await db.query(`
        SELECT 
          c.name,
          AVG(cs.process) as progress
        FROM course c
        JOIN course_subcribe cs ON c.id = cs.course_id
        WHERE 1=1 ${dateCondition.replace(/createdAt/g, "cs.createdAt")}
        GROUP BY c.id, c.name
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
    // Log lỗi chi tiết ra console server để debug nếu vẫn lỗi
    console.error("Dashboard Stats Error:", error);
    return res.status(500).json({ message: "Lỗi server khi lấy thống kê" });
  }
};
