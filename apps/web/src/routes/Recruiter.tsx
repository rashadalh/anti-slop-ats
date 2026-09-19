import { useCallback, useEffect, useMemo, useState } from "react";
import DetectionRow from "../components/DetectionRow.tsx";
import ReplayToggle from "../components/ReplayToggle.tsx";
import { getBackend } from "../lib/backendInstance.ts";
import type { Detection } from "../lib/types.ts";

export default function Recruiter() {
  const [detections, setDetections] = useState<Detection[]>(() =>
    getBackend().listDetections(),
  );

  const jobTitles = useMemo(() => {
    const map = new Map<string, string>();
    for (const j of getBackend().listJobs()) map.set(j.id, j.title);
    return map;
  }, []);

  const refresh = useCallback(() => {
    setDetections(getBackend().listDetections());
  }, []);

  useEffect(() => {
    const unsub = getBackend().subscribeDetections((d) => {
      setDetections((prev) => {
        const idx = prev.findIndex((x) => x.id === d.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = d;
          return next.sort((a, b) => b.created_at_ms - a.created_at_ms);
        }
        return [d, ...prev].sort((a, b) => b.created_at_ms - a.created_at_ms);
      });
    });
    return unsub;
  }, []);

  async function handleOverride(id: string, label: 0 | 1) {
    await getBackend().overrideLabel(id, label);
    refresh();
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-white">Recruiter review</h2>
        <p className="mt-2 text-sm text-slate-400">
          Live detections with probability, confidence, and feature reasoning.
          Overrides change the displayed label only—not the model probability.
        </p>
      </div>

      <ReplayToggle onReplayed={refresh} />

      {detections.length === 0 ? (
        <p className="text-slate-400">
          No detections yet. Submit an application or run a replay pack.
        </p>
      ) : (
        <ul className="space-y-4">
          {detections.map((d) => (
            <li key={d.id}>
              <DetectionRow
                detection={d}
                jobTitle={jobTitles.get(d.job_id)}
                onOverride={(id, label) => void handleOverride(id, label)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
