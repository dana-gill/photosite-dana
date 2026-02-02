import Carousel from "../islands/Carousel.tsx";
import { LandingPageTitle } from "../components/LandingPageTitle.tsx";

export default function Home() {
  return (
    <div class="min-h-screen bg-gray-50">
      <div class="px-4 py-8 mx-auto flex items-center justify-center">
        <LandingPageTitle>Dana Gill Photography</LandingPageTitle>
      </div>
      {/* <div class="px-4 py-8">
        <Carousel />
      </div> */}
    </div>
  );
}
