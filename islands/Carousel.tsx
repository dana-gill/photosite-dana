import { useEffect, useState } from "preact/hooks";
import type { StrapiImage } from "../types/strapi.ts";

export default function Carousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [images, setImages] = useState<ReadonlyArray<StrapiImage>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      const response = await fetch("/api/recent-images");
      const data = await response.json();
      setImages(data);
      setIsLoading(false);
    };
    fetchImages();
  }, []);

  useEffect(() => {
    const hasImages = images.length > 0;
    if (!hasImages) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [images]);

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const handlePrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  if (isLoading) {
    return (
      <div class="w-full h-[70vh] flex items-center justify-center">
        <p class="text-gray-500">Loading...</p>
      </div>
    );
  }

  const hasNoImages = images.length === 0;
  if (hasNoImages) {
    return (
      <div class="w-full h-[70vh] flex items-center justify-center">
        <p class="text-gray-500">No images available</p>
      </div>
    );
  }

  return (
    <div class="relative w-full h-[70vh] overflow-hidden group">
      <div class="relative w-full h-full">
        {images.map((image, index) => {
          const url = image.formats?.large?.url ?? image.url;
          const isActive = index === currentIndex;
          return (
            <div
              key={image.id}
              class={`absolute inset-0 transition-opacity duration-1000 ${
                isActive ? "opacity-100" : "opacity-0"
              }`}
            >
              <img
                src={url}
                alt={image.alternativeText ?? image.name}
                class="w-full h-full object-contain"
                loading={index === 0 ? "eager" : "lazy"}
              />
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handlePrevious}
        class="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-none hover:bg-black/70"
        aria-label="Previous image"
      >
        ←
      </button>

      <button
        type="button"
        onClick={handleNext}
        class="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-none hover:bg-black/70"
        aria-label="Next image"
      >
        →
      </button>
    </div>
  );
}
