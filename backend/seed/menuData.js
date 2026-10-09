/**
 * The real Yum by Fatima menu, transcribed from the printed boards.
 *
 * This is the file to edit when the menu changes - prices, descriptions and the
 * order things appear in all live here, and `npm run import-menu` pushes the
 * whole thing into the database.
 *
 * Two deliberate decisions:
 *
 * 1. SIZES. The ten standard pizzas share one price list (599 / 899 / 1599), so
 *    rather than inventing a variant system they are expanded into three
 *    categories. At the till that reads as "tap Large, tap Fajita" - two taps,
 *    the same way a customer orders it - and the product report then splits
 *    sales by size for free.
 *
 * 2. NAMES. Spelled exactly as they appear on the printed menu, typos included
 *    ("Hawain", "Beef Beacon"), so the bill a customer is handed matches the
 *    board they ordered from. Fix them here and they change everywhere.
 */

/** Sized pizzas: one definition, three price points. */
export const PIZZA_SIZES = [
  { label: "Small", price: 599 },
  { label: "Medium", price: 899 },
  { label: "Large", price: 1599 },
];

export const PIZZAS = [
  ["Fajita Pizza", "Secret sauce, chicken, green capsicum, onion, cheese, black olive, jalapeno"],
  ["Tikka Pizza", "Secret sauce, BBQ, green capsicum, cheese, black olive, jalapeno"],
  ["Afghani Pizza", "Secret sauce, creamy boti, green capsicum, onion, cheese, white seeds"],
  ["Sicilian Pizza", "Secret sauce, flavoured chicken, green capsicum, onion, cheese, black olive, jalapeno"],
  ["BBQ Special Pizza", "Secret sauce, BBQ chicken, green capsicum, onion, black olive, cheese, jalapeno, sweet corn"],
  ["Crown Crust Pizza", "Secret sauce, chicken boti, chicken kabab, green capsicum, onion, black olive, jalapeno"],
  ["Pepperoni Pizza", "Secret sauce, pepperoni, crush chicken, green capsicum, onion, black olive, cheese"],
  ["Margarita Pizza", "Secret sauce, cheese, basil leaves"],
  ["Mexican Flat Pizza", "Secret sauce, chicken slices, secret masala, cheese, green capsicum, yellow capsicum, red capsicum, onions, black olives"],
  ["Malai Boti Pizza", "Secret sauce, malai boti, green capsicum, onion, cheese, black olive, sweet corn"],
];

/**
 * Everything else, in the order it should appear on the till.
 *
 * `kitchen: false` marks the sealed drinks - they must never reach a kitchen
 * token. Everything that gets prepared prints, including the dips: the kitchen
 * seeing one extra line costs nothing, the kitchen missing a raita costs a
 * complaint.
 */
