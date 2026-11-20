import type { Category } from "./category.ts";

export interface SanityImageDimensions {
  readonly width: number;
  readonly height: number;
  readonly aspectRatio: number;
}

export interface SanityImageMetadata {
  readonly dimensions: SanityImageDimensions;
  readonly lqip: string;
}

export interface SanityImageAsset {
  readonly _id: string;
  readonly url: string;
  readonly metadata: SanityImageMetadata | undefined;
}

export interface SanityImageField {
  readonly _type: "image";
  readonly asset: SanityImageAsset;
  readonly hotspot?: {
    readonly x: number;
    readonly y: number;
    readonly height: number;
    readonly width: number;
  };
}

export interface SanityPhoto {
  readonly _id: string;
  readonly image: SanityImageField;
  readonly altTitle: string | null;
  readonly caption: string | null;
  readonly order: number;
  readonly category: Category;
}

export interface SanityAbout {
  readonly _id: string;
  readonly image: SanityImageField;
  readonly altTitle: string | null;
}

export interface CarouselEntry {
  readonly photoId: string;
}
