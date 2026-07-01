/**
 * Seed: representative ingredients (per-100g, approximating IFCT/USDA) and a
 * starter set of dishes as composite recipes. These values are curated
 * approximations for the vertical slice — replace with exact IFCT 2017 data
 * during the data-import phase (SPEC §8.1). Idempotent via upserts on name.
 */
import { PrismaClient } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();

// Per-100g nutrient definition. Only fields that differ from 0 need be given.
type Ing = {
  calories: number;
  proteinG: number;
  carbG: number;
  sugarG?: number;
  fatG: number;
  satFatG?: number;
  fiberG?: number;
  ironMg?: number;
  calciumMg?: number;
  b12Ug?: number;
  folateUg?: number;
  sodiumMg?: number;
  potassiumMg?: number;
  glycemicIndex?: number | null;
  aliases?: string[];
  source?: string;
};

const INGREDIENTS: Record<string, Ing> = {
  // --- staples / carbs ---
  "cooked white rice": { calories: 130, proteinG: 2.7, carbG: 28, sugarG: 0.1, fatG: 0.3, satFatG: 0.1, fiberG: 0.4, ironMg: 0.2, calciumMg: 10, folateUg: 3, sodiumMg: 1, potassiumMg: 35, glycemicIndex: 73, aliases: ["rice", "steamed rice", "basmati rice"] },
  "whole wheat flour": { calories: 340, proteinG: 13, carbG: 72, sugarG: 0.4, fatG: 2.5, satFatG: 0.4, fiberG: 11, ironMg: 3.9, calciumMg: 34, folateUg: 44, sodiumMg: 2, potassiumMg: 360, glycemicIndex: 62, aliases: ["atta", "wheat flour"] },
  "semolina": { calories: 360, proteinG: 12, carbG: 73, sugarG: 0, fatG: 1, fiberG: 4, ironMg: 1.2, calciumMg: 17, folateUg: 72, sodiumMg: 1, potassiumMg: 186, glycemicIndex: 66, aliases: ["rava", "sooji", "suji"] },
  "flattened rice": { calories: 350, proteinG: 6.6, carbG: 77, fatG: 1.2, fiberG: 2.5, ironMg: 20, calciumMg: 20, folateUg: 10, sodiumMg: 5, potassiumMg: 100, glycemicIndex: 70, aliases: ["poha", "aval"] },
  "urad dal": { calories: 341, proteinG: 25, carbG: 59, fatG: 1.6, fiberG: 18, ironMg: 7.5, calciumMg: 138, folateUg: 216, sodiumMg: 38, potassiumMg: 983, glycemicIndex: 43 },
  "gram flour": { calories: 387, proteinG: 22, carbG: 58, fatG: 6.7, fiberG: 11, ironMg: 4.9, calciumMg: 45, folateUg: 437, sodiumMg: 64, potassiumMg: 846, glycemicIndex: 35, aliases: ["besan"] },
  "cooked pasta": { calories: 158, proteinG: 5.8, carbG: 31, sugarG: 0.6, fatG: 0.9, fiberG: 1.8, ironMg: 0.5, calciumMg: 7, folateUg: 18, sodiumMg: 1, potassiumMg: 44, glycemicIndex: 49 },
  "wheat tortilla": { calories: 310, proteinG: 8, carbG: 51, sugarG: 2, fatG: 8, satFatG: 2, fiberG: 3, ironMg: 3, calciumMg: 150, sodiumMg: 620, potassiumMg: 130, glycemicIndex: 30 },

  // --- pulses / legumes ---
  "cooked toor dal": { calories: 121, proteinG: 7, carbG: 20, sugarG: 1, fatG: 0.7, fiberG: 4.5, ironMg: 1.6, calciumMg: 19, folateUg: 60, sodiumMg: 5, potassiumMg: 300, glycemicIndex: 29, aliases: ["arhar dal", "toor dal", "cooked dal"] },
  "cooked moong dal": { calories: 105, proteinG: 7, carbG: 19, fatG: 0.4, fiberG: 5, ironMg: 1.4, calciumMg: 27, folateUg: 80, sodiumMg: 4, potassiumMg: 266, glycemicIndex: 29, aliases: ["moong dal", "mung dal"] },
  "cooked rajma": { calories: 127, proteinG: 8.7, carbG: 23, sugarG: 0.3, fatG: 0.5, fiberG: 6.4, ironMg: 2.9, calciumMg: 35, folateUg: 130, sodiumMg: 6, potassiumMg: 405, glycemicIndex: 24, aliases: ["kidney beans", "rajma"] },
  "cooked chickpeas": { calories: 164, proteinG: 8.9, carbG: 27, sugarG: 4.8, fatG: 2.6, fiberG: 7.6, ironMg: 2.9, calciumMg: 49, folateUg: 172, sodiumMg: 7, potassiumMg: 291, glycemicIndex: 28, aliases: ["chana", "chole", "kabuli chana", "garbanzo"] },
  "cooked black beans": { calories: 132, proteinG: 8.9, carbG: 24, sugarG: 0.3, fatG: 0.5, fiberG: 8.7, ironMg: 2.1, calciumMg: 27, folateUg: 149, sodiumMg: 2, potassiumMg: 355, glycemicIndex: 30 },

  // --- dairy / protein ---
  paneer: { calories: 296, proteinG: 18.3, carbG: 3.4, sugarG: 2.6, fatG: 23, satFatG: 15, fiberG: 0, ironMg: 0.2, calciumMg: 420, b12Ug: 1.1, folateUg: 37, sodiumMg: 22, potassiumMg: 138, aliases: ["cottage cheese"] },
  "curd": { calories: 61, proteinG: 3.5, carbG: 4.7, sugarG: 4.7, fatG: 3.3, satFatG: 2, calciumMg: 121, b12Ug: 0.4, folateUg: 7, sodiumMg: 46, potassiumMg: 155, aliases: ["yogurt", "dahi", "plain curd"] },
  "whole milk": { calories: 61, proteinG: 3.2, carbG: 4.8, sugarG: 5.1, fatG: 3.3, satFatG: 1.9, calciumMg: 113, b12Ug: 0.5, folateUg: 5, sodiumMg: 43, potassiumMg: 132, glycemicIndex: 39, aliases: ["milk"] },
  "mozzarella cheese": { calories: 280, proteinG: 28, carbG: 3.1, sugarG: 1, fatG: 17, satFatG: 10, calciumMg: 505, b12Ug: 2.3, folateUg: 7, sodiumMg: 627, potassiumMg: 76 },
  "cooked chicken": { calories: 189, proteinG: 27, carbG: 0, fatG: 8, satFatG: 2.3, ironMg: 1.3, calciumMg: 15, b12Ug: 0.3, folateUg: 6, sodiumMg: 82, potassiumMg: 256, aliases: ["chicken", "chicken breast"] },
  egg: { calories: 155, proteinG: 13, carbG: 1.1, sugarG: 1.1, fatG: 11, satFatG: 3.3, ironMg: 1.8, calciumMg: 56, b12Ug: 1.1, folateUg: 44, sodiumMg: 124, potassiumMg: 126, aliases: ["boiled egg"] },

  // --- vegetables ---
  onion: { calories: 40, proteinG: 1.1, carbG: 9.3, sugarG: 4.2, fatG: 0.1, fiberG: 1.7, ironMg: 0.2, calciumMg: 23, folateUg: 19, sodiumMg: 4, potassiumMg: 146, glycemicIndex: 10 },
  tomato: { calories: 18, proteinG: 0.9, carbG: 3.9, sugarG: 2.6, fatG: 0.2, fiberG: 1.2, ironMg: 0.3, calciumMg: 10, folateUg: 15, sodiumMg: 5, potassiumMg: 237, glycemicIndex: 15, aliases: ["tomatoes"] },
  "boiled potato": { calories: 87, proteinG: 1.9, carbG: 20, sugarG: 0.9, fatG: 0.1, fiberG: 1.8, ironMg: 0.3, calciumMg: 5, folateUg: 10, sodiumMg: 4, potassiumMg: 379, glycemicIndex: 78, aliases: ["potato", "aloo"] },
  cauliflower: { calories: 25, proteinG: 1.9, carbG: 5, sugarG: 1.9, fatG: 0.3, fiberG: 2, ironMg: 0.4, calciumMg: 22, folateUg: 57, sodiumMg: 30, potassiumMg: 299, glycemicIndex: 15, aliases: ["gobi"] },
  okra: { calories: 33, proteinG: 1.9, carbG: 7.5, sugarG: 1.5, fatG: 0.2, fiberG: 3.2, ironMg: 0.6, calciumMg: 82, folateUg: 60, sodiumMg: 7, potassiumMg: 299, glycemicIndex: 20, aliases: ["bhindi", "lady finger"] },
  spinach: { calories: 23, proteinG: 2.9, carbG: 3.6, sugarG: 0.4, fatG: 0.4, fiberG: 2.2, ironMg: 2.7, calciumMg: 99, folateUg: 194, sodiumMg: 79, potassiumMg: 558, glycemicIndex: 15, aliases: ["palak"] },
  "mixed vegetables": { calories: 45, proteinG: 2.5, carbG: 9, sugarG: 3, fatG: 0.3, fiberG: 3, ironMg: 0.8, calciumMg: 35, folateUg: 40, sodiumMg: 30, potassiumMg: 250, glycemicIndex: 25 },
  "green peas": { calories: 81, proteinG: 5.4, carbG: 14, sugarG: 5.7, fatG: 0.4, fiberG: 5.7, ironMg: 1.5, calciumMg: 25, folateUg: 65, sodiumMg: 5, potassiumMg: 244, glycemicIndex: 22, aliases: ["matar", "peas"] },
  coconut: { calories: 354, proteinG: 3.3, carbG: 15, sugarG: 6.2, fatG: 33, satFatG: 30, fiberG: 9, ironMg: 2.4, calciumMg: 14, folateUg: 26, sodiumMg: 20, potassiumMg: 356 },
  "tomato sauce": { calories: 82, proteinG: 1.6, carbG: 12, sugarG: 7, fatG: 3, satFatG: 0.5, fiberG: 2, ironMg: 1, calciumMg: 24, sodiumMg: 460, potassiumMg: 400, glycemicIndex: 45, aliases: ["marinara", "pizza sauce"] },
  salsa: { calories: 36, proteinG: 1.5, carbG: 7, sugarG: 4, fatG: 0.2, fiberG: 1.8, sodiumMg: 430, potassiumMg: 270, glycemicIndex: 30 },

  // --- fats / sugar / condiments ---
  "vegetable oil": { calories: 884, proteinG: 0, carbG: 0, fatG: 100, satFatG: 13, sodiumMg: 0, aliases: ["oil", "cooking oil", "refined oil"] },
  ghee: { calories: 900, proteinG: 0, carbG: 0, fatG: 100, satFatG: 62, sodiumMg: 0, aliases: ["clarified butter"] },
  sugar: { calories: 387, proteinG: 0, carbG: 100, sugarG: 100, fatG: 0, sodiumMg: 1, glycemicIndex: 65, aliases: ["white sugar"] },
  salt: { calories: 0, proteinG: 0, carbG: 0, fatG: 0, sodiumMg: 38758, aliases: [] },
  "tea leaves": { calories: 1, proteinG: 0, carbG: 0.2, fatG: 0, sodiumMg: 3, potassiumMg: 37, aliases: ["tea"] },
  "coffee (brewed)": { calories: 1, proteinG: 0.1, carbG: 0, fatG: 0, sodiumMg: 2, potassiumMg: 49, aliases: ["coffee"] },
  banana: { calories: 89, proteinG: 1.1, carbG: 23, sugarG: 12, fatG: 0.3, fiberG: 2.6, ironMg: 0.3, calciumMg: 5, folateUg: 20, sodiumMg: 1, potassiumMg: 358, glycemicIndex: 51 },
};

