"use client";

import { useState, useEffect } from "react";
import SpotlightButton from "./SpotlightButton";

type SenderGroup = {
  sender: string;
  domain: string;
  count: number;
  latestSubject: string;
  latestDate: string;
};

type Plan = {
  gmailQuery: string;
  description: string;
  safetyLevel: "safe" | "moderate" | "risky";
  explanation: string;
};

type AnalyzeResult = {
  plan: Plan;
  preview: {
    totalEstimate: number;
    senderGroups: SenderGroup[];
  };
};

type Status =
  | "idle"
  | "analyzing"
  | "previewing"
  | "trashing"
  | "done"
  | "error";

type Props = {
  instruction: string;
  onInstructionChange: (value: string) => void;
  directRun: Plan | null;
  onDirectRunConsumed: () => void;
};

const SAFETY_STYLES = {
  safe: "bg-green-100 text-green-800 border-green-200",
  moderate: "bg-yellow-100 text-yellow-800 border-yellow-200",
  risky: "bg-red-100 text-red-800 border-red-200",
};

const SAFETY_LABELS = {
  safe: "Safe to run",
  moderate: "Review carefully",
  risky: "High risk — review closely",
};

export default function CleanupForm({
  instruction,
  onInstructionChange,
  directRun,
  onDirectRunConsumed,
}: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [trashedCount, setTrashedCount] = useState(0);
  const [error, setError] = useState("");

  const [showSaveForm, setShowSaveForm] = useState(false);
  const [recipeName, setRecipeName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!directRun) return;
    onDirectRunConsumed();
    setStatus("analyzing");
    setError("");
    setResult(null);
    setExcluded(new Set());
    setShowSaveForm(false);
    setSaved(false);

    fetch("/api/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gmailQuery: directRun.gmailQuery }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res
            .json()
            .catch(() => ({ error: "Something went wrong" }));
          throw new Error(data.error || "Something went wrong");
        }
        return res.json();
      })
      .then((data) => {
        setResult({ plan: directRun, preview: data });
        setStatus("previewing");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Something went wrong");
        setStatus("error");
      });
  }, [directRun]);

  async function analyze() {
    if (!instruction.trim()) return;
    setStatus("analyzing");
    setError("");
    setResult(null);
    setExcluded(new Set());
    setShowSaveForm(false);
    setSaved(false);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction }),
      });
      if (!res.ok) {
        const data = await res
          .json()
          .catch(() => ({ error: "Something went wrong" }));
        throw new Error(data.error || "Something went wrong");
      }
      const data: AnalyzeResult = await res.json();
      setResult(data);
      setStatus("previewing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStatus("error");
    }
  }

  async function confirmTrash() {
    if (!result) return;
    setStatus("trashing");

    let finalQuery = result.plan.gmailQuery;
    if (excluded.size > 0) {
      const exclusions = Array.from(excluded)
        .map((d) => `-from:@${d}`)
        .join(" ");
      finalQuery = `(${finalQuery}) ${exclusions}`;
    }

    try {
      const res = await fetch("/api/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gmailQuery: finalQuery }),
      });
      if (!res.ok) {
        const data = await res
          .json()
          .catch(() => ({ error: "Something went wrong" }));
        throw new Error(data.error || "Something went wrong");
      }
      const data = await res.json();
      setTrashedCount(data.count);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStatus("error");
    }
  }

  async function handleSaveRecipe() {
    if (!result || !recipeName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: recipeName.trim(),
          instruction,
          gmail_query: result.plan.gmailQuery,
          safety_level: result.plan.safetyLevel,
          description: result.plan.description,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      setShowSaveForm(false);
      setRecipeName("");
      window.location.reload();
    } catch {
      alert("Failed to save recipe. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setStatus("idle");
    setResult(null);
    onInstructionChange("");
    setError("");
    setTrashedCount(0);
    setExcluded(new Set());
    setShowSaveForm(false);
    setSaved(false);
    setRecipeName("");
  }

  function toggleDomain(domain: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      next.has(domain) ? next.delete(domain) : next.add(domain);
      return next;
    });
  }

  if (status === "done") {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">✓</div>
        <h2 className="text-2xl font-semibold mb-2">
          {trashedCount.toLocaleString()} emails moved to trash
        </h2>
        <p className="text-gray-500 text-sm mb-1">
          Gmail keeps trashed emails for 30 days — restore anything from your
          Trash folder.
        </p>
        <p className="text-gray-400 text-xs mb-8">
          Nothing was permanently deleted.
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-black text-white px-5 py-2.5 text-sm hover:opacity-90"
        >
          Clean something else
        </button>
      </div>
    );
  }

  const activeCount = result
    ? result.preview.senderGroups.filter((g) => !excluded.has(g.domain)).length
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          What do you want to clean up?
        </label>
        <textarea
          value={instruction}
          onChange={(e) => onInstructionChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) analyze();
          }}
          placeholder={`Try:\n"Delete all promotional emails older than 1 year"\n"Clean newsletters I never open"\n"Remove old social notifications"`}
          rows={4}
          disabled={status === "analyzing" || status === "trashing"}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50 resize-none font-mono"
        />
        <div className="mt-2 flex items-center gap-3">
          <SpotlightButton
            onClick={analyze}
            disabled={
              !instruction.trim() ||
              status === "analyzing" ||
              status === "trashing"
            }
            className="rounded-lg bg-black text-white px-5 py-2.5 text-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {status === "analyzing" ? "Analyzing…" : "Analyze"}
          </SpotlightButton>
          <span className="text-xs text-gray-400">⌘ + Enter</span>
        </div>
      </div>

      {status === "error" && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
          <button
            onClick={() => setStatus("idle")}
            className="ml-3 underline text-red-600"
          >
            Try again
          </button>
        </div>
      )}

      {status === "previewing" && result && (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{result.plan.description}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {result.plan.explanation}
                </p>
                <p className="text-xs text-gray-400 mt-1.5 font-mono truncate">
                  {result.plan.gmailQuery}
                </p>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full border font-medium whitespace-nowrap shrink-0 ${
                  SAFETY_STYLES[result.plan.safetyLevel]
                }`}
              >
                {SAFETY_LABELS[result.plan.safetyLevel]}
              </span>
            </div>

            {!saved && (
              <div className="mt-3">
                {showSaveForm ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={recipeName}
                      onChange={(e) => setRecipeName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveRecipe();
                        if (e.key === "Escape") setShowSaveForm(false);
                      }}
                      placeholder="Name this recipe…"
                      autoFocus
                      className="flex-1 text-xs border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-black"
                    />
                    <button
                      onClick={handleSaveRecipe}
                      disabled={!recipeName.trim() || saving}
                      className="text-xs px-3 py-1.5 bg-black text-white rounded-md disabled:opacity-40 hover:opacity-80"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() => setShowSaveForm(false)}
                      className="text-xs text-gray-400 hover:text-gray-600 px-1"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSaveForm(true)}
                    className="text-xs text-gray-500 hover:text-black transition-colors underline underline-offset-2"
                  >
                    + Save this cleanup for later
                  </button>
                )}
              </div>
            )}
            {saved && (
              <p className="text-xs text-green-600 mt-3">✓ Saved to your recipes</p>
            )}
          </div>

          <div className="bg-white">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                ~{result.preview.totalEstimate.toLocaleString()} total · preview
                of top senders
              </span>
              <span className="text-xs text-gray-400">
                Uncheck senders to exclude
              </span>
            </div>

            {result.preview.senderGroups.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-500">
                No emails found matching this query. Try a different instruction.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {result.preview.senderGroups.map((g) => {
                  const isExcluded = excluded.has(g.domain);
                  return (
                    <li
                      key={g.domain}
                      className={`px-4 py-3 flex items-center gap-3 transition-colors ${
                        isExcluded ? "opacity-40" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!isExcluded}
                        onChange={() => toggleDomain(g.domain)}
                        className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {g.sender}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {g.latestSubject}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold tabular-nums">
                          {g.count}
                        </div>
                        <div className="text-xs text-gray-400">
                          {g.latestDate}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {result.preview.senderGroups.length > 0 && (
            <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between gap-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                Emails move to <strong>Trash</strong> — not permanently deleted.
                Restore anything within 30 days.
              </p>
              <div className="flex items-center gap-3 shrink-0">
                {excluded.size > 0 && (
                  <span className="text-xs text-gray-400">
                    {excluded.size} sender{excluded.size !== 1 ? "s" : ""}{" "}
                    excluded
                  </span>
                )}
                <button
                  onClick={confirmTrash}
                  disabled={activeCount === 0}
                  className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-40 transition-colors"
                >
                  Move to Trash
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {status === "trashing" && (
        <div className="text-center py-8 text-sm text-gray-500">
          Moving emails to trash… this may take a moment for large batches.
        </div>
      )}
    </div>
  );
}
