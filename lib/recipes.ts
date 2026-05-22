import sql from "./db";

export type Recipe = {
  id: string;
  user_email: string;
  name: string;
  instruction: string;
  gmail_query: string;
  safety_level: "safe" | "moderate" | "risky";
  description: string;
  created_at: string;
};

export async function getRecipes(userEmail: string): Promise<Recipe[]> {
  const rows = await sql`
    SELECT * FROM recipes
    WHERE user_email = ${userEmail}
    ORDER BY created_at DESC
    LIMIT 20
  `;
  return rows as Recipe[];
}

export async function saveRecipe(
  userEmail: string,
  recipe: Omit<Recipe, "id" | "user_email" | "created_at">
): Promise<Recipe> {
  const rows = await sql`
    INSERT INTO recipes (user_email, name, instruction, gmail_query, safety_level, description)
    VALUES (
      ${userEmail},
      ${recipe.name},
      ${recipe.instruction},
      ${recipe.gmail_query},
      ${recipe.safety_level},
      ${recipe.description}
    )
    RETURNING *
  `;
  return rows[0] as Recipe;
}

export async function deleteRecipe(
  id: string,
  userEmail: string
): Promise<void> {
  await sql`
    DELETE FROM recipes
    WHERE id = ${id} AND user_email = ${userEmail}
  `;
}
