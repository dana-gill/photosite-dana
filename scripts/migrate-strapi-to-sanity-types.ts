export interface StrapiImage {
  readonly id: number;
  readonly documentId: string;
  readonly name: string;
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly mime: string;
}

export interface StrapiAlbum {
  readonly id: number;
  readonly documentId: string;
  readonly title: string;
  readonly slug: string;
  readonly description: string | null;
}

export interface StrapiPhoto {
  readonly id: number;
  readonly documentId: string;
  readonly caption: string | null;
  readonly altTitle: string | null;
  readonly order: number;
  readonly image: StrapiImage;
  readonly album: StrapiAlbum | null;
}

export interface StrapiPagination {
  readonly page: number;
  readonly pageSize: number;
  readonly pageCount: number;
  readonly total: number;
}

export interface StrapiListResponse<T> {
  readonly data: ReadonlyArray<T>;
  readonly meta: { readonly pagination: StrapiPagination };
}
