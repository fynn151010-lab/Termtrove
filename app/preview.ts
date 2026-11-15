// Read-only visual-review data. This module is loaded only in the explicit preview build.
// It never creates users, sessions, listings, orders or payments.
import { samples } from "../db/seed";
const books = samples.map((b, index) => ({
  ...b,
  id: b.id,
  seller_id: "",
  seller_name: "TermTrove · sample",
  is_demo: true,
  status: "available",
  publisher: "",
  description:
    "Sample book shown only in this design preview. It is not available for purchase.",
  fulfilment: "Collection in Bangkok",
  created_at: new Date(2026, 0, 6 - index).toISOString(),
}));
export async function previewRead(path: string) {
  const url = new URL(path, "https://preview.invalid");
  if (url.pathname === "/me") return { user: null };
  if (url.pathname === "/listings") {
    const q = url.searchParams,
      term = (q.get("q") || "").toLowerCase();
    let listings = books.filter((b) =>
      [b.title, b.author, b.isbn, b.subject, b.curriculum].some((v) =>
        v.toLowerCase().includes(term),
      ),
    );
    for (const key of ["condition", "subject", "curriculum", "status"] as const)
      if (q.get(key)) listings = listings.filter((b) => b[key] === q.get(key));
    if (q.get("min"))
      listings = listings.filter((b) => b.price >= Number(q.get("min")) * 100);
    if (q.get("max"))
      listings = listings.filter((b) => b.price <= Number(q.get("max")) * 100);
    const sort = q.get("sort");
    if (sort === "low") listings.sort((a, b) => a.price - b.price);
    if (sort === "high") listings.sort((a, b) => b.price - a.price);
    if (sort === "az") listings.sort((a, b) => a.title.localeCompare(b.title));
    return { listings };
  }
  const match = url.pathname.match(/^\/listings\/([^/]+)$/);
  if (match) {
    const listing = books.find((b) => b.id === match[1]);
    if (!listing) throw new Error("Book not found.");
    return { listing, images: [] };
  }
  throw new Error(
    "This is a read-only design preview. Live accounts and transactions are not connected.",
  );
}
