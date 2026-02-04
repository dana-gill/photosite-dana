import { useEffect, useState } from "preact/hooks";
import type { NavLink } from "../types/nav.ts";
import WorkModal from "./WorkModal.tsx";
import WorkModalMobile from "./WorkModalMobile.tsx";

const navLinks: ReadonlyArray<NavLink> = [
  { href: "/about", label: "About" },
];

export default function Nav() {
  const [isWorkOpen, setIsWorkOpen] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => {
      window.removeEventListener("resize", checkScreenSize);
    };
  }, []);

  const handleWorkOpen = () => {
    setIsWorkOpen(!isWorkOpen);
  };

  const handleWorkClose = () => {
    setIsWorkOpen(false);
  };

  return (
    <>
      <nav class="w-full bg-transparent fixed top-0 left-0 z-50">
        <div class="px-4 py-4">
          <ul class="flex gap-6 justify-between items-start">
            <li>
              <a href="/" class="text-gray-900 font-[500] italic">
                Dana Gill Photography
              </a>
            </li>
            <div class="flex gap-6">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    class="group text-gray-900 font-[500] transition duration-300"
                  >
                    {link.label}
                    <span class="block max-w-0 group-hover:max-w-full transition-all duration-300 h-px bg-gray-900">
                    </span>
                  </a>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={handleWorkOpen}
                  class="group text-gray-900 font-[500] transition duration-300 cursor-pointer bg-transparent border-none p-0"
                >
                  Work
                  <span class="block max-w-0 group-hover:max-w-full transition-all duration-300 h-px bg-gray-900">
                  </span>
                </button>
              </li>
            </div>
          </ul>
        </div>
      </nav>
      {isSmallScreen ? (
        <WorkModalMobile isOpen={isWorkOpen} onClose={handleWorkClose} />
      ) : (
        <WorkModal isOpen={isWorkOpen} onClose={handleWorkClose} />
      )}
    </>
  );
}
