import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { previewMessages } from "@/lib/gmail";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `You are a Gmail cleanup assistant. Convert the user's natural language cleanup request into a Gmail search query and a safety assessment.

Gmail operators you can use:
  older_than:1y  older_than:6m  older_than:30d  older_than:7d
  newer_than:1y  newer_than:6m  newer_than:30d  newer_than:7d
  category:promotions  category:social  category:updates  category:forums
  is:unread  is:read
  from:email@domain.com  from:@domain.com
  subject:keyword
  has:attachment
  label:INBOX
  OR  (combine conditions)

Rules for building the query:
- "latest", "recent", "newest" → use newer_than:30d or newer_than:7d. Do NOT add older_than.
- "old", "older than", "haven't seen in" → use older_than with the stated time
- Specific sender like "LinkedIn", "Amazon", "Twitter" → use from:@linkedin.com from:@amazon.com etc
- "newsletters I never open" → category:promotions is:unread
- "promotional emails" → category:promotions
- "social notifications" → category:social
- "never", "never opened", "unread" → add is:unread
- Compound requests like "LinkedIn AND Twitter" → from:@linkedin.com OR from:@twitter.com
- When no time is specified for bulk/promo cleanup → default to older_than:6m to be safe
- When the user says "latest" or "recent" → never add older_than, use newer_than instead

Safety levels:
  safe     — clearly bulk content (promotions, newsletters, social notifications). Very low risk.
  moderate — sender-specific or unread-based queries. Could include something useful. Review recommended.
  risky    — broad queries with no sender or category filter, or anything touching personal/work patterns.

Never generate a query that matches everything (e.g. bare label:INBOX with nothing else).`;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    gmailQuery: {
      type: Type.STRING,
      description: "Gmail search operators string",
    },
    description: {
      type: Type.STRING,
      description: "Human-readable description of what will be found",
    },
    safetyLevel: {
      type: Type.STRING,
      enum: ["safe", "moderate", "risky"],
    },
    explanation: {
      type: Type.STRING,
      description:
        "One sentence explaining what will be cleaned and why it has that safety level",
    },
  },
  required: ["gmailQuery", "description", "safetyLevel", "explanation"],
  propertyOrdering: ["gmailQuery", "description", "safetyLevel", "explanation"],
};

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
  const instruction: string = body.instruction?.trim();
  if (!instruction) {
    return NextResponse.json({ error: "Instruction required" }, { status: 400 });
  }

  let plan: {
    gmailQuery: string;
    description: string;
    safetyLevel: "safe" | "moderate" | "risky";
    explanation: string;
  };

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: instruction,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.1,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    const rawText = result.text;
    if (!rawText) throw new Error("Empty response from AI");

    plan = JSON.parse(rawText);

    const dangerousPatterns = [
      /^label:INBOX$/,
      /^is:read$/,
      /^is:unread$/,
      /^in:inbox$/,
    ];
    if (dangerousPatterns.some((p) => p.test(plan.gmailQuery.trim()))) {
      return NextResponse.json(
        {
          error:
            "That instruction is too broad to run safely. Try adding a sender, category, or time range.",
        },
        { status: 400 }
      );
    }
  } catch (e) {
    console.error("Gemini error:", e);
    const msg = e instanceof Error ? e.message : String(e);

    if (msg.includes("429") || msg.toLowerCase().includes("quota")) {
      return NextResponse.json(
        { error: "Rate limit hit — wait a moment and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Couldn't understand that instruction. Try rephrasing it." },
      { status: 500 }
    );
  }

  const { totalEstimate, messages } = await previewMessages(
    session.accessToken,
    plan.gmailQuery
  );

  const senderGroups = groupBySender(messages);

  return NextResponse.json({
    plan,
    preview: { totalEstimate, senderGroups },
  });
}
