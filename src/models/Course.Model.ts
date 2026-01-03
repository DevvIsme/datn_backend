import { DataTypes, Model } from "sequelize";
import sequelize from "../configurations/database";
import Topic from "./Topic.Model";

class Course extends Model {
  public id!: number;
  public topic_id!: number;
  public name!: string;
  public description!: string;
  public thumbnail!: string;
  public slug!: string;
  public type!: boolean;
  public start_date!: Date | null;
  public end_date!: Date | null;
  public price!: number;
  public status!: "active" | "hidden" | "locked";
}

Course.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    topic_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      references: {
        model: Topic,
        key: "id",
      },
      allowNull: true,
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    thumbnail: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: "course.png",
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    type: {
      type: DataTypes.BOOLEAN,
      defaultValue: 0,
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    price: {
      type: DataTypes.DOUBLE, // Hoặc DECIMAL(10, 2) nếu muốn chính xác tuyệt đối
      allowNull: false,
      defaultValue: 0, // Mặc định là miễn phí
    },
    status: {
      type: DataTypes.ENUM("active", "hidden", "locked"),
      allowNull: false,
      defaultValue: "active",
    },
  },
  { tableName: "course", sequelize, timestamps: true }
);

Topic.hasMany(Course, { foreignKey: "topic_id", as: "course" });
Course.belongsTo(Topic, { foreignKey: "topic_id", as: "topic" });

export default Course;
