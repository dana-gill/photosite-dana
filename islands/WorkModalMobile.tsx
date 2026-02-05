import { useEffect, useState } from "preact/hooks";
import type { NavLink } from "../types/nav.ts";
import type { WorkPreview } from "../utils.ts";

interface WorkModalMobileProps {
  isOpen: boolean;
  onClose: () => void;
  workLinks: ReadonlyArray<NavLink>;
  workPreviews: ReadonlyArray<WorkPreview>;
}

export default function WorkModalMobile(
  { isOpen, onClose, workLinks, workPreviews }: WorkModalMobileProps,
) {
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsOpening(true);
      const timer = setTimeout(() => {
        setIsOpening(false);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  const getPreviewForHref = (href: string): WorkPreview | null => {
    return workPreviews.find((preview) => preview.href === href) ?? null;
  };

  if (!isOpen && !isClosing) {
    return null;
  }

  return (
    <div
      class={`fixed inset-0 bg-gray-50 z-[100] flex flex-col transition-opacity duration-300 ${
        isClosing || isOpening ? "opacity-0" : "opacity-100"
      }`}
    >
      <button
        type="button"
        onClick={handleClose}
        class="absolute top-8 left-8 text-4xl text-gray-900 bg-transparent border-none cursor-pointer p-0 hover:opacity-70 transition-opacity z-10"
      >
        ×
      </button>
      <div
        class={`flex flex-col gap-8 p-8 pt-24 overflow-y-auto transition-all duration-300 ${
          isClosing || isOpening
            ? "opacity-0 translate-y-4"
            : "opacity-100 translate-y-0"
        }`}
      >
        {workLinks.map((link) => {
          const preview = getPreviewForHref(link.href);
          return (
            <a
              key={link.href}
              href={link.href}
              class="relative flex items-center justify-center min-h-[300px] overflow-hidden"
            >
              {preview && (
                <img
                  src={preview.imageUrl}
                  alt={link.label}
                  class="absolute inset-0 w-full h-full object-cover"
                />
              )}
              <span class="relative z-10 text-white text-3xl font-[200] italic text-center px-4 drop-shadow-lg">
                {link.label}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
