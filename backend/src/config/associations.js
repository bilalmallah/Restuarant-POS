/**
 * Every association in one place.
 *
 * Models stay inside their own feature folder (QANAT convention), but the
 * relationships between them do not belong to any single feature - and
 * declaring them inside the model files made the import graph circular the
 * moment orders needed products and products needed order history. Importing
 * this module once, at boot, is what makes `include` work anywhere.
 */
import User from "../features/users/userModel.js";
import Table from "../features/tables/tableModel.js";
import Category from "../features/categories/categoryModel.js";
import Product from "../features/products/productModel.js";
import Employee from "../features/employees/employeeModel.js";
import Order from "../features/orders/orderModel.js";
import OrderItem from "../features/orders/orderItemModel.js";
import CreditPerson from "../features/credit/creditPersonModel.js";
import CreditAccount from "../features/credit/creditAccountModel.js";
import CreditTransaction from "../features/credit/creditTransactionModel.js";
import Expense from "../features/expenses/expenseModel.js";
import EmployeeLedger from "../features/payroll/employeeLedgerModel.js";
import KitchenCategory from "../features/kitchen/kitchenCategoryModel.js";
import KitchenItem from "../features/kitchen/kitchenItemModel.js";
import Closing from "../features/closings/closingModel.js";
import ClosingItem from "../features/closings/closingItemModel.js";
import Setting from "../features/settings/settingModel.js";

/* ---------------- Menu ---------------- */
Category.hasMany(Product, { foreignKey: "categoryId", as: "products", onDelete: "RESTRICT" });
Product.belongsTo(Category, { foreignKey: "categoryId", as: "category" });

/* ---------------- Orders ---------------- */
Order.hasMany(OrderItem, { foreignKey: "orderId", as: "items", onDelete: "CASCADE" });
OrderItem.belongsTo(Order, { foreignKey: "orderId", as: "order" });

/** SET NULL, not RESTRICT: a product may be retired, its sales history may not. */
Product.hasMany(OrderItem, { foreignKey: "productId", as: "orderItems", onDelete: "SET NULL" });
OrderItem.belongsTo(Product, { foreignKey: "productId", as: "product" });

Table.hasMany(Order, { foreignKey: "tableId", as: "orders", onDelete: "SET NULL" });
Order.belongsTo(Table, { foreignKey: "tableId", as: "table" });

Employee.hasMany(Order, { foreignKey: "waiterId", as: "servedOrders", onDelete: "SET NULL" });
Order.belongsTo(Employee, { foreignKey: "waiterId", as: "waiter" });

Order.belongsTo(User, { foreignKey: "createdById", as: "createdBy" });
OrderItem.belongsTo(User, { foreignKey: "createdById", as: "createdBy" });

/* ---------------- Credit book ---------------- */
CreditPerson.hasMany(CreditAccount, { foreignKey: "creditPersonId", as: "accounts", onDelete: "CASCADE" });
CreditAccount.belongsTo(CreditPerson, { foreignKey: "creditPersonId", as: "person" });

CreditPerson.hasMany(CreditTransaction, { foreignKey: "creditPersonId", as: "transactions", onDelete: "CASCADE" });
CreditTransaction.belongsTo(CreditPerson, { foreignKey: "creditPersonId", as: "person" });

CreditAccount.hasMany(CreditTransaction, { foreignKey: "creditAccountId", as: "transactions", onDelete: "CASCADE" });
CreditTransaction.belongsTo(CreditAccount, { foreignKey: "creditAccountId", as: "account" });

Order.hasOne(CreditTransaction, { foreignKey: "orderId", as: "creditEntry", onDelete: "SET NULL" });
CreditTransaction.belongsTo(Order, { foreignKey: "orderId", as: "order" });

Order.belongsTo(CreditPerson, { foreignKey: "creditPersonId", as: "creditPerson" });
Order.belongsTo(CreditAccount, { foreignKey: "creditAccountId", as: "creditAccount" });

/* ---------------- Payroll ---------------- */
Employee.hasMany(EmployeeLedger, { foreignKey: "employeeId", as: "ledger", onDelete: "CASCADE" });
EmployeeLedger.belongsTo(Employee, { foreignKey: "employeeId", as: "employee" });
EmployeeLedger.belongsTo(User, { foreignKey: "createdById", as: "createdBy" });

/* ---------------- Expenses ---------------- */
Expense.belongsTo(User, { foreignKey: "createdById", as: "createdBy" });

/* ---------------- Kitchen store ---------------- */
KitchenCategory.hasMany(KitchenItem, { foreignKey: "kitchenCategoryId", as: "items", onDelete: "RESTRICT" });
KitchenItem.belongsTo(KitchenCategory, { foreignKey: "kitchenCategoryId", as: "kitchenCategory" });

Closing.hasMany(ClosingItem, { foreignKey: "closingId", as: "items", onDelete: "CASCADE" });
ClosingItem.belongsTo(Closing, { foreignKey: "closingId", as: "closing" });

KitchenItem.hasMany(ClosingItem, { foreignKey: "kitchenItemId", as: "closingItems", onDelete: "SET NULL" });
ClosingItem.belongsTo(KitchenItem, { foreignKey: "kitchenItemId", as: "kitchenItem" });

Closing.belongsTo(User, { foreignKey: "checkedById", as: "checkedBy" });

/**
 * Creation order matters for `sync`: a table cannot be created before the one
 * its foreign keys point at. Export them already sorted.
 */
export const modelsInDependencyOrder = [
  User,
  Table,
  Category,
  Product,
  Employee,
  CreditPerson,
  CreditAccount,
  Order,
  OrderItem,
  CreditTransaction,
  Expense,
  EmployeeLedger,
  KitchenCategory,
  KitchenItem,
  Closing,
  ClosingItem,
  Setting,
];

export {
  User, Table, Category, Product, Employee, Order, OrderItem,
  CreditPerson, CreditAccount, CreditTransaction, Expense, EmployeeLedger,
  KitchenCategory, KitchenItem, Closing, ClosingItem, Setting,
};
