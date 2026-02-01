import { useState } from "preact/hooks";
import type { NavLink } from "../types/nav.ts";

const navLinks: ReadonlyArray<NavLink> = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const workLinks: ReadonlyArray<NavLink> = [
  { href: "/work/meri-in-pberg", label: "Meri in Pberg" },
  { href: "/work/sunchasing", label: "Sunchasing" },
];

export default function Nav() {
  const [isWorkOpen, setIsWorkOpen] = useState(false);

  const handleWorkClick = () => {
    setIsWorkOpen(!isWorkOpen);
  };

  return (
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
          <li class="relative">
            <button
              type="button"
              onClick={handleWorkClick}
              class="group text-gray-900 font-[500] transition duration-300 cursor-pointer bg-transparent border-none p-0"
            >
              Work
              <span class="block max-w-0 group-hover:max-w-full transition-all duration-300 h-px bg-gray-900"></span>
            </button>
            {isWorkOpen && (
              <ul class="absolute top-full right-0 mt-2 flex flex-col gap-2">
                {workLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={() => setIsWorkOpen(false)}
                      class="group text-gray-900 font-[200] italic transition duration-300 whitespace-nowrap"
                    >
                      {link.label}
                      <span class="block max-w-0 group-hover:max-w-full transition-all duration-300 h-px bg-gray-900"></span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        </ul>
      </div>
    </nav>
  );
}
