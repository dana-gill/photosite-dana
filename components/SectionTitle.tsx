import type { SectionTitleProps } from "../types/section-title.ts";

export const SectionTitle = ({ children }: SectionTitleProps) => {
  return (
    <h1 class="text-4xl font-[200] italic mt-8 mb-2 text-center fade-in-title">
      {children}
    </h1>
  );
};
