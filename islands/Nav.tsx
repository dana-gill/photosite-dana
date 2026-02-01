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

  const handleWorkClick = (e: MouseEvent) => {
    e.preventDefault();
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
                class="text-gray-900 font-[500] hover:underline transition-colors"
              >
                {link.label}
              </a>
            </li>
          ))}
          <li class="relative">
            <button
              onClick={handleWorkClick}
              class="text-gray-900 font-[500] hover:underline transition-colors cursor-pointer bg-transparent border-none"
            >
              Work
            </button>
            {isWorkOpen && (
              <ul class="absolute top-full right-0 mt-2 flex flex-col gap-2">
                {workLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={() => setIsWorkOpen(false)}
                      class="text-gray-900 font-[200] italic hover:underline transition-colors whitespace-nowrap"
                    >
                      {link.label}
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
