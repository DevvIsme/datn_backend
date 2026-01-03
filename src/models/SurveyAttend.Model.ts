import { DataTypes, Model } from "sequelize";
import sequelize from "../configurations/database";
import Survey from "./Survey.Model";
import Student from "./Student.Model";
import SurveyAnswer from "./SurveyAnswer.Model";

class SurveyAttend extends Model {
  public id!: number;
  public survey_id!: number;
  public student_id!: number;
  // THÊM DÒNG NÀY:
  public submittedAt!: Date;
}

SurveyAttend.init(
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
 
    submittedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW, // Hoặc defaultValue: new Date()
    },
  },
  { sequelize, timestamps: true, tableName: "survey_attend" }
);

SurveyAttend.belongsTo(Survey, { foreignKey: "survey_id", as: "survey" });
SurveyAttend.belongsTo(Student, { foreignKey: "student_id", as: "student" });

Survey.hasMany(SurveyAttend, { foreignKey: "survey_id", as: "attend" });
Student.hasMany(SurveyAttend, { foreignKey: "student_id", as: "attend" });


export default SurveyAttend;
