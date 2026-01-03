import { DataTypes, Model } from "sequelize";
import sequelize from "../configurations/database";
import Course from "./Course.Model";
// import CourseLesson from "./CourseLesson.Model";

class Lesson extends Model {
  public id!: number;
  public name!: string;
  public description!: string | null;
  public context!: string | null;
  public type!: string;             // 'text' | 'video' | 'file'
  public file_path!: string | null; // File path nếu có
}

Lesson.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },

    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    context: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    type: {
      type: DataTypes.ENUM("text", "video", "file"),
      allowNull: false,
      defaultValue: "text",
    },

    file_path: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: "lesson",
    sequelize,
    timestamps: true,
  }
);

// /* ======================
//    DEFINE RELATIONS
// ====================== */

// // N-N Lesson ↔ Course thông qua course_lessons
// Lesson.belongsToMany(Course, {
//   through: CourseLesson,
//   foreignKey: "lesson_id",
//   as: "courses",
// });

// Course.belongsToMany(Lesson, {
//   through: CourseLesson,
//   foreignKey: "course_id",
//   as: "lessons",
// });

 export default Lesson;
