import type { SectionTitleProps } from "../types/section-title.ts";

export const SectionTitle = ({ children }: SectionTitleProps) => {
  return (
    <h1 class="text-4xl font-light mb-8 text-center">
      {children}
    </h1>
  );
};
