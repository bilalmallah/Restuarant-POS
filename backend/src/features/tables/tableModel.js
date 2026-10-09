import { DataTypes } from "sequelize";
import { sequelize } from "../../config/connectDb.js";

export const TABLE_STATUSES = ["free", "occupied", "reserved"];

const Table = sequelize.define(
  "Table",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: { msg: "A table with this name already exists" },
    },
    area: { type: DataTypes.STRING, allowNull: false, defaultValue: "Main Hall" },
    capacity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 4 },
    /**
     * Denormalised on purpose: the POS table grid is polled constantly and
     * deriving "is anyone sitting here" from open orders on every paint made
     * the floor screen visibly slow. Orders keep this column in sync.
     */
    status: { type: DataTypes.ENUM(...TABLE_STATUSES), allowNull: false, defaultValue: "free" },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { tableName: "tables", timestamps: true }
);

export default Table;
