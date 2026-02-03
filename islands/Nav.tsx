import { useEffect, useState } from "preact/hooks";
import type { NavLink } from "../types/nav.ts";

const navLinks: ReadonlyArray<NavLink> = [
  { href: "/about", label: "About" },
];

export default function Nav() {
  const [isWorkOpen, setIsWorkOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [workLinks, setWorkLinks] = useState<ReadonlyArray<NavLink>>([]);

  useEffect(() => {
    const fetchWorkLinks = async () => {
      const response = await fetch("/api/work-links");
      const links = await response.json();
      setWorkLinks(links);
    };
    fetchWorkLinks();
  }, []);

  const handleModalClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsWorkOpen(false);
      setIsClosing(false);
    }, 300);
  };

  const handleWorkOpen = () => {
    if (isWorkOpen) {
      handleModalClose();
    } else {
      setIsWorkOpen(true);
      setIsClosing(false);
    }
  };

  return (
    <>
      <nav class="w-full bg-transparent fixed top-0 left-0 z-50">
        <div class="px-4 py-4">
          <ul class="flex gap-6 justify-between items-start">
            <li>
              <span class="text-gray-900 font-[500] italic">Dana Gill Photography</span>
            </li>
            <div class="flex gap-6">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    class="group text-gray-900 font-[500] transition duration-300"
                  >
                    {link.label}
                    <span class="block max-w-0 group-hover:max-w-full transition-all duration-300 h-px bg-gray-900"></span>
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
                  <span class="block max-w-0 group-hover:max-w-full transition-all duration-300 h-px bg-gray-900"></span>
                </button>
              </li>
            </div>
          </ul>
        </div>
      </nav>
      {(isWorkOpen || isClosing) && (
        <div
          class={`fixed inset-0 bg-gray-50 z-[100] flex items-center justify-center transition-opacity duration-300 ${
            isClosing ? "opacity-0" : "opacity-100"
          }`}
        >
          <button
            type="button"
            onClick={handleModalClose}
            class="absolute top-8 left-8 text-4xl text-gray-900 bg-transparent border-none cursor-pointer p-0 hover:opacity-70 transition-opacity"
          >
            ×
          </button>
          <ul
            class={`flex flex-col gap-8 items-center transition-all duration-300 ${
              isClosing ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
            }`}
          >
            {workLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  class="group text-gray-900 font-[200] italic transition duration-300 text-3xl"
                >
                  {link.label}
                  <span class="block max-w-0 group-hover:max-w-full transition-all duration-300 h-px bg-gray-900"></span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
