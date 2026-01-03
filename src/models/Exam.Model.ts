import { DataTypes, Model } from "sequelize";
import sequelize from "../configurations/database";
import Topic from "./Topic.Model";

class Exam extends Model {
  public id!: number;
  public name!: string;
  public slug!: string;
  public numberQuestion!: number;
  public passingScore!: number;
  public submitTime!: number;
  public reDoTime!: number;
  public studentDid!: number;
  public topic_id!: number;
  public shuffle_answers!: number;
  public shuffle_questions!: number;
  public status!: number;
  public start_date!: Date | null;
  public end_date!: Date | null;
  public is_ai_proctoring!: boolean;
}

Exam.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    numberQuestion: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    passingScore: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    submitTime: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    reDoTime: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    studentDid: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    topic_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: Topic,
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    shuffle_questions: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    shuffle_answers: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 1,
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    is_ai_proctoring: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
  },
  { sequelize, timestamps: true, tableName: "exam" }
);

Topic.hasMany(Exam, { foreignKey: "topic_id", as: "exam" });
Exam.belongsTo(Topic, { foreignKey: "topic_id", as: "topic" });

export default Exam;
