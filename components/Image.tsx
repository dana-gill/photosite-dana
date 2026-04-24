import type { ImageProps } from "../types/image.ts";

export const Image = ({ alt, height, src, width }: ImageProps) => (
  <img
    src={src}
    alt={alt}
    width={width}
    height={height}
    class="max-w-full h-auto"
    loading="lazy"
  />
);
