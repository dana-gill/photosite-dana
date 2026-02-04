import { useEffect, useState } from "preact/hooks";
import type { NavLink } from "../types/nav.ts";

interface WorkPreview {
  height: number;
  href: string;
  imageUrl: string;
  width: number;
}

interface WorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  workLinks: ReadonlyArray<NavLink>;
  workPreviews: ReadonlyArray<WorkPreview>;
}

interface MousePosition {
  x: number;
  y: number;
}

export default function WorkModal(
  { isOpen, onClose, workLinks, workPreviews }: WorkModalProps,
) {
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState<MousePosition>({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    if (isOpen) {
      setIsOpening(true);
      setTimeout(() => {
        setIsOpening(false);
      }, 10);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  const handleMouseMove = (e: MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleWorkLinkMouseEnter = (href: string) => {
    setHoveredHref(href);
  };

  const handleWorkLinkMouseLeave = () => {
    setHoveredHref(null);
  };

  const getPreviewForHref = (href: string): WorkPreview | null => {
    return workPreviews.find((preview) => preview.href === href) ?? null;
  };

  const currentPreview = hoveredHref ? getPreviewForHref(hoveredHref) : null;

  if (!isOpen && !isClosing) {
    return null;
  }

  return (
    <div
      class={`fixed inset-0 bg-gray-50 z-[100] flex items-center justify-center transition-opacity duration-300 ${
        isClosing || isOpening ? "opacity-0" : "opacity-100"
      }`}
      onMouseMove={handleMouseMove}
    >
      <button
        type="button"
        onClick={handleClose}
        class="absolute top-8 left-8 text-4xl text-gray-900 bg-transparent border-none cursor-pointer p-0 hover:opacity-70 transition-opacity"
      >
        ×
      </button>
      <ul
        class={`flex flex-col gap-8 items-center transition-all duration-300 ${
          isClosing || isOpening
            ? "opacity-0 translate-y-4"
            : "opacity-100 translate-y-0"
        }`}
      >
        {workLinks.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              class="group text-gray-900 font-[200] italic transition duration-300 text-3xl"
              onMouseEnter={() => handleWorkLinkMouseEnter(link.href)}
              onMouseLeave={handleWorkLinkMouseLeave}
            >
              {link.label}
              <span class="block max-w-0 group-hover:max-w-full transition-all duration-300 h-px bg-gray-900">
              </span>
            </a>
          </li>
        ))}
      </ul>
      {currentPreview && (
        <div
          class="fixed pointer-events-none z-[101] transition-opacity duration-200"
          style={{
            left: `${mousePosition.x + 20}px`,
            top: `${mousePosition.y + 20}px`,
            maxWidth: "300px",
          }}
        >
          <img
            src={currentPreview.imageUrl}
            alt="Work preview"
            style={{
              width: "auto",
              height: "auto",
              maxWidth: "300px",
              maxHeight: "300px",
              objectFit: "contain",
            }}
          />
        </div>
      )}
    </div>
  );
}
