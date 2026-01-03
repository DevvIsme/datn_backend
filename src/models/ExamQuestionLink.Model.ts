import { Model, DataTypes } from "sequelize";
import sequelize from "../configurations/database"; // Hãy đảm bảo đường dẫn này đúng
import Exam from "./Exam.Model";
import ExamQuestion from "./ExamQuestion.Model";

class ExamQuestionLink extends Model {
  public id!: number;
  public exam_id!: number;
  public question_id!: number;
  public point!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ExamQuestionLink.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    exam_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: "exam",
        key: "id",
      },
    },
    question_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "question",
        key: "id",
      },
    },
    point: {
      type: DataTypes.DOUBLE,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: "exam_questions", // Tên bảng trong SQL
    timestamps: true, // Bảng này có createdAt và updatedAt
  }
);

// Thiết lập quan hệ (Optional: Thường đặt ở file association hoặc init)
// Exam.belongsToMany(ExamQuestion, { through: ExamQuestionLink, foreignKey: 'exam_id' });
// ExamQuestion.belongsToMany(Exam, { through: ExamQuestionLink, foreignKey: 'question_id' });

export default ExamQuestionLink;
