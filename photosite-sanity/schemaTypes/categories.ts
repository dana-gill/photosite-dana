// Keep the same as types/category.ts in the Deno app.
export const CATEGORIES = ["architecture", "couples", "portraits"] as const;

export type Category = typeof CATEGORIES[number];

export const CATEGORY_LABELS: Readonly<Record<Category, string>> = {
  architecture: "Architecture",
  couples: "Couples",
  portraits: "Portraits",
};

export const CATEGORY_OPTIONS = CATEGORIES.map((value) => ({
  title: CATEGORY_LABELS[value],
  value,
}));
