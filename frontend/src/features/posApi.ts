import baseApi from "../app/baseApi";
import { buildQuery } from "../utils/api";
import type {
  AuthUser,
  MessageResponse,
  DiningTable,
  Floor,
  Category,
  Product,
  MenuCategory,
  Order,
  KitchenToken,
  Employee,
  Waiter,
  EmployeeStatement,
  LedgerEntry,
  PayrollSummary,
  CreditPerson,
  CreditPersonList,
  CreditAccount,
  CreditEntry,
  CreditStatement,
  Expense,
  ExpenseList,
  KitchenCategory,
  KitchenItem,
  KitchenGroup,
  Closing,
  ShoppingList,
  SalesReport,
  ProductReport,
  DayBook,
  WaiterReport,
  Dashboard,
  SettingsResponse,
  AppSettings,
  PrinterList,
  BackupFile,
  BackupStatus,
} from "../types";

type Saved<T> = { message: string; data: T };
type Params = Record<string, string | number | boolean | undefined | null>;

/**
 * Every endpoint in one slice.
 *
 * RTK Query already namespaces by feature through its tag types, and keeping
 * the whole surface in one file means the tag graph - which is what makes the
 * floor plan refresh the moment a bill is settled - can be read in one sitting
 * instead of being reconstructed from a dozen injectEndpoints calls.
 */
