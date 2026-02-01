import type { LandingPageTitleProps } from "../types/landing-page-title.ts";

export const LandingPageTitle = ({ children }: LandingPageTitleProps) => {
  return (
    <h1 class="text-6xl font-light text-gray-900 italic">
      {children}
    </h1>
  );
};
