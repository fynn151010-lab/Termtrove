import { normalizePhoto } from "./images";
import { readConfig, type AppConfig } from "./config";
import { requestClient } from "./supabase";
import { authRoute } from "./auth";
import {
  HttpError,
  fail,
  text,
  uuid,
  email,
  body,
  checked,
  assertSameOrigin,
} from "./http";
export async function handleAPI(
  req: Request,
  providedConfig?: AppConfig,
): Promise<Response> {
  let finish = (response: Response) => response;
  try {
    let config: AppConfig;
    try {
      config = providedConfig || readConfig();
    } catch {
      fail(
        503,
        "TermTrove’s backend is not configured yet. Please set the Supabase connection and application origin.",
      );
    }
    const context = requestClient(req, config!);
    finish = context.finish;
    const db = context.client;
    assertSameOrigin(req, config!.origin);
    const authentication = await authRoute(req, db, config!);
    if (authentication) return finish(authentication);
    const url = new URL(req.url),
      path = url.pathname,
      method = req.method;
    let currentUser: any,
      lookedUp = false;
    async function user(required = true) {
      if (!lookedUp) {
        const result = await db.auth.getUser();
        currentUser = result.error ? null : result.data.user;
        lookedUp = true;
      }
      if (required && !currentUser) fail(401, "Please sign in to continue.");
      return currentUser;
    }
    const json = (data: unknown, status = 200) =>
      finish(Response.json(data, { status }));
    if (path === "/api/health" && method === "GET") {
      const result = await db
        .from("marketplace_listings")
        .select("id")
        .limit(1);
      if (result.error)
        fail(
          503,
          "The marketplace database is not ready. Check connection settings and apply migrations.",
        );
      return json({ status: "ok" });
    }
    if (path === "/api/me" && method === "GET") {
      const u = await user(false);
      if (!u) return json({ user: null });
      const profile = checked(
        await db
          .from("profiles")
          .select("id,display_name,school")
          .eq("id", u.id)
          .single(),
      );
      return json({ user: { ...profile, email: u.email } });
    }
    if (path === "/api/me" && method === "PATCH") {
      const u = await user(),
        d = await body(req);
      checked(
        await db
          .from("profiles")
          .update({
            display_name: text(d.display_name, "Display name", 60),
            school: text(d.school || "", "School", 120, false),
          })
          .eq("id", u.id),
      );
      return json({ ok: true });
    }
    if (path === "/api/listings" && method === "GET") {
      let query = db
        .from("marketplace_listings")
        .select("*")
        .neq("status", "archived");
      const q = url.searchParams;
      const search = (q.get("q") || "").trim().slice(0, 200);
      if (search) {
        const term = search.replace(/[\\%_]/g, "\\$&");
        const like = JSON.stringify("%" + term + "%");
        query = query.or(
          ["title", "author", "isbn", "subject", "curriculum"]
            .map((key) => key + ".ilike." + like)
            .join(","),
        );
      }
      for (const key of ["condition", "subject", "curriculum", "status"])
        if (q.get(key)) query = query.eq(key, q.get(key));
      for (const [key, op] of [
        ["min", "gte"],
        ["max", "lte"],
      ])
        if (q.get(key)) {
          const price = Number(q.get(key));
          if (!Number.isFinite(price) || price < 0)
            fail(400, "Enter a valid price range.");
          query =
            op === "gte"
              ? query.gte("price", Math.round(price * 100))
              : query.lte("price", Math.round(price * 100));
        }
      const sort = q.get("sort") || "recent";
      const column =
        sort === "low" || sort === "high"
          ? "price"
          : sort === "az"
            ? "title"
            : "created_at";
      const listings = checked(
        await query
          .order(column, { ascending: sort === "low" || sort === "az" })
          .order("id")
          .limit(200),
      );
      return json({ listings });
    }
    const listingRoute = path.match(/^\/api\/listings\/([^/]+)$/);
    if (listingRoute && method === "GET") {
      const id = uuid(listingRoute[1]);
      const { data: listing, error } = await db
        .from("marketplace_listings")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) checked({ data: listing, error });
      if (!listing) fail(404, "Book not found.");
      const images = checked(
        await db
          .from("images")
          .select("id")
          .eq("listing_id", id)
          .order("position"),
      );
      return json({ listing, images });
    }
    if (path === "/api/images" && method === "POST") {
      const u = await user();
      if (Number(req.headers.get("content-length") || 0) > 4 * 1024 * 1024)
        fail(413, "Choose a photo under 3 MB.");
      const data = await req.formData(),
        file = data.get("image");
      if (
        !(file instanceof File) ||
        file.size > 3 * 1024 * 1024 ||
        file.size < 12
      )
        fail(400, "Choose a JPG, PNG or WebP image under 3 MB.");
      const bytes = await normalizePhoto(
        new Uint8Array(await file.arrayBuffer()),
      );
      const id = crypto.randomUUID(),
        object_key = u.id + "/" + id;
      checked(
        await db.storage.from("book-images").upload(object_key, bytes, {
          contentType: "image/webp",
          upsert: false,
        }),
      );
      const saved = await db
        .from("images")
        .insert({ id, owner_id: u.id, object_key });
      if (saved.error) {
        await db.storage.from("book-images").remove([object_key]);
        checked(saved);
      }
      return json({ id }, 201);
    }
    const imageRoute = path.match(/^\/api\/images\/([^/]+)$/);
    if (imageRoute && method === "GET") {
      const { data: image } = await db
        .from("images")
        .select("object_key")
        .eq("id", uuid(imageRoute[1]))
        .maybeSingle();
      if (!image) fail(404, "Image not found.");
      const file = checked(
        await db.storage.from("book-images").download(image.object_key),
      );
      if (!file) fail(404, "Image not found.");
      return finish(
        new Response(file!, {
          headers: {
            "Content-Type": file!.type || "image/jpeg",
            "Content-Disposition": "inline",
            "X-Content-Type-Options": "nosniff",
          },
        }),
      );
    }
    if (
      (path === "/api/listings" && method === "POST") ||
      (listingRoute && method === "PUT")
    ) {
      await user();
      const d = await body(req);
      const price = Number(d.price),
        original = d.original_price ? Number(d.original_price) : null;
      if (!Number.isFinite(price) || price < 0.01 || price > 100000)
        fail(400, "Price must be between ฿0.01 and ฿100,000.");
      if (
        original !== null &&
        (!Number.isFinite(original) || original < price || original > 1000000)
      )
        fail(400, "Original price must be at least the selling price.");
      if (!["Like New", "Good", "Fair", "Acceptable"].includes(d.condition))
        fail(400, "Choose a book condition.");
      if (
        !Array.isArray(d.images) ||
        d.images.length < 1 ||
        d.images.length > 5 ||
        new Set(d.images).size !== d.images.length
      )
        fail(400, "Add between 1 and 5 book photos.");
      const description = text(d.description, "Description", 5000);
      if (description.length < 10)
        fail(400, "Please add at least 10 characters describing the book.");
      const data = {
        title: text(d.title, "Title"),
        author: text(d.author, "Author"),
        subject: text(d.subject, "Subject", 80),
        curriculum: text(d.curriculum || "Other", "Curriculum", 80),
        condition: d.condition,
        price: Math.round(price * 100),
        original_price: original === null ? null : Math.round(original * 100),
        isbn: text(d.isbn || "", "ISBN", 30, false),
        publisher: text(d.publisher || "", "Publisher", 150, false),
        edition: text(d.edition || "", "Edition", 80, false),
        description,
        fulfilment: text(
          d.fulfilment || "Collection in Bangkok",
          "Collection preference",
          300,
        ),
      };
      const id = checked(
        await db.rpc("save_listing", {
          p_data: data,
          p_image_ids: d.images.map(uuid),
          p_listing_id: listingRoute ? uuid(listingRoute[1]) : null,
        }),
      );
      return json({ id }, listingRoute ? 200 : 201);
    }
    if (listingRoute && method === "PATCH") {
      await user();
      const d = await body(req);
      if (!["archived", "sold"].includes(d.status))
        fail(400, "Invalid listing action.");
      checked(
        await db.rpc("change_listing_status", {
          p_listing_id: uuid(listingRoute[1]),
          p_status: d.status,
        }),
      );
      return json({ ok: true });
    }
    if (path === "/api/orders" && method === "POST") {
      await user();
      const d = await body(req);
      if (d.payment_method !== "collection")
        fail(
          400,
          "Payment on collection is the only supported payment method.",
        );
      const order = checked(
        await db.rpc("place_order", {
          p_listing_id: uuid(d.listing_id),
          p_collection_note: text(
            d.collection_note,
            "Collection message",
            1000,
          ),
        }),
      );
      return json(order, 201);
    }
    if (path === "/api/dashboard" && method === "GET") {
      const u = await user();
      const [books, ordersResult, messagesResult] = await Promise.all([
        db
          .from("marketplace_listings")
          .select("*")
          .eq("seller_id", u.id)
          .order("created_at", { ascending: false }),
        db.from("orders").select("*").order("created_at", { ascending: false }),
        db.from("order_messages").select("*").order("created_at"),
      ]);
      const listings = checked(books),
        orders = checked(ordersResult) || [],
        messages = checked(messagesResult) || [];
      const ids = [
        ...new Set([
          ...orders.flatMap((o) => [o.buyer_id, o.seller_id]),
          ...messages.map((m) => m.sender_id),
        ]),
      ];
      const sellers = ids.length
        ? checked(
            await db
              .from("public_sellers")
              .select("id,display_name")
              .in("id", ids),
          )
        : [];
      const names = new Map((sellers || []).map((s) => [s.id, s.display_name]));
      return json({
        listings,
        orders: orders.map((o) => ({
          ...o,
          buyer_name: names.get(o.buyer_id),
          seller_name: names.get(o.seller_id),
        })),
        messages: messages.map((m) => ({
          ...m,
          sender_name: names.get(m.sender_id),
        })),
      });
    }
    const messageRoute = path.match(/^\/api\/orders\/([^/]+)\/messages$/);
    if (messageRoute && method === "POST") {
      const u = await user(),
        d = await body(req);
      checked(
        await db.from("order_messages").insert({
          order_id: uuid(messageRoute[1]),
          sender_id: u.id,
          message: text(d.message, "Message", 1000),
        }),
      );
      return json({ ok: true }, 201);
    }
    const orderRoute = path.match(/^\/api\/orders\/([^/]+)$/);
    if (orderRoute && method === "PATCH") {
      await user();
      const d = await body(req);
      if (!["cancelled", "completed"].includes(d.status))
        fail(400, "Invalid order action.");
      checked(
        await db.rpc("change_order_status", {
          p_order_id: uuid(orderRoute[1]),
          p_status: d.status,
        }),
      );
      return json({ ok: true });
    }
    if (path === "/api/contact" && method === "POST") {
      const u = await user(),
        d = await body(req),
        id = crypto.randomUUID();
      checked(
        await db.from("contact_messages").insert({
          id,
          user_id: u.id,
          name: text(d.name, "Name", 100),
          email: email(d.email),
          message: text(d.message, "Message", 5000),
        }),
      );
      return json({ reference: "MSG-" + id.slice(0, 8).toUpperCase() }, 201);
    }
    fail(404, "Page not found.");
  } catch (error) {
    if (error instanceof HttpError)
      return finish(
        Response.json({ error: error.message }, { status: error.status }),
      );
    console.error("TermTrove request failed", {
      type: error instanceof Error ? error.name : "Unknown",
    });
    return finish(
      Response.json(
        { error: "We could not complete that request. Please try again." },
        { status: 500 },
      ),
    );
  }
}
