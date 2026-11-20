export const CATEGORIES = ["architecture", "couples", "portraits"] as const;
export type Category = typeof CATEGORIES[number];

export const CATEGORY_LABELS: Readonly<Record<Category, string>> = {
  architecture: "Architecture",
  couples: "Couples",
  portraits: "Portraits",
};

export const isCategory = (value: string): value is Category =>
  CATEGORIES.some((category) => category === value);
