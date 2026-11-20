import { defineField, defineType } from "sanity";
import { CATEGORIES, CATEGORY_LABELS, CATEGORY_OPTIONS } from "./categories.ts";

const labelFor = (value: unknown): string => {
  const match = CATEGORIES.find((category) => category === value);
  return match ? CATEGORY_LABELS[match] : "No category";
};

export const photo = defineType({
  name: "photo",
  type: "document",
  title: "Photo",
  fields: [
    defineField({
      name: "image",
      type: "image",
      title: "Image",
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "category",
      type: "string",
      title: "Category",
      options: { list: CATEGORY_OPTIONS, layout: "radio" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "order",
      type: "number",
      title: "Order",
      description: "Position inside the category (1 is first).",
      validation: (rule) => rule.required().integer().min(1),
    }),
    defineField({ name: "altTitle", type: "string", title: "Alt title" }),
    defineField({ name: "caption", type: "string", title: "Caption" }),
  ],
  orderings: [
    {
      title: "Order",
      name: "orderAsc",
      by: [{ field: "order", direction: "asc" }],
    },
  ],
  preview: {
    select: {
      image: "image",
      altTitle: "altTitle",
      category: "category",
      order: "order",
      filename: "image.asset.originalFilename",
    },
    prepare: ({ image, altTitle, category, order, filename }) => {
      const title = typeof altTitle === "string" && altTitle.length > 0
        ? altTitle
        : typeof filename === "string" && filename.length > 0
        ? filename
        : "Untitled";
      const position = typeof order === "number" ? `#${order}` : "#?";
      return {
        title,
        subtitle: `${labelFor(category)} · ${position}`,
        media: image,
      };
    },
  },
});
