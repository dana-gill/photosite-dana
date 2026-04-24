import { useEffect, useState } from "preact/hooks";
import type { SanityPhoto } from "../types/sanity.ts";
import Carousel from "./Carousel.tsx";

interface CarouselWrapperProps {
  images: ReadonlyArray<SanityPhoto>;
}

export default function CarouselWrapper({ images }: CarouselWrapperProps) {
  const [isFadingIn, setIsFadingIn] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setIsFadingIn(false);
    }, 10);
  }, []);

  return (
    <div
      class={`w-full max-w-screen-xl px-4 transition-opacity duration-500 ${
        isFadingIn ? "opacity-0" : "opacity-100"
      }`}
    >
      <Carousel images={images} />
    </div>
  );
}