export const posApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /* ============================ AUTH ============================ */

    login: builder.mutation<AuthUser, { username: string; password: string }>({
      query: (body) => buildQuery("/users/login", "POST")({ body }),
    }),

    getMe: builder.query<AuthUser, void>({
      query: () => buildQuery("/users/me")(),
      providesTags: ["Auth"],
    }),

    changeMyPassword: builder.mutation<
      MessageResponse,
      { currentPassword: string; newPassword: string }
    >({
      query: (body) => buildQuery("/users/me/password", "PATCH")({ body }),
    }),

    listUsers: builder.query<AuthUser[], void>({
      query: () => buildQuery("/users")(),
      providesTags: ["Users"],
    }),

    createUser: builder.mutation<Saved<AuthUser>, Record<string, unknown>>({
      query: (body) => buildQuery("/users", "POST")({ body }),
      invalidatesTags: ["Users"],
    }),

    updateUser: builder.mutation<Saved<AuthUser>, { id: number; body: Record<string, unknown> }>({
      query: ({ id, body }) => buildQuery(`/users/${id}`, "PUT")({ body }),
      invalidatesTags: ["Users"],
    }),

    deleteUser: builder.mutation<MessageResponse, number>({
      query: (id) => buildQuery(`/users/${id}`, "DELETE")(),
      invalidatesTags: ["Users"],
    }),

    /* ========================== SETTINGS ========================== */

    getSettings: builder.query<SettingsResponse, void>({
      query: () => buildQuery("/settings")(),
      providesTags: ["Settings"],
    }),

    updateSettings: builder.mutation<Saved<AppSettings>, Partial<Record<string, unknown>>>({
      query: (body) => buildQuery("/settings", "PUT")({ body }),
      invalidatesTags: ["Settings"],
    }),

    /* =========================== PRINTING ========================= */

    listPrinters: builder.query<PrinterList, void>({
      query: () => buildQuery("/print/printers")(),
      providesTags: ["Printers"],
    }),

    /**
     * The browser lays the receipt out (it owns the design); the API owns the
     * hardware. Posting the finished text means no print dialog and a real
     * error when the printer is off.
     */
    sendToPrinter: builder.mutation<
      { message: string; printer: string },
      { target: "receipt" | "kitchen"; text: string; printerName?: string | null; label?: string }
    >({
      query: (body) => buildQuery("/print", "POST")({ body }),
    }),

    /* =========================== BACKUPS ========================== */

    getBackupStatus: builder.query<BackupStatus, void>({
      query: () => buildQuery("/backups/status")(),
      providesTags: ["Backups"],
    }),

    listBackups: builder.query<BackupFile[], void>({
      query: () => buildQuery("/backups")(),
      providesTags: ["Backups"],
    }),

    createBackup: builder.mutation<{ message: string; data: BackupFile }, void>({
      query: () => buildQuery("/backups", "POST")(),
      invalidatesTags: ["Backups"],
    }),

    /* =========================== TABLES =========================== */

    getFloor: builder.query<Floor, void>({
      query: () => buildQuery("/tables/floor")(),
      providesTags: ["Floor"],
    }),

    listTables: builder.query<DiningTable[], Params | void>({
      query: (params) => buildQuery("/tables")({ params: params || {} }),
      providesTags: ["Tables"],
    }),

    createTable: builder.mutation<Saved<DiningTable>, Record<string, unknown>>({
      query: (body) => buildQuery("/tables", "POST")({ body }),
      invalidatesTags: ["Tables", "Floor"],
    }),

    updateTable: builder.mutation<
      Saved<DiningTable>,
      { id: number; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => buildQuery(`/tables/${id}`, "PUT")({ body }),
      invalidatesTags: ["Tables", "Floor"],
    }),

    deleteTable: builder.mutation<MessageResponse, number>({
      query: (id) => buildQuery(`/tables/${id}`, "DELETE")(),
      invalidatesTags: ["Tables", "Floor"],
    }),

    transferOrder: builder.mutation<Saved<Order>, { orderId: number; toTableId: number }>({
      query: (body) => buildQuery("/tables/transfer", "POST")({ body }),
      invalidatesTags: ["Floor", "Orders"],
    }),

    /* ============================ MENU ============================ */

    getMenu: builder.query<MenuCategory[], void>({
      query: () => buildQuery("/products/menu")(),
      providesTags: ["Menu"],
    }),

    listCategories: builder.query<Category[], Params | void>({
      query: (params) => buildQuery("/categories")({ params: params || {} }),
      providesTags: ["Categories"],
    }),

    createCategory: builder.mutation<Saved<Category>, Record<string, unknown>>({
      query: (body) => buildQuery("/categories", "POST")({ body }),
      invalidatesTags: ["Categories", "Menu"],
    }),

    updateCategory: builder.mutation<Saved<Category>, { id: number; body: Record<string, unknown> }>({
      query: ({ id, body }) => buildQuery(`/categories/${id}`, "PUT")({ body }),
      invalidatesTags: ["Categories", "Menu", "Products"],
    }),

    deleteCategory: builder.mutation<MessageResponse, number>({
      query: (id) => buildQuery(`/categories/${id}`, "DELETE")(),
      invalidatesTags: ["Categories", "Menu"],
    }),

    listProducts: builder.query<Product[], Params | void>({
      query: (params) => buildQuery("/products")({ params: params || {} }),
      providesTags: ["Products"],
    }),

    createProduct: builder.mutation<Saved<Product>, Record<string, unknown>>({
      query: (body) => buildQuery("/products", "POST")({ body }),
      invalidatesTags: ["Products", "Menu"],
    }),

    updateProduct: builder.mutation<Saved<Product>, { id: number; body: Record<string, unknown> }>({
      query: ({ id, body }) => buildQuery(`/products/${id}`, "PUT")({ body }),
      invalidatesTags: ["Products", "Menu"],
    }),

    deleteProduct: builder.mutation<MessageResponse, number>({
      query: (id) => buildQuery(`/products/${id}`, "DELETE")(),
      invalidatesTags: ["Products", "Menu"],
    }),

    toggleProduct: builder.mutation<Saved<Product>, number>({
      query: (id) => buildQuery(`/products/${id}/toggle-active`, "PATCH")(),
      invalidatesTags: ["Products", "Menu"],
    }),

    bulkUpdatePrices: builder.mutation<MessageResponse, { items: { id: number; price: number }[] }>({
      query: (body) => buildQuery("/products/bulk-price", "PATCH")({ body }),
      invalidatesTags: ["Products", "Menu"],
    }),

    /* =========================== ORDERS =========================== */

    listOrders: builder.query<Order[], Params | void>({
      query: (params) => buildQuery("/orders")({ params: params || {} }),
      providesTags: ["Orders"],
    }),

    listActiveOrders: builder.query<Order[], void>({
      query: () => buildQuery("/orders/active")(),
      providesTags: ["Orders"],
    }),

    getOrder: builder.query<Order, number>({
      query: (id) => buildQuery(`/orders/${id}`)(),
      providesTags: ["Orders"],
    }),

    createOrder: builder.mutation<Saved<Order>, Record<string, unknown>>({
      query: (body) => buildQuery("/orders", "POST")({ body }),
      invalidatesTags: ["Orders", "Floor", "Reports"],
    }),

    updateOrder: builder.mutation<Saved<Order>, { id: number; body: Record<string, unknown> }>({
      query: ({ id, body }) => buildQuery(`/orders/${id}`, "PUT")({ body }),
      invalidatesTags: ["Orders", "Floor"],
    }),

    addOrderItem: builder.mutation<Saved<Order>, { id: number; body: Record<string, unknown> }>({
      query: ({ id, body }) => buildQuery(`/orders/${id}/items`, "POST")({ body }),
      invalidatesTags: ["Orders", "Floor"],
    }),

    updateOrderItem: builder.mutation<
      Saved<Order>,
      { id: number; itemId: number; body: Record<string, unknown> }
    >({
      query: ({ id, itemId, body }) => buildQuery(`/orders/${id}/items/${itemId}`, "PATCH")({ body }),
      invalidatesTags: ["Orders", "Floor"],
    }),

    removeOrderItem: builder.mutation<Saved<Order>, { id: number; itemId: number }>({
      query: ({ id, itemId }) => buildQuery(`/orders/${id}/items/${itemId}`, "DELETE")(),
      invalidatesTags: ["Orders", "Floor"],
    }),

    /**
     * `preview: true` reads the pending lines without consuming them, so the
     * order screen can show a "3 waiting" badge on the token button.
     */
    printKitchenToken: builder.mutation<
      KitchenToken,
      { id: number; preview?: boolean; itemIds?: number[] }
    >({
      query: ({ id, preview, itemIds }) =>
        buildQuery(`/orders/${id}/token`, "POST")({
          params: preview ? { preview: true } : {},
          body: { itemIds: itemIds ?? null },
        }),
      invalidatesTags: (_result, _error, arg) => (arg.preview ? [] : ["Orders"]),
    }),

    printBill: builder.mutation<{ message: string; isReprint: boolean; data: Order }, number>({
      query: (id) => buildQuery(`/orders/${id}/bill`, "POST")(),
      invalidatesTags: ["Orders", "Floor"],
    }),

    settleOrder: builder.mutation<
      { message: string; change: number; data: Order },
      { id: number; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => buildQuery(`/orders/${id}/settle`, "POST")({ body }),
      invalidatesTags: ["Orders", "Floor", "Reports", "Payroll", "Employees"],
    }),

    sendOrderToCredit: builder.mutation<Saved<Order>, { id: number; body: Record<string, unknown> }>({
      query: ({ id, body }) => buildQuery(`/orders/${id}/credit`, "POST")({ body }),
      invalidatesTags: ["Orders", "Floor", "Reports", "Credit", "Payroll", "Employees"],
    }),

    voidOrder: builder.mutation<
      Saved<Order>,
      { id: number; voidReason: string; password: string }
    >({
      query: ({ id, voidReason, password }) =>
        buildQuery(`/orders/${id}/void`, "POST")({ body: { voidReason, password } }),
      invalidatesTags: ["Orders", "Floor", "Reports", "Credit", "Payroll"],
    }),

    reopenOrder: builder.mutation<Saved<Order>, number>({
      query: (id) => buildQuery(`/orders/${id}/reopen`, "POST")(),
      invalidatesTags: ["Orders", "Floor", "Reports"],
    }),

    deleteOrder: builder.mutation<MessageResponse, number>({
      query: (id) => buildQuery(`/orders/${id}`, "DELETE")(),
      invalidatesTags: ["Orders", "Floor", "Reports", "Credit"],
    }),

    /* ========================== EMPLOYEES ========================= */

    listEmployees: builder.query<Employee[], Params | void>({
      query: (params) => buildQuery("/employees")({ params: params || {} }),
      providesTags: ["Employees"],
    }),

    listEmployeesWithBalances: builder.query<Employee[], Params | void>({
      query: (params) => buildQuery("/employees/with-balances")({ params: params || {} }),
      providesTags: ["Employees", "Payroll"],
    }),

    listWaiters: builder.query<Waiter[], void>({
      query: () => buildQuery("/employees/waiters")(),
      providesTags: ["Employees"],
    }),

    getEmployeeStatement: builder.query<EmployeeStatement, { id: number; from?: string; to?: string }>({
      query: ({ id, ...params }) => buildQuery(`/employees/${id}/statement`)({ params }),
      providesTags: ["Employees", "Payroll"],
    }),

    createEmployee: builder.mutation<Saved<Employee>, Record<string, unknown>>({
      query: (body) => buildQuery("/employees", "POST")({ body }),
      invalidatesTags: ["Employees"],
    }),

    updateEmployee: builder.mutation<Saved<Employee>, { id: number; body: Record<string, unknown> }>({
      query: ({ id, body }) => buildQuery(`/employees/${id}`, "PUT")({ body }),
      invalidatesTags: ["Employees"],
    }),

    deleteEmployee: builder.mutation<MessageResponse, number>({
      query: (id) => buildQuery(`/employees/${id}`, "DELETE")(),
      invalidatesTags: ["Employees"],
    }),

    toggleEmployee: builder.mutation<Saved<Employee>, number>({
      query: (id) => buildQuery(`/employees/${id}/toggle-active`, "PATCH")(),
      invalidatesTags: ["Employees"],
    }),

    /* =========================== PAYROLL ========================== */

    getPayrollSummary: builder.query<PayrollSummary, Params | void>({
      query: (params) => buildQuery("/payroll/summary")({ params: params || {} }),
      providesTags: ["Payroll"],
    }),

    getCommissionFromSales: builder.query<
      { rows: { employeeId: number; name: string; orderCount: number; totalSales: number; commission: number }[]; totals: { orderCount: number; totalSales: number; commission: number } },
      Params | void
    >({
      query: (params) => buildQuery("/payroll/commission-from-sales")({ params: params || {} }),
      providesTags: ["Payroll", "Orders"],
    }),

    listLedgerEntries: builder.query<LedgerEntry[], Params | void>({
      query: (params) => buildQuery("/payroll/entries")({ params: params || {} }),
      providesTags: ["Payroll"],
    }),

    createLedgerEntry: builder.mutation<Saved<LedgerEntry>, Record<string, unknown>>({
      query: (body) => buildQuery("/payroll/entries", "POST")({ body }),
      invalidatesTags: ["Payroll", "Employees"],
    }),

    updateLedgerEntry: builder.mutation<
      Saved<LedgerEntry>,
      { id: number; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => buildQuery(`/payroll/entries/${id}`, "PUT")({ body }),
      invalidatesTags: ["Payroll", "Employees"],
    }),

    deleteLedgerEntry: builder.mutation<MessageResponse, number>({
      query: (id) => buildQuery(`/payroll/entries/${id}`, "DELETE")(),
      invalidatesTags: ["Payroll", "Employees"],
    }),

    recordAdvance: builder.mutation<Saved<LedgerEntry>, Record<string, unknown>>({
      query: (body) => buildQuery("/payroll/advance", "POST")({ body }),
      invalidatesTags: ["Payroll", "Employees"],
    }),

    recordStaffPayment: builder.mutation<
      { message: string; data: LedgerEntry; pending: number },
      Record<string, unknown>
    >({
      query: (body) => buildQuery("/payroll/payment", "POST")({ body }),
      invalidatesTags: ["Payroll", "Employees", "Reports"],
    }),

    postSalaries: builder.mutation<
      { message: string; created: { id: number; name: string; amount: number }[]; skipped: { id: number; name: string; reason: string }[] },
      Record<string, unknown>
    >({
      query: (body) => buildQuery("/payroll/post-salaries", "POST")({ body }),
      invalidatesTags: ["Payroll", "Employees"],
    }),

    saveDailyCommissions: builder.mutation<MessageResponse, Record<string, unknown>>({
      query: (body) => buildQuery("/payroll/daily-commissions", "POST")({ body }),
      invalidatesTags: ["Payroll", "Employees"],
    }),

    /* =========================== CREDIT =========================== */

    listCreditPersons: builder.query<CreditPersonList, Params | void>({
      query: (params) => buildQuery("/credit/persons")({ params: params || {} }),
      providesTags: ["Credit"],
    }),

    getCreditStatement: builder.query<
      CreditStatement,
      { id: number; from?: string; to?: string; accountId?: number }
    >({
      query: ({ id, ...params }) => buildQuery(`/credit/persons/${id}/statement`)({ params }),
      providesTags: ["Credit"],
    }),

    createCreditPerson: builder.mutation<Saved<CreditPerson>, Record<string, unknown>>({
      query: (body) => buildQuery("/credit/persons", "POST")({ body }),
      invalidatesTags: ["Credit"],
    }),

    updateCreditPerson: builder.mutation<
      Saved<CreditPerson>,
      { id: number; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => buildQuery(`/credit/persons/${id}`, "PUT")({ body }),
      invalidatesTags: ["Credit"],
    }),

    deleteCreditPerson: builder.mutation<MessageResponse, number>({
      query: (id) => buildQuery(`/credit/persons/${id}`, "DELETE")(),
      invalidatesTags: ["Credit"],
    }),

    listCreditAccounts: builder.query<CreditAccount[], number>({
      query: (id) => buildQuery(`/credit/persons/${id}/accounts`)(),
      providesTags: ["Credit"],
    }),

    createCreditAccount: builder.mutation<
      Saved<CreditAccount>,
      { id: number; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => buildQuery(`/credit/persons/${id}/accounts`, "POST")({ body }),
      invalidatesTags: ["Credit"],
    }),

    updateCreditAccount: builder.mutation<
      Saved<CreditAccount>,
      { id: number; accountId: number; body: Record<string, unknown> }
    >({
      query: ({ id, accountId, body }) =>
        buildQuery(`/credit/persons/${id}/accounts/${accountId}`, "PUT")({ body }),
      invalidatesTags: ["Credit"],
    }),

    deleteCreditAccount: builder.mutation<MessageResponse, { id: number; accountId: number }>({
      query: ({ id, accountId }) =>
        buildQuery(`/credit/persons/${id}/accounts/${accountId}`, "DELETE")(),
      invalidatesTags: ["Credit"],
    }),

    createCreditTransaction: builder.mutation<
      { message: string; data: CreditEntry; balance: number },
      { id: number; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => buildQuery(`/credit/persons/${id}/transactions`, "POST")({ body }),
      invalidatesTags: ["Credit", "Reports"],
    }),

    updateCreditTransaction: builder.mutation<
      Saved<CreditEntry>,
      { id: number; transactionId: number; body: Record<string, unknown> }
    >({
      query: ({ id, transactionId, body }) =>
        buildQuery(`/credit/persons/${id}/transactions/${transactionId}`, "PUT")({ body }),
      invalidatesTags: ["Credit", "Reports"],
    }),

    deleteCreditTransaction: builder.mutation<
      MessageResponse,
      { id: number; transactionId: number }
    >({
      query: ({ id, transactionId }) =>
        buildQuery(`/credit/persons/${id}/transactions/${transactionId}`, "DELETE")(),
      invalidatesTags: ["Credit", "Reports"],
    }),

    listCreditTransactions: builder.query<
      { rows: CreditEntry[]; totals: { given: number; received: number } },
      Params | void
    >({
      query: (params) => buildQuery("/credit/transactions")({ params: params || {} }),
      providesTags: ["Credit"],
    }),

    /* ========================== EXPENSES ========================== */

    listExpenses: builder.query<ExpenseList, Params | void>({
      query: (params) => buildQuery("/expenses")({ params: params || {} }),
      providesTags: ["Expenses"],
    }),

    listExpenseCategories: builder.query<string[], void>({
      query: () => buildQuery("/expenses/categories")(),
      providesTags: ["Expenses"],
    }),

    createExpense: builder.mutation<Saved<Expense>, Record<string, unknown>>({
      query: (body) => buildQuery("/expenses", "POST")({ body }),
      invalidatesTags: ["Expenses", "Reports"],
    }),

    updateExpense: builder.mutation<Saved<Expense>, { id: number; body: Record<string, unknown> }>({
      query: ({ id, body }) => buildQuery(`/expenses/${id}`, "PUT")({ body }),
      invalidatesTags: ["Expenses", "Reports"],
    }),

    deleteExpense: builder.mutation<MessageResponse, number>({
      query: (id) => buildQuery(`/expenses/${id}`, "DELETE")(),
      invalidatesTags: ["Expenses", "Reports"],
    }),

    /* =========================== KITCHEN ========================== */

    getKitchenGroups: builder.query<KitchenGroup[], void>({
      query: () => buildQuery("/kitchen/items/grouped")(),
      providesTags: ["KitchenItems", "KitchenCategories"],
    }),

    listKitchenCategories: builder.query<KitchenCategory[], Params | void>({
      query: (params) => buildQuery("/kitchen/categories")({ params: params || {} }),
      providesTags: ["KitchenCategories"],
    }),

    createKitchenCategory: builder.mutation<Saved<KitchenCategory>, Record<string, unknown>>({
      query: (body) => buildQuery("/kitchen/categories", "POST")({ body }),
      invalidatesTags: ["KitchenCategories", "KitchenItems"],
    }),

    updateKitchenCategory: builder.mutation<
      Saved<KitchenCategory>,
      { id: number; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => buildQuery(`/kitchen/categories/${id}`, "PUT")({ body }),
      invalidatesTags: ["KitchenCategories", "KitchenItems"],
    }),

    deleteKitchenCategory: builder.mutation<MessageResponse, number>({
      query: (id) => buildQuery(`/kitchen/categories/${id}`, "DELETE")(),
      invalidatesTags: ["KitchenCategories", "KitchenItems"],
    }),

    listKitchenItems: builder.query<KitchenItem[], Params | void>({
      query: (params) => buildQuery("/kitchen/items")({ params: params || {} }),
      providesTags: ["KitchenItems"],
    }),

    createKitchenItem: builder.mutation<Saved<KitchenItem>, Record<string, unknown>>({
      query: (body) => buildQuery("/kitchen/items", "POST")({ body }),
      invalidatesTags: ["KitchenItems"],
    }),

    updateKitchenItem: builder.mutation<
      Saved<KitchenItem>,
      { id: number; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => buildQuery(`/kitchen/items/${id}`, "PUT")({ body }),
      invalidatesTags: ["KitchenItems"],
    }),

    deleteKitchenItem: builder.mutation<MessageResponse, number>({
      query: (id) => buildQuery(`/kitchen/items/${id}`, "DELETE")(),
      invalidatesTags: ["KitchenItems"],
    }),

    /* ========================== CLOSINGS ========================== */

    listClosings: builder.query<Closing[], Params | void>({
      query: (params) => buildQuery("/closings")({ params: params || {} }),
      providesTags: ["Closings"],
    }),

    getClosing: builder.query<Closing, number>({
      query: (id) => buildQuery(`/closings/${id}`)(),
      providesTags: ["Closings"],
    }),

    getClosingByDate: builder.query<Closing | null, string>({
      query: (date) => buildQuery(`/closings/by-date/${date}`)(),
      providesTags: ["Closings"],
    }),

    openClosing: builder.mutation<Closing, { businessDate?: string | null }>({
      query: (body) => buildQuery("/closings/open", "POST")({ body }),
      invalidatesTags: ["Closings"],
    }),

    saveClosingItems: builder.mutation<Saved<Closing>, { id: number; body: Record<string, unknown> }>({
      query: ({ id, body }) => buildQuery(`/closings/${id}/items`, "PUT")({ body }),
      invalidatesTags: ["Closings"],
    }),

    completeClosing: builder.mutation<Saved<Closing>, { id: number; note?: string | null }>({
      query: ({ id, note }) => buildQuery(`/closings/${id}/complete`, "POST")({ body: { note } }),
      invalidatesTags: ["Closings"],
    }),

    reopenClosing: builder.mutation<Saved<Closing>, number>({
      query: (id) => buildQuery(`/closings/${id}/reopen`, "POST")(),
      invalidatesTags: ["Closings"],
    }),

    deleteClosing: builder.mutation<MessageResponse, number>({
      query: (id) => buildQuery(`/closings/${id}`, "DELETE")(),
      invalidatesTags: ["Closings"],
    }),

    getShoppingList: builder.query<ShoppingList, number>({
      query: (id) => buildQuery(`/closings/${id}/shopping-list`)(),
      providesTags: ["Closings"],
    }),

    /* =========================== REPORTS ========================== */

    getDashboard: builder.query<Dashboard, void>({
      query: () => buildQuery("/reports/dashboard")(),
      providesTags: ["Reports"],
    }),

    getSalesReport: builder.query<SalesReport, Params>({
      query: (params) => buildQuery("/reports/sales")({ params }),
      providesTags: ["Reports"],
    }),

    getProductReport: builder.query<ProductReport, Params>({
      query: (params) => buildQuery("/reports/products")({ params }),
      providesTags: ["Reports"],
    }),

    getDayBook: builder.query<DayBook, Params>({
      query: (params) => buildQuery("/reports/day-book")({ params }),
      providesTags: ["Reports"],
    }),

    getWaiterReport: builder.query<WaiterReport, Params>({
      query: (params) => buildQuery("/reports/waiters")({ params }),
      providesTags: ["Reports"],
    }),
  }),

  overrideExisting: false,
});

