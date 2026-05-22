import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { trashByQuery } from "@/lib/gmail";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const gmailQuery: string = body.gmailQuery?.trim();
  if (!gmailQuery) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }

  const count = await trashByQuery(session.accessToken, gmailQuery);
  return NextResponse.json({ count });
}
