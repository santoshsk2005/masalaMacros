import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  ParsedMeal,
  ParsedMealSchema,
  ParsedItem,
} from "./nutrition/types";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic();
  return client;
}

export function llmAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// Extract the first JSON object/array from a model response.
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.search(/[[{]/);
  if (start === -1) throw new Error("no JSON found in model output");
  return JSON.parse(raw.slice(start));
}

// ---------------------------------------------------------------------------
// 1. Parse free-text / voice meal description → structured items
// ---------------------------------------------------------------------------

const PARSE_SYSTEM = `You convert a person's description of a meal (often Indian home food, sometimes other cuisines) into structured items. Return ONLY JSON matching:
{"mealType": "breakfast|lunch|dinner|snack|meal", "items": [{"label": string, "quantity": number, "unit": string}]}

Rules:
- label = the dish or food name, lowercased, no quantities (e.g. "dal tadka", "aloo gobi", "phulka", "chai with sugar").
- Use natural Indian units when implied: roti, phulka, chapati, paratha, dosa, idli, katori, cup, glass, bowl, piece, tbsp, tsp, or g/ml. Default unit "katori" for wet dishes (dal/sabzi/curry), "piece" for countables (roti/idli), "cup"/"glass" for drinks.
- If quantity is unstated, use 1.
- Split compound meals into separate items. Do not invent items not mentioned.
- Infer mealType from context/time words if present, else "meal".`;

// Very small heuristic parser used when no API key is configured.
const UNIT_WORDS = [
  "katori",
  "katoris",
  "roti",
  "rotis",
  "phulka",
  "phulkas",
  "chapati",
  "chapatis",
  "paratha",
  "parathas",
  "dosa",
  "dosas",
  "idli",
  "idlis",
  "cup",
  "cups",
  "glass",
  "glasses",
  "bowl",
  "bowls",
  "plate",
  "plates",
  "piece",
  "pieces",
  "tbsp",
  "tsp",
  "g",
  "grams",
  "ml",
  "slice",
  "slices",
];

const NUM_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  half: 0.5,
  couple: 2,
};

function singularUnit(u: string): string {
  const map: Record<string, string> = {
    katoris: "katori",
    rotis: "roti",
    phulkas: "phulka",
    chapatis: "chapati",
    parathas: "paratha",
    dosas: "dosa",
    idlis: "idli",
    cups: "cup",
    glasses: "glass",
    bowls: "bowl",
    plates: "plate",
    pieces: "piece",
    slices: "slice",
    grams: "g",
  };
  return map[u] ?? u;
}

export function heuristicParse(text: string): ParsedMeal {
  const lower = text.toLowerCase();
  let mealType: ParsedMeal["mealType"] = "meal";
  if (/\bbreakfast\b/.test(lower)) mealType = "breakfast";
  else if (/\blunch\b/.test(lower)) mealType = "lunch";
  else if (/\bdinner\b/.test(lower)) mealType = "dinner";
  else if (/\bsnack\b/.test(lower)) mealType = "snack";

  const chunks = lower
    .replace(/\b(had|ate|for breakfast|for lunch|for dinner|i)\b/g, " ")
    .split(/,|;|\band\b|\bwith\b|\bplus\b|\+/)
    .map((c) => c.trim())
    .filter(Boolean);

  const items: ParsedItem[] = [];
  for (const chunk of chunks) {
    const tokens = chunk.split(/\s+/).filter(Boolean);
    let quantity = 1;
    let unit = "katori";
    let unitFound = false;
    const labelTokens: string[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (/^\d+(\.\d+)?$/.test(t)) {
        quantity = parseFloat(t);
        continue;
      }
      if (t in NUM_WORDS) {
        quantity = NUM_WORDS[t];
        continue;
      }
      if (UNIT_WORDS.includes(t)) {
        unit = singularUnit(t);
        unitFound = true;
        // a countable unit word often IS the food (roti, idli, dosa)
        if (["roti", "phulka", "chapati", "paratha", "dosa", "idli"].includes(unit)) {
          labelTokens.push(unit);
        }
        continue;
      }
      labelTokens.push(t);
    }

    const label = labelTokens.join(" ").trim();
    if (!label) continue;
    if (!unitFound) {
      if (/\b(chai|tea|coffee|milk|juice|lassi|water)\b/.test(label)) unit = "cup";
    }
    items.push({ label, quantity, unit });
  }

  if (items.length === 0) items.push({ label: text.trim(), quantity: 1, unit: "serving" });
  return { mealType, items };
}

