import type { PipelineProgress } from "../types";

interface ProgressBarProps {
  progress: PipelineProgress;
}

const stageLabels: Record<string, string> = {
  idle: "Ready",
  scoring: "Scoring candidates",
  writing: "Writing to sheet",
  complete: "Complete!",
};

export default function ProgressBar({ progress }: ProgressBarProps) {
  if (progress.stage === "idle") return null;

  const pct =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  const isComplete = progress.stage === "complete";

  return (
    <div className="progress-container">
      <div className="progress-label">
        <span className="stage-text">
          {stageLabels[progress.stage] || progress.stage}
          {progress.currentName && progress.stage === "scoring"
            ? ` — ${progress.currentName}`
            : ""}
        </span>
        <span className="progress-count">
          {progress.current}/{progress.total}
        </span>
      </div>
      <div className="progress-bar-track">
        <div
          className={`progress-bar-fill ${isComplete ? "complete" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
