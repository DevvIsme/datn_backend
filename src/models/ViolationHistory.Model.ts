// src/models/ViolationHistory.Model.ts
import { DataTypes, Model } from "sequelize";
import sequelize from "../configurations/database";
import Student from "./Student.Model";
import Exam from "./Exam.Model";

class ViolationHistory extends Model {}

ViolationHistory.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    student_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    exam_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM(
        "cheating_tab_switch",
        "face_missing",
        "multiple_faces",
        "detect_phone",
        "rude_comment",
        "other"
      ),
      defaultValue: "other",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    evidence_image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    severity: {
      type: DataTypes.ENUM("warning", "cancel_exam", "account_lock"),
      defaultValue: "warning",
    },
    detectedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "violation_history",
    timestamps: false, // Vì ta đã có detectedAt
  }
);

// Thiết lập quan hệ (Optional - giúp query dễ hơn sau này)
ViolationHistory.belongsTo(Student, {
  foreignKey: "student_id",
  as: "student",
});
ViolationHistory.belongsTo(Exam, { foreignKey: "exam_id", as: "exam" });

export default ViolationHistory;
