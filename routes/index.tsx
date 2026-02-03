import Carousel from "../islands/Carousel.tsx";

export default function Home() {
  return (
    <div class="min-h-screen bg-gray-50 flex justify-center pt-20 md:items-center">
      <div class="w-full max-w-screen-xl px-4">
        <Carousel />
      </div>
    </div>
  );
}
