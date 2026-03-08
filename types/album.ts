import type { StrapiImage } from "./strapi.ts";

export interface StrapiAlbum {
  readonly id: number;
  readonly documentId: string;
  readonly title: string;
  readonly slug: string;
  readonly description: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface StrapiAlbumResponse {
  readonly data: ReadonlyArray<StrapiAlbum>;
  readonly meta: {
    readonly pagination: {
      readonly page: number;
      readonly pageSize: number;
      readonly pageCount: number;
      readonly total: number;
    };
  };
}

export interface StrapiPhoto {
  readonly id: number;
  readonly documentId: string;
  readonly altTitle: string | null;
  readonly caption: string | null;
  readonly order: number;
  readonly image: StrapiImage;
  readonly album: StrapiAlbum | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface StrapiPhotoResponse {
  readonly data: ReadonlyArray<StrapiPhoto>;
  readonly meta: {
    readonly pagination: {
      readonly page: number;
      readonly pageSize: number;
      readonly pageCount: number;
      readonly total: number;
    };
  };
}

export interface StrapiAlbumSingleResponse {
  readonly data: StrapiAlbum;
}

export interface StrapiPhotoSingleResponse {
  readonly data: StrapiPhoto;
}
