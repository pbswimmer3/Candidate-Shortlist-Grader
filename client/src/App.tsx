import { useState, useRef } from "react";
import Sidebar from "./components/Sidebar";
import InputPanel from "./components/InputPanel";
import ProgressBar from "./components/ProgressBar";
import ResultsTable from "./components/ResultsTable";
import FailedTable from "./components/FailedTable";
import { useSSE } from "./hooks/useSSE";
import type { FailedCandidate } from "./types";

type Tab = "scored" | "failed";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("scored");
  const {
    scored,
    failed,
    progress,
    stats,
    sheetUrl,
    isRunning,
    startPipeline,
    retryCandidate,
    retryAllFailed,
  } = useSSE();

  // Store JD/rubric for retries
  const configRef = useRef({ jobDescription: "", rubric: "" });

  const handleRun = (
    profiles: Record<string, unknown>[],
    jobDescription: string,
    rubric: string
  ) => {
    configRef.current = { jobDescription, rubric };
    startPipeline(profiles, jobDescription, rubric);
  };

  const handleRetry = (candidate: FailedCandidate) => {
    retryCandidate(
      candidate,
      configRef.current.jobDescription,
      configRef.current.rubric
    );
  };

  const handleRetryAll = () => {
    retryAllFailed(
      configRef.current.jobDescription,
      configRef.current.rubric
    );
  };

  return (
    <div className="app-layout">
      <Sidebar stats={stats} sheetUrl={sheetUrl} />

      <main className="main-content">
        <div className="main-header">
          <h1>Candidate Scoring Pipeline</h1>
          <p>
            Upload Apify JSON output, score against the rubric, and export to
            Google Sheets
          </p>
        </div>

        <InputPanel onRun={handleRun} isRunning={isRunning} />

        <ProgressBar progress={progress} />

        <div className="results-section">
          <div className="tabs-header">
            <button
              className={`tab-button ${activeTab === "scored" ? "active" : ""}`}
              onClick={() => setActiveTab("scored")}
            >
              Scored Candidates
              {scored.length > 0 && (
                <span className="tab-count scored">{scored.length}</span>
              )}
            </button>
            <button
              className={`tab-button ${activeTab === "failed" ? "active" : ""}`}
              onClick={() => setActiveTab("failed")}
            >
              Failed / Retry
              {failed.length > 0 && (
                <span className="tab-count failed">{failed.length}</span>
              )}
            </button>
          </div>

          <div className="tab-content">
            {activeTab === "scored" && (
              <ResultsTable candidates={scored} />
            )}
            {activeTab === "failed" && (
              <FailedTable
                candidates={failed}
                isRunning={isRunning}
                onRetry={handleRetry}
                onRetryAll={handleRetryAll}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
