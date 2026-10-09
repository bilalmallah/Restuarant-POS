import { DataTypes } from "sequelize";
import bcrypt from "bcrypt";
import { sequelize } from "../../config/connectDb.js";

export const USER_ROLES = ["admin", "manager", "cashier"];

const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: { msg: "This username is already taken" },
    },
    email: { type: DataTypes.STRING, allowNull: true, unique: { msg: "This email is already registered" } },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM(...USER_ROLES), allowNull: false, defaultValue: "cashier" },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: "users",
    timestamps: true,
    defaultScope: { attributes: { exclude: ["password"] } },
    scopes: { withPassword: { attributes: { include: ["password"] } } },
    hooks: {
      beforeCreate: async (user) => {
        user.password = await bcrypt.hash(user.password, 10);
      },
      beforeUpdate: async (user) => {
        if (user.changed("password")) user.password = await bcrypt.hash(user.password, 10);
      },
    },
  }
);

User.prototype.validatePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

export default User;
