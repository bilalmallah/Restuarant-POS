import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import brand from "./app/brand";
import RouteWrapper from "./components/layout/RouteWrapper";
import { Loader } from "./components/ui/primitives";
import type { Role } from "./types";

import Login from "./pages/Auth/Login";

/* Split per screen: the till only ever loads the POS bundle. */
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard"));
const FloorPlan = lazy(() => import("./pages/Pos/FloorPlan"));
const OrderScreen = lazy(() => import("./pages/Pos/OrderScreen"));
const SalesHistory = lazy(() => import("./pages/Orders/SalesHistory"));

const Products = lazy(() => import("./pages/Menu/Products"));
const Categories = lazy(() => import("./pages/Menu/Categories"));
const Tables = lazy(() => import("./pages/Menu/Tables"));

const ClosingChecklist = lazy(() => import("./pages/Kitchen/ClosingChecklist"));
const ClosingHistory = lazy(() => import("./pages/Kitchen/ClosingHistory"));
const KitchenItems = lazy(() => import("./pages/Kitchen/KitchenItems"));
const KitchenCategories = lazy(() => import("./pages/Kitchen/KitchenCategories"));

const CreditBook = lazy(() => import("./pages/Credit/CreditBook"));
const CreditStatement = lazy(() => import("./pages/Credit/CreditStatement"));
const CreditMovements = lazy(() => import("./pages/Credit/CreditMovements"));
const Expenses = lazy(() => import("./pages/Expenses/Expenses"));

const Employees = lazy(() => import("./pages/Staff/Employees"));
const EmployeeLedger = lazy(() => import("./pages/Staff/EmployeeLedger"));
const Payroll = lazy(() => import("./pages/Staff/Payroll"));
const DailyCommission = lazy(() => import("./pages/Staff/DailyCommission"));

const SalesReport = lazy(() => import("./pages/Reports/SalesReport"));
const ProductReport = lazy(() => import("./pages/Reports/ProductReport"));
const DayBook = lazy(() => import("./pages/Reports/DayBook"));
const WaiterReport = lazy(() => import("./pages/Reports/WaiterReport"));

const Settings = lazy(() => import("./pages/Settings/Settings"));
const Users = lazy(() => import("./pages/Settings/Users"));
const Shortcuts = lazy(() => import("./pages/Help/Shortcuts"));

const MANAGER: Role[] = ["admin", "manager"];
const ADMIN: Role[] = ["admin"];

/**
 * Every guarded screen goes through RouteWrapper, which supplies the app shell
 * and the role gate. Roles listed here mirror the server's own checks - this
 * layer is for not showing people doors they cannot open, not for security.
 */
const ROUTES: [path: string, Component: React.ComponentType, roles?: Role[]][] = [
  ["/dashboard", Dashboard],

  /* POS */
  ["/pos", FloorPlan],
  ["/pos/order/:id", OrderScreen],
  ["/orders", SalesHistory],

  /* Menu setup */
  ["/menu/products", Products, MANAGER],
  ["/menu/categories", Categories, MANAGER],
  ["/menu/tables", Tables, MANAGER],

  /* Kitchen */
  ["/kitchen/closing", ClosingChecklist],
  ["/kitchen/history", ClosingHistory],
  ["/kitchen/items", KitchenItems],
  ["/kitchen/categories", KitchenCategories, MANAGER],

  /* Money */
  ["/credit", CreditBook],
  ["/credit/movements", CreditMovements],
  ["/credit/:id", CreditStatement],
  ["/expenses", Expenses],

  /* Staff */
  ["/staff", Employees, MANAGER],
  ["/staff/payroll", Payroll, MANAGER],
  ["/staff/commission", DailyCommission, MANAGER],
  ["/staff/:id", EmployeeLedger, MANAGER],

  /* Reports */
  ["/reports/sales", SalesReport, MANAGER],
  ["/reports/products", ProductReport, MANAGER],
  ["/reports/day-book", DayBook, MANAGER],
  ["/reports/waiters", WaiterReport, MANAGER],

  /* Setup */
  ["/settings", Settings, MANAGER],
  ["/settings/users", Users, ADMIN],
  ["/shortcuts", Shortcuts],
];

const App = () => {
  // The tab title is the restaurant's name, from the single root .env.
  useEffect(() => {
    document.title = brand.name;
  }, []);

  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/login" element={<Login />} />

        {ROUTES.map(([path, Component, roles]) => (
          <Route
            key={path}
            path={path}
            element={
              <RouteWrapper roles={roles}>
                <Component />
              </RouteWrapper>
            }
          />
        ))}

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;
