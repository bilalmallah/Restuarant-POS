import { DataTypes } from "sequelize";
import { sequelize } from "../../config/connectDb.js";

/**
 *   open      food is being served, the table is occupied
 *   billed    bill printed, waiting for cash at the counter
 *   paid      settled, money in the drawer
 *   credit    settled against a khata account, money still owed
 *   void      cancelled, kept for the audit trail rather than deleted
 */
export const ORDER_STATUSES = ["open", "billed", "paid", "credit", "void"];
export const ORDER_TYPES = ["dine-in", "takeaway", "delivery"];
export const PAYMENT_METHODS = ["cash", "card", "online", "credit", "split"];
export const DISCOUNT_TYPES = ["amount", "percent"];

const Order = sequelize.define(
  "Order",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    /** Human-readable counter that restarts every day, e.g. 0042. */
    orderNumber: { type: DataTypes.STRING, allowNull: false },
    businessDate: { type: DataTypes.DATEONLY, allowNull: false },

    tableId: { type: DataTypes.INTEGER, allowNull: true },
    waiterId: { type: DataTypes.INTEGER, allowNull: true },
    createdById: { type: DataTypes.INTEGER, allowNull: true },

    orderType: { type: DataTypes.ENUM(...ORDER_TYPES), allowNull: false, defaultValue: "dine-in" },
    status: { type: DataTypes.ENUM(...ORDER_STATUSES), allowNull: false, defaultValue: "open" },
    guests: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    customerName: { type: DataTypes.STRING, allowNull: true },
    customerPhone: { type: DataTypes.STRING, allowNull: true },

    /* ---------- Money. Recalculated from the items on every change. ---------- */
    subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    discountType: { type: DataTypes.ENUM(...DISCOUNT_TYPES), allowNull: false, defaultValue: "amount" },
    discountValue: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    discountAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    taxPercent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    taxAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    serviceCharge: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    deliveryCharge: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    total: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },

    paidAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    /** Cash tendered, kept so the receipt can print the change given. */
    tenderedAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    paymentMethod: { type: DataTypes.ENUM(...PAYMENT_METHODS), allowNull: true },

    /* ---------- Credit ---------- */
    creditPersonId: { type: DataTypes.INTEGER, allowNull: true },
    creditAccountId: { type: DataTypes.INTEGER, allowNull: true },

    /* ---------- Waiter commission, frozen at settlement ---------- */
    commissionPercent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    commissionAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },

    note: { type: DataTypes.TEXT, allowNull: true },
    voidReason: { type: DataTypes.STRING, allowNull: true },
    /** How many times the bill has been printed - a reprint is worth noticing. */
    billPrintCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    openedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    closedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "orders",
    timestamps: true,
    indexes: [
      { unique: true, fields: ["businessDate", "orderNumber"], name: "orders_date_number_unique" },
      { fields: ["status"] },
      { fields: ["tableId"] },
    ],
  }
);

export default Order;
