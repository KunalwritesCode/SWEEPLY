import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { deleteRecipe } from "@/lib/recipes";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  await deleteRecipe(id, session.user.email);
  return NextResponse.json({ success: true });
}
