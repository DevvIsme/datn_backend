import { DataTypes, Model } from "sequelize";
import sequelize from "../configurations/database";

class Topic extends Model {
  public id!: number;
  public name!: string;
  public description!: string;
  public slug!: string;
}

Topic.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  { tableName: "topic", sequelize, timestamps: false }
);

export default Topic;
