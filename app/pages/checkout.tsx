import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { api } from "../api";
import { SignInGate } from "../auth";
import { Cover, ErrorBox, Loading } from "../components";
import type { Profile } from "../types";
import { money } from "../utils";
import { useBook } from "./marketplace";

export function Checkout({
  id,
  user,
  navigate,
  notify,
}: {
  id: string;
  user: Profile | null;
  navigate: (p: string) => void;
  notify: (s: string) => void;
}) {
  const { data, error } = useBook(id),
    [note, setNote] = useState(""),
    [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false),
    [problem, setProblem] = useState(""),
    [confirmation, setConfirmation] = useState("");
  if (!user) return <SignInGate />;
  if (error)
    return (
      <section className="section">
        <ErrorBox message={error} />
      </section>
    );
  if (!data) return <Loading />;
  const b = data.listing;
  async function order(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setProblem("");
    try {
      const d = await api("/orders", {
        method: "POST",
        body: JSON.stringify({
          listing_id: id,
          collection_note: note,
          payment_method: "collection",
        }),
      });
      setConfirmation(d.reference);
      notify("Your book is reserved. No payment has been taken.");
    } catch (e: any) {
      setProblem(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (confirmation)
    return (
      <section className="section success-page">
        <div className="success-mark">
          <Check size={34} />
        </div>
        <span className="eyebrow">A NEW CHAPTER AWAITS</span>
        <h1>Your book is reserved.</h1>
        <p>
          Order <strong>{confirmation}</strong>
        </p>
        <p>
          Pay {money(b.price)} on collection. Arrange a public collection point
          with the seller using your order’s collection note. Your order is
          saved in both dashboards.
        </p>
        <a href="/account" className="button">
          View your order <ArrowRight size={18} />
        </a>
      </section>
    );
  return (
    <section className="section form-page">
      <a className="back" href={"/book/" + id}>
        <ArrowLeft size={16} /> Back to the book
      </a>
      <div className="page-title">
        <span className="eyebrow">ONE STEP CLOSER</span>
        <h1>Make it your next chapter.</h1>
        <p>Review your order. Reserve your book. Pay when you collect.</p>
      </div>
      <div className="checkout-layout">
        <form className="form-card" onSubmit={order}>
          <h2>Collection & payment</h2>
          {problem && <ErrorBox message={problem} />}
          <label className="choice">
            <input type="radio" name="fulfilment" defaultChecked />
            <MapPin size={21} />
            <span>
              <strong>Collection in Bangkok</strong>
              <small>{b.fulfilment}</small>
            </span>
          </label>
          <label className="choice">
            <input type="radio" name="payment" defaultChecked />
            <ShoppingBag size={21} />
            <span>
              <strong>Payment on collection</strong>
              <small>
                Pay the seller in person. No online payment is taken.
              </small>
            </span>
          </label>
          <label>
            Collection message *
            <textarea
              required
              maxLength={1000}
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Suggest a public collection point and a few suitable times. This is shared only with the seller."
            />
          </label>
          <label className="check-label">
            <input
              required
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />{" "}
            I’ll check the book’s condition and pay the seller when collecting.
          </label>
          <button
            className="button full"
            disabled={
              busy ||
              b.status !== "available" ||
              !!b.is_demo ||
              b.seller_id === user.id
            }
            type="submit"
          >
            {busy ? "Reserving…" : "Confirm purchase · " + money(b.price)}{" "}
            <ArrowRight size={18} />
          </button>
          <small>You can cancel a pending order from your dashboard.</small>
        </form>
        <aside className="order-summary">
          <h3>Your next good find</h3>
          <div className="summary-book">
            <Cover book={b} />
            <div>
              <span className="tag">{b.condition}</span>
              <h3>{b.title}</h3>
              <p>{b.author}</p>
            </div>
          </div>
          <dl>
            <div>
              <dt>Book</dt>
              <dd>{money(b.price)}</dd>
            </div>
            <div>
              <dt>Collection</dt>
              <dd>Arrange with seller</dd>
            </div>
            <div className="total">
              <dt>Total due on collection</dt>
              <dd>{money(b.price)}</dd>
            </div>
          </dl>
          <p>
            <ShieldCheck size={16} /> Your book is reserved exclusively when the
            order is confirmed.
          </p>
        </aside>
      </div>
    </section>
  );
}
