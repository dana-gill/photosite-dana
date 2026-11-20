import { defineArrayMember, defineField, defineType } from "sanity";

export const carousel = defineType({
  name: "carousel",
  type: "document",
  title: "Carousel",
  fields: [
    defineField({
      name: "images",
      type: "array",
      title: "Images",
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "photo" }],
          weak: true,
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: "Carousel" }) },
});
