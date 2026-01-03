import { DataTypes, Model } from "sequelize";
import sequelize from "../configurations/database";
import Student from "./Student.Model";
import Course from "./Course.Model";

class Payment extends Model {
  public id!: number;
  public app_trans_id!: string; // Mã giao dịch của ZaloPay (quan trọng để tra cứu)
  public student_id!: number;
  public course_id!: number;
  public amount!: number;
  public status!: "pending" | "success" | "failed";

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Payment.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    app_trans_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true, // Mã giao dịch không được trùng
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
    course_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: Course,
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    amount: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "success", "failed"),
      defaultValue: "pending",
    },
  },
  {
    tableName: "payment", // Tên bảng trong DB
    sequelize,
    timestamps: true,
  }
);

// --- Associations (Quan hệ) ---

// Payment thuộc về Student
Payment.belongsTo(Student, { foreignKey: "student_id", as: "student" });
Student.hasMany(Payment, { foreignKey: "student_id", as: "payments" });

// Payment thuộc về Course
Payment.belongsTo(Course, { foreignKey: "course_id", as: "course" });
Course.hasMany(Payment, { foreignKey: "course_id", as: "payments" });

export default Payment;