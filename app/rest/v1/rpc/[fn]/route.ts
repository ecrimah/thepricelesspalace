import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase-compat";
import { isPlainPostgres } from "@/lib/db/mode";
import { authorizeRpc, resolveRestActor } from "@/lib/db/rest-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PG_IDENT = /^[a-z_][a-z0-9_]*$/i;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ fn: string }> }
) {
  if (!isPlainPostgres()) {
    return NextResponse.json({ message: "DATABASE_URL not set" }, { status: 503, headers: cors });
  }
  const { fn } = await ctx.params;
  if (!PG_IDENT.test(fn)) {
    return NextResponse.json({ message: "Invalid function name" }, { status: 400, headers: cors });
  }

  const actor = await resolveRestActor(req);
  const authz = authorizeRpc(actor, fn);
  if (!authz.ok) {
    return NextResponse.json(
      { message: authz.message, code: "PGRST301" },
      { status: authz.status, headers: cors }
    );
  }

  // Dangerous payment RPCs must never be callable from the browser REST shim
  if (fn === "mark_order_paid" && !(actor.kind === "user" && (actor.role === "admin" || actor.role === "staff"))) {
    return NextResponse.json(
      { message: "RPC not allowed", code: "PGRST301" },
      { status: 403, headers: cors }
    );
  }

  const args = (await req.json().catch(() => ({}))) as Record<string, any>;
  const client = createClient();
  const { data, error } = await client.rpc(fn, args);
  if (error) {
    return NextResponse.json(
      { message: error.message, code: "PGRST202" },
      { status: 400, headers: cors }
    );
  }
  return NextResponse.json(data, { headers: cors });
}
