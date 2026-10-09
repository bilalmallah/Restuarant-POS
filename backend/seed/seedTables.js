import config from "../src/config/config.js";
import {
  User,
  Table,
  Category,
  Product,
  Employee,
  CreditPerson,
  CreditAccount,
  KitchenCategory,
  KitchenItem,
  Setting,
} from "../src/config/associations.js";
import { SETTING_DEFAULTS } from "../src/features/settings/settingModel.js";
import { buildMenu } from "./menuData.js";

/**
 * Starter data so a fresh install is usable immediately: an admin to log in
 * with, a floor of tables, a small menu and a stocked kitchen list. Everything
 * here is idempotent - re-running the seed never duplicates rows, so it is safe
 * to run again after adding tables.
 */

const seedAdmin = async () => {
  const existing = await User.findOne({ where: { username: "admin" } });
  if (existing) return console.log("Admin user already exists");

  await User.create({
    name: "Administrator",
    username: "admin",
    email: config.defaultAdminEmail,
    password: config.defaultAdminPassword,
    role: "admin",
  });

  console.log(`Admin created  ->  username: admin  password: ${config.defaultAdminPassword}`);
};

const seedSettings = async () => {
  for (const [key, value] of Object.entries(SETTING_DEFAULTS)) {
    await Setting.findOrCreate({ where: { key }, defaults: { value } });
  }
  console.log("Settings initialised");
};

const seedTables = async () => {
  if (await Table.count()) return console.log("Tables already exist");

  const rows = [];
  for (let number = 1; number <= 12; number += 1) {
    rows.push({
      name: `T${String(number).padStart(2, "0")}`,
      area: number <= 8 ? "Main Hall" : "Family Section",
      capacity: number <= 8 ? 4 : 6,
      sortOrder: number,
    });
  }

  await Table.bulkCreate(rows);
  console.log(`${rows.length} tables created`);
};

/**
 * The real menu lives in menuData.js so there is exactly one copy of it - a
 * fresh install and `npm run import-menu` produce the same thing.
 */
const seedMenu = async () => {
  if (await Category.count()) return console.log("Menu already exists");

  const menu = buildMenu();
  let categoryOrder = 0;
  let count = 0;

  for (const group of menu) {
    const category = await Category.create({
      name: group.category,
      colour: group.colour,
      sortOrder: categoryOrder++,
    });

    await Product.bulkCreate(
      group.products.map(([name, price, description, options], index) => ({
        name,
        description: description ?? null,
        variantLabel: options?.variant ?? null,
        price,
        categoryId: category.id,
        // Sealed drinks are the only things that skip the kitchen token.
        printToKitchen: options?.kitchen ?? true,
        sortOrder: index,
      }))
    );

    count += group.products.length;
  }

  console.log(`${count} products created across ${menu.length} categories`);
};

const seedEmployees = async () => {
  if (await Employee.count()) return console.log("Employees already exist");

  await Employee.bulkCreate([
    { name: "Asif Ali", role: "waiter", payType: "commission", commissionPercent: 3, isWaiter: true },
    { name: "Bilal Ahmed", role: "waiter", payType: "monthly", monthlySalary: 35000, commissionPercent: 2, isWaiter: true },
    { name: "Kamran Shah", role: "waiter", payType: "daily", dailyWage: 1200, commissionPercent: 2, isWaiter: true },
    { name: "Ustad Rafiq", role: "chef", payType: "monthly", monthlySalary: 60000, isWaiter: false },
    { name: "Naeem", role: "helper", payType: "daily", dailyWage: 900, isWaiter: false },
  ]);

  console.log("5 employees created");
};

const seedCreditPersons = async () => {
  if (await CreditPerson.count()) return console.log("Credit book already has people");

  const people = [
    { name: "Sohail Traders", phone: "0300-1234567", company: "Sohail Traders", creditLimit: 100000 },
    { name: "Imran Sahab", phone: "0321-7654321", creditLimit: 50000 },
  ];

  for (const person of people) {
    const created = await CreditPerson.create(person);
    await CreditAccount.create({ creditPersonId: created.id, name: "General", openingBalance: 0 });
  }

  console.log(`${people.length} credit accounts created`);
};

const KITCHEN = [
  ["Meat", [["Chicken", "kg", 5], ["Beef", "kg", 3], ["Mutton", "kg", 2], ["Fish", "kg", 5]]],
  ["Vegetables", [["Onion", "kg", 10], ["Tomato", "kg", 8], ["Garlic", "kg", 2], ["Ginger", "kg", 2], ["Green Chilli", "kg", 1], ["Coriander", "bundle", 5]]],
  ["Dry Goods", [["Cooking Oil", "litre", 5], ["Desi Ghee", "kg", 2], ["Basmati Rice", "kg", 10], ["Maida", "kg", 5], ["Aata", "kg", 10], ["Salt", "kg", 2]]],
  ["Dairy", [["Milk", "litre", 5], ["Cream", "litre", 1], ["Yogurt", "kg", 3], ["Butter", "kg", 1]]],
  ["Spices", [["Red Chilli Powder", "kg", 1], ["Turmeric", "kg", 1], ["Garam Masala", "packet", 2], ["Cumin", "kg", 1]]],
  ["Beverages", [["Soft Drink Crate", "packet", 3], ["Mineral Water Pack", "packet", 5], ["Tea Leaves", "kg", 1]]],
  ["Supplies", [["Tissue Roll", "packet", 5], ["Disposable Box", "packet", 10], ["Shopping Bag", "packet", 5], ["Charcoal", "kg", 20]]],
];

const seedKitchen = async () => {
  if (await KitchenCategory.count()) return console.log("Kitchen list already exists");

  let categorySort = 0;

  for (const [name, items] of KITCHEN) {
    const category = await KitchenCategory.create({ name, sortOrder: categorySort++ });

    await KitchenItem.bulkCreate(
      items.map(([itemName, unit, minQuantity], index) => ({
        name: itemName,
        kitchenCategoryId: category.id,
        unit,
        minQuantity,
        // Left at zero so the first closing sheet only lists what staff
        // actually tick as needed; owners can set a usual order size per item.
        defaultOrderQuantity: 0,
        sortOrder: index,
      }))
    );
  }

  const itemCount = KITCHEN.reduce((sum, [, items]) => sum + items.length, 0);
  console.log(`${KITCHEN.length} kitchen categories with ${itemCount} items created`);
};

await seedAdmin();
await seedSettings();
await seedTables();
await seedMenu();
await seedEmployees();
await seedCreditPersons();
await seedKitchen();

console.log(`\n${config.appName} is ready. Start the API with: npm run dev\n`);
