/**
 * Access control for the PostgREST-compat shim (/rest/v1).
 * Replaces removed Postgres RLS with application allowlists.
 */

import { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/db/auth";
import { query } from "@/lib/db/pool";

export type RestActor =
  | { kind: "anon" }
  | { kind: "user"; userId: string; role: string; email?: string };

/** Catalog + public CMS — readable without a session */
const PUBLIC_READ = new Set([
  "products",
  "categories",
  "product_images",
  "product_variants",
  "store_settings",
  "store_modules",
  "reviews",
  "banners",
  "blog_posts",
  "faqs",
]);

/** Anonymous may INSERT only these (forms) */
const ANON_INSERT = new Set(["contact_submissions", "support_feedback"]);

/** Authenticated customers may INSERT these */
const USER_INSERT = new Set([
  "reviews",
  "wishlist_items",
  "cart_items",
  "return_requests",
  "support_tickets",
  "support_ticket_messages",
]);

/** Authenticated customers may UPDATE these (own-row filters expected client-side; admin uses staff role) */
const USER_UPDATE = new Set(["profiles", "wishlist_items", "cart_items"]);

/** Never allow through REST for non-admin (force /api/*) */
const MUTATION_BLOCKED_FOR_NON_ADMIN = new Set([
  "orders",
  "order_items",
  "store_settings",
  "coupons",
  "customers",
  "riders",
  "delivery_assignments",
  "delivery_zones",
  "delivery_status_history",
  "staff_roles",
  "auth",
  "payment_attempts",
  "payment_webhook_events",
  "sms_messages",
  "audit_logs",
]);

/** Sensitive tables — no REST read for non-admin (use /api/*) */
const READ_BLOCKED_FOR_NON_ADMIN = new Set([
  "payment_attempts",
  "payment_webhook_events",
  "sms_messages",
  "audit_logs",
  "auth",
]);

/** RPC callable without auth */
const PUBLIC_RPC = new Set(["get_order_for_tracking"]);

/** RPC callable by any authenticated user */
const USER_RPC = new Set([
  "get_order_for_tracking",
  "upsert_customer_from_order",
]);

function isAdminRole(role: string | undefined): boolean {
  return role === "admin" || role === "staff";
}

function bearerToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (!token) return null;
    // Anon / placeholder keys are not JWTs
    if (token === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
    if (token === "x" || token.length < 20) return null;
    // JWTs have three segments
    if (token.split(".").length !== 3) return null;
    return token;
  }
  return null;
}

export async function resolveRestActor(req: NextRequest): Promise<RestActor> {
  const token = bearerToken(req);
  if (!token) return { kind: "anon" };

  const verified = await verifyAccessToken(token);
  if (!verified?.userId) return { kind: "anon" };

  let role = "user";
  try {
    const { rows } = await query<{ role: string }>(
      `SELECT role FROM profiles WHERE id = $1 LIMIT 1`,
      [verified.userId]
    );
    if (rows[0]?.role) role = String(rows[0].role);
  } catch {
    /* keep default */
  }

  return {
    kind: "user",
    userId: verified.userId,
    role,
  };
}

export function authorizeTableAccess(
  actor: RestActor,
  table: string,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
): { ok: true } | { ok: false; status: number; message: string } {
  if (actor.kind === "user" && isAdminRole(actor.role)) {
    return { ok: true };
  }

  if (method === "GET") {
    if (READ_BLOCKED_FOR_NON_ADMIN.has(table)) {
      return {
        ok: false,
        status: 403,
        message: `Reads from '${table}' must go through authenticated API routes`,
      };
    }
    if (PUBLIC_READ.has(table)) return { ok: true };
    if (actor.kind === "user") return { ok: true };
    return { ok: false, status: 401, message: "Authentication required" };
  }

  // Mutations
  if (MUTATION_BLOCKED_FOR_NON_ADMIN.has(table)) {
    return {
      ok: false,
      status: 403,
      message: `Writes to '${table}' must go through authenticated API routes`,
    };
  }

  if (method === "POST") {
    if (ANON_INSERT.has(table)) return { ok: true };
    if (actor.kind === "user" && USER_INSERT.has(table)) return { ok: true };
    if (actor.kind === "anon") {
      return { ok: false, status: 401, message: "Authentication required" };
    }
    return { ok: false, status: 403, message: "Insert not allowed for this role" };
  }

  if (method === "PATCH" || method === "PUT") {
    if (actor.kind === "user" && USER_UPDATE.has(table)) return { ok: true };
    if (actor.kind === "anon") {
      return { ok: false, status: 401, message: "Authentication required" };
    }
    return { ok: false, status: 403, message: "Update not allowed for this role" };
  }

  if (method === "DELETE") {
    if (actor.kind === "user" && (table === "wishlist_items" || table === "cart_items")) {
      return { ok: true };
    }
    return { ok: false, status: 403, message: "Delete not allowed for this role" };
  }

  return { ok: false, status: 403, message: "Forbidden" };
}

export function authorizeRpc(
  actor: RestActor,
  fn: string
): { ok: true } | { ok: false; status: number; message: string } {
  if (actor.kind === "user" && isAdminRole(actor.role)) return { ok: true };
  if (PUBLIC_RPC.has(fn)) return { ok: true };
  if (actor.kind === "user" && USER_RPC.has(fn)) return { ok: true };
  if (actor.kind === "anon") {
    return { ok: false, status: 401, message: "Authentication required" };
  }
  return { ok: false, status: 403, message: `RPC '${fn}' is not allowed for this role` };
}
