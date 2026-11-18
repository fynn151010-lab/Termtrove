import "dotenv/config";
import { writeFileSync } from "node:fs";
const excluded = [
  "/api/",
  "/account",
  "/checkout/",
  "/edit/",
  "/sell",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];
let origin = process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL || "";
if (origin) {
  const url = new URL(origin);
  if (
    url.protocol !== "https:" ||
    ["localhost", "127.0.0.1"].includes(url.hostname)
  )
    origin = "";
  else origin = url.origin;
}
writeFileSync(
  "dist/client/robots.txt",
  "User-agent: *\nAllow: /\n" +
    excluded.map((path) => "Disallow: " + path).join("\n") +
    "\n" +
    (origin ? "Sitemap: " + origin + "/sitemap.xml\n" : ""),
);
if (origin) {
  const xml = origin
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
  const pages = [
    "/",
    "/browse",
    "/about",
    "/how-it-works",
    "/faq",
    "/collection-guide",
    "/privacy",
    "/terms",
  ];
  writeFileSync(
    "dist/client/sitemap.xml",
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      pages.map((path) => "<url><loc>" + xml + path + "</loc></url>").join("") +
      "</urlset>\n",
  );
}
console.log(
  origin
    ? "Generated crawl rules and public-page sitemap."
    : "Generated crawl rules; set production APP_ORIGIN to generate the sitemap.",
);
