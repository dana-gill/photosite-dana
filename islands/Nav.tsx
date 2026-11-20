import { useState } from "preact/hooks";
import { NAV_LINKS } from "./consts.ts";

export default function Nav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav class="w-full bg-transparent fixed top-0 left-0 z-50">
      <div class="px-4 py-4 flex justify-between items-start">
        <a href="/" class="text-gray-900 font-[500] italic">
          Dana Gill Photography
        </a>
        <ul class="hidden md:flex gap-6">
          {NAV_LINKS.map((link) => (
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
        </ul>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls="mobile-nav"
          onClick={() => setIsOpen(!isOpen)}
          class="md:hidden text-gray-900 font-[500] cursor-pointer bg-transparent border-none p-0"
        >
          Menu
        </button>
      </div>
      {isOpen && (
        <ul
          id="mobile-nav"
          class="md:hidden flex flex-col gap-3 bg-gray-50 px-4 pb-4"
        >
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} class="text-gray-900 font-[500]">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
