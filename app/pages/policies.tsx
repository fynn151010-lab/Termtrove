import { AppLink } from "../routing";

const privacy = [
  [
    "What other people can see",
    "Anyone can browse a published book’s photos, description, price, collection details and seller display name. Use a general area for collection. Keep your home address, school timetable and phone number out of the listing, and check photos for names written inside the book.",
  ],
  [
    "Your account and cookies",
    "Supabase handles email sign-in and confirmation and reset links. TermTrove uses cookies to keep you signed in. Your account email and optional school or curriculum field stay off your public seller profile. Sign out from My profile when you finish using a shared device.",
  ],
  [
    "Reservations and conversations",
    "TermTrove stores the book, agreed order price, order reference, collection note and messages so the buyer and seller can arrange the exchange. Both participants can read their order conversation. A cancellation changes the order status and keeps its history.",
  ],
  [
    "Hosting, photos and email",
    "Netlify serves the website. Supabase stores accounts, marketplace records and uploaded photos. TermTrove resizes book photos and removes embedded metadata before storage. Anything visible in the photograph itself can still appear in a public listing. Confirmation and recovery messages use the email address supplied for the account.",
  ],
  [
    "Changing your details or asking for help",
    "Edit your display name and optional school in My profile. Archive an available listing from My listings to remove it from browsing. Archiving keeps its record and order history. For an access, correction or deletion request, use the contact form while signed in. Include the relevant listing or order reference and keep the message reference. Contact submissions are stored for the TermTrove team.",
  ],
];

const terms = [
  [
    "Listing a book",
    "List educational books you own or have permission to sell. Give the exact edition, price and condition. Show writing, damage, missing pages and used access codes before someone reserves the book. Use photos you have permission to share.",
  ],
  [
    "Reserving and paying",
    "A confirmed reservation holds one book for one buyer. The order records the price in Thai baht. Arrange collection in the order conversation and pay the seller directly when you meet. TermTrove does not collect card details or hold funds.",
  ],
  [
    "Cancelling or completing an order",
    "Either participant can cancel a pending order from My purchases or My sales. The book then becomes available again. If the edition or condition differs from the listing, discuss it before paying. The seller should mark the order complete only after handing over the book and receiving payment.",
  ],
  [
    "Using the marketplace",
    "Keep messages about the book and its collection. Give other people accurate information and respect their privacy. Keep passwords and confirmation codes to yourself. If a listing or message causes concern, send the team its reference through Contact.",
  ],
];

const collection = [
  [
    "Before you reserve",
    "Check the edition, ISBN, curriculum and condition against your course requirements. Look for missing supplements or one-use access codes. The listing price and the amount due on collection appear before you confirm.",
  ],
  [
    "Choose a meeting place",
    "Use the private order conversation to agree on a busy public location and a time. If you are a student, involve a parent, guardian or trusted adult in the arrangements. Share only what the other person needs to find you.",
  ],
  [
    "When you meet",
    "Compare the cover and ISBN with the listing. Check the pages, binding and markings before paying. Sellers can confirm completion in My sales once they have received payment and handed over the book.",
  ],
  [
    "If plans change",
    "Open My purchases or My sales to message the other person or cancel a pending reservation. If someone asks for a deposit, password or verification code, stop the exchange. You can report the listing from its book page.",
  ],
];

export function PolicyPage({ path }: { path: string }) {
  const [title, intro, sections] =
    path === "/privacy"
      ? ([
          "Privacy Policy",
          "See where your information appears and how to manage it.",
          privacy,
        ] as const)
      : path === "/terms"
        ? ([
            "Terms of Service",
            "These marketplace guidelines explain what buyers and sellers can expect when exchanging a book.",
            terms,
          ] as const)
        : ([
            "Collection guide",
            "From checking the edition to handing over the book in Bangkok.",
            collection,
          ] as const);
  return (
    <section className="section info-page narrow policy-page">
      <div className="page-title">
        <h1>{title}</h1>
        <p>{intro}</p>
      </div>
      {sections.map(([heading, body]) => (
        <section key={heading}>
          <h2>{heading}</h2>
          <p>{body}</p>
        </section>
      ))}
      <nav aria-label="Related help" className="policy-links">
        {[
          ["/privacy", "Privacy Policy"],
          ["/terms", "Terms of Service"],
          ["/collection-guide", "Collection guide"],
          ["/contact", "Contact the team"],
        ]
          .filter(([href]) => href !== path)
          .map(([href, label]) => (
            <AppLink key={href} href={href}>
              {label}
            </AppLink>
          ))}
      </nav>
    </section>
  );
}
