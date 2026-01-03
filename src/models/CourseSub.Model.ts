import { DataTypes, Model } from "sequelize";
import sequelize from "../configurations/database";
import Course from "./Course.Model";
import Student from "./Student.Model";

class CourseSub extends Model {
  public id!: number;
  public course_id!: number;
  public student_id!: number;
  public rate!: number;
  public process!: number;
  public comment!: string;
}

CourseSub.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    course_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      references: {
        model: Course,
        key: "id",
      },
      allowNull: true,
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    student_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      references: {
        model: Student,
        key: "id",
      },
      allowNull: true,
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    process: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    rate: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  { tableName: "course_subcribe", sequelize, timestamps: true }
);

Course.hasMany(CourseSub, { foreignKey: "course_id", as: "subscribed_course" });
Student.hasMany(CourseSub, {
  foreignKey: "student_id",
  as: "subscribed_student",
});

CourseSub.belongsTo(Course, { foreignKey: "course_id", as: "course_sub" });
CourseSub.belongsTo(Student, { foreignKey: "student_id", as: "student" });

export default CourseSub;
