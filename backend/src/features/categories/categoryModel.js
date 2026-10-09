import { DataTypes } from "sequelize";
import { sequelize } from "../../config/connectDb.js";

const Category = sequelize.define(
  "Category",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: { msg: "A category with this name already exists" },
    },
    colour: { type: DataTypes.STRING, allowNull: false, defaultValue: "#2563eb" },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { tableName: "categories", timestamps: true }
);

export default Category;
