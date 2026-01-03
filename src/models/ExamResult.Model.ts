import { DataTypes, Model } from "sequelize";
import sequelize from "../configurations/database";
import { DetailResult } from "../interfaces/Exam.interface";
import Student from "./Student.Model";
import Exam from "./Exam.Model";

class ExamResult extends Model {
  public id!: number;
  public exam_id!: number;
  public student_id!: number;
  public isPass!: boolean;
  public point!: number;
  public correctAns!: number;
  public detailResult!: DetailResult[];
  public submitAt!: Date;
  public createdAt!: Date;
}

ExamResult.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    student_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: Student,
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    exam_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: Exam,
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    isPass: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    point: {
      type: DataTypes.DOUBLE,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 10,
      },
    },
    correctAns: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    detailResult: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    submitAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },

  { sequelize, tableName: "exam_result", timestamps: true }
);

ExamResult.belongsTo(Student, { foreignKey: "student_id", as: "student" });
ExamResult.belongsTo(Exam, { foreignKey: "exam_id", as: "exam" });

Student.hasMany(ExamResult, { foreignKey: "student_id", as: "result" });
Exam.hasMany(ExamResult, { foreignKey: "exam_id", as: "result" });

export default ExamResult;
