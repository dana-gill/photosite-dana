import type { SortOrderingItem } from "sanity";
import type { StructureResolver } from "sanity/structure";
import { CATEGORIES, CATEGORY_LABELS } from "./schemaTypes/categories.ts";

const photosByOrder: SortOrderingItem[] = [{ field: "order", direction: "asc" }];

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Content")
    .items([
      ...CATEGORIES.map((category) =>
        S.listItem()
          .title(CATEGORY_LABELS[category])
          .id(`category-${category}`)
          .child(
            S.documentTypeList("photo")
              .title(CATEGORY_LABELS[category])
              .filter('_type == "photo" && category == $category')
              .params({ category })
              .defaultOrdering(photosByOrder)
              .initialValueTemplates([
                S.initialValueTemplateItem("photo-by-category", { category }),
              ]),
          )
      ),
      S.divider(),
      S.listItem()
        .title("All photos")
        .id("all-photos")
        .child(
          S.documentTypeList("photo")
            .title("All photos")
            .defaultOrdering(photosByOrder),
        ),
      S.divider(),
      S.listItem()
        .title("Carousel")
        .id("carousel")
        .child(
          S.document().schemaType("carousel").documentId("carousel"),
        ),
      S.listItem()
        .title("About")
        .id("about")
        .child(S.document().schemaType("about").documentId("about")),
    ]);
