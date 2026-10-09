import type { IconType } from "react-icons";
import {
  FiGrid,
  FiShoppingBag,
  FiList,
  FiCoffee,
  FiLayers,
  FiUsers,
  FiUser,
  FiBookOpen,
  FiCreditCard,
  FiDollarSign,
  FiTrendingUp,
  FiPieChart,
  FiPackage,
  FiCheckSquare,
  FiArchive,
  FiSettings,
  FiSliders,
  FiHelpCircle,
  FiAward,
  FiHome,
} from "react-icons/fi";
import type { Role } from "../../types";

export type NavItem = {
  label: string;
  to: string;
  icon: IconType;
  /** Omitted means everyone signed in can see it. */
  roles?: Role[];
  hint?: string;
};

export type NavSection = {
  key: string;
  label: string;
  icon: IconType;
  /** Shown under the section name in the switcher. */
  blurb: string;
  items: NavItem[];
};

/**
 * The sidebar is two levels on purpose.
 *
 * A waiter at the till only ever needs POS; the cook only needs Kitchen; the
 * owner needs Money and Reports. Showing all twenty screens at once is how
 * these systems become unusable, so the top strip picks a SECTION and the
 * sidebar below shows only that section's pages.
 */
export const SECTIONS: NavSection[] = [
  {
    key: "pos",
    label: "POS",
    icon: FiShoppingBag,
    blurb: "Take orders and settle bills",
    items: [
      { label: "Dashboard", to: "/dashboard", icon: FiHome },
      { label: "Floor Plan", to: "/pos", icon: FiGrid, hint: "Ctrl+1" },
      { label: "Sales History", to: "/orders", icon: FiList, hint: "Ctrl+2" },
    ],
  },
  {
    key: "menu",
    label: "Menu",
    icon: FiCoffee,
    blurb: "Products, categories and prices",
    items: [
      { label: "Products", to: "/menu/products", icon: FiCoffee, roles: ["admin", "manager"] },
      { label: "Categories", to: "/menu/categories", icon: FiLayers, roles: ["admin", "manager"] },
      { label: "Tables", to: "/menu/tables", icon: FiGrid, roles: ["admin", "manager"] },
    ],
  },
  {
    key: "kitchen",
    label: "Kitchen",
    icon: FiPackage,
    blurb: "Store list and nightly closing",
    items: [
      { label: "Closing Checklist", to: "/kitchen/closing", icon: FiCheckSquare, hint: "Ctrl+4" },
      { label: "Closing History", to: "/kitchen/history", icon: FiArchive },
      { label: "Kitchen Items", to: "/kitchen/items", icon: FiPackage },
      { label: "Item Categories", to: "/kitchen/categories", icon: FiLayers, roles: ["admin", "manager"] },
    ],
  },
  {
    key: "money",
    label: "Money",
    icon: FiDollarSign,
    blurb: "Credit book and daily expenses",
    items: [
      { label: "Credit Book", to: "/credit", icon: FiBookOpen, hint: "Ctrl+3" },
      { label: "Credit Movements", to: "/credit/movements", icon: FiCreditCard },
      { label: "Expenses", to: "/expenses", icon: FiDollarSign },
    ],
  },
  {
    key: "staff",
    label: "Staff",
    icon: FiUsers,
    blurb: "Employees, salary and commission",
    items: [
      { label: "Employees", to: "/staff", icon: FiUsers, roles: ["admin", "manager"] },
      { label: "Payroll", to: "/staff/payroll", icon: FiAward, roles: ["admin", "manager"] },
      { label: "Daily Commission", to: "/staff/commission", icon: FiTrendingUp, roles: ["admin", "manager"] },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    icon: FiPieChart,
    blurb: "Sales, products and profit",
    items: [
      { label: "Sales Report", to: "/reports/sales", icon: FiTrendingUp, roles: ["admin", "manager"], hint: "Ctrl+5" },
      { label: "Product Report", to: "/reports/products", icon: FiCoffee, roles: ["admin", "manager"] },
      { label: "Day Book", to: "/reports/day-book", icon: FiBookOpen, roles: ["admin", "manager"] },
      { label: "Waiter Report", to: "/reports/waiters", icon: FiUser, roles: ["admin", "manager"] },
    ],
  },
  {
    key: "setup",
    label: "Setup",
    icon: FiSettings,
    blurb: "Users, preferences and help",
    items: [
      { label: "Settings", to: "/settings", icon: FiSliders, roles: ["admin", "manager"] },
      { label: "Users", to: "/settings/users", icon: FiUsers, roles: ["admin"] },
      { label: "Keyboard Shortcuts", to: "/shortcuts", icon: FiHelpCircle },
    ],
  },
];

/** Which section a URL belongs to, so a deep link opens the right sidebar. */
export const sectionForPath = (pathname: string): NavSection => {
  const match = SECTIONS.find((section) =>
    section.items.some(
      (item) => pathname === item.to || pathname.startsWith(`${item.to}/`)
    )
  );

  // Order screens live under /pos/order/:id and belong to the POS section.
  return match ?? SECTIONS[0];
};

export const visibleItems = (section: NavSection, role: Role | null) =>
  section.items.filter((item) => !item.roles || (role && item.roles.includes(role)));

export const visibleSections = (role: Role | null) =>
  SECTIONS.filter((section) => visibleItems(section, role).length > 0);
