const pages: Record<string, [string, string]> = {
  "/": [
    "TermTrove — Affordable Second-Hand Textbooks in Bangkok",
    "Buy and sell pre-loved textbooks and educational books with Bangkok’s student-led TermTrove community.",
  ],
  "/browse": [
    "Browse Second-Hand Textbooks | TermTrove",
    "Find pre-loved IGCSE, GCSE, A Level and IB textbooks by title, ISBN, subject, price and condition.",
  ],
  "/about": [
    "About TermTrove | Affordable Education, Shared Knowledge",
    "Meet TermTrove, a student-led Bangkok marketplace making educational books more affordable and extending their useful lives.",
  ],
  "/how-it-works": [
    "How TermTrove Works | Buy, Sell and Collect Books",
    "Learn how to list a textbook, reserve a book and arrange payment on collection with another learner.",
  ],
  "/faq": [
    "Frequently Asked Questions | TermTrove",
    "Answers about listing books, condition, collection, reservations and buying pre-loved textbooks.",
  ],
  "/login": [
    "Sign In | TermTrove",
    "Sign in to your independent TermTrove account.",
  ],
  "/register": [
    "Create Your Account | TermTrove",
    "Create a TermTrove email and password account to buy and sell educational books.",
  ],
  "/forgot-password": [
    "Forgot Your Password? | TermTrove",
    "Request a secure password-reset email for your TermTrove account.",
  ],
  "/reset-password": [
    "Reset Your Password | TermTrove",
    "Choose a new password for your TermTrove account.",
  ],
};
export function updateMetadata(path: string) {
  const [title, description] = pages[path] || [
    "TermTrove — Good books. New beginnings.",
    "A student-led marketplace for affordable pre-loved educational books in Bangkok.",
  ];
  document.title = title;
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute("content", description);
  let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (!robots) {
    robots = document.createElement("meta");
    robots.name = "robots";
    document.head.append(robots);
  }
  const indexable =
    Object.prototype.hasOwnProperty.call(pages, path) &&
    !["/login", "/register", "/forgot-password", "/reset-password"].includes(
      path,
    );
  robots.content = indexable ? "index,follow" : "noindex,follow";
  let canonical = document.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.append(canonical);
  }
  canonical.href = location.origin + path;
}
