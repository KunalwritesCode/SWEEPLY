"use client";

import { useState } from "react";
import type { Recipe } from "@/lib/recipes";

type SelectPayload = {
  instruction: string;
  gmailQuery: string;
  description: string;
  safetyLevel: "safe" | "moderate" | "risky";
};

type Props = {
  savedRecipes: Recipe[];
  onSelect: (recipe: SelectPayload) => void;
};

const DEFAULT_RECIPES: (Omit<Recipe, "id" | "user_email" | "created_at"> & {
  id: string;
})[] = [
  {
    id: "default-1",
    name: "Old promotions",
    instruction: "Delete all promotional emails older than 6 months",
    gmail_query: "category:promotions older_than:6m",
    safety_level: "safe",
    description: "Promotional emails older than 6 months",
  },
  {
    id: "default-2",
    name: "Unread newsletters",
    instruction: "Clean up newsletters I never open",
    gmail_query: "category:promotions is:unread older_than:30d",
    safety_level: "safe",
    description: "Unread promotional emails older than 30 days",
  },
  {
    id: "default-3",
    name: "Social notifications",
    instruction: "Remove old social notifications",
    gmail_query: "category:social older_than:3m",
    safety_level: "safe",
    description: "Social notifications older than 3 months",
  },
  {
    id: "default-4",
    name: "Old updates",
    instruction: "Delete update emails older than 1 year",
    gmail_query: "category:updates older_than:1y",
    safety_level: "safe",
    description: "Update emails older than 1 year",
  },
  {
    id: "default-5",
    name: "Large attachments",
    instruction: "Find old emails with large attachments",
    gmail_query: "has:attachment larger:5M older_than:1y",
    safety_level: "moderate",
    description: "Emails with attachments over 5MB older than 1 year",
  },
];

const SAFETY_DOT: Record<string, string> = {
  safe: "bg-green-400",
  moderate: "bg-yellow-400",
  risky: "bg-red-400",
};

export default function RecipesList({ savedRecipes, onSelect }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [localSaved, setLocalSaved] = useState<Recipe[]>(savedRecipes);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/recipes/${id}`, { method: "DELETE" });
      setLocalSaved((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Quick cleanups
        </p>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_RECIPES.map((r) => (
            <button
              key={r.id}
              onClick={() =>
                onSelect({
                  instruction: r.instruction,
                  gmailQuery: r.gmail_query,
                  description: r.description,
                  safetyLevel: r.safety_level as "safe" | "moderate" | "risky",
                })
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-sm text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-colors"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${SAFETY_DOT[r.safety_level]}`}
              />
              {r.name}
            </button>
          ))}
        </div>
      </div>

      {localSaved.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Your saved cleanups
          </p>
          <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {localSaved.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${SAFETY_DOT[r.safety_level]}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {r.instruction}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() =>
                      onSelect({
                        instruction: r.instruction,
                        gmailQuery: r.gmail_query,
                        description: r.description,
                        safetyLevel: r.safety_level as
                          | "safe"
                          | "moderate"
                          | "risky",
                      })
                    }
                    className="text-xs px-3 py-1.5 rounded-md bg-black text-white hover:opacity-80 transition-opacity"
                  >
                    Run
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    disabled={deletingId === r.id}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40 px-1"
                  >
                    {deletingId === r.id ? "…" : "✕"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
