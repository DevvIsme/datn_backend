import { DataTypes, Model } from "sequelize";
import sequelize from "../configurations/database"; // Đảm bảo đường dẫn đúng tới file config db của bạn
import Course from "./Course.Model"; // Import Model Course
import Lesson from "./Lesson.Model"; // Import Model Lesson

class CourseLesson extends Model {
  public id!: number;
  public course_id!: number;
  public lesson_id!: number;
  public position!: number;
  
  // Các field timestamp (tùy chọn khai báo)
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

CourseLesson.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    course_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: Course, // Tham chiếu trực tiếp đến Model Course
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    lesson_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: Lesson, // Tham chiếu trực tiếp đến Model Lesson
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    position: {
      type: DataTypes.INTEGER,
      defaultValue: 0, // Mặc định vị trí là 0
      allowNull: false,
    },
  },
  { 
    tableName: "course_lessons", // Tên bảng trong DB
    sequelize, // Instance sequelize import từ config
    timestamps: true 
  }
);

// --- ĐỊNH NGHĨA QUAN HỆ (ASSOCIATIONS) ---

// 1. Quan hệ trực tiếp để query bảng trung gian (Cần thiết cho hàm ListLesson của bạn)
Course.hasMany(CourseLesson, { foreignKey: "course_id" });
CourseLesson.belongsTo(Course, { foreignKey: "course_id" });

Lesson.hasMany(CourseLesson, { foreignKey: "lesson_id" });
CourseLesson.belongsTo(Lesson, { foreignKey: "lesson_id" });

// 2. Quan hệ N-N (Many-to-Many) để query đường tắt nếu cần
// Ví dụ: Course.findAll({ include: Lesson })
Course.belongsToMany(Lesson, { 
    through: CourseLesson, 
    foreignKey: "course_id",
    otherKey: "lesson_id",
    as: "lessons" // alias
});

Lesson.belongsToMany(Course, { 
    through: CourseLesson, 
    foreignKey: "lesson_id", 
    otherKey: "course_id",
    as: "courses" // alias
});

export default CourseLesson;