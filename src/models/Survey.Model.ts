import { DataTypes, Model } from "sequelize";
import sequelize from "../configurations/database";
import Topic from "./Topic.Model";

class Survey extends Model {
  public id!: number;
  public name!: string;
  public slug!: string;
  public dueAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public status!: "active" | "hidden" | "locked";
}

Survey.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    dueAt: {
      type: DataTypes.DATE,
      defaultValue: new Date(new Date().setDate(new Date().getDate() + 7)),
    },
    status: {
      type: DataTypes.ENUM("active", "hidden", "locked"),
      defaultValue: "active",
    },
  },
  { sequelize, timestamps: true, tableName: "survey" }
);

export default Survey;
