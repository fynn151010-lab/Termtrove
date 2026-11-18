import { ArrowRight, Check, Leaf, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api";
import { SignInGate } from "../auth";
import { BookCard, ErrorBox, Loading } from "../components";
import type { Profile } from "../types";
import { preparePhoto } from "../photos";
import { scrollBehavior } from "../utils";

const subjects = [
  "Biology",
  "Chemistry",
  "Physics",
  "Mathematics",
  "Economics",
  "English",
  "History",
  "Geography",
  "Other",
];
export function Sell({
  id,
  user,
  navigate,
  notify,
  authReady,
}: {
  id?: string;
  user: Profile | null;
  navigate: (p: string) => void;
  notify: (s: string) => void;
  authReady: boolean;
}) {
  const [form, setForm] = useState<any>({
      title: "",
      author: "",
      subject: "",
      condition: "Good",
      price: "",
      description: "",
      curriculum: "IGCSE",
      isbn: "",
      publisher: "",
      edition: "",
      original_price: "",
      fulfilment: "Arrange collection at a public place in Bangkok.",
      images: [],
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [uploadLabel, setUploadLabel] = useState(""),
    [preview, setPreview] = useState(false),
    [loaded, setLoaded] = useState(!id),
    [loadError, setLoadError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    if (id && user) {
      setLoaded(false);
      setLoadError("");
      api("/listings/" + id, { signal: controller.signal })
        .then((d) => {
          if (controller.signal.aborted) return;
          if (d.listing.seller_id !== user?.id)
            throw new Error("You can only edit your own listing.");
          setForm({
            ...d.listing,
            price: d.listing.price / 100,
            original_price: d.listing.original_price
              ? d.listing.original_price / 100
              : "",
            images: d.images.map((i: any) => i.id),
          });
          setError("");
          setLoaded(true);
        })
        .catch((e) => {
          if (!controller.signal.aborted) {
            setLoadError(e.message);
            setLoaded(true);
          }
        });
    }
    return () => controller.abort();
  }, [id, user?.id, retry]);
  if (!authReady) return <Loading />;
  if (!user) return <SignInGate />;
  const update = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  async function upload(files: FileList | null) {
    if (!files) return;
    const selected = Array.from(files);
    if (selected.length + form.images.length > 5) {
      setError("You can add up to 5 photos.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      for (const [index, file] of selected.entries()) {
        setUploadLabel(`Preparing photo ${index + 1} of ${selected.length}…`);
        const photo = await preparePhoto(file);
        setUploadLabel(`Uploading photo ${index + 1} of ${selected.length}…`);
        const fd = new FormData();
        fd.set("image", photo);
        const result = await api("/images", { method: "POST", body: fd });
        setForm((f: any) => ({ ...f, images: [...f.images, result.id] }));
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
      setUploadLabel("");
    }
  }
  async function publish() {
    setError("");
    setBusy(true);
    try {
      const result = await api("/listings" + (id ? "/" + id : ""), {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
      notify(
        id
          ? "Your listing has been updated."
          : "Your book is on the shelf. Here’s to its next chapter!",
      );
      navigate("/book/" + result.id);
    } catch (e: any) {
      setError(e.message);
      setPreview(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="section form-page">
      <div className="page-title">
        <span className="eyebrow">MAKE ROOM FOR WHAT’S NEXT</span>
        <h1>
          {id ? "Refresh your listing." : "Your books have more to give."}
        </h1>
        <p>A few details, a good photo, and a new chapter for your book.</p>
      </div>
      {error && <ErrorBox message={error} />}
      <div className="form-layout">
        <div>
          {!loaded ? (
            <Loading />
          ) : loadError ? (
            <ErrorBox
              message={loadError}
              onRetry={() => setRetry((value) => value + 1)}
            />
          ) : preview ? (
            <div className="form-card">
              <span className="eyebrow">LISTING PREVIEW</span>
              <div className="preview-card">
                <BookCard
                  interactive={false}
                  book={{
                    ...form,
                    id: "preview",
                    price: Math.round(Number(form.price) * 100),
                    original_price: form.original_price
                      ? Math.round(Number(form.original_price) * 100)
                      : null,
                    image_id: form.images[0],
                    is_demo: 0,
                    status: "available",
                  }}
                />
              </div>
              <h3>Description</h3>
              <p className="description">{form.description}</p>
              <div className="form-actions">
                <button
                  className="button outline"
                  disabled={busy}
                  onClick={() => setPreview(false)}
                >
                  Keep editing
                </button>
                <button className="button" disabled={busy} onClick={publish}>
                  {busy
                    ? "Publishing…"
                    : id
                      ? "Save changes"
                      : "Publish listing"}{" "}
                  <Check size={17} />
                </button>
              </div>
            </div>
          ) : (
            <form
              className="form-card"
              onSubmit={(e) => {
                e.preventDefault();
                if (form.images.length < 1) {
                  setError("Add at least one photo of your book.");
                  return;
                }
                setError("");
                setPreview(true);
                window.scrollTo({ top: 150, behavior: scrollBehavior() });
              }}
            >
              <h2>Tell us about your book</h2>
              <p className="form-intro">
                Fields marked * help another learner find the right book.
              </p>
              <div className="form-fields">
                <label className="wide">
                  Book title *
                  <input
                    required
                    maxLength={200}
                    value={form.title}
                    onChange={(e) => update("title", e.target.value)}
                    placeholder="e.g. Cambridge IGCSE Biology"
                  />
                </label>
                <label className="wide">
                  Author *
                  <input
                    required
                    maxLength={200}
                    value={form.author}
                    onChange={(e) => update("author", e.target.value)}
                    placeholder="Who wrote the book?"
                  />
                </label>
                <label>
                  Subject *
                  <select
                    required
                    value={form.subject}
                    onChange={(e) => update("subject", e.target.value)}
                  >
                    <option value="">Choose a subject</option>
                    {subjects.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Curriculum
                  <select
                    value={form.curriculum}
                    onChange={(e) => update("curriculum", e.target.value)}
                  >
                    {["IGCSE", "GCSE", "A Level", "IB", "Other"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Condition *
                  <select
                    required
                    value={form.condition}
                    onChange={(e) => update("condition", e.target.value)}
                  >
                    {["Like New", "Good", "Fair", "Acceptable"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Edition / publication year
                  <input
                    maxLength={80}
                    value={form.edition}
                    onChange={(e) => update("edition", e.target.value)}
                    placeholder="e.g. 4th edition, 2023"
                  />
                </label>
                <label>
                  Selling price (THB) *
                  <input
                    required
                    type="number"
                    min="0.01"
                    max="100000"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => update("price", e.target.value)}
                    placeholder="450"
                  />
                </label>
                <label>
                  Original retail price (THB)
                  <input
                    type="number"
                    min={form.price || "0.01"}
                    max="1000000"
                    step="0.01"
                    value={form.original_price}
                    onChange={(e) => update("original_price", e.target.value)}
                    placeholder="Optional"
                  />
                </label>
                <label>
                  ISBN
                  <input
                    maxLength={30}
                    value={form.isbn}
                    onChange={(e) => update("isbn", e.target.value)}
                    placeholder="Optional"
                  />
                </label>
                <label>
                  Publisher
                  <input
                    maxLength={150}
                    value={form.publisher}
                    onChange={(e) => update("publisher", e.target.value)}
                    placeholder="Optional"
                  />
                </label>
                <label className="wide">
                  Book photos *
                  <span className="upload-zone">
                    <Upload size={25} />
                    <strong role="status" aria-live="polite">
                      {uploadLabel || "Choose photos of your book"}
                    </strong>
                    <span>
                      JPG, PNG or WebP · up to 20 MB each · 1–5 photos. Large
                      photos are resized before uploading.
                    </span>
                    <input
                      disabled={busy}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      aria-label="Upload book photographs"
                      onChange={(e) => {
                        upload(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </span>
                </label>
                <div className="uploaded-photos wide">
                  {form.images.map((image: string) => (
                    <div key={image}>
                      <img
                        src={"/api/images/" + image}
                        alt="Uploaded book photograph"
                      />
                      <button
                        type="button"
                        disabled={busy}
                        aria-label="Remove photo"
                        onClick={() =>
                          update(
                            "images",
                            form.images.filter((v: string) => v !== image),
                          )
                        }
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
                <label className="wide">
                  Description *
                  <textarea
                    required
                    maxLength={5000}
                    minLength={10}
                    rows={5}
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="Tell us about the book, any highlighting or notes, and anything a buyer should know."
                  />
                </label>
                <label className="wide">
                  Collection preferences
                  <input
                    required
                    maxLength={300}
                    value={form.fulfilment}
                    onChange={(e) => update("fulfilment", e.target.value)}
                  />
                  <small>
                    Suggest a public place. Do not include a home address or
                    personal contact details.
                  </small>
                </label>
              </div>
              <div className="form-actions">
                <span>Payment on collection</span>
                <button disabled={busy} className="button" type="submit">
                  Preview listing <ArrowRight size={18} />
                </button>
              </div>
            </form>
          )}
        </div>
        <aside className="seller-tips">
          <Leaf size={32} />
          <h3>
            A good listing
            <br />
            goes a long way.
          </h3>
          <p>
            <Check size={16} /> Show the cover and any wear.
          </p>
          <p>
            <Check size={16} /> Be honest about notes or markings.
          </p>
          <p>
            <Check size={16} /> Check the edition and curriculum.
          </p>
          <p>
            <Check size={16} /> Set a price you’d be happy to find.
          </p>
          <hr />
          <strong>How’s the condition?</strong>
          <dl>
            <dt>Like New</dt>
            <dd>Almost untouched, no writing.</dd>
            <dt>Good</dt>
            <dd>Light wear, a few notes or highlights.</dd>
            <dt>Fair</dt>
            <dd>Visible wear or frequent markings.</dd>
            <dt>Acceptable</dt>
            <dd>Well used, but complete and readable.</dd>
          </dl>
        </aside>
      </div>
    </section>
  );
}
