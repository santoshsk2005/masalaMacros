-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "sex" TEXT,
    "age" INTEGER,
    "heightCm" REAL,
    "weightKg" REAL,
    "activityLevel" TEXT,
    "goal" TEXT,
    "dietaryType" TEXT NOT NULL DEFAULT 'vegetarian',
    "allergies" TEXT,
    "healthFoci" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Target" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "effectiveFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calories" REAL NOT NULL,
    "proteinG" REAL NOT NULL,
    "carbG" REAL NOT NULL,
    "fatG" REAL NOT NULL,
    "fiberG" REAL NOT NULL,
    "sodiumMaxMg" REAL,
    "addedSugarMaxG" REAL,
    "isOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Target_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "aliases" TEXT,
    "source" TEXT NOT NULL DEFAULT 'curated',
    "calories" REAL NOT NULL,
    "proteinG" REAL NOT NULL,
    "carbG" REAL NOT NULL,
    "sugarG" REAL NOT NULL DEFAULT 0,
    "fatG" REAL NOT NULL,
    "satFatG" REAL NOT NULL DEFAULT 0,
    "fiberG" REAL NOT NULL DEFAULT 0,
    "ironMg" REAL NOT NULL DEFAULT 0,
    "calciumMg" REAL NOT NULL DEFAULT 0,
    "b12Ug" REAL NOT NULL DEFAULT 0,
    "folateUg" REAL NOT NULL DEFAULT 0,
    "sodiumMg" REAL NOT NULL DEFAULT 0,
    "potassiumMg" REAL NOT NULL DEFAULT 0,
    "glycemicIndex" REAL
);

-- CreateTable
CREATE TABLE "Dish" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "aliases" TEXT,
    "cuisine" TEXT NOT NULL DEFAULT 'indian',
    "region" TEXT,
    "cookingMethod" TEXT,
    "servingUnit" TEXT NOT NULL DEFAULT 'katori',
    "servingGrams" REAL NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'curated',
    "verified" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "DishComponent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dishId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "grams" REAL NOT NULL,
    CONSTRAINT "DishComponent_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DishComponent_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PortionUnit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "foodClass" TEXT NOT NULL DEFAULT '*',
    "grams" REAL NOT NULL,
    "userId" TEXT,
    CONSTRAINT "PortionUnit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Meal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "eatenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mealType" TEXT NOT NULL DEFAULT 'meal',
    "note" TEXT,
    "rawText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Meal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MealItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mealId" TEXT NOT NULL,
    "dishId" TEXT,
    "ingredientId" TEXT,
    "label" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'katori',
    "grams" REAL NOT NULL,
    "nutrients" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'curated',
    "confidence" REAL NOT NULL DEFAULT 1,
    CONSTRAINT "MealItem_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MealItem_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MealItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Assessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Target_userId_effectiveFrom_idx" ON "Target"("userId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_name_key" ON "Ingredient"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Dish_name_key" ON "Dish"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DishComponent_dishId_ingredientId_key" ON "DishComponent"("dishId", "ingredientId");

-- CreateIndex
CREATE INDEX "PortionUnit_name_foodClass_idx" ON "PortionUnit"("name", "foodClass");

-- CreateIndex
CREATE INDEX "Meal_userId_eatenAt_idx" ON "Meal"("userId", "eatenAt");

-- CreateIndex
CREATE INDEX "Assessment_userId_createdAt_idx" ON "Assessment"("userId", "createdAt");
