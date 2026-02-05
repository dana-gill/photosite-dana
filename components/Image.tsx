import type { ImageProps } from "../types/image.ts";

const buildSrcSet = (
  formats: ImageProps["formats"],
  originalSrc: string,
  originalWidth: number,
): string => {
  if (!formats) {
    return "";
  }

  const srcSetParts: string[] = [];

  if (formats.thumbnail) {
    srcSetParts.push(`${formats.thumbnail.url} ${formats.thumbnail.width}w`);
  }
  if (formats.small) {
    srcSetParts.push(`${formats.small.url} ${formats.small.width}w`);
  }
  if (formats.medium) {
    srcSetParts.push(`${formats.medium.url} ${formats.medium.width}w`);
  }
  if (formats.large) {
    srcSetParts.push(`${formats.large.url} ${formats.large.width}w`);
  }

  srcSetParts.push(`${originalSrc} ${originalWidth}w`);

  return srcSetParts.join(", ");
};

const getDefaultSrc = (
  formats: ImageProps["formats"],
  originalSrc: string,
): string => {
  if (!formats) {
    return originalSrc;
  }

  return formats.medium?.url ?? formats.small?.url ?? originalSrc;
};

export const Image = ({ alt, formats, height, src, width }: ImageProps) => {
  const srcSet = buildSrcSet(formats, src, width);
  const defaultSrc = getDefaultSrc(formats, src);

  return (
    <img
      src={defaultSrc}
      srcSet={srcSet || undefined}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      alt={alt}
      width={width}
      height={height}
      class="max-w-full h-auto"
      loading="lazy"
    />
  );
};
