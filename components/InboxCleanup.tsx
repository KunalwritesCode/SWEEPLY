"use client";

import { useState } from "react";
import CleanupForm from "./CleanupForm";
import RecipesList from "./RecipesList";
import type { Recipe } from "@/lib/recipes";

type Props = {
  savedRecipes: Recipe[];
};

export default function InboxCleanup({ savedRecipes }: Props) {
  const [instruction, setInstruction] = useState("");
  const [directRun, setDirectRun] = useState<{
    gmailQuery: string;
    description: string;
    safetyLevel: "safe" | "moderate" | "risky";
    explanation: string;
  } | null>(null);

  function handleRecipeSelect(recipe: {
    instruction: string;
    gmailQuery: string;
    description: string;
    safetyLevel: "safe" | "moderate" | "risky";
  }) {
    setInstruction(recipe.instruction);
    setDirectRun({
      gmailQuery: recipe.gmailQuery,
      description: recipe.description,
      safetyLevel: recipe.safetyLevel,
      explanation: `Saved cleanup — ${recipe.description}`,
    });
  }

  function handleInstructionChange(value: string) {
    setInstruction(value);
    setDirectRun(null); // clear direct run if user edits the textarea
  }

  return (
    <div className="space-y-8">
      <RecipesList
        savedRecipes={savedRecipes}
        onSelect={handleRecipeSelect}
      />
      <CleanupForm
        instruction={instruction}
        onInstructionChange={handleInstructionChange}
        directRun={directRun}
        onDirectRunConsumed={() => setDirectRun(null)}
      />
    </div>
  );
}