export const {
  /* Auth */
  useLoginMutation,
  useGetMeQuery,
  useChangeMyPasswordMutation,
  useListUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  /* Settings */
  useGetSettingsQuery,
  useListPrintersQuery,
  useSendToPrinterMutation,
  /* Backups */
  useGetBackupStatusQuery,
  useListBackupsQuery,
  useCreateBackupMutation,
  useUpdateSettingsMutation,
  /* Tables */
  useGetFloorQuery,
  useListTablesQuery,
  useCreateTableMutation,
  useUpdateTableMutation,
  useDeleteTableMutation,
  useTransferOrderMutation,
  /* Menu */
  useGetMenuQuery,
  useListCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useListProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useToggleProductMutation,
  useBulkUpdatePricesMutation,
  /* Orders */
  useListOrdersQuery,
  useListActiveOrdersQuery,
  useGetOrderQuery,
  useCreateOrderMutation,
  useUpdateOrderMutation,
  useAddOrderItemMutation,
  useUpdateOrderItemMutation,
  useRemoveOrderItemMutation,
  usePrintKitchenTokenMutation,
  usePrintBillMutation,
  useSettleOrderMutation,
  useSendOrderToCreditMutation,
  useVoidOrderMutation,
  useReopenOrderMutation,
  useDeleteOrderMutation,
  /* Employees */
  useListEmployeesQuery,
  useListEmployeesWithBalancesQuery,
  useListWaitersQuery,
  useGetEmployeeStatementQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
  useToggleEmployeeMutation,
  /* Payroll */
  useGetPayrollSummaryQuery,
  useGetCommissionFromSalesQuery,
  useListLedgerEntriesQuery,
  useCreateLedgerEntryMutation,
  useUpdateLedgerEntryMutation,
  useDeleteLedgerEntryMutation,
  useRecordAdvanceMutation,
  useRecordStaffPaymentMutation,
  usePostSalariesMutation,
  useSaveDailyCommissionsMutation,
  /* Credit */
  useListCreditPersonsQuery,
  useGetCreditStatementQuery,
  useCreateCreditPersonMutation,
  useUpdateCreditPersonMutation,
  useDeleteCreditPersonMutation,
  useListCreditAccountsQuery,
  useCreateCreditAccountMutation,
  useUpdateCreditAccountMutation,
  useDeleteCreditAccountMutation,
  useCreateCreditTransactionMutation,
  useUpdateCreditTransactionMutation,
  useDeleteCreditTransactionMutation,
  useListCreditTransactionsQuery,
  /* Expenses */
  useListExpensesQuery,
  useListExpenseCategoriesQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  /* Kitchen */
  useGetKitchenGroupsQuery,
  useListKitchenCategoriesQuery,
  useCreateKitchenCategoryMutation,
  useUpdateKitchenCategoryMutation,
  useDeleteKitchenCategoryMutation,
  useListKitchenItemsQuery,
  useCreateKitchenItemMutation,
  useUpdateKitchenItemMutation,
  useDeleteKitchenItemMutation,
  /* Closings */
  useListClosingsQuery,
  useGetClosingQuery,
  useGetClosingByDateQuery,
  useOpenClosingMutation,
  useSaveClosingItemsMutation,
  useCompleteClosingMutation,
  useReopenClosingMutation,
  useDeleteClosingMutation,
  useGetShoppingListQuery,
  /* Reports */
  useGetDashboardQuery,
  useGetSalesReportQuery,
  useGetProductReportQuery,
  useGetDayBookQuery,
  useGetWaiterReportQuery,
} = posApi;

export default posApi;
