import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { handleAPI } from "../../server/api";
import marketplace from "../../netlify/functions/marketplace";
import { readConfig } from "../../server/config";
const config = readConfig();
if (!["localhost", "127.0.0.1"].includes(new URL(config.supabaseUrl).hostname))
  throw new Error(
    "Integration tests only run against a local Supabase instance; production data is never changed.",
  );
const prefix = crypto.randomUUID().slice(0, 8),
  pass = " TermTrove-local-test-Only-123! ";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAABgAAAAgCAIAAACHPC9vAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAL0lEQVRIiWOQsDegCmIYNUhiNIwkRtOR/WgWsR8tRgxGS0iD0VpEYrSClBjajQgA/VmVECVHEqYAAAAASUVORK5CYII=",
  "base64",
);
class Browser {
  cookies = new Map<string, string>();
  async request(path: string, method = "GET", data?: any) {
    const headers = new Headers({
      cookie: [...this.cookies].map(([k, v]) => k + "=" + v).join("; "),
    });
    if (!["GET", "HEAD"].includes(method)) headers.set("origin", config.origin);
    if (data && !(data instanceof FormData))
      headers.set("content-type", "application/json");
    // Run real auth, uploads and orders through the deployed function adapter.
    const response = await marketplace(
      new Request(config.origin + "/api" + path, {
        method,
        headers,
        body:
          data instanceof FormData
            ? data
            : data
              ? JSON.stringify(data)
              : undefined,
      }),
    );
    for (const item of response.headers.getSetCookie()) {
      const cookie = item.split(";")[0],
        index = cookie.indexOf("=");
      const name = cookie.slice(0, index),
        value = cookie.slice(index + 1);
      if (value) this.cookies.set(name, value);
      else this.cookies.delete(name);
    }
    const type = response.headers.get("content-type") || "";
    return {
      status: response.status,
      data: type.includes("json") ? ((await response.json()) as any) : null,
      response,
    };
  }
  async signup(role: string) {
    return this.request("/auth/signup", "POST", {
      email: prefix + "-" + role + "@example.test",
      password: pass,
      display_name: "Test " + role,
      return_to: "/account",
    });
  }
  async login(role: string, password = pass) {
    return this.request("/auth/login", "POST", {
      email: prefix + "-" + role + "@example.test",
      password,
    });
  }
}
const seller = new Browser(),
  buyer = new Browser(),
  other = new Browser(),
  anonymous = new Browser();
let bookId: string, photoId: string, orderId: string;
async function emailLink(recipient: string) {
  const list = (await (
    await fetch("http://127.0.0.1:54324/api/v1/messages")
  ).json()) as any;
  const message = list.messages?.find((m: any) =>
    (m.To || []).some((to: any) => to.Address === recipient),
  );
  assert.ok(message, "Local Supabase should deliver an email to Mailpit");
  const detail = (await (
    await fetch("http://127.0.0.1:54324/api/v1/message/" + message.ID)
  ).json()) as any;
  const content = (detail.HTML || detail.Text || "").replaceAll("&amp;", "&");
  const link = content.match(
    /https?:\/\/[^\s"<>]+\/auth\/v1\/verify\?[^\s"<>]+/i,
  )?.[0];
  assert.ok(link, "Supabase email must include a verification link");
  return link;
}
async function confirmEmail(browser: Browser, role: string) {
  const link = await emailLink(prefix + "-" + role + "@example.test");
  const verified = await fetch(link, { redirect: "manual" });
  const location = verified.headers.get("location");
  assert.ok(location);
  const url = new URL(location!);
  assert.ok(
    url.searchParams.get("code"),
    "Supabase should return a real PKCE code",
  );
  return browser.request("/auth/callback" + url.search);
}
async function upload(browser: Browser) {
  const fd = new FormData();
  fd.set("image", new File([png], "book.png", { type: "image/png" }));
  const result = await browser.request("/images", "POST", fd);
  assert.equal(result.status, 201, JSON.stringify(result.data));
  return result.data.id;
}
function listing(images = [photoId]) {
  return {
    title: "Test Biology " + prefix,
    author: "Student Author",
    subject: "Biology",
    curriculum: "IGCSE",
    condition: "Good",
    price: 345.5,
    original_price: 1000,
    description: "A complete educational book with a few notes.",
    fulfilment: "Meet at a public station in Bangkok.",
    images,
  };
}

