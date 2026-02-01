export interface StrapiImageFormat {
  readonly ext: string;
  readonly hash: string;
  readonly height: number;
  readonly mime: string;
  readonly name: string;
  readonly path: string | null;
  readonly size: number;
  readonly url: string;
  readonly width: number;
}

export interface StrapiImageFormats {
  readonly large?: StrapiImageFormat;
  readonly medium?: StrapiImageFormat;
  readonly small?: StrapiImageFormat;
  readonly thumbnail?: StrapiImageFormat;
}

export interface StrapiImage {
  readonly id: number;
  readonly name: string;
  readonly alternativeText: string | null;
  readonly caption: string | null;
  readonly width: number;
  readonly height: number;
  readonly formats: StrapiImageFormats | null;
  readonly hash: string;
  readonly ext: string;
  readonly mime: string;
  readonly size: number;
  readonly url: string;
  readonly previewUrl: string | null;
  readonly provider: string;
  readonly provider_metadata: Record<string, string> | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface StrapiFileResponse {
  readonly data: ReadonlyArray<StrapiImage>;
  readonly meta: {
    readonly pagination: {
      readonly page: number;
      readonly pageSize: number;
      readonly pageCount: number;
      readonly total: number;
    };
  };
}

export type AlbumImages = ReadonlyMap<string, ReadonlyArray<StrapiImage>>;

export interface CacheMetadata {
  readonly lastRefresh: Date;
  readonly totalImages: number;
  readonly albumCount: number;
}
