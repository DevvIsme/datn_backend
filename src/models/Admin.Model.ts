import { DataTypes, Model } from "sequelize";
import sequelize from "../configurations/database";

class Admin extends Model {
  public id!: number;
  public fullName!: string;
  public email!: string;
  public hashPassword!: string;
  public role!: number;
  public course_permission!: boolean;
  public student_permission!: boolean;
  public exam_permission!: boolean;
  public status!: boolean;
}

Admin.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    fullName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    hashPassword: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("2", "1"),
      defaultValue: 1,
      allowNull: false,
    },
    course_permission: {
      type: DataTypes.BOOLEAN,
      defaultValue: 0,
    },
    student_permission: {
      type: DataTypes.BOOLEAN,
      defaultValue: 0,
    },
    exam_permission: {
      type: DataTypes.BOOLEAN,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  { tableName: "admin", sequelize, timestamps: false }
);

export default Admin;
