/* ------------------------------------------------------------------ */
/* SHARED DOMAIN TYPES                                                 */
/*                                                                     */
/* Sequelize returns DECIMAL columns as strings to protect precision,   */
/* so anything that is money is typed `number | string` and passed      */
/* through `money()` or `Number()` before arithmetic.                   */
/* ------------------------------------------------------------------ */

export type Role = "admin" | "manager" | "cashier";

export type AuthUser = {
  id: number;
  name: string;
  username: string;
  email: string | null;
  role: Role;
  isActive: boolean;
  token?: string;
};

export type MessageResponse = { message: string };

/* ---------------- Floor ---------------- */

export type TableStatus = "free" | "occupied" | "reserved" | "billed";

export type DiningTable = {
  id: number;
  name: string;
  area: string;
  capacity: number;
  status: TableStatus;
  sortOrder: number;
  isActive: boolean;
};

export type FloorTable = Omit<DiningTable, "isActive"> & {
  order: {
    id: number;
    orderNumber: string;
    status: OrderStatus;
    total: number;
    guests: number;
    openedAt: string;
    waiterName: string | null;
  } | null;
};

export type Floor = { areas: string[]; tables: FloorTable[] };

/* ---------------- Menu ---------------- */

export type Category = {
  id: number;
  name: string;
  colour: string;
  sortOrder: number;
  isActive: boolean;
};

export type Product = {
  id: number;
  name: string;
  description: string | null;
  /** "Small" / "Medium" / "Large" for sized items, null otherwise. */
  variantLabel: string | null;
  code: string | null;
  categoryId: number;
  category?: Pick<Category, "id" | "name" | "colour">;
  price: number | string;
  printToKitchen: boolean;
  commissionPercent: number | string | null;
  sortOrder: number;
  isActive: boolean;
};

export type MenuProduct = {
  id: number;
  name: string;
  description: string | null;
  variantLabel: string | null;
  code: string | null;
  price: number;
  categoryId: number;
  categoryName: string;
  printToKitchen: boolean;
  commissionPercent: number | null;
};

export type MenuCategory = {
  id: number;
  name: string;
  colour: string;
  products: MenuProduct[];
};

/* ---------------- Orders ---------------- */

export type OrderStatus = "open" | "billed" | "paid" | "credit" | "void";
export type OrderType = "dine-in" | "takeaway" | "delivery";
export type PaymentMethod = "cash" | "card" | "online" | "credit" | "split";
export type DiscountType = "amount" | "percent";

export type OrderItem = {
  id: number;
  orderId: number;
  productId: number | null;
  name: string;
  variantLabel: string | null;
  categoryName: string | null;
  unitPrice: string | number;
  originalPrice: string | number;
  quantity: string | number;
  lineTotal: string | number;
  printedQuantity: string | number;
  printToKitchen: boolean;
  note: string | null;
  isReturned: boolean;
};

export type Order = {
  id: number;
  orderNumber: string;
  businessDate: string;
  tableId: number | null;
  waiterId: number | null;
  orderType: OrderType;
  status: OrderStatus;
  guests: number;
  customerName: string | null;
  customerPhone: string | null;
  subtotal: string | number;
  discountType: DiscountType;
  discountValue: string | number;
  discountAmount: string | number;
  taxPercent: string | number;
  taxAmount: string | number;
  serviceCharge: string | number;
  deliveryCharge: string | number;
  total: string | number;
  paidAmount: string | number;
  tenderedAmount: string | number;
  paymentMethod: PaymentMethod | null;
  creditPersonId: number | null;
  creditAccountId: number | null;
  commissionPercent: string | number;
  commissionAmount: string | number;
  note: string | null;
  voidReason: string | null;
  billPrintCount: number;
  openedAt: string;
  closedAt: string | null;
  items?: OrderItem[];
  table?: { id: number; name: string; area: string } | null;
  waiter?: { id: number; name: string } | null;
  createdBy?: { id: number; name: string } | null;
  creditPerson?: { id: number; name: string; phone: string | null } | null;
  creditAccount?: { id: number; name: string } | null;
};

export type KitchenToken = {
  orderId: number;
  orderNumber: string;
  tableName: string | null;
  waiterName: string | null;
  orderType: OrderType;
  guests: number;
  note: string | null;
  printedAt: string;
  isReprint?: boolean;
  lines: {
    id: number;
    name: string;
    variantLabel: string | null;
    note: string | null;
    quantity: number;
  }[];
};

/* ---------------- Staff ---------------- */

export type EmployeeRole =
  | "waiter"
  | "chef"
  | "helper"
  | "cashier"
  | "manager"
  | "cleaner"
  | "other";

export type PayType = "monthly" | "daily" | "commission";

export type Employee = {
  id: number;
  name: string;
  phone: string | null;
  cnic: string | null;
  role: EmployeeRole;
  payType: PayType;
  monthlySalary: number | string;
  dailyWage: number | string;
  commissionPercent: number | string;
  isWaiter: boolean;
  joiningDate: string | null;
  isActive: boolean;
  notes: string | null;
  pending?: number;
  lastEntryDate?: string | null;
};

