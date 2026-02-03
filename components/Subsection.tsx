import type { SubsectionProps } from "../types/subsection.ts";

export const Subsection = ({ children }: SubsectionProps) => {
  return (
    <p class="text-lg font-[200] text-center">
      {children}
    </p>
  );
};
