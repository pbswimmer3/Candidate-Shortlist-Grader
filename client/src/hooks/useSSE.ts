import { useCallback, useRef, useState } from "react";
import type {
  ScoredCandidate,
  FailedCandidate,
  PipelineProgress,
  BatchStats,
} from "../types";

const MAX_RETRIES = 3;

function recOrder(rec: string): number {
  if (rec === "REACH OUT") return 0;
  if (rec === "MAYBE") return 1;
  return 2;
}

export function useSSE() {
  const [scored, setScored] = useState<ScoredCandidate[]>([]);
  const [failed, setFailed] = useState<FailedCandidate[]>([]);
  const [progress, setProgress] = useState<PipelineProgress>({
    stage: "idle",
    current: 0,
    total: 0,
  });
  const [stats, setStats] = useState<BatchStats>({
    total: 0,
    scored: 0,
    failed: 0,
  });
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Store raw profiles for retry lookups
  const rawProfilesRef = useRef<Record<string, unknown>[]>([]);

  const connectToStream = useCallback((streamId: string) => {
    const es = new EventSource(`/api/score/stream/${streamId}`);

    es.addEventListener("score_start", (e) => {
      const data = JSON.parse(e.data);
      setProgress({
        stage: "scoring",
        current: data.index,
        total: data.total,
        currentName: data.name,
      });
    });

    es.addEventListener("score_complete", (e) => {
      const data = JSON.parse(e.data);
      const candidate: ScoredCandidate = { ...data.result };
      setScored((prev) =>
        [...prev, candidate].sort((a, b) => recOrder(a.recommendation) - recOrder(b.recommendation))
      );
      setStats((prev) => ({ ...prev, scored: prev.scored + 1 }));
    });

    es.addEventListener("score_fail", (e) => {
      const data = JSON.parse(e.data);
      // Look up raw profile from our stored ref (index is 1-based)
      const rawProfile = rawProfilesRef.current[data.index - 1] || {};
      setFailed((prev) => [
        ...prev,
        {
          name: data.name || "Unknown",
          linkedinUrl: data.linkedinUrl || "",
          rawProfile,
          error: data.error,
          retryCount: 0,
        },
      ]);
      setStats((prev) => ({ ...prev, failed: prev.failed + 1 }));
    });

    es.addEventListener("sheet_written", (e) => {
      const data = JSON.parse(e.data);
      setProgress((prev) => ({
        ...prev,
        stage: "writing",
        current: data.index,
      }));
    });

    es.addEventListener("batch_complete", (e) => {
      const data = JSON.parse(e.data);
      if (data.sheetUrl) setSheetUrl(data.sheetUrl);
      setProgress({ stage: "complete", current: data.total, total: data.total });
      setIsRunning(false);
      es.close();
    });

    es.onerror = () => {
      es.close();
      setIsRunning(false);
    };
  }, []);

  const startPipeline = useCallback(
    async (profiles: Record<string, unknown>[], jobDescription: string, rubric: string) => {
      // Reset state
      rawProfilesRef.current = profiles;
      setScored([]);
      setFailed([]);
      setProgress({ stage: "scoring", current: 0, total: profiles.length });
      setStats({ total: profiles.length, scored: 0, failed: 0 });
      setSheetUrl(null);
      setIsRunning(true);

      try {
        const res = await fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profiles, jobDescription, rubric }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to start pipeline");
        }

        const { streamId } = await res.json();
        connectToStream(streamId);
      } catch (err) {
        console.error("Pipeline start error:", err);
        setIsRunning(false);
        setProgress({ stage: "idle", current: 0, total: 0 });
      }
    },
    [connectToStream]
  );

  const retryCandidate = useCallback(
    async (failedEntry: FailedCandidate, jobDescription: string, rubric: string) => {
      if (failedEntry.retryCount >= MAX_RETRIES) return;

      // Update retry count
      setFailed((prev) =>
        prev.map((f) =>
          f === failedEntry ? { ...f, retryCount: f.retryCount + 1 } : f
        )
      );

      setIsRunning(true);

      try {
        const res = await fetch("/api/score/retry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profiles: [failedEntry.rawProfile],
            jobDescription,
            rubric,
          }),
        });

        if (!res.ok) throw new Error("Retry request failed");

        const { streamId } = await res.json();
        const es = new EventSource(`/api/score/stream/${streamId}`);

        es.addEventListener("score_complete", (e) => {
          const data = JSON.parse(e.data);
          const candidate: ScoredCandidate = { ...data.result };
          setFailed((prev) => prev.filter((f) => f !== failedEntry));
          setScored((prev) =>
            [...prev, candidate].sort((a, b) => recOrder(a.recommendation) - recOrder(b.recommendation))
          );
          setStats((prev) => ({
            ...prev,
            scored: prev.scored + 1,
            failed: prev.failed - 1,
          }));
        });

        es.addEventListener("score_fail", (e) => {
          const data = JSON.parse(e.data);
          setFailed((prev) =>
            prev.map((f) =>
              f === failedEntry ? { ...f, error: data.error } : f
            )
          );
        });

        es.addEventListener("batch_complete", () => {
          es.close();
          setIsRunning(false);
        });

        es.onerror = () => {
          es.close();
          setIsRunning(false);
        };
      } catch {
        setIsRunning(false);
      }
    },
    []
  );

  const retryAllFailed = useCallback(
    async (jobDescription: string, rubric: string) => {
      const retryable = failed.filter((f) => f.retryCount < MAX_RETRIES);
      if (retryable.length === 0) return;

      // Update retry counts
      setFailed((prev) =>
        prev.map((f) =>
          f.retryCount < MAX_RETRIES ? { ...f, retryCount: f.retryCount + 1 } : f
        )
      );

      setIsRunning(true);

      try {
        const res = await fetch("/api/score/retry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profiles: retryable.map((f) => f.rawProfile),
            jobDescription,
            rubric,
          }),
        });

        if (!res.ok) throw new Error("Retry request failed");

        const { streamId } = await res.json();
        const es = new EventSource(`/api/score/stream/${streamId}`);

        es.addEventListener("score_complete", (e) => {
          const data = JSON.parse(e.data);
          const candidate: ScoredCandidate = { ...data.result };
          // Remove from failed by name match
          setFailed((prev) => prev.filter((f) => f.name !== candidate.name));
          setScored((prev) =>
            [...prev, candidate].sort((a, b) => recOrder(a.recommendation) - recOrder(b.recommendation))
          );
          setStats((prev) => ({
            ...prev,
            scored: prev.scored + 1,
            failed: prev.failed - 1,
          }));
        });

        es.addEventListener("score_fail", (e) => {
          const data = JSON.parse(e.data);
          setFailed((prev) =>
            prev.map((f) =>
              f.name === data.name ? { ...f, error: data.error } : f
            )
          );
        });

        es.addEventListener("batch_complete", () => {
          es.close();
          setIsRunning(false);
        });

        es.onerror = () => {
          es.close();
          setIsRunning(false);
        };
      } catch {
        setIsRunning(false);
      }
    },
    [failed]
  );

  return {
    scored,
    failed,
    progress,
    stats,
    sheetUrl,
    isRunning,
    startPipeline,
    retryCandidate,
    retryAllFailed,
  };
}
