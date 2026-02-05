import type { StrapiImageFormats } from "./strapi.ts";

export interface ImageProps {
  readonly alt: string;
  readonly formats?: StrapiImageFormats | null;
  readonly height: number;
  readonly src: string;
  readonly width: number;
}