export type Waiter = {
  id: number;
  name: string;
  role: EmployeeRole;
  commissionPercent: string | number;
};

export type LedgerType =
  | "salary"
  | "wage"
  | "commission"
  | "bonus"
  | "advance"
  | "payment"
  | "deduction";

export type LedgerEntry = {
  id: number;
  employeeId: number;
  type: LedgerType;
  amount: number;
  entryDate: string;
  periodMonth: string | null;
  description: string | null;
  runningBalance?: number;
  employee?: { id: number; name: string; role: EmployeeRole; payType: PayType };
};

export type LedgerSummary = {
  salary: number;
  wage: number;
  commission: number;
  bonus: number;
  advance: number;
  payment: number;
  deduction: number;
  earned: number;
  settled: number;
  pending: number;
};

export type EmployeeStatement = {
  employee: Employee;
  summary: LedgerSummary;
  entries: LedgerEntry[];
  sales: {
    orderCount: number;
    totalSales: number;
    totalCommission: number;
    orders: {
      id: number;
      orderNumber: string;
      businessDate: string;
      total: string;
      commissionAmount: string;
    }[];
  };
};

export type PayrollRow = {
  id: number;
  name: string;
  role: EmployeeRole;
  payType: PayType;
  monthlySalary: number;
  dailyWage: number;
  commissionPercent: number;
  periodEarned: number;
  periodCommission: number;
  periodAdvance: number;
  periodPaid: number;
  pending: number;
};

export type PayrollSummary = {
  rows: PayrollRow[];
  totals: {
    earned: number;
    commission: number;
    advance: number;
    paid: number;
    pending: number;
  };
};

/* ---------------- Credit ---------------- */

export type CreditTxnType = "credit" | "payment" | "adjustment";

export type CreditAccount = {
  id: number;
  creditPersonId: number;
  name: string;
  openingBalance: number;
  balance?: number;
  isActive: boolean;
};

export type CreditPerson = {
  id: number;
  name: string;
  phone: string | null;
  company: string | null;
  address: string | null;
  creditLimit: number;
  isActive: boolean;
  notes: string | null;
  balance?: number;
  lastEntryDate?: string | null;
  accounts?: CreditAccount[];
};

export type CreditPersonList = {
  rows: CreditPerson[];
  totals: { people: number; outstanding: number; advance: number };
};

export type CreditEntry = {
  id: number;
  creditPersonId: number;
  creditAccountId: number;
  orderId: number | null;
  type: CreditTxnType;
  amount: number;
  entryDate: string;
  paymentMethod: string | null;
  description: string | null;
  signedAmount?: number;
  runningBalance?: number;
  account?: { id: number; name: string };
  person?: { id: number; name: string; phone: string | null };
  order?: { id: number; orderNumber: string } | null;
};

export type CreditStatement = {
  person: CreditPerson;
  accounts: CreditAccount[];
  summary: {
    openingBalance: number;
    totalCredit: number;
    totalPaid: number;
    closingBalance: number;
  };
  entries: CreditEntry[];
};

/* ---------------- Expenses ---------------- */

export type Expense = {
  id: number;
  entryDate: string;
  category: string;
  title: string;
  amount: number;
  paidTo: string | null;
  paymentMethod: string;
  billNumber: string | null;
  note: string | null;
  createdBy?: { id: number; name: string } | null;
};

export type ExpenseList = {
  rows: Expense[];
  totals: { count: number; amount: number };
  byCategory: { category: string; amount: number }[];
};

/* ---------------- Kitchen ---------------- */

export type KitchenUnit =
  | "kg"
  | "gram"
  | "litre"
  | "ml"
  | "piece"
  | "packet"
  | "dozen"
  | "bundle"
  | "bottle"
  | "tin";