// Dish = { serving, unit, components: [ingredientName, grams] } (grams per ONE serving)
type Dish = {
  serving: number;
  unit: string;
  cuisine?: string;
  region?: string;
  method?: string;
  aliases?: string[];
  components: [string, number][];
};

const DISHES: Record<string, Dish> = {
  "phulka": { serving: 40, unit: "piece", region: "north", method: "dry", aliases: ["roti", "chapati", "phulka roti"], components: [["whole wheat flour", 32]] },
  "paratha": { serving: 70, unit: "piece", region: "north", method: "fried", aliases: ["plain paratha"], components: [["whole wheat flour", 45], ["vegetable oil", 6]] },
  "steamed rice": { serving: 150, unit: "katori", method: "steamed", aliases: ["rice", "plain rice", "white rice"], components: [["cooked white rice", 150]] },
  "jeera rice": { serving: 150, unit: "katori", method: "tadka", components: [["cooked white rice", 150], ["ghee", 4]] },

  "dal tadka": { serving: 150, unit: "katori", region: "north", method: "tadka", aliases: ["dal", "tadka dal", "dal fry", "yellow dal"], components: [["cooked toor dal", 140], ["onion", 15], ["tomato", 15], ["vegetable oil", 6], ["salt", 1.2] ] },
  "moong dal": { serving: 150, unit: "katori", method: "tadka", aliases: ["yellow moong dal"], components: [["cooked moong dal", 140], ["tomato", 10], ["ghee", 4], ["salt", 1.1]] },
  "rajma masala": { serving: 180, unit: "katori", region: "north", method: "curry", aliases: ["rajma", "rajma curry"], components: [["cooked rajma", 150], ["onion", 25], ["tomato", 25], ["vegetable oil", 8], ["salt", 1.2]] },
  "chana masala": { serving: 180, unit: "katori", region: "north", method: "curry", aliases: ["chole", "chana", "chole masala", "chickpea curry"], components: [["cooked chickpeas", 150], ["onion", 25], ["tomato", 25], ["vegetable oil", 8], ["salt", 1.2]] },

  "aloo gobi": { serving: 150, unit: "katori", region: "north", method: "dry", aliases: ["aloo gobhi", "potato cauliflower"], components: [["boiled potato", 70], ["cauliflower", 70], ["onion", 15], ["tomato", 10], ["vegetable oil", 8], ["salt", 1]] },
  "bhindi masala": { serving: 150, unit: "katori", method: "dry", aliases: ["bhindi", "okra sabzi", "bhindi sabzi"], components: [["okra", 120], ["onion", 20], ["vegetable oil", 9], ["salt", 1]] },
  "palak paneer": { serving: 180, unit: "katori", region: "north", method: "curry", aliases: ["palak paneer curry", "spinach paneer"], components: [["spinach", 110], ["paneer", 45], ["onion", 15], ["tomato", 10], ["vegetable oil", 8], ["salt", 1.1]] },
  "paneer butter masala": { serving: 180, unit: "katori", region: "north", method: "curry", aliases: ["paneer makhani", "butter paneer"], components: [["paneer", 70], ["tomato", 45], ["onion", 20], ["ghee", 8], ["whole milk", 15], ["salt", 1.2]] },
  "mixed veg curry": { serving: 150, unit: "katori", method: "curry", aliases: ["mixed vegetable", "sabzi", "veg curry"], components: [["mixed vegetables", 120], ["onion", 15], ["tomato", 10], ["vegetable oil", 7], ["salt", 1]] },
  "chicken curry": { serving: 180, unit: "katori", method: "curry", aliases: ["chicken masala", "murgh curry"], components: [["cooked chicken", 110], ["onion", 25], ["tomato", 25], ["vegetable oil", 10], ["salt", 1.3]] },

  "masala dosa": { serving: 200, unit: "piece", region: "south", method: "fried", aliases: ["dosa", "masala dose"], components: [["cooked white rice", 90], ["urad dal", 15], ["boiled potato", 70], ["onion", 15], ["vegetable oil", 10], ["salt", 1.2]] },
  "idli": { serving: 40, unit: "piece", region: "south", method: "steamed", aliases: ["idly"], components: [["cooked white rice", 28], ["urad dal", 10], ["salt", 0.4]] },
  "upma": { serving: 180, unit: "katori", region: "south", method: "tadka", components: [["semolina", 55], ["onion", 20], ["vegetable oil", 8], ["salt", 1]] },
  "poha": { serving: 150, unit: "katori", region: "west", method: "tadka", aliases: ["kanda poha"], components: [["flattened rice", 55], ["boiled potato", 25], ["onion", 20], ["vegetable oil", 7], ["salt", 1]] },
  "coconut chutney": { serving: 40, unit: "tbsp", region: "south", method: "raw", aliases: ["chutney"], components: [["coconut", 25], ["urad dal", 3], ["salt", 0.3]] },
  "veg pulao": { serving: 200, unit: "katori", method: "tadka", aliases: ["pulao", "vegetable pulao", "veg biryani"], components: [["cooked white rice", 150], ["mixed vegetables", 40], ["green peas", 15], ["ghee", 8], ["salt", 1.2]] },

  "chai": { serving: 150, unit: "cup", method: "raw", aliases: ["tea", "masala chai", "chai with sugar", "milk tea"], components: [["whole milk", 60], ["sugar", 8], ["tea leaves", 1]] },
  "black coffee": { serving: 150, unit: "cup", method: "raw", aliases: ["coffee"], components: [["coffee (brewed)", 148]] },

  // --- non-Indian (same engine) ---
  "chicken burrito bowl": { serving: 400, unit: "bowl", cuisine: "mexican", method: "curry", aliases: ["burrito bowl"], components: [["cooked white rice", 150], ["cooked black beans", 90], ["cooked chicken", 90], ["salsa", 60], ["vegetable oil", 5]] },
  "margherita pizza slice": { serving: 110, unit: "slice", cuisine: "italian", method: "roasted", aliases: ["pizza slice", "margherita pizza"], components: [["whole wheat flour", 45], ["mozzarella cheese", 30], ["tomato sauce", 30], ["vegetable oil", 4]] },
  "pasta marinara": { serving: 250, unit: "bowl", cuisine: "italian", method: "curry", aliases: ["pasta", "spaghetti marinara"], components: [["cooked pasta", 180], ["tomato sauce", 60], ["vegetable oil", 6], ["salt", 1]] },
};

