import type { NavLink } from "../types/nav.ts";
import { CATEGORIES, CATEGORY_LABELS } from "../types/category.ts";

export const CAROUSEL_LIBRARY_PAGE_SIZE = 20;

export const NAV_LINKS: ReadonlyArray<NavLink> = [
  ...CATEGORIES.map((category) => ({
    href: `/${category}`,
    label: CATEGORY_LABELS[category],
  })),
  { href: "/about", label: "About" },
];

export const UPLOAD_END_EVENT = "photo-upload-end";
export const UPLOAD_START_EVENT = "photo-upload-start";
