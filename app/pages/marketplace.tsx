import { appHref } from "../routing";
import { AppLink } from "../routing";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Leaf,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useState } from "react";
import { samples } from "../../db/seed";
import { api, signIn } from "../api";
import { BookCard, Cover, Empty, ErrorBox, Loading } from "../components";
import type { Book, Profile } from "../types";
import { money } from "../utils";
import {
  browseQuery,
  defaultFilters,
  readBrowseFilters,
} from "../browse-filters";

export function Home() {
  const [books, setBooks] = useState<Book[]>([]),
    [homeLoading, setHomeLoading] = useState(true),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setHomeLoading(true);
    setError("");
    api("/listings?status=available", { signal: controller.signal })
      .then((d) => {
        if (!controller.signal.aborted) setBooks(d.listings.slice(0, 4));
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setHomeLoading(false);
      });
    return () => controller.abort();
  }, [retry]);
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span /> BIG IDEAS. SMALLER PRICE TAGS.
          </div>
          <h1>
            Making education
            <br />
            more affordable,
            <br />
            <em>one book at a time.</em>
          </h1>
          <p>
            TermTrove connects students and families through a trusted
            marketplace for pre-loved textbooks and educational books. Save
            money, give books a second life, and make quality education more
            accessible to everyone.
          </p>
          <div className="hero-actions">
            <AppLink className="button" href="/browse">
              Find your next book <ArrowUpRight size={19} />
            </AppLink>
            <AppLink className="button outline" href="/sell">
              Sell your books <ArrowRight size={18} />
            </AppLink>
          </div>
          <div className="hero-note">
            <span className="mini-leaf">
              <Leaf size={15} />
            </span>{" "}
            A smarter way to learn. A kinder way to reuse.
          </div>
        </div>
        <div className="hero-visual">
          <div className="visual-label">
            A SECOND LIFE.
            <br />
            <em>A whole new chapter.</em>
          </div>
          <div className="hero-circle" />
          <div className="hero-book rear">
            <Cover book={samples[1]} large />
          </div>
          <div className="hero-book front">
            <Cover book={samples[0]} large />
          </div>
          <div className="price-sticker">
            <span>GOOD BOOKS.</span>
            <strong>Better prices.</strong>
            <ArrowUpRight size={22} />
          </div>
          <div className="floating-note">
            <span>
              <Leaf size={20} />
            </span>
            <div>
              A little less new.
              <br />
              <strong>A lot more possibility.</strong>
            </div>
          </div>
          <span className="visual-caption">FOR THE NEXT CURIOUS MIND ↗</span>
        </div>
      </section>
      <section className="benefits">
        <div>
          <BookOpen />
          <span>
            <strong>More learning. Less spending.</strong>
            <small>Quality books at student-friendly prices</small>
          </span>
        </div>
        <div>
          <Leaf />
          <span>
            <strong>Good for your next chapter.</strong>
            <small>Keep great books in circulation</small>
          </span>
        </div>
        <div>
          <ShieldCheck />
          <span>
            <strong>Community at the heart.</strong>
            <small>Connecting students and families in Bangkok</small>
          </span>
        </div>
      </section>
      <section className="section featured">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE SHELF IS OPEN</span>
            <h2>Your next chapter starts here.</h2>
            <p>A few good finds, ready for a fresh set of notes.</p>
          </div>
          <AppLink className="text-link" href="/browse">
            Explore all books <ArrowUpRight size={18} />
          </AppLink>
        </div>
        <form
          className="home-search"
          action="/browse"
          onSubmit={(e) => {
            e.preventDefault();
            location.href = appHref("/browse?q=" + encodeURIComponent(query));
          }}
        >
          <Search size={20} />
          <input
            aria-label="Search books"
            type="search"
            maxLength={200}
            placeholder="Search by title, author, subject or ISBN…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit">
            Find a book <ArrowRight size={16} />
          </button>
        </form>
        <div className="chips">
          <AppLink href="/browse">
            All books <ArrowUpRight size={13} />
          </AppLink>
          {["IGCSE", "IB", "A Level", "GCSE"].map((x) => (
            <AppLink
              key={x}
              href={"/browse?curriculum=" + encodeURIComponent(x)}
            >
              {x}
            </AppLink>
          ))}
          <AppLink href="/browse?subject=Mathematics">Mathematics</AppLink>
          <AppLink href="/browse?subject=Biology">Sciences</AppLink>
        </div>
        {error ? (
          <ErrorBox
            message={error}
            onRetry={() => setRetry((value) => value + 1)}
          />
        ) : books.length ? (
          <div className="book-grid">
            {books.map((b) => (
              <BookCard book={b} key={b.id} />
            ))}
          </div>
        ) : homeLoading ? (
          <Loading />
        ) : (
          <Empty
            title="The next chapter starts with you."
            text="Be the first to pass on a book and help another learner get started."
          />
        )}
        {books.some((book) => book.is_demo) && (
          <p className="sample-note">
            Sample listings are labelled for exploration. Add your book to help
            start the community.
          </p>
        )}
      </section>
      <section className="how-section" id="how-it-works">
        <div className="section-heading">
          <div>
            <span className="eyebrow">SIMPLE BY DESIGN</span>
            <h2>From one learner to the next.</h2>
          </div>
          <p>
            One small exchange.
            <br />A meaningful difference.
          </p>
        </div>
        <div className="steps">
          <article>
            <span className="step-number">01</span>
            <Search />
            <h3>Discover affordable books</h3>
            <p>
              Find the textbooks and educational books you need, at a price that
              makes sense.
            </p>
          </article>
          <article>
            <span className="step-number">02</span>
            <BookOpen />
            <h3>Buy or sell with ease</h3>
            <p>
              Give your old books a new home, or reserve a great find and pay on
              collection.
            </p>
          </article>
          <article>
            <span className="step-number">03</span>
            <Leaf />
            <h3>Make learning go further</h3>
            <p>
              Save on education, share knowledge, and keep useful resources out
              of the bin.
            </p>
          </article>
        </div>
      </section>
      <section className="mission">
        <div className="mission-art">
          <BookOpen size={84} strokeWidth={1} />
          <span>
            KNOWLEDGE IS
            <br />
            BETTER SHARED.
          </span>
          <div className="orbit">a new chapter ↗</div>
        </div>
        <div>
          <span className="eyebrow">OUR STORY, YOUR COMMUNITY</span>
          <h2>
            Good books shouldn’t
            <br />
            come at a high price.
          </h2>
          <p>
            At TermTrove, we believe that access to quality educational
            resources should not depend on how much a family can afford to
            spend. Our mission is to make textbooks more affordable, extend the
            lifespan of educational materials, and build a community where
            knowledge can be shared rather than wasted.
          </p>
          <AppLink className="text-link" href="/about">
            Get to know TermTrove <ArrowUpRight size={18} />
          </AppLink>
        </div>
      </section>
      <section className="bottom-cta">
        <div>
          <span className="eyebrow">YOUR BOOKS HAVE MORE TO GIVE</span>
          <h2>Finished the book? Pass on the possibility.</h2>
        </div>
        <AppLink className="button" href="/sell">
          List your first book <Plus size={18} />
        </AppLink>
      </section>
    </>
  );
}
export function Browse() {
  const [filters, setFilters] = useState(() =>
      readBrowseFilters(location.search),
    ),
    [books, setBooks] = useState<Book[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [showFilters, setShowFilters] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    history.replaceState(
      history.state,
      "",
      location.pathname + "?" + browseQuery(filters),
    );
    const timer = setTimeout(() => {
      if (
        filters.min &&
        filters.max &&
        Number(filters.min) > Number(filters.max)
      ) {
        setError(
          "The minimum price must be less than or equal to the maximum price.",
        );
        setLoading(false);
        return;
      }
      api("/listings?" + browseQuery(filters, true), {
        signal: controller.signal,
      })
        .then((d) => {
          if (current) {
            setBooks(d.listings);
            setError("");
          }
        })
        .catch((e) => current && setError(e.message))
        .finally(() => current && setLoading(false));
    }, 180);
    return () => {
      current = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [filters, retry]);
  const set = (k: string, v: string) =>
    setFilters((previous) => ({ ...previous, [k]: v }));
  const filtered = Object.entries(defaultFilters).some(
    ([key, value]) => key !== "sort" && value !== filters[key],
  );
  const reset = () => setFilters({ ...defaultFilters });
  return (
    <section className="section browse-page">
      <div className="page-title">
        <span className="eyebrow">A GOOD BOOK IS WAITING</span>
        <h1>Find your next chapter.</h1>
        <p>
          Pre-loved textbooks. Fresh possibilities. A little more room in your
          budget.
        </p>
      </div>
      <div className="browse-search">
        <Search />
        <input
          aria-label="Search listings"
          type="search"
          maxLength={200}
          placeholder="Title, author, ISBN, subject or curriculum"
          value={filters.q}
          onChange={(e) => set("q", e.target.value)}
        />
        <button
          className="button small filter-toggle"
          type="button"
          aria-expanded={showFilters}
          aria-controls="book-filters"
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal size={16} /> Filters
        </button>
      </div>
      <div className="market-layout">
        <aside
          id="book-filters"
          aria-label="Filter books"
          className={showFilters ? "filters shown" : "filters"}
        >
          <div className="filter-heading">
            <strong>
              <SlidersHorizontal size={17} /> Refine your shelf
            </strong>
            <button type="button" onClick={reset}>
              Reset
            </button>
          </div>
          {[
            [
              "curriculum",
              "Curriculum",
              ["IGCSE", "GCSE", "A Level", "IB", "Other"],
            ],
            [
              "subject",
              "Subject",
              [
                "Biology",
                "Chemistry",
                "Physics",
                "Mathematics",
                "Economics",
                "English",
                "History",
                "Geography",
                "Other",
              ],
            ],
            [
              "condition",
              "Condition",
              ["Like New", "Good", "Fair", "Acceptable"],
            ],
            ["status", "Availability", ["available", "reserved", "sold"]],
          ].map(([key, label, options]) => (
            <label key={key as string}>
              {label as string}
              <select
                value={filters[key as string]}
                onChange={(e) => set(key as string, e.target.value)}
              >
                <option value="">All {(label as string).toLowerCase()}</option>
                {(options as string[]).map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
          ))}
          <label>
            Price range (THB)
            <div className="price-range">
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="Min"
                aria-label="Minimum price"
                value={filters.min}
                onChange={(e) => set("min", e.target.value)}
              />
              <span>–</span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="Max"
                aria-label="Maximum price"
                value={filters.max}
                onChange={(e) => set("max", e.target.value)}
              />
            </div>
          </label>
          <div className="filter-note">
            <Leaf size={25} />
            <strong>
              Small savings.
              <br />
              Bigger possibilities.
            </strong>
            <p>Every book deserves another curious mind.</p>
          </div>
        </aside>
        <div aria-busy={loading}>
          <div className="results-header">
            <span role="status" aria-live="polite">
              {loading
                ? "Finding books…"
                : `${books.length} book${books.length === 1 ? "" : "s"} on the shelf`}
            </span>
            <label>
              Sort by{" "}
              <select
                aria-label="Sort books"
                value={filters.sort}
                onChange={(e) => set("sort", e.target.value)}
              >
                <option value="recent">Recently listed</option>
                <option value="low">Price: low to high</option>
                <option value="high">Price: high to low</option>
                <option value="az">Alphabetical</option>
              </select>
            </label>
          </div>
          {error ? (
            <ErrorBox
              message={error}
              onRetry={() => setRetry((value) => value + 1)}
            />
          ) : loading && !books.length ? (
            <Loading />
          ) : books.length ? (
            <div className="book-grid browse-grid">
              {books.map((b) => (
                <BookCard key={b.id} book={b} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <BookOpen size={38} />
              <h2>
                {filtered
                  ? "No matching books."
                  : "No books on this shelf yet."}
              </h2>
              <p>
                {filtered
                  ? "Try a different search or clear the filters."
                  : "Have a textbook to pass on? List it for the next learner."}
              </p>
              {filtered && (
                <button
                  type="button"
                  className="button outline"
                  onClick={reset}
                >
                  Reset filters
                </button>
              )}
              <AppLink href="/sell" className="button">
                List a book <Plus size={16} />
              </AppLink>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
export function useBook(id: string) {
  const [data, setData] = useState<{
      listing: Book;
      images: { id: string }[];
    } | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    api("/listings/" + id, { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [id, retry]);
  return { data, error, reload: () => setRetry((value) => value + 1) };
}
export function Product({
  id,
  user,
  navigate,
}: {
  id: string;
  user: Profile | null;
  navigate: (p: string) => void;
  notify: (m: string) => void;
}) {
  const { data, error, reload } = useBook(id),
    [photo, setPhoto] = useState("");
  if (error)
    return (
      <section className="section">
        <ErrorBox message={error} onRetry={reload} />
      </section>
    );
  if (!data) return <Loading />;
  const b = data.listing;
  return (
    <section className="section product-page">
      <AppLink className="back" href="/browse">
        <ArrowLeft size={16} /> Back to the bookshelf
      </AppLink>
      <div className="product-layout">
        <div>
          <div className="product-stage">
            <Cover book={{ ...b, image_id: photo || b.image_id }} large />
          </div>
          {data.images.length > 1 && (
            <div className="thumbnails">
              {data.images.map((i, index) => (
                <button
                  key={i.id}
                  type="button"
                  aria-label={"View book photo " + (index + 1)}
                  aria-pressed={(photo || b.image_id) === i.id}
                  onClick={() => setPhoto(i.id)}
                >
                  <img
                    src={"/api/images/" + i.id}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="product-copy">
          <span className="eyebrow">
            {b.curriculum} / {b.subject}
          </span>
          <h1>{b.title}</h1>
          <p>by {b.author}</p>
          <span className="tag">{b.condition}</span>{" "}
          <span className="tag">{b.status}</span>
          <div className="product-price">
            {money(b.price)}{" "}
            {b.original_price && <del>{money(b.original_price)} new</del>}
          </div>
          <p className="description">{b.description}</p>
          <dl>
            <div>
              <dt>Edition</dt>
              <dd>{b.edition || "Not specified"}</dd>
            </div>
            <div>
              <dt>ISBN</dt>
              <dd>{b.isbn || "Not provided"}</dd>
            </div>
            <div>
              <dt>Curriculum</dt>
              <dd>{b.curriculum}</dd>
            </div>
            <div>
              <dt>Seller</dt>
              <dd>{b.seller_name}</dd>
            </div>
          </dl>
          {b.is_demo ? (
            <div className="callout">
              <BookOpen size={20} />
              <div>
                <strong>A little preview of what’s possible.</strong>
                <p>
                  This is a sample listing, not a book for sale. Real community
                  listings will appear alongside these examples.
                </p>
              </div>
            </div>
          ) : b.seller_id === user?.id ? (
            <AppLink
              className="button full"
              href={b.status === "available" ? "/edit/" + id : "/account"}
            >
              Manage your listing <ArrowRight size={17} />
            </AppLink>
          ) : (
            <button
              disabled={b.status !== "available"}
              className="button full"
              onClick={() =>
                user
                  ? navigate("/checkout/" + id)
                  : location.assign(signIn("/checkout/" + id))
              }
            >
              {b.status === "available"
                ? "Buy now"
                : b.status === "reserved"
                  ? "Reserved by another learner"
                  : "This book has found a new home"}{" "}
              <ArrowRight size={18} />
            </button>
          )}
          <div className="product-assurance">
            <ShieldCheck size={17} />
            <span>Payment on collection. No online payment required.</span>
          </div>
          <div className="collection">
            <MapPin size={19} />
            <div>
              <strong>Collection in Bangkok</strong>
              <p>
                {b.fulfilment ||
                  "Arrange a convenient public collection point after placing your order."}
              </p>
            </div>
          </div>
          {!b.is_demo && (
            <AppLink
              className="text-link report-link"
              href={"/contact?listing=" + encodeURIComponent(b.id)}
            >
              Report this listing
            </AppLink>
          )}
        </div>
      </div>
    </section>
  );
}
