import { ArrowUpRight, BookOpen, Leaf, Loader2, MapPin } from "lucide-react";
import React from "react";
import { samples } from "../db/seed";
import type { Book } from "./types";
import { money } from "./utils";

export function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <a className="brand" href="/" aria-label="TermTrove home">
      <span
        className="logo-placeholder"
        title="Approved logo will be added here"
      >
        LOGO
        <br />
        HERE
      </span>
      <span>
        Term<span className={footer ? "" : "brand-light"}>Trove</span>
        <small>PRE-LOVED BOOKS. NEW POSSIBILITIES.</small>
      </span>
    </a>
  );
}
export function Cover({
  book,
  large = false,
}: {
  book: Book | any;
  large?: boolean;
}) {
  const sample = samples.find(
    (b) => b.id === book.id || b.title === book.title,
  );
  return book.image_id ? (
    <img
      className={"book-photo " + (large ? "large" : "")}
      src={"/api/images/" + book.image_id}
      alt={book.title}
      loading="lazy"
    />
  ) : (
    <div
      className={"cover " + (large ? "large" : "")}
      style={
        {
          "--cover": sample?.color || "#254b3e",
          "--ink": sample?.accent || "#d9e8c9",
        } as React.CSSProperties
      }
    >
      <div className="cover-top">
        {book.curriculum || "TERMTROVE"}
        <span>STUDENT EDITION</span>
      </div>
      <div className="cover-title">{sample?.tag || book.subject || "BOOK"}</div>
      <span className="cover-subtitle">{sample?.subtitle || book.title}</span>
      <div className="cover-art">
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="cover-bottom">
        <BookOpen size={17} />
        <span>LEARN. DISCOVER. GROW.</span>
      </div>
    </div>
  );
}
export function BookCard({ book: b }: { book: Book }) {
  return (
    <a className="book-card" href={"/book/" + b.id}>
      <div className="book-stage">
        <span className="condition">{b.condition}</span>
        <Cover book={b} />
        <span className="view-book">
          View book <ArrowUpRight size={17} />
        </span>
      </div>
      <div className="book-meta">
        <span>
          {b.curriculum} <i /> {b.subject}
        </span>
        {!!b.is_demo && <small>Sample</small>}
      </div>
      <h3>{b.title}</h3>
      <p className="author">{b.author}</p>
      <div className="book-price">
        <strong>{money(b.price)}</strong>
        {b.original_price && <del>{money(b.original_price)}</del>}
        <span>{b.status === "available" ? "View details ↗" : b.status}</span>
      </div>
    </a>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <Loader2 className="spin" size={22} /> Loading your next chapter…
    </div>
  );
}
export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="error" role="alert">
      {message}
    </div>
  );
}
export function Empty({
  title,
  text,
  browse = false,
}: {
  title: string;
  text: string;
  browse?: boolean;
}) {
  return (
    <div className="empty">
      <BookOpen size={40} />
      <h2>{title}</h2>
      <p>{text}</p>
      <a href={browse ? "/browse" : "/sell"} className="button">
        {browse ? "Explore the bookshelf" : "List your first book"}{" "}
        <ArrowUpRight size={17} />
      </a>
    </div>
  );
}
export function Footer() {
  return (
    <footer>
      <div className="footer-main">
        <div className="footer-brand">
          <Brand footer />
          <p>
            A student-led marketplace helping good books find new beginnings.
            Made for learners, families, and a more affordable education.
          </p>
          <span>
            <MapPin size={14} /> Bangkok, Thailand
          </span>
        </div>
        <div>
          <h4>The bookshelf</h4>
          <a href="/browse">Browse Books</a>
          <a href="/sell">Sell a Book</a>
          <a href="/account">My Account</a>
        </div>
        <div>
          <h4>Around TermTrove</h4>
          <a href="/about">About Us</a>
          <a href="/how-it-works">How It Works</a>
          <a href="/faq">FAQ</a>
          <a href="/contact">Contact</a>
        </div>
        <div className="footer-message">
          <Leaf size={25} />
          <p>
            Good for your budget.
            <br />
            Better for the next learner.
          </p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} TermTrove. A new chapter for every book.
        </span>
        <div>
          <a href="/terms">Terms of Service</a>
          <a href="/privacy">Privacy Policy</a>
          <span>
            Built with purpose <span className="tiny-heart">♡</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
