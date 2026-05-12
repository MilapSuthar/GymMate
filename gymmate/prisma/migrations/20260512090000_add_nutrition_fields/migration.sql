-- Add macro columns to MealPlan
ALTER TABLE "MealPlan" ADD COLUMN "proteinPerDay" INTEGER;
ALTER TABLE "MealPlan" ADD COLUMN "carbsPerDay" INTEGER;
ALTER TABLE "MealPlan" ADD COLUMN "fatsPerDay" INTEGER;

-- Add name and mealType to NutritionLog
ALTER TABLE "NutritionLog" ADD COLUMN "name" TEXT;
ALTER TABLE "NutritionLog" ADD COLUMN "mealType" TEXT;
