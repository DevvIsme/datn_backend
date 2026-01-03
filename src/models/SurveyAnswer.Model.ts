import { DataTypes, Model } from "sequelize";
import sequelize from "../configurations/database";
import SurveyQuestionBank from "./SurveyQuestionBank.Model";
import SurveyAttend from "./SurveyAttend.Model";


class SurveyAnswer extends Model {
  public id!: number;
  public survey_attend_id!: number;
  public question_bank_id!: number;
  public score!: number;
  public text_answer!: string;
}

SurveyAnswer.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    survey_attend_id: { type: DataTypes.INTEGER, allowNull: false },
    question_bank_id: { type: DataTypes.INTEGER, allowNull: false },
    score: { type: DataTypes.INTEGER, allowNull: true }, // Điểm (1-5)
    text_answer: { type: DataTypes.TEXT, allowNull: true }, // Câu trả lời text
  },
  { sequelize, tableName: "survey_answer", timestamps: true, updatedAt: false }
);

SurveyAnswer.belongsTo(SurveyQuestionBank, {
  foreignKey: "question_bank_id",
  as: "question_data",
});

// 2. Định nghĩa quan hệ: 1 Câu trả lời thuộc về 1 Lượt làm bài
SurveyAnswer.belongsTo(SurveyAttend, { 
    foreignKey: "survey_attend_id", 
    as: "attend" // Alias này phải khớp với chữ 'as' bạn dùng trong Controller
});



export default SurveyAnswer;
