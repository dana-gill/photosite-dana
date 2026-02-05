import { useState } from "preact/hooks";
import type { StrapiImage } from "../types/strapi.ts";

interface CarouselProps {
  images: ReadonlyArray<StrapiImage>;
}

const buildSrcSet = (image: StrapiImage): string => {
  const srcSetParts: string[] = [];

  if (image.formats?.small) {
    srcSetParts.push(`${image.formats.small.url} ${image.formats.small.width}w`);
  }
  if (image.formats?.medium) {
    srcSetParts.push(`${image.formats.medium.url} ${image.formats.medium.width}w`);
  }
  if (image.formats?.large) {
    srcSetParts.push(`${image.formats.large.url} ${image.formats.large.width}w`);
  }

  srcSetParts.push(`${image.url} ${image.width}w`);

  return srcSetParts.join(", ");
};

const getDefaultSrc = (image: StrapiImage): string => {
  return image.formats?.medium?.url ?? image.formats?.small?.url ?? image.url;
};

export default function Carousel({ images }: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const handlePrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const hasNoImages = images.length === 0;
  if (hasNoImages) {
    return (
      <div class="w-full h-[70vh] flex items-center justify-center">
        <p class="text-gray-500">No images available</p>
      </div>
    );
  }

  return (
    <div class="w-full flex flex-col items-center gap-4">
      <div class="relative w-full h-[70vh] overflow-hidden">
        <div class="relative w-full h-full">
          {images.map((image, index) => {
            const srcSet = buildSrcSet(image);
            const defaultSrc = getDefaultSrc(image);
            const isActive = index === currentIndex;
            return (
              <div
                key={image.id}
                class={`absolute inset-0 flex items-center justify-center transition-opacity duration-1000 ${
                  isActive ? "opacity-100" : "opacity-0"
                }`}
              >
                <img
                  src={defaultSrc}
                  srcSet={srcSet}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 80vw"
                  alt={image.alternativeText ?? image.name}
                  class="max-w-full max-h-full object-contain"
                  loading={index === 0 ? "eager" : "lazy"}
                />
              </div>
            );
          })}
        </div>

        <div
          onClick={handlePrevious}
          class="absolute left-0 top-0 w-1/2 h-full cursor-w-resize"
          aria-label="Previous image"
        />

        <div
          onClick={handleNext}
          class="absolute right-0 top-0 w-1/2 h-full cursor-e-resize"
          aria-label="Next image"
        />
      </div>

      <div class="text-gray-600 text-xs lg:hidden">
        Preview - {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
}
