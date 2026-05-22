import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { getRecipes, saveRecipe } from "@/lib/recipes";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const recipes = await getRecipes(session.user.email);
  return NextResponse.json({ recipes });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { name, instruction, gmail_query, safety_level, description } = body;

  if (!name?.trim() || !gmail_query?.trim()) {
    return NextResponse.json(
      { error: "Name and query are required" },
      { status: 400 }
    );
  }

  const recipe = await saveRecipe(session.user.email, {
    name: name.trim(),
    instruction: instruction?.trim() ?? "",
    gmail_query: gmail_query.trim(),
    safety_level,
    description: description?.trim() ?? "",
  });

  return NextResponse.json({ recipe });
}
