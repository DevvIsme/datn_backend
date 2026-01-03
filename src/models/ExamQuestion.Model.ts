import { Model, DataTypes } from "sequelize";
import sequelize from "../configurations/database"; // Hãy đảm bảo đường dẫn này đúng với project của bạn
import Topic from "./Topic.Model";

class ExamQuestion extends Model {
  public id!: number;
  public name!: string;
  public type!: "radio" | "checkbox";
  public choice!: string; // Lưu dưới dạng string JSON
  public correctAns!: string; // Lưu dưới dạng string JSON
  public topic_id!: number;
}

ExamQuestion.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("radio", "checkbox"),
      allowNull: false,
    },
    choice: {
      type: DataTypes.TEXT("long"), // SQL là longtext
      allowNull: false,
      // Lưu ý: Controller của bạn đang tự parse JSON, nên để TEXT là an toàn nhất
    },
    correctAns: {
      type: DataTypes.TEXT("long"), // SQL là longtext
      allowNull: false,
    },
    topic_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "question", // Tên bảng trong SQL là 'question'
    timestamps: false, // SQL không có createdAt/updatedAt cho bảng này
  }
);

// Định nghĩa quan hệ nếu cần (Question thuộc về 1 Topic)
ExamQuestion.belongsTo(Topic, { foreignKey: "topic_id", as: "topic" });

export default ExamQuestion;
