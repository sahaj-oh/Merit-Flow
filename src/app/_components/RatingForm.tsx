"use client";

import { useState, useTransition } from "react";
import { RATING_LABELS, RATING_MAX, RATING_MIN, WEIGHTS } from "@/lib/review";

const ratingOptions = Array.from(
  { length: RATING_MAX - RATING_MIN + 1 },
  (_, i) => RATING_MIN + i
);

type Mode = "manager" | "founder";

type Props = {
  mode: Mode;
  employeeId: string;
  action: (formData: FormData) => Promise<void>;
  managerKra?: number | null;
  managerBehavioral?: number | null;
  managerOverall?: number | null;
};

export function RatingForm({
  mode,
  employeeId,
  action,
  managerKra = null,
  managerBehavioral = null,
  managerOverall = null
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [kra, setKra] = useState<string>("");
  const [beh, setBeh] = useState<string>("");
  const [ovr, setOvr] = useState<string>("");

  const isManagerMode = mode === "manager";

  const effKra = isManagerMode ? toNum(kra) : toNum(kra) ?? managerKra;
  const effBeh = isManagerMode ? toNum(beh) : toNum(beh) ?? managerBehavioral;
  const effOvr = isManagerMode ? toNum(ovr) : toNum(ovr) ?? managerOverall;

  const final =
    effKra != null && effBeh != null && effOvr != null
      ? Math.round((WEIGHTS.kra * effKra + WEIGHTS.behavioral * effBeh + WEIGHTS.overall * effOvr) * 10) / 10
      : null;

  const overridden = {
    kra: !isManagerMode && toNum(kra) != null && toNum(kra) !== managerKra,
    beh: !isManagerMode && toNum(beh) != null && toNum(beh) !== managerBehavioral,
    ovr: !isManagerMode && toNum(ovr) != null && toNum(ovr) !== managerOverall
  };

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await action(formData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Submission failed");
      }
    });
  }

  const commentsName = isManagerMode ? "manager_comments" : "founder_comments";

  return (
    <form action={handleSubmit} className="mt-3 space-y-4">
      <input type="hidden" name="employee_id" value={employeeId} />

      <Select
        name={isManagerMode ? "kra_rating" : "founder_kra_rating"}
        label={
          isManagerMode
            ? "KRA / Goal Performance (50%)"
            : `KRA — manager said ${managerKra ?? "—"}`
        }
        required={isManagerMode}
        value={kra}
        onChange={setKra}
        showOverridden={overridden.kra}
      />
      <Select
        name={isManagerMode ? "behavioral_rating" : "founder_behavioral_rating"}
        label={
          isManagerMode
            ? "Behavioral (30%)"
            : `Behavioral — manager said ${managerBehavioral ?? "—"}`
        }
        required={isManagerMode}
        value={beh}
        onChange={setBeh}
        showOverridden={overridden.beh}
      />
      <Select
        name={isManagerMode ? "manager_overall_rating" : "founder_overall_rating"}
        label={
          isManagerMode
            ? "Manager Overall (20%)"
            : `Overall — manager said ${managerOverall ?? "—"}`
        }
        required={isManagerMode}
        value={ovr}
        onChange={setOvr}
        showOverridden={overridden.ovr}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700">Comments</label>
        <textarea
          name={commentsName}
          rows={isManagerMode ? 4 : 3}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Live final rating
          </span>
          <span className="text-2xl font-semibold tabular-nums">
            {final ?? "—"}
            {final != null && (
              <span className="ml-2 text-xs font-normal text-gray-500">
                {labelFor(final)}
              </span>
            )}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-gray-500">
          0.5 × KRA + 0.3 × Behavioral + 0.2 × Overall
          {!isManagerMode && " · blank fields keep the manager value"}
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
      >
        {isPending
          ? "Saving…"
          : isManagerMode
            ? "Submit rating"
            : "Save founder review"}
      </button>
    </form>
  );
}

function Select({
  name,
  label,
  required,
  value,
  onChange,
  showOverridden
}: {
  name: string;
  label: string;
  required: boolean;
  value: string;
  onChange: (v: string) => void;
  showOverridden: boolean;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <span>{label}</span>
        {showOverridden && (
          <span className="inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium uppercase text-purple-800">
            Will override
          </span>
        )}
      </label>
      <select
        name={name}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
      >
        <option value="">{required ? "Select rating…" : "No change"}</option>
        {ratingOptions.map((n) => (
          <option key={n} value={n}>
            {n} — {RATING_LABELS[n]}
          </option>
        ))}
      </select>
    </div>
  );
}

function toNum(v: string): number | null {
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function labelFor(final: number): string {
  const rounded = Math.round(final);
  return RATING_LABELS[rounded] ?? "";
}
