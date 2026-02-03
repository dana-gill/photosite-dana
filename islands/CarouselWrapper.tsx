import { useEffect, useState } from "preact/hooks";
import Carousel from "./Carousel.tsx";

export default function CarouselWrapper() {
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
      <Carousel />
    </div>
  );
}
