import { DataTypes } from "sequelize";
import { sequelize } from "../../config/connectDb.js";

export const EMPLOYEE_ROLES = ["waiter", "chef", "helper", "cashier", "manager", "cleaner", "other"];
export const PAY_TYPES = ["monthly", "daily", "commission"];

const Employee = sequelize.define(
  "Employee",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: true },
    cnic: { type: DataTypes.STRING, allowNull: true },
    role: { type: DataTypes.ENUM(...EMPLOYEE_ROLES), allowNull: false, defaultValue: "waiter" },

    /**
     * Pay structure. A monthly cook, a daily-wage helper and a commission-only
     * waiter all live in this one table, so only the field matching payType
     * is meaningful - the payroll service reads the right one per employee.
     */
    payType: { type: DataTypes.ENUM(...PAY_TYPES), allowNull: false, defaultValue: "monthly" },
    monthlySalary: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    dailyWage: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    commissionPercent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },

    /** Only waiters appear in the "who is serving this table" picker. */
    isWaiter: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    joiningDate: { type: DataTypes.DATEONLY, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  { tableName: "employees", timestamps: true }
);

export default Employee;
