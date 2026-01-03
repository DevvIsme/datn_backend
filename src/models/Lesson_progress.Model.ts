import { DataTypes, Model } from "sequelize";
import sequelize from "../configurations/database";
import Student from "./Student.Model"; // Đảm bảo bạn đã có Model Student
import Lesson from "./Lesson.Model";
import Course from "./Course.Model";

class LessonProgress extends Model {
  public id!: number;
  public student_id!: number;
  public lesson_id!: number;
  public course_id!: number;
  public is_completed!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

LessonProgress.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    student_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: Student,
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    lesson_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: Lesson,
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    course_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: Course,
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    is_completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: true, // Mặc định là true khi tạo record này
    },
  },
  {
    tableName: "lesson_progress",
    sequelize,
    timestamps: true,
    indexes: [
      {
        unique: true, // Đảm bảo 1 user chỉ có 1 record cho 1 bài học
        fields: ["student_id", "lesson_id"],
      },
    ],
  }
);

// --- ĐỊNH NGHĨA QUAN HỆ (ASSOCIATIONS) ---

// 1. Quan hệ với Student
Student.hasMany(LessonProgress, { foreignKey: "student_id", as: "progress" });
LessonProgress.belongsTo(Student, { foreignKey: "student_id", as: "student" });

// 2. Quan hệ với Lesson
Lesson.hasMany(LessonProgress, { foreignKey: "lesson_id", as: "progress" });
LessonProgress.belongsTo(Lesson, { foreignKey: "lesson_id", as: "lesson" });

// 3. Quan hệ với Course (Để dễ query thống kê theo khóa học)
Course.hasMany(LessonProgress, { foreignKey: "course_id", as: "progress" });
LessonProgress.belongsTo(Course, { foreignKey: "course_id", as: "course" });

export default LessonProgress;