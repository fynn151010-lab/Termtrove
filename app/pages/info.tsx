import { PolicyPage } from "./policies";
import { AppLink } from "../routing";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Heart,
  Leaf,
  Plus,
  ShoppingBag,
} from "lucide-react";
import { useState } from "react";
import { api } from "../api";
import { SignInGate } from "../auth";
import { ErrorBox } from "../components";
import type { Profile } from "../types";

const faqs = [
  [
    "How do I list a book?",
    "Sign in to TermTrove, choose Sell a Book, and add your title, author, subject, condition, price, description and at least one photo. Preview the listing, then publish it.",
  ],
  [
    "How do I buy a book?",
    "Open an available community listing, choose Buy Now, and sign in. Review the order, add a collection message and confirm. Your book is reserved exclusively, and you pay the seller when collecting. Sample listings cannot be purchased.",
  ],
  [
    "How are book conditions classified?",
    "Like New means almost untouched with no writing. Good means light wear with a few notes or highlights. Fair means visible wear or frequent markings. Acceptable means well used but complete and readable. Sellers should show any wear in their photos.",
  ],
  [
    "How do I arrange collection?",
    "Add a proposed public collection point and suitable times in the collection message at checkout. The note is visible only to you and the seller in your dashboards. Use the private collection conversation in your dashboard to coordinate changes with the other person. Inspect the book and pay on collection.",
  ],
  [
    "What happens if a book is no longer available?",
    "Once an order is confirmed, the book is reserved and cannot be bought by someone else. Either party can cancel a pending order, which makes the book available again. The seller confirms collection and payment to complete the order.",
  ],
  [
    "Can I edit or remove my listing?",
    "Yes. Open My account → My listings to edit, archive, or mark an available book as sold. Reserved listings are locked while an order is pending; cancel the order before making changes.",
  ],
  [
    "Are online payments available?",
    "The initial marketplace supports payment on collection only. No card details are collected and no online payment is taken. There is no configured online payment gateway.",
  ],
];
export function Info({
  path,
  user,
}: {
  path: string;
  user: Profile | null;
}) {
  const [error, setError] = useState(""),
    [sent, setSent] = useState(""),
    [busy, setBusy] = useState(false);
  const reportId = new URLSearchParams(location.search).get("listing");
  const report =
    reportId && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(reportId)
      ? reportId
      : "";
  if (path === "/about")
    return (
      <>
        <section className="section about-hero">
          <span className="eyebrow">STUDENT-LED. COMMUNITY-MINDED.</span>
          <h1>
            A good education.
            <br />
            <em>A lighter price tag.</em>
          </h1>
          <p>
            We’re TermTrove, a student-led marketplace based in Bangkok,
            Thailand. We connect students and families so useful textbooks can
            keep doing what they do best: opening minds.
          </p>
        </section>
        <section className="mission about-mission">
          <div className="mission-art">
            <BookOpen size={86} strokeWidth={1} />
            <span>
              KNOWLEDGE IS
              <br />
              BETTER SHARED.
            </span>
          </div>
          <div>
            <span className="eyebrow">WHY WE’RE HERE</span>
            <h2>
              Good Books Shouldn’t
              <br />
              Come at a High Price.
            </h2>
            <p>
              At TermTrove, we believe that access to quality educational
              resources should not depend on how much a family can afford to
              spend. Our mission is to make textbooks more affordable, extend
              the lifespan of educational materials, and build a community where
              knowledge can be shared rather than wasted.
            </p>
            <AppLink className="button" href="/browse">
              Explore the bookshelf <ArrowRight size={17} />
            </AppLink>
          </div>
        </section>
        <section className="section values">
          <h2>Built around what matters.</h2>
          <div className="steps">
            <article>
              <BookOpen />
              <h3>Affordable learning</h3>
              <p>Help families spend less on the resources students need.</p>
            </article>
            <article>
              <Leaf />
              <h3>Longer book lives</h3>
              <p>
                Keep valuable educational materials in use, term after term.
              </p>
            </article>
            <article>
              <Heart />
              <h3>Shared opportunity</h3>
              <p>
                Build a community where one learner’s last chapter becomes
                another’s first.
              </p>
            </article>
          </div>
        </section>
      </>
    );
  if (path === "/how-it-works")
    return (
      <section className="section info-page">
        <div className="page-title">
          <span className="eyebrow">A SIMPLE EXCHANGE, A REAL DIFFERENCE</span>
          <h1>From shelf to school bag.</h1>
          <p>Here’s how to give a good book its next beginning.</p>
        </div>
        <div className="how-columns">
          <article className="form-card">
            <ShoppingBag size={30} />
            <h2>Finding your next book</h2>
            {[
              [
                "Browse & discover",
                "Search by title, subject, ISBN or curriculum. Filter for the condition and price that work for you.",
              ],
              [
                "Reserve your find",
                "Sign in, review the book and confirm an order with a proposed public collection point and time.",
              ],
              [
                "Collect & keep learning",
                "Check the condition, pay the seller on collection, and let your next chapter begin.",
              ],
            ].map(([h, p], i) => (
              <div className="numbered-step" key={h}>
                <span>0{i + 1}</span>
                <div>
                  <h3>{h}</h3>
                  <p>{p}</p>
                </div>
              </div>
            ))}
            <AppLink className="button" href="/browse">
              Find a book <ArrowUpRight size={17} />
            </AppLink>
          </article>
          <article className="form-card">
            <BookOpen size={30} />
            <h2>Passing a book on</h2>
            {[
              [
                "Create your listing",
                "Sign in, upload clear photos and add honest details about the edition, condition and price.",
              ],
              [
                "Get ready for a new reader",
                "Your book appears on the marketplace. A confirmed order reserves it for one buyer only.",
              ],
              [
                "Meet, collect, complete",
                "Meet in a public place, receive payment and confirm collection in your dashboard.",
              ],
            ].map(([h, p], i) => (
              <div className="numbered-step" key={h}>
                <span>0{i + 1}</span>
                <div>
                  <h3>{h}</h3>
                  <p>{p}</p>
                </div>
              </div>
            ))}
            <AppLink className="button" href="/sell">
              List a book <Plus size={17} />
            </AppLink>
          </article>
        </div>
        <p className="center-note">
          Have a question?{" "}
          <AppLink href="/faq">Our FAQ has a few good answers ↗</AppLink>
        </p>
      </section>
    );
  if (path === "/faq")
    return (
      <section className="section info-page narrow">
        <div className="page-title">
          <span className="eyebrow">A LITTLE CLARITY</span>
          <h1>
            Good questions.
            <br />
            Straightforward answers.
          </h1>
        </div>
        <div className="faq-list">
          {faqs.map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <Plus size={19} />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
        <div className="bottom-cta">
          <h3>Something else on your mind?</h3>
          <AppLink className="text-link" href="/contact">
            Get in touch <ArrowUpRight size={18} />
          </AppLink>
        </div>
      </section>
    );
  if (path === "/contact")
    return (
      <section className="section form-page">
        <div className="page-title">
          <span className="eyebrow">WE’RE LISTENING</span>
          <h1>{report ? "Report a listing" : "Contact TermTrove"}</h1>
          <p>
            Questions, ideas, or feedback? Leave a message for the TermTrove
            team.
          </p>
        </div>
        {!user ? (
          <SignInGate title="Sign in to leave a message." />
        ) : sent ? (
          <div className="form-card">
            <CheckCircle2 size={36} />
            <h2>Your message is saved.</h2>
            <p>Reference: {sent}</p>
            <p>Keep this reference if you contact the team again.</p>
          </div>
        ) : (
          <form
            className="form-card contact-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const form = new FormData(e.currentTarget);
              try {
                const d = await api("/contact", {
                  method: "POST",
                  body: JSON.stringify(Object.fromEntries(form)),
                });
                setSent(d.reference);
              } catch (e: any) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {error && <ErrorBox message={error} />}
            <label>
              Your name
              <input
                name="name"
                required
                maxLength={100}
                defaultValue={user.display_name}
              />
            </label>
            <label>
              Your email
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                defaultValue={user.email}
              />
            </label>
            <label>
              Your message
              <textarea
                name="message"
                required
                maxLength={5000}
                rows={6}
                defaultValue={report ? "Listing " + report + "\n" : ""}
              />
            </label>
            <button disabled={busy} className="button">
              {busy ? "Saving…" : "Send message"} <ArrowUpRight size={18} />
            </button>
            <small>
              Your message is stored privately. No email address is published on
              the marketplace.
            </small>
          </form>
        )}
      </section>
    );
  if (["/terms", "/privacy", "/collection-guide"].includes(path))
    return <PolicyPage path={path} />;
  return (
    <section className="section empty">
      <BookOpen size={40} />
      <h1>That chapter is missing.</h1>
      <p>The page you’re looking for isn’t on this shelf.</p>
      <AppLink className="button" href="/">
        Back home <ArrowRight size={17} />
      </AppLink>
    </section>
  );
}
