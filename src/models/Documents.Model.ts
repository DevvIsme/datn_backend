import { DataTypes, Model } from "sequelize";
import sequelize from "../configurations/database";
import Course from "./Course.Model";
import { triggerAsyncId } from "async_hooks";

class Documents extends Model {
  public id!: number;
  public course_id!: number;
  public name!: string;
  public context!: string;
}

Documents.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    course_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      references: {
        model: Course,
        key: "id",
      },
      allowNull: false,
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    context: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  { sequelize, tableName: "document", timestamps: true }
);

Course.hasMany(Documents, { foreignKey: "course_id", as: "course_document" });
Documents.belongsTo(Course, { foreignKey: "course_id", as: "document_course" });

export default Documents;
