import { DataTypes, Model } from "sequelize";
import sequelize from "../configurations/database";

class Student extends Model {
  public id!: number;
  public fullName!: string;
  public email!: string;
  public hashPassword!: string;
  public status!: boolean;
  public avatar!: string;
  public gender!: string;
  public phone!: string | null;
  public birthday!: Date | null;
  public googleId!: string | null;
}

Student.init(
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
      allowNull: true,
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    avatar: {
      type: DataTypes.STRING(255),
      defaultValue: "avatar.png",
    },
    gender: {
      type: DataTypes.STRING(10),
      defaultValue: "other",
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    birthday: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    googleId: {
      // <--- THÊM CỘT NÀY
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  { tableName: "student", sequelize, timestamps: true }
);

export default Student;
