import { useState } from "react";
import type { Detection, ReplayPackId } from "../lib/types.ts";
import { getBackend } from "../lib/backendInstance.ts";

const PACKS: { id: ReplayPackId; label: string; expected: 0 | 1 }[] = [
  { id: "human_slow_fill", label: "Human slow fill", expected: 0 },
  { id: "human_ai_essays", label: "Human + AI essays", expected: 0 },
  { id: "bot_burst", label: "Bot burst", expected: 1 },
  { id: "placeholder_bot", label: "Placeholder bot", expected: 1 },
];

type Props = {
  onReplayed: (detection: Detection) => void;
};

export default function ReplayToggle({ onReplayed }: Props) {
  const [running, setRunning] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  async function runPack(id: ReplayPackId, expected: 0 | 1) {
    setRunning(id);
    setLastResult(null);
    try {
      const det = await getBackend().replayPack(id);
      onReplayed(det);
      const ok = det.label === expected;
      setLastResult(
        `${id}: expected ${expected}, got ${det.label} — ${ok ? "match" : "MISMATCH"}`,
      );
    } catch (err) {
      setLastResult(err instanceof Error ? err.message : "Replay failed");
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 p-5">
      <h3 className="text-sm font-semibold text-white">Fixture replay</h3>
      <p className="mt-1 text-xs text-slate-400">
        Run labeled packs through the local scorer (no live form).
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {PACKS.map((pack) => (
          <button
            key={pack.id}
            type="button"
            disabled={running !== null}
            onClick={() => void runPack(pack.id, pack.expected)}
            className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-50"
          >
            {running === pack.id ? "Running…" : pack.label}
          </button>
        ))}
      </div>
      {lastResult ? (
        <p className="mt-3 font-mono text-xs text-emerald-300">{lastResult}</p>
      ) : null}
    </div>
  );
}