async function main() {
  console.log("Seeding ingredients...");
  const ingIds: Record<string, string> = {};
  for (const [name, v] of Object.entries(INGREDIENTS)) {
    const data = {
      name,
      aliases: JSON.stringify(v.aliases ?? []),
      source: v.source ?? "curated",
      calories: v.calories,
      proteinG: v.proteinG,
      carbG: v.carbG,
      sugarG: v.sugarG ?? 0,
      fatG: v.fatG,
      satFatG: v.satFatG ?? 0,
      fiberG: v.fiberG ?? 0,
      ironMg: v.ironMg ?? 0,
      calciumMg: v.calciumMg ?? 0,
      b12Ug: v.b12Ug ?? 0,
      folateUg: v.folateUg ?? 0,
      sodiumMg: v.sodiumMg ?? 0,
      potassiumMg: v.potassiumMg ?? 0,
      glycemicIndex: v.glycemicIndex ?? null,
    };
    const row = await prisma.ingredient.upsert({ where: { name }, update: data, create: data });
    ingIds[name] = row.id;
  }
  console.log(`  ${Object.keys(ingIds).length} ingredients.`);

  console.log("Seeding dishes...");
  for (const [name, d] of Object.entries(DISHES)) {
    const dish = await prisma.dish.upsert({
      where: { name },
      update: {
        aliases: JSON.stringify(d.aliases ?? []),
        cuisine: d.cuisine ?? "indian",
        region: d.region ?? null,
        cookingMethod: d.method ?? null,
        servingUnit: d.unit,
        servingGrams: d.serving,
      },
      create: {
        name,
        aliases: JSON.stringify(d.aliases ?? []),
        cuisine: d.cuisine ?? "indian",
        region: d.region ?? null,
        cookingMethod: d.method ?? null,
        servingUnit: d.unit,
        servingGrams: d.serving,
      },
    });
    // Rebuild components
    await prisma.dishComponent.deleteMany({ where: { dishId: dish.id } });
    for (const [ingName, grams] of d.components) {
      const ingredientId = ingIds[ingName];
      if (!ingredientId) throw new Error(`Dish "${name}" references unknown ingredient "${ingName}"`);
      await prisma.dishComponent.create({ data: { dishId: dish.id, ingredientId, grams } });
    }
  }
  console.log(`  ${Object.keys(DISHES).length} dishes.`);

  console.log("Seeding demo user...");
  const email = "santosh@example.com";
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Santosh",
      sex: "male",
      age: 38,
      heightCm: 175,
      weightKg: 78,
      activityLevel: "moderate",
      goal: "lose",
      dietaryType: "vegetarian",
      healthFoci: JSON.stringify(["general", "weight", "glycemic", "protein"]),
    },
  });
  console.log("Done.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
