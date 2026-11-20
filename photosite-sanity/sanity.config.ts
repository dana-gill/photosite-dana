import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./schemaTypes/index.ts";
import { CATEGORIES } from "./schemaTypes/categories.ts";
import { structure } from "./structure.ts";

const SINGLETON_TYPES: ReadonlySet<string> = new Set(["carousel", "about"]);
const SINGLETON_ACTIONS: ReadonlySet<string> = new Set([
  "publish",
  "discardChanges",
  "restore",
]);

export default defineConfig({
  name: "default",
  title: "Dana Gill Photography",
  projectId: "serh8kfd",
  dataset: "production",
  plugins: [structureTool({ structure }), visionTool()],
  schema: {
    types: schemaTypes,
    templates: (templates) => [
      ...templates.filter(({ schemaType }) =>
        !SINGLETON_TYPES.has(schemaType)
      ),
      {
        id: "photo-by-category",
        title: "Photo in category",
        schemaType: "photo",
        parameters: [{ name: "category", type: "string" }],
        value: (params: { readonly category?: string }) => ({
          category: CATEGORIES.find((c) => c === params.category),
        }),
      },
    ],
  },
  document: {
    actions: (input, context) =>
      SINGLETON_TYPES.has(context.schemaType)
        ? input.filter(({ action }) =>
          action !== undefined && SINGLETON_ACTIONS.has(action)
        )
        : input,
    newDocumentOptions: (prev, { creationContext }) =>
      creationContext.type === "global"
        ? prev.filter(({ templateId }) => !SINGLETON_TYPES.has(templateId))
        : prev,
  },
});