export async function parseMealText(text: string): Promise<{
  parsed: ParsedMeal;
  usedLlm: boolean;
}> {
  const c = getClient();
  if (!c) return { parsed: heuristicParse(text), usedLlm: false };

  try {
    const msg = await c.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: PARSE_SYSTEM,
      messages: [{ role: "user", content: text }],
    });
    const block = msg.content.find((b) => b.type === "text");
    const json = extractJson(block && "text" in block ? block.text : "");
    const parsed = ParsedMealSchema.parse(json);
    return { parsed, usedLlm: true };
  } catch (err) {
    console.error("LLM parse failed, using heuristic:", err);
    return { parsed: heuristicParse(text), usedLlm: false };
  }
}

// ---------------------------------------------------------------------------
// 2. Decompose an unknown dish → ingredient breakdown with per-100g nutrients
//    (the AI fallback path; results feed the SAME deterministic engine)
// ---------------------------------------------------------------------------

export const DecomposedIngredientSchema = z.object({
  name: z.string(),
  grams: z.number().nonnegative(),
  calories: z.number().nonnegative(),
  proteinG: z.number().nonnegative(),
  carbG: z.number().nonnegative(),
  sugarG: z.number().nonnegative().default(0),
  fatG: z.number().nonnegative(),
  satFatG: z.number().nonnegative().default(0),
  fiberG: z.number().nonnegative().default(0),
  ironMg: z.number().nonnegative().default(0),
  calciumMg: z.number().nonnegative().default(0),
  b12Ug: z.number().nonnegative().default(0),
  folateUg: z.number().nonnegative().default(0),
  sodiumMg: z.number().nonnegative().default(0),
  potassiumMg: z.number().nonnegative().default(0),
  glycemicIndex: z.number().min(0).max(100).nullable().default(null),
});
export type DecomposedIngredient = z.infer<typeof DecomposedIngredientSchema>;

export const DecompositionSchema = z.object({
  ingredients: z.array(DecomposedIngredientSchema).min(1),
});

const DECOMPOSE_SYSTEM = `You are a nutrition data expert. Given a dish name and an approximate total cooked weight in grams, break it into its main ingredients and give per-100g nutrient values for EACH ingredient (values are per 100g of that ingredient, NOT for the portion). Include cooking oil/ghee explicitly when the dish is fried or tempered (tadka). Return ONLY JSON:
{"ingredients": [{"name": string, "grams": number, "calories": n, "proteinG": n, "carbG": n, "sugarG": n, "fatG": n, "satFatG": n, "fiberG": n, "ironMg": n, "calciumMg": n, "b12Ug": n, "folateUg": n, "sodiumMg": n, "potassiumMg": n, "glycemicIndex": n or null}]}
- grams = grams of that ingredient in the given total weight; they should roughly sum to the total.
- Use realistic Indian cooking values. glycemicIndex only for carb sources (rice ~73, wheat roti ~62, potato ~78, sugar ~65), else null.`;

// Fallback estimate when no LLM: a single generic "mixed cooked dish" ingredient.
export function heuristicDecompose(
  label: string,
  grams: number,
): { ingredients: DecomposedIngredient[] } {
  return {
    ingredients: [
      {
        name: `${label} (estimated)`,
        grams,
        calories: 150,
        proteinG: 5,
        carbG: 18,
        sugarG: 2,
        fatG: 6,
        satFatG: 2,
        fiberG: 2,
        ironMg: 1,
        calciumMg: 30,
        b12Ug: 0,
        folateUg: 20,
        sodiumMg: 250,
        potassiumMg: 150,
        glycemicIndex: 50,
      },
    ],
  };
}

export async function decomposeDish(
  label: string,
  grams: number,
): Promise<{ ingredients: DecomposedIngredient[]; usedLlm: boolean }> {
  const c = getClient();
  if (!c) return { ...heuristicDecompose(label, grams), usedLlm: false };

  try {
    const msg = await c.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: DECOMPOSE_SYSTEM,
      messages: [
        { role: "user", content: `Dish: "${label}". Approx total cooked weight: ${grams} g.` },
      ],
    });
    const block = msg.content.find((b) => b.type === "text");
    const json = extractJson(block && "text" in block ? block.text : "");
    const parsed = DecompositionSchema.parse(json);
    return { ingredients: parsed.ingredients, usedLlm: true };
  } catch (err) {
    console.error("LLM decompose failed, using heuristic:", err);
    return { ...heuristicDecompose(label, grams), usedLlm: false };
  }
}
