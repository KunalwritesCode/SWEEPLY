import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { previewMessages } from "@/lib/gmail";

function groupBySender(
  messages: { from: string; subject: string; date: string }[]
) {
  const map = new Map<
    string,
    {
      sender: string;
      domain: string;
      count: number;
      latestSubject: string;
      latestDate: string;
    }
  >();

  for (const msg of messages) {
    const emailMatch =
      msg.from.match(/<([^>]+)>/) ?? msg.from.match(/(\S+@\S+)/);
    const email = emailMatch?.[1]?.trim() ?? msg.from;
    const domain = email.split("@")[1]?.toLowerCase() ?? "unknown";
    const nameMatch = msg.from.match(/^"?([^"<]+)"?\s*</);
    const displayName = nameMatch?.[1]?.trim() ?? email;

    if (!map.has(domain)) {
      map.set(domain, {
        sender: displayName,
        domain,
        count: 0,
        latestSubject: msg.subject || "(no subject)",
        latestDate: msg.date
          ? new Date(msg.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "",
      });
    }
    map.get(domain)!.count++;
  }

  return Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

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

  const { totalEstimate, messages } = await previewMessages(
    session.accessToken,
    gmailQuery
  );

  const senderGroups = groupBySender(messages);
  return NextResponse.json({ totalEstimate, senderGroups });
}