export type KitchenCategory = {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export type KitchenItem = {
  id: number;
  name: string;
  kitchenCategoryId: number;
  kitchenCategory?: { id: number; name: string };
  unit: KitchenUnit;
  minQuantity: number | string;
  defaultOrderQuantity: number | string;
  supplier: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type KitchenGroup = {
  id: number;
  name: string;
  items: {
    id: number;
    name: string;
    unit: KitchenUnit;
    minQuantity: number;
    defaultOrderQuantity: number;
    supplier: string | null;
    kitchenCategoryId: number;
    categoryName: string;
  }[];
};

export type StockStatus = "available" | "low" | "out";

export type ClosingItem = {
  id: number;
  closingId: number;
  kitchenItemId: number | null;
  itemName: string;
  categoryName: string | null;
  unit: string;
  status: StockStatus;
  inStockQuantity: number | string;
  demandQuantity: number | string;
  note: string | null;
  sortOrder: number;
};

export type Closing = {
  id: number;
  businessDate: string;
  status: "draft" | "completed";
  checkedById: number | null;
  checkedByName: string | null;
  note: string | null;
  completedAt: string | null;
  items?: ClosingItem[];
  checkedBy?: { id: number; name: string } | null;
  stats?: { total: number; low: number; out: number; demand: number };
};

export type ShoppingList = {
  closingId: number;
  businessDate: string;
  checkedByName: string | null;
  status: "draft" | "completed";
  note: string | null;
  totalItems: number;
  outOfStock: number;
  lowStock: number;
  groups: {
    name: string;
    items: {
      id: number;
      name: string;
      unit: string;
      status: StockStatus;
      inStockQuantity: number;
      demandQuantity: number;
      note: string | null;
    }[];
  }[];
};

/* ---------------- Reports ---------------- */

export type DateRange = { from: string; to: string };

export type SalesReport = {
  range: DateRange;
  totals: {
    grossSales: number;
    discount: number;
    tax: number;
    serviceCharge: number;
    deliveryCharge: number;
    netSales: number;
    received: number;
    commission: number;
    guests: number;
    onCredit: number;
    orderCount: number;
    voidedCount: number;
    averageBill: number;
    averagePerGuest: number;
  };
  byPaymentMethod: { method: string; amount: number }[];
  byOrderType: { type: string; amount: number }[];
  byDay: { date: string; orders: number; sales: number; discount: number }[];
  orders: {
    id: number;
    orderNumber: string;
    businessDate: string;
    openedAt: string;
    tableName: string | null;
    waiterName: string | null;
    orderType: OrderType;
    status: OrderStatus;
    paymentMethod: PaymentMethod | null;
    subtotal: number;
    discountAmount: number;
    total: number;
    paidAmount: number;
  }[];
};

export type ProductReport = {
  range: DateRange;
  totals: { productCount: number; quantity: number; amount: number };
  byCategory: { categoryName: string; quantity: number; amount: number }[];
  products: {
    name: string;
    categoryName: string;
    quantity: number;
    amount: number;
    lineCount: number;
    averagePrice: number;
  }[];
};

export type DayBook = {
  range: DateRange;
  totals: {
    orderCount: number;
    sales: number;
    cashReceived: number;
    creditGiven: number;
    creditRecovered: number;
    expenses: number;
    staffPaid: number;
    moneyIn: number;
    moneyOut: number;
    netInHand: number;
    netProfit: number;
  };
  byDay: {
    date: string;
    sales: number;
    cashReceived: number;
    creditGiven: number;
    creditRecovered: number;
    expenses: number;
    staffPaid: number;
  }[];
  expensesByCategory: { category: string; amount: number }[];
};

export type WaiterReport = {
  range: DateRange;
  rows: {
    employeeId: number;
    name: string;
    role: EmployeeRole | null;
    orderCount: number;
    guests: number;
    sales: number;
    discount: number;
    commission: number;
    averageBill: number;
  }[];
  totals: { orderCount: number; sales: number; commission: number };
};

export type Dashboard = {
  date: string;
  today: {
    sales: number;
    orderCount: number;
    averageBill: number;
    cashReceived: number;
    expenses: number;
    netInHand: number;
    guests: number;
  };
  outstandingCredit: number;
  openOrders: {
    id: number;
    orderNumber: string;
    tableName: string | null;
    waiterName: string | null;
    status: OrderStatus;
    total: number;
    openedAt: string;
  }[];
  trend: { date: string; sales: number }[];
};

/* ---------------- Settings ---------------- */

export type AppSettings = {
  taxPercent: string;
  serviceChargePercent: string;
  defaultCommissionPercent: string;
  printTokenOnSave: string;

  /* Receipt layout - all stored as strings, parsed by receiptOptions.ts */
  receiptWidth: string;
  receiptHeaderText: string;
  receiptFooter: string;
  showAddressOnReceipt: string;
  showPhoneOnReceipt: string;
  showWaiterOnReceipt: string;
  showGuestsOnReceipt: string;
  showRateColumn: string;
  showTaxOnReceipt: string;
  showFooterNote: string;
  showPrintedAt: string;
  receiptFontScale: string;
  receiptCopies: string;
  receiptFeedLines: string;
  /** Settings are stored as strings; "true"/"false" for the toggles. */
  silentPrint: string;
  receiptPrinterName: string;
  kitchenPrinterName: string;
};

export type Printer = {
  name: string;
  driver: string | null;
  port: string | null;
  /** What Windows calls the state, e.g. "Normal", "PaperOut", "Offline". */
  statusName: string;
  status: "ready" | "offline";
  offline: boolean;
};

export type PrinterList = {
  supported: boolean;
  reason: string | null;
  printers: Printer[];
};

export type SettingsResponse = {
  branding: {
    appName: string;
    tagline: string;
    currency: string;
    phone: string;
    address: string;
    footerNote: string;
  };
  settings: AppSettings;
};

/* ---------------- Backups ---------------- */

export type BackupFile = {
  name: string;
  sizeBytes: number;
  createdAt: string;
};

export type BackupStatus = {
  enabled: boolean;
  directory: string;
  intervalDays: number;
  keep: number;
  pgDump: string;
  latest: BackupFile | null;
  count: number;
  dueAt: string | null;
  overdue: boolean;
};
