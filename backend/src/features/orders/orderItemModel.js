import { DataTypes } from "sequelize";
import { sequelize } from "../../config/connectDb.js";

const OrderItem = sequelize.define(
  "OrderItem",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    orderId: { type: DataTypes.INTEGER, allowNull: false },
    productId: { type: DataTypes.INTEGER, allowNull: true },

    /**
     * Name, price and category are copied onto the line rather than joined at
     * read time. A bill printed in March must keep showing March prices even
     * after the menu is re-priced, and a deleted product must not blank out
     * last month's sales report.
     */
    name: { type: DataTypes.STRING, allowNull: false },
    /** Snapshotted with the name: a bill must still say which size was sold. */
    variantLabel: { type: DataTypes.STRING, allowNull: true },
    categoryName: { type: DataTypes.STRING, allowNull: true },
    /** Editable at the till - double-click the price on the order screen. */
    unitPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    originalPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 1 },
    lineTotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },

    /**
     * The kitchen has already cooked whatever was on the last token, so a
     * reprint must only show the difference. Tokens print quantity minus
     * printedQuantity, then set them equal.
     */
    printedQuantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    printToKitchen: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

    /** "no chilli", "extra raita" - printed on the kitchen token. */
    note: { type: DataTypes.STRING, allowNull: true },
    /** Set when a served item comes back; kept for the void report. */
    isReturned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    returnReason: { type: DataTypes.STRING, allowNull: true },
    createdById: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    tableName: "order_items",
    timestamps: true,
    indexes: [{ fields: ["orderId"] }, { fields: ["productId"] }],
  }
);

export default OrderItem;