test("independent sign-up confirms email, signs in and persists HttpOnly sessions", async () => {
  assert.equal((await anonymous.request("/health")).status, 200);
  for (const [browser, role] of [
    [seller, "seller"],
    [buyer, "buyer"],
    [other, "other"],
  ] as const) {
    const signup = await browser.signup(role);
    assert.equal(signup.status, 200, JSON.stringify(signup.data));
    if (signup.data.requires_confirmation) {
      const confirmation = await confirmEmail(browser, role);
      assert.equal(confirmation.status, 303);
    }
    const login = await browser.login(role);
    assert.equal(login.status, 200, JSON.stringify(login.data));
    const me = await browser.request("/me");
    assert.equal(me.data.user.display_name, "Test " + role);
    assert.equal((await browser.request("/me")).data.user.id, me.data.user.id);
    assert.ok(
      login.response.headers
        .getSetCookie()
        .every((h) => h.includes("HttpOnly")),
    );
  }
  assert.equal((await anonymous.request("/me")).data.user, null);
  const forged = await handleAPI(
    new Request(config.origin + "/api/me", {
      headers: {
        "oai-authenticated-user-id": "forged",
        "oai-authenticated-user-email": "victim@example.test",
      },
    }),
    config,
  );
  assert.equal((await forged.json()).user, null);
});
test("photos persist privately; anonymous writes and invalid image types are rejected", async () => {
  const bad = new FormData();
  bad.set(
    "image",
    new File(["<svg>not-a-photo</svg>"], "file.png", { type: "image/png" }),
  );
  assert.equal((await seller.request("/images", "POST", bad)).status, 400);
  photoId = await upload(seller);
  const storedPhoto = await seller.request("/images/" + photoId);
  assert.equal(storedPhoto.status, 200);
  assert.equal(storedPhoto.response.headers.get("content-type"), "image/webp");
  assert.equal((await anonymous.request("/images/" + photoId)).status, 404);
  assert.equal(
    (await anonymous.request("/listings", "POST", listing())).status,
    401,
  );
});
test("only the owner can remove an unused photo, and removal cannot race with publication", async () => {
  const disposable = await upload(seller);
  const ownerId = (await seller.request("/me")).data.user.id;
  const objectKey = ownerId + "/" + disposable;
  assert.equal(
    (await anonymous.request("/images/" + disposable, "DELETE")).status,
    401,
  );
  assert.equal(
    (await other.request("/images/" + disposable, "DELETE")).status,
    403,
  );
  const raw = createClient(config.supabaseUrl, config.supabaseKey, {
    auth: { persistSession: false },
  });
  assert.equal(
    (
      await raw.auth.signInWithPassword({
        email: prefix + "-seller@example.test",
        password: pass,
      })
    ).error,
    null,
  );
  await raw.storage.from("book-images").remove([objectKey]);
  assert.equal(
    (await seller.request("/images/" + disposable)).status,
    200,
    "Direct storage deletion cannot bypass the removal state",
  );
  const requested = await raw.rpc("request_photo_removal", {
    p_image_id: disposable,
  });
  assert.equal(requested.error, null);
  const prematureFinish = await raw.rpc("finish_photo_removal", {
    p_image_id: disposable,
  });
  assert.ok(
    prematureFinish.error,
    "Metadata stays locked until the stored object has been removed",
  );
  const attemptedPublication = await seller.request(
    "/listings",
    "POST",
    listing([disposable]),
  );
  assert.equal(attemptedPublication.status, 400);
  assert.match(attemptedPublication.data.error, /being removed/);
  assert.equal(
    (await seller.request("/images/" + disposable, "DELETE")).status,
    200,
  );
  assert.equal((await seller.request("/images/" + disposable)).status, 404);
  assert.ok(
    (await raw.storage.from("book-images").download(objectKey)).error,
    "The stored object must be deleted as well as its metadata",
  );
  assert.equal(
    (await seller.request("/images/" + disposable, "DELETE")).status,
    200,
    "Removal retries are idempotent",
  );
});
test("real listing creation, search, filters and ownership work through PostgreSQL RLS", async () => {
  assert.equal(
    (await other.request("/listings", "POST", listing())).status,
    403,
  );
  const result = await seller.request("/listings", "POST", listing());
  assert.equal(result.status, 201, JSON.stringify(result.data));
  bookId = result.data.id;
  const detail = await anonymous.request("/listings/" + bookId);
  assert.equal(detail.status, 200);
  assert.equal(detail.data.listing.price, 34550);
  assert.ok(!JSON.stringify(detail.data).includes("@example.test"));
  assert.equal((await anonymous.request("/images/" + photoId)).status, 200);
  assert.equal(
    (
      await anonymous.request(
        "/listings?q=" +
          encodeURIComponent(prefix) +
          "&curriculum=IGCSE&subject=Biology",
      )
    ).data.listings.length,
    1,
  );
  assert.equal(
    (
      await seller.request("/listings/" + bookId, "PUT", {
        ...listing(),
        title: "Updated " + prefix,
      })
    ).status,
    200,
  );
  assert.equal(
    (await other.request("/listings/" + bookId, "PUT", listing())).status,
    403,
  );
  const raw = createClient(config.supabaseUrl, config.supabaseKey, {
    auth: { persistSession: false },
  });
  await raw.auth.signInWithPassword({
    email: prefix + "-other@example.test",
    password: pass,
  });
  const profileId = (await seller.request("/me")).data.user.id;
  const privateProfile = await raw
    .from("profiles")
    .select("*")
    .eq("id", profileId);
  assert.equal(privateProfile.data?.length, 0);
  const guest = createClient(config.supabaseUrl, config.supabaseKey, {
    auth: { persistSession: false },
  });
  const blockedRpc = await guest.rpc("place_order", {
    p_listing_id: bookId,
    p_collection_note: "Anonymous callers cannot reserve a book.",
  });
  assert.match(
    blockedRpc.error?.message || "",
    /permission denied for function/i,
  );
  const changedName = await seller.request("/me", "PATCH", {
    display_name: "Updated seller",
    school: "Private school detail",
  });
  assert.equal(changedName.status, 200);
  const publicName = await guest
    .from("public_sellers")
    .select("*")
    .eq("id", profileId)
    .single();
  assert.deepEqual(publicName.data, {
    id: profileId,
    display_name: "Updated seller",
  });
  assert.equal(
    (await anonymous.request("/listings/" + bookId)).data.listing.seller_name,
    "Updated seller",
  );
  const forgedPublicName = await raw
    .from("seller_profiles")
    .update({ display_name: "Forged seller" })
    .eq("id", profileId);
  assert.ok(
    forgedPublicName.error,
    "API roles cannot write public seller names directly",
  );
  const privateField = await guest.from("public_sellers").select("school");
  assert.ok(
    privateField.error,
    "The public seller projection has no private school column",
  );
  const direct = await raw
    .from("listings")
    .update({ price: 1 })
    .eq("id", bookId);
  assert.ok(
    direct.error,
    "Direct table mutation must be denied even to signed-in users",
  );
});
test("saving replacement photos cleans up old objects and preserves the selected cover order", async () => {
  assert.equal(
    (await seller.request("/images/" + photoId, "DELETE")).status,
    409,
    "Published photos cannot be deleted directly",
  );
  const first = await upload(seller),
    second = await upload(seller);
  const replaced = await seller.request("/listings/" + bookId, "PUT", {
    ...listing([first, second]),
    title: "Updated " + prefix,
  });
  assert.equal(replaced.status, 200);
  const detail = await anonymous.request("/listings/" + bookId);
  assert.equal(detail.data.listing.image_id, first);
  assert.deepEqual(
    detail.data.images.map((image: { id: string }) => image.id),
    [first, second],
  );
  assert.equal(
    (await seller.request("/images/" + photoId)).status,
    404,
    "An old photo is removed only after its listing update succeeds",
  );
  const reordered = await seller.request("/listings/" + bookId, "PUT", {
    ...listing([second, first]),
    title: "Updated " + prefix,
  });
  assert.equal(reordered.status, 200);
  assert.equal(
    (await anonymous.request("/listings/" + bookId)).data.listing.image_id,
    second,
  );
  assert.equal(
    (await anonymous.request("/images/" + first)).status,
    200,
    "Reordering must preserve both stored photos",
  );
  photoId = second;
});
test("concurrent buyers reserve exactly one book; orders appear only to participants", async () => {
  assert.equal(
    (
      await seller.request("/orders", "POST", {
        listing_id: bookId,
        payment_method: "collection",
        collection_note: "At station",
      })
    ).status,
    400,
  );
  const results = await Promise.all(
    [buyer, other].map((b) =>
      b.request("/orders", "POST", {
        listing_id: bookId,
        payment_method: "collection",
        collection_note: "Public station, 5pm.",
      }),
    ),
  );
  assert.equal(
    results.filter((r) => r.status === 201).length,
    1,
    JSON.stringify(results.map((r) => r.data)),
  );
  assert.equal(results.filter((r) => r.status === 409).length, 1);
  orderId = results.find((r) => r.status === 201)!.data.id;
  const orders = (await seller.request("/dashboard")).data.orders;
  assert.ok(orders.some((o: any) => o.id === orderId));
  assert.equal((await anonymous.request("/dashboard")).status, 401);
  assert.equal(
    (await seller.request("/listings/" + bookId, "PUT", listing())).status,
    409,
  );
});
test("private collection messages, cancellation, reordering and paid collection are persistent", async () => {
  const orders = (await seller.request("/dashboard")).data.orders;
  const buyerId = orders.find((o: any) => o.id === orderId).buyer_id;
  const winningBuyer =
    (await buyer.request("/me")).data.user.id === buyerId ? buyer : other;
  const outsider = winningBuyer === buyer ? other : buyer;
  assert.equal(
    (
      await winningBuyer.request("/orders/" + orderId + "/messages", "POST", {
        message: "Can we meet at the public concourse?",
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await seller.request("/orders/" + orderId + "/messages", "POST", {
        message: "Yes, 5pm works.",
      })
    ).status,
    201,
  );
  assert.equal((await outsider.request("/dashboard")).data.messages.length, 0);
  assert.equal(
    (
      await outsider.request("/orders/" + orderId + "/messages", "POST", {
        message: "No access",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await winningBuyer.request("/orders/" + orderId, "PATCH", {
        status: "completed",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await winningBuyer.request("/orders/" + orderId, "PATCH", {
        status: "cancelled",
      })
    ).status,
    200,
  );
  assert.equal(
    (await anonymous.request("/listings/" + bookId)).data.listing.status,
    "available",
  );
  const again = await buyer.request("/orders", "POST", {
    listing_id: bookId,
    payment_method: "collection",
    collection_note: "Public station, 6pm.",
  });
  assert.equal(again.status, 201);
  assert.equal(
    (
      await seller.request("/orders/" + again.data.id, "PATCH", {
        status: "completed",
      })
    ).status,
    200,
  );
  assert.equal(
    (await anonymous.request("/listings/" + bookId)).data.listing.status,
    "sold",
  );
  assert.equal(
    (await buyer.request("/dashboard")).data.orders.find(
      (o: any) => o.id === again.data.id,
    ).payment_status,
    "paid_on_collection",
  );
});
test("seller archives another book and private contact submissions are saved", async () => {
  const photo = await upload(seller);
  const result = await seller.request("/listings", "POST", listing([photo]));
  assert.equal(result.status, 201);
  assert.equal(
    (
      await seller.request("/listings/" + result.data.id, "PATCH", {
        status: "archived",
      })
    ).status,
    200,
  );
  assert.equal(
    (await anonymous.request("/listings/" + result.data.id)).status,
    404,
  );
  const contact = await buyer.request("/contact", "POST", {
    name: "Buyer",
    email: prefix + "-buyer@example.test",
    message: "A local integration test question.",
  });
  assert.equal(contact.status, 201, JSON.stringify(contact.data));
  assert.ok(contact.data.reference.startsWith("MSG-"));
});
test("real password-recovery email resets password and invalidates the old credentials", async () => {
  const recovery = await other.request("/auth/forgot-password", "POST", {
    email: prefix + "-other@example.test",
  });
  assert.equal(recovery.status, 200);
  const callback = await confirmEmail(other, "other");
  assert.equal(callback.status, 303);
  assert.equal(
    callback.response.headers.get("location"),
    config.origin + "/reset-password",
  );
  const next = "New-independent-local-Password-456!";
  assert.equal(
    (await other.request("/auth/reset-password", "POST", { password: next }))
      .status,
    200,
  );
  assert.equal((await other.login("other")).status, 401);
  assert.equal((await other.login("other", next)).status, 200);
  assert.equal((await other.request("/auth/logout", "POST", {})).status, 200);
  assert.equal((await other.request("/me")).data.user, null);
});

test("email confirmation and recovery can finish in a fresh browser without the original PKCE cookie", async () => {
  const originalBrowser = new Browser();
  const signup = await originalBrowser.signup("cross-device");
  assert.equal(signup.status, 200);
  const confirmationLink = new URL(
    await emailLink(prefix + "-cross-device@example.test"),
  );
  const confirmationHash = confirmationLink.searchParams.get("token");
  assert.ok(
    confirmationHash,
    "The real local email includes its one-time verification hash",
  );
  const newBrowser = new Browser();
  const confirmed = await newBrowser.request(
    "/auth/confirm?type=signup&token_hash=" +
      encodeURIComponent(confirmationHash),
  );
  assert.equal(confirmed.status, 303);
  assert.equal(
    confirmed.response.headers.get("location"),
    config.origin + "/account",
  );
  assert.equal(
    (await newBrowser.request("/me")).data.user.email,
    prefix + "-cross-device@example.test",
  );
  assert.equal((await originalBrowser.request("/me")).data.user, null);
  const replay = await new Browser().request(
    "/auth/confirm?type=signup&token_hash=" +
      encodeURIComponent(confirmationHash),
  );
  assert.equal(
    replay.response.headers.get("location"),
    config.origin + "/login?error=confirmation",
  );

  await newBrowser.request("/auth/forgot-password", "POST", {
    email: prefix + "-cross-device@example.test",
  });
  const recoveryHash = new URL(
    await emailLink(prefix + "-cross-device@example.test"),
  ).searchParams.get("token");
  assert.ok(recoveryHash);
  const recoveryBrowser = new Browser();
  const recovery = await recoveryBrowser.request(
    "/auth/confirm?type=recovery&token_hash=" +
      encodeURIComponent(recoveryHash),
  );
  assert.equal(
    recovery.response.headers.get("location"),
    config.origin + "/reset-password",
  );
  const newPassword = "Fresh-browser-local-Password-789!";
  assert.equal(
    (
      await recoveryBrowser.request("/auth/reset-password", "POST", {
        password: newPassword,
      })
    ).status,
    200,
  );
  assert.equal((await new Browser().login("cross-device")).status, 401);
  assert.equal(
    (await new Browser().login("cross-device", newPassword)).status,
    200,
  );
});
