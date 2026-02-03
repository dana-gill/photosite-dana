import type { PageHeaderProps } from "../types/page-header.ts";

export const PageHeader = ({ subtitle, title }: PageHeaderProps) => {
  return (
    <>
      <div class="my-8">
        <h1 class="text-4xl font-[200] italic mt-8 mb-2 text-center fade-in-title">
          {title}
        </h1>
        <p class="text-sm font-[200] text-center">
          {subtitle}
        </p>
      </div>
    </>
  );
};
