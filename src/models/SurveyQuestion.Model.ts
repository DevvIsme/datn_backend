import { DataTypes, Model } from "sequelize";
import sequelize from "../configurations/database";
import Survey from "./Survey.Model";
import SurveyQuestionBank from "./SurveyQuestionBank.Model";

class SurveyQuestion extends Model {
  public id!: number;
  public survey_id!: number;
  public question_bank_id!: number; // Thêm cột này
  // Xóa public name!: string;
  // Xóa các cột thống kê cũ (very_disagree...) vì đã chuyển sang bảng SurveyAnswer
}

SurveyQuestion.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    survey_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: Survey,
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    // --- THÊM CỘT NÀY ---
    question_bank_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: SurveyQuestionBank,
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    // --- XÓA HẾT CÁC CỘT: name, very_disagree, disagree, neutral, agree, very_agree ---
  },
  { sequelize, timestamps: false, tableName: "survey_question" }
);

// --- SETUP QUAN HỆ ---
// 1. Survey có nhiều câu hỏi (thông qua bảng trung gian này)
Survey.hasMany(SurveyQuestion, { foreignKey: "survey_id", as: "questions" });

// 2. Bảng trung gian thuộc về 1 câu hỏi trong kho
SurveyQuestion.belongsTo(SurveyQuestionBank, {
  foreignKey: "question_bank_id",
  as: "question_data", // Alias này quan trọng để join dữ liệu
});

export default SurveyQuestion;
