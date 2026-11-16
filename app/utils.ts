export const money = (p: number) =>
  "฿" + (p / 100).toLocaleString("en-TH", { maximumFractionDigits: 2 });

export const scrollBehavior = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
