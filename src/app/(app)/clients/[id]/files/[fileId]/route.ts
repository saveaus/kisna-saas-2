import { NextResponse, type NextRequest } from "next/server";
import { getClientFileLink } from "@/lib/data/client-records.server";

/**
 * Opens a client's file. Checks access, then sends the browser on to a link
 * that works for a minute, so no lasting link ever reaches the page.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/clients/[id]/files/[fileId]">) {
  const { id, fileId } = await ctx.params;
  const clientId = Number(id);
  const file = Number(fileId);
  const notFound = () => new NextResponse("File not found", { status: 404 });
  if (!Number.isSafeInteger(clientId) || !Number.isSafeInteger(file)) return notFound();

  const link = await getClientFileLink(clientId, file);
  if (!link) return notFound();

  return NextResponse.redirect(link, { status: 303, headers: { "Cache-Control": "no-store" } });
}
