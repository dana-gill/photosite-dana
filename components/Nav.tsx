import type { NavLink } from "../types/nav.ts";

const navLinks: ReadonlyArray<NavLink> = [
  { href: "/about", label: "About" },
  { href: "/work", label: "Work" },
  { href: "/contact", label: "Contact" },
];

export const Nav = () => {
  return (
    <nav class="w-full bg-transparent fixed top-0 left-0 z-50">
      <div class="px-4 py-4">
        <ul class="flex gap-6 justify-end">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                class="text-gray-900 font-[500] hover:text-gray-600 transition-colors"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};
