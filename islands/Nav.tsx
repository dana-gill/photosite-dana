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

  const handleWorkOpen = () => {
    setIsWorkOpen(!isWorkOpen);
    setIsClosing(false);
  };

  const handleModalClose = () => {
    setIsWorkOpen(false);
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
    }, 500);
  };

  const handleWorkLinkClick = (e: Event, href: string) => {
    e.preventDefault();
    setIsClosing(true);
    setTimeout(() => {
      globalThis.location.href = href;
    }, 500);
  };

  return (
    <>
      <nav class="w-full bg-transparent fixed top-0 left-0 z-50">
        <div class="px-4 py-4">
          <ul class="flex gap-6 justify-end items-start">
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
          </ul>
        </div>
      </nav>
      {isWorkOpen && (
        <div class={`fixed inset-0 bg-gray-50 z-[100] flex items-center justify-center`}>
          <button
            type="button"
            onClick={handleModalClose}
            class="absolute top-8 left-8 text-4xl text-gray-900 bg-transparent border-none cursor-pointer p-0 hover:opacity-70 transition-opacity"
          >
            ×
          </button>
          <ul class="flex flex-col gap-8 items-center">
            {workLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={(e) => handleWorkLinkClick(e, link.href)}
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
