import { AppLink } from "../routing";
import { ArrowRight, Check, ChevronDown, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { SignInGate, SignOutButton } from "../auth";
import { Cover, Empty, ErrorBox, Loading } from "../components";
import type { Book, Profile } from "../types";
import { money } from "../utils";

export function Dashboard({
  user,
  setUser,
  notify,
}: {
  user: Profile | null;
  setUser: (u: Profile) => void;
  notify: (s: string) => void;
}) {
  const [tab, setTab] = useState(() => {
      const section = new URLSearchParams(location.search).get("tab");
      return section && ["purchases", "sales", "profile"].includes(section)
        ? section
        : "listings";
    }),
    [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [pending, setPending] = useState(""),
    [confirm, setConfirm] = useState<{
      path: string;
      data: any;
      label: string;
    } | null>(null),
    [name, setName] = useState(user?.display_name || ""),
    [school, setSchool] = useState(user?.school || "");
  const confirmationBox = useRef<HTMLDivElement>(null);
  const load = () => {
    setError("");
    return api("/dashboard")
      .then((value) => {
        setData(value);
        setError("");
      })
      .catch((e) => setError(e.message));
  };
  useEffect(() => {
    if (confirm) confirmationBox.current?.focus();
  }, [confirm]);
  useEffect(() => {
    if (user) load();
  }, [user?.id]);
  useEffect(() => {
    setName(user?.display_name || "");
    setSchool(user?.school || "");
  }, [user?.id]);
  if (!user) return <SignInGate title="Your books, all in one place." />;
  async function action(path: string, body: any) {
    setPending(path);
    setError("");
    try {
      await api(path, { method: "PATCH", body: JSON.stringify(body) });
      setConfirm(null);
      notify("All updated.");
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPending("");
    }
  }
  return (
    <section className="section dashboard">
      <div className="section-heading">
        <div>
          <span className="eyebrow">YOUR LITTLE CORNER OF TERMTROVE</span>
          <h1>Hello, {user.display_name}.</h1>
          <p>Good books, new beginnings, and everything in between.</p>
        </div>
        <AppLink className="button" href="/sell">
          <Plus size={18} /> List a book
        </AppLink>
      </div>
      <div
        className="dashboard-tabs"
        role="group"
        aria-label="Account sections"
      >
        {[
          ["listings", "My listings"],
          ["purchases", "My purchases"],
          ["sales", "My sales"],
          ["profile", "My profile"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "selected" : ""}
            aria-pressed={tab === id}
            onClick={() => {
              setTab(id);
              setConfirm(null);
              const url = new URL(location.href);
              url.searchParams.set("tab", id);
              history.replaceState(history.state, "", url);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {error && (
        <ErrorBox
          message={error}
          onRetry={() => {
            void load();
          }}
        />
      )}{" "}
      {confirm && (
        <div
          className="confirm-box"
          role="alert"
          tabIndex={-1}
          ref={confirmationBox}
        >
          <div>
            <strong>{confirm.label}</strong>
            <p>This will update the listing and any associated order.</p>
          </div>
          <button
            className="button small outline"
            onClick={() => setConfirm(null)}
          >
            Keep as is
          </button>
          <button
            disabled={!!pending}
            className="button small"
            onClick={() => action(confirm.path, confirm.data)}
          >
            {pending ? "Updating…" : "Confirm"}
          </button>
        </div>
      )}
      {tab === "profile" ? (
        <form
          className="form-card profile-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending("profile");
            setError("");
            try {
              await api("/me", {
                method: "PATCH",
                body: JSON.stringify({ display_name: name, school }),
              });
              setUser({ ...user, display_name: name, school });
              notify("Your profile is updated.");
            } catch (e: any) {
              setError(e.message);
            } finally {
              setPending("");
            }
          }}
        >
          <h2>A little about you</h2>
          <label>
            Display name
            <input
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <small>This is the name buyers and sellers see.</small>
          </label>
          <label>
            Email
            <input readOnly value={user.email} />
            <small>
              Your account email. Contact support for email changes. Never shown
              on public listings.
            </small>
          </label>
          <label>
            School or preferred curriculum (optional)
            <input
              maxLength={120}
              value={school}
              onChange={(e) => setSchool(e.target.value)}
            />
          </label>
          <button className="button" disabled={!!pending}>
            Save profile <Check size={17} />
          </button>
          <SignOutButton />
        </form>
      ) : !data ? (
        error ? null : (
          <Loading />
        )
      ) : tab === "listings" ? (
        data.listings.length ? (
          <div className="management-list">
            {data.listings.map((b: Book) => (
              <article key={b.id}>
                <div className="management-cover">
                  <Cover book={b} />
                </div>
                <div className="management-info">
                  <span className="tag">{b.status}</span>
                  <h3>
                    <AppLink href={"/book/" + b.id}>{b.title}</AppLink>
                  </h3>
                  <p>
                    {money(b.price)} · {b.condition}
                  </p>
                </div>
                <div className="management-actions">
                  {b.status === "available" && (
                    <>
                      <AppLink
                        className="button small outline"
                        href={"/edit/" + b.id}
                      >
                        Edit
                      </AppLink>
                      <button
                        className="button small outline"
                        onClick={() =>
                          setConfirm({
                            path: "/listings/" + b.id,
                            data: { status: "sold" },
                            label: "Mark this book as sold outside TermTrove?",
                          })
                        }
                      >
                        Mark sold
                      </button>
                      <button
                        className="subtle-button"
                        onClick={() =>
                          setConfirm({
                            path: "/listings/" + b.id,
                            data: { status: "archived" },
                            label: "Remove this listing from the marketplace?",
                          })
                        }
                      >
                        Archive
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            title="Your shelf is ready when you are."
            text="List a book you’ve finished and help another learner get started."
          />
        )
      ) : (
        <div className="orders-list">
          {data.orders.filter((o: any) =>
            tab === "purchases"
              ? o.buyer_id === user.id
              : o.seller_id === user.id,
          ).length ? (
            data.orders
              .filter((o: any) =>
                tab === "purchases"
                  ? o.buyer_id === user.id
                  : o.seller_id === user.id,
              )
              .map((o: any) => (
                <article className="order-card" key={o.id}>
                  <div className="order-top">
                    <span>
                      {o.reference} ·{" "}
                      {new Date(o.created_at).toLocaleDateString("en-GB")}
                    </span>
                    <span className="tag">{o.status}</span>
                  </div>
                  <h3>{o.title}</h3>
                  <p>
                    {tab === "purchases"
                      ? "Seller: " + o.seller_name
                      : "Buyer: " + o.buyer_name}{" "}
                    · {money(o.price)}
                  </p>
                  <div className="order-note">
                    <strong>Collection note</strong>
                    <p>{o.collection_note}</p>
                  </div>
                  <OrderConversation
                    order={o}
                    messages={(data.messages || []).filter(
                      (m: any) => m.order_id === o.id,
                    )}
                    user={user}
                    onSent={load}
                  />
                  <p className="payment-note">
                    {o.payment_status === "due_on_collection"
                      ? "Payment due on collection"
                      : o.payment_status === "paid_on_collection"
                        ? "Seller confirmed payment and collection"
                        : "Order cancelled · no payment taken online"}
                  </p>
                  {o.status === "pending" && (
                    <div className="form-actions">
                      {o.seller_id === user.id && (
                        <button
                          className="button small"
                          onClick={() =>
                            setConfirm({
                              path: "/orders/" + o.id,
                              data: { status: "completed" },
                              label:
                                "Confirm that this book has been collected and paid for?",
                            })
                          }
                        >
                          Confirm collection & payment <Check size={16} />
                        </button>
                      )}
                      <button
                        className="subtle-button"
                        onClick={() =>
                          setConfirm({
                            path: "/orders/" + o.id,
                            data: { status: "cancelled" },
                            label:
                              "Cancel this order and return the book to the marketplace?",
                          })
                        }
                      >
                        Cancel order
                      </button>
                    </div>
                  )}
                </article>
              ))
          ) : (
            <Empty
              title={
                tab === "purchases"
                  ? "Your next chapter is out there."
                  : "Good things take a little time."
              }
              text={
                tab === "purchases"
                  ? "Your reserved and purchased books will appear here."
                  : "When someone reserves your book, the order will appear here."
              }
              browse={tab === "purchases"}
            />
          )}
        </div>
      )}
    </section>
  );
}
export function OrderConversation({
  order,
  messages,
  user,
  onSent,
}: {
  order: any;
  messages: any[];
  user: Profile;
  onSent: () => any;
}) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <details className="order-conversation">
      <summary>
        Collection conversation{" "}
        <span>
          {messages.length} messages <ChevronDown size={14} />
        </span>
      </summary>
      <p className="conversation-help">
        Only you and the other person in this order can see these messages.
        Agree on a public place and a time.
      </p>
      <div className="conversation-messages">
        {messages.map((m) => (
          <div
            key={m.id}
            className={m.sender_id === user.id ? "own-message" : ""}
          >
            <strong>{m.sender_id === user.id ? "You" : m.sender_name}</strong>
            <p>{m.message}</p>
          </div>
        ))}
      </div>
      {order.status === "pending" && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api("/orders/" + order.id + "/messages", {
                method: "POST",
                body: JSON.stringify({ message }),
              });
              setMessage("");
              await onSent();
            } catch (e: any) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Message
            <textarea
              required
              maxLength={1000}
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Suggest a collection time or confirm a meeting point…"
            />
          </label>
          {error && <ErrorBox message={error} />}
          <button className="button small" disabled={busy}>
            {busy ? "Sending…" : "Send message"} <ArrowRight size={14} />
          </button>
        </form>
      )}
    </details>
  );
}
