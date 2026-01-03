import { DataTypes, Model } from "sequelize";
import sequelize from "../configurations/database";

class SurveyQuestionBank extends Model {
  public id!: number;
  public content!: string;
  public type!: string;
}

SurveyQuestionBank.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    content: { type: DataTypes.TEXT, allowNull: false },
    type: {
      type: DataTypes.ENUM("rating", "text", "choice"),
      defaultValue: "rating",
    },
  },
  { sequelize, tableName: "survey_question_bank", timestamps: true }
);

export default SurveyQuestionBank;
