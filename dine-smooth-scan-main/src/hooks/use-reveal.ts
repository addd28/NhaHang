import { useEffect } from "react";

/**
 * Scroll-reveal hook: any element with the class `reveal` will get the `is-visible` class
 * when it enters the viewport. Animations and styles are defined in styles.css.
 */
export function useReveal() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const observedElements = new Set<HTMLElement>();

    if (!("IntersectionObserver" in window)) {
      const els = document.querySelectorAll<HTMLElement>(".reveal");
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
            observedElements.delete(entry.target as HTMLElement);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
    );

    const observeNewElements = () => {
      const els = document.querySelectorAll<HTMLElement>(".reveal");
      els.forEach((el) => {
        if (!observedElements.has(el) && !el.classList.contains("is-visible")) {
          io.observe(el);
          observedElements.add(el);
        }
      });
    };

    // Initial run
    observeNewElements();

    // Observe body mutations to detect dynamically loaded items (e.g. from API)
    const observer = new MutationObserver(() => {
      observeNewElements();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      io.disconnect();
      observer.disconnect();
      observedElements.clear();
    };
  }, []);
}
