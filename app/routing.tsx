import type { AnchorHTMLAttributes } from "react";
export const visualPreview = import.meta.env.VITE_VISUAL_PREVIEW === "1";
const base = import.meta.env.BASE_URL.replace(/\/$/, "");
export function logicalPath(pathname = location.pathname) {
  return base && pathname === base
    ? "/"
    : base && pathname.startsWith(base + "/")
      ? pathname.slice(base.length)
      : pathname;
}
export function appHref(href: string) {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  if (base && (href === base || href.startsWith(base + "/"))) return href;
  return base + (href === "/" ? "/" : href);
}
export function AppLink({
  href,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} href={href ? appHref(href) : href} />;
}
