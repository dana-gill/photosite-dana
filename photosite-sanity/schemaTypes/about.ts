import { defineField, defineType } from "sanity";

export const about = defineType({
  name: "about",
  type: "document",
  title: "About",
  fields: [
    defineField({
      name: "image",
      type: "image",
      title: "Image",
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "altTitle", type: "string", title: "Alt title" }),
  ],
  preview: { prepare: () => ({ title: "About" }) },
});