export const MENU = [
  {
    category: "YBF Premium Pizza",
    colour: "#a16207",
    products: [
      ["Pasta Pizza", 1999, "Secret sauce, creamy pasta, chicken, mushroom, green, red and yellow capsicum, black olive, cheese"],
      ["Meat Balls Pizza", 1899, "Secret sauce, beef balls, onions, mushrooms, basil leaves, cheese"],
      ["Hawain Pizza", 2099, "Secret sauce, pineapple, chicken, onions, cheese, edges filled pizza"],
      ["Beef Beacon Pizza", 1999, "Secret sauce, beef, beef beacon, onions, sun ridge tomato, cheese"],
    ],
  },
  {
    category: "Extra Toppings",
    colour: "#6d28d9",
    products: [
      ["Cheese", 150, null],
      ["Chicken", 200, null],
      ["Sweet Corn", 100, null],
      ["Pepperoni", 100, null],
      ["Pineapple", 100, null],
      ["Extra Sauce", 100, null],
    ],
  },
  {
    category: "BBQ",
    colour: "#b91c1c",
    products: [
      ["Chef Special Boti", 990, "Tender, juicy chicken boti marinated in the chef's special blend of spices. (8 pcs)"],
      ["Chicken Bihari Boti", 850, "Tender, juicy chicken marinated in traditional Bihari spices and grilled to smoky perfection. (8 pcs)"],
      ["Beef Bihari Boti", 1190, "Tender beef marinated in aromatic Bihari spices and grilled to perfection for a rich, smoky, flavorful bite. (8 pcs)"],
      ["Chicken Malai Boti", 890, "Creamy, tender chicken marinated with rich malai and aromatic spices, grilled to juicy, smoky perfection. (8 pcs)"],
      ["Tandoori Boti", 950, "Succulent chicken marinated in traditional tandoori spices and grilled to smoky, juicy perfection. (5 pcs)"],
      ["Turkish Boti", 1190, "Tender, juicy chicken marinated in aromatic Turkish spices and grilled to smoky perfection. (8 pcs)"],
      ["Shinwari Boti", 850, "Tender, juicy chicken seasoned with aromatic Shinwari spices and grilled over high heat for a smoky finish. (5 pcs)"],
      ["Chicken Boti", 850, "Juicy, tender chicken marinated in aromatic spices and grilled to smoky perfection. (8 pcs)"],
      ["Chicken Tikka (Chest)", 700, "Tender chicken breast marinated in aromatic spices and grilled to juicy, smoky perfection with a charred finish."],
      ["Chicken Tikka (Leg)", 650, "Juicy chicken leg marinated in aromatic spices and grilled over charcoal for a smoky, tender finish."],
    ],
  },
  {
    category: "Kabab",
    colour: "#dc2626",
    products: [
      ["Reshmi Kabab", 990, "Soft, juicy minced chicken blended with creamy spices and grilled to smoky perfection."],
      ["Turkish Kabab", 1190, "Juicy minced meat seasoned with aromatic Turkish spices and grilled to smoky perfection."],
      ["Chicken Cheese Kabab", 1190, "Juicy minced chicken blended with creamy cheese and aromatic spices, grilled to smoky perfection."],
      ["Beef Kabab", 1190, "Juicy minced beef seasoned with aromatic spices and grilled to smoky perfection."],
    ],
  },
  {
    category: "YBF Rolls",
    colour: "#ea580c",
    products: [
      ["Chicken Chatni Roll", 290, "Tender grilled chicken wrapped in a soft paratha with fresh chutney and creamy sauce."],
      ["Ch. Mayo Garlic Roll", 330, "Tender grilled chicken wrapped in a soft paratha with creamy mayo and zesty garlic sauce."],
      ["Ch. Malai Boti Roll", 330, "Tender, creamy malai chicken wrapped in a soft paratha with fresh chutney and flavorful sauces."],
      ["Beef Bihari Roll", 450, "Spiced, tender beef wrapped in soft paratha with fresh chutney."],
      ["YBF Special Roll", 490, "Tender grilled chicken, fresh veggies and signature creamy sauces wrapped in soft paratha."],
    ],
  },
  {
    category: "Mandi",
    colour: "#15803d",
    products: [
      ["Single Mandi", 1050, "1 Mandi special tikka (chest or leg), served with rice and our special sauces."],
      ["Half Mandi", 1890, "2 Mandi special tikka (chest and leg), served with rice and our special sauces."],
      ["Full Mandi", 3590, "Full Mandi special chicken, served with rice and our special sauce."],
    ],
  },
  {
    category: "Portuguese Chicken",
    colour: "#0e7490",
    products: [
      ["Single Portuguese Chicken", 950, "One piece of chicken, Portuguese style."],
      ["Half Portuguese Chicken", 1790, "One side of chicken, Portugal style."],
      ["Full Portuguese", 3590, "Full chicken, Portugal style."],
    ],
  },
  {
    category: "Platters",
    colour: "#be185d",
    products: [
      [
        "Platter 1",
        2190,
        "2-3 persons. 1 half plate Turkish kabab, 1 half plate beef kabab, 1 chicken tikka, 1 full plate malai boti. Served with rice and our special sauces.",
      ],
      [
        "Platter 2",
        4790,
        "4-5 persons. 1 full plate Turkish kabab, 1 full plate beef kabab, 1 chicken tikka, 1 full plate malai boti, 1 full plate chicken tandoori boti, 1 full plate beef bihari boti, 2 puri paratha. Served with rice and our special sauces.",
      ],
    ],
  },
  {
    category: "Extras",
    colour: "#475569",
    products: [
      ["Puri Paratha", 80, null],
      ["Chapati", 50, null],
      ["Kitchup Dip", 50, null],
      ["Mayo Dip", 50, null],
      ["Chatni Dip", 50, null],
      ["Raita", 150, null],
      ["Salad", 150, null],
    ],
  },
  {
    category: "Beverages",
    colour: "#1d4ed8",
    products: [
      ["Small Water", 120, null, { kitchen: false }],
      ["Large Water", 230, null, { kitchen: false }],
      ["Cold Drinks Can", 200, null, { kitchen: false }],
      ["Nestle Juices", 250, null, { kitchen: false }],
      ["Red Bull", 750, null, { kitchen: false }],
      // Made to order at the counter, so the kitchen does need to see these.
      ["Mint Lemonade", 450, null],
      ["Fresh Lime", 350, null],
    ],
  },
];

/** Expands the sized pizzas into one category per size, then appends the rest. */
export const buildMenu = () => {
  const pizzaShades = ["#c2410c", "#b45309", "#9a3412"];

  const sized = PIZZA_SIZES.map((size, index) => ({
    category: `Pizza (${size.label})`,
    colour: pizzaShades[index] ?? "#b45309",
    // The size rides on the product itself, so it reaches the kitchen token and
    // the bill - the category name alone never left this screen.
    products: PIZZAS.map(([name, description]) => [
      name,
      size.price,
      description,
      { variant: size.label },
    ]),
  }));

  return [...sized, ...MENU];
};

export default buildMenu;
