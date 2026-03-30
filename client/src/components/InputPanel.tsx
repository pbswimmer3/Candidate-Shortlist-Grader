import { useState, useEffect, useRef } from "react";

interface InputPanelProps {
  onRun: (profiles: Record<string, unknown>[], jobDescription: string, rubric: string) => void;
  isRunning: boolean;
}

export default function InputPanel({ onRun, isRunning }: InputPanelProps) {
  const [profiles, setProfiles] = useState<Record<string, unknown>[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [rubric, setRubric] = useState("");
  const [jdOpen, setJdOpen] = useState(false);
  const [rubricOpen, setRubricOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load defaults on mount
  useEffect(() => {
    fetch("/api/score/defaults")
      .then((res) => res.json())
      .then((data) => {
        setJobDescription(data.jobDescription);
        setRubric(data.rubric);
      })
      .catch(console.error);
  }, []);

  const handleFile = (file: File) => {
    setParseError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target?.result as string);
        // Accept either an array or a single object
        const arr = Array.isArray(raw) ? raw : [raw];
        if (arr.length === 0) {
          setParseError("JSON file contains no profiles");
          setProfiles([]);
          return;
        }
        setProfiles(arr);
      } catch {
        setParseError("Invalid JSON file");
        setProfiles([]);
      }
    };
    reader.readAsText(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleRun = () => {
    if (profiles.length > 0 && !isRunning) {
      onRun(profiles, jobDescription, rubric);
    }
  };

  return (
    <div className="input-panel">
      <div className="input-section">
        <label className="input-label">
          Apify JSON Output
          {profiles.length > 0 && (
            <span className="url-count">
              {profiles.length} candidate{profiles.length !== 1 ? "s" : ""} detected
            </span>
          )}
        </label>

        <div
          className="file-drop-zone"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileInput}
            style={{ display: "none" }}
            disabled={isRunning}
          />
          {fileName ? (
            <div className="file-selected">
              <span className="file-icon">&#128196;</span>
              <div>
                <div className="file-name">{fileName}</div>
                <div className="file-meta">
                  {profiles.length} profile{profiles.length !== 1 ? "s" : ""} loaded
                </div>
              </div>
            </div>
          ) : (
            <div className="file-placeholder">
              <span className="file-icon">&#128194;</span>
              <div>Drop Apify JSON file here or click to browse</div>
              <div className="file-hint">Supports single profile or array of up to 50</div>
            </div>
          )}
        </div>

        {parseError && <div className="file-error">{parseError}</div>}
      </div>

      <div className="input-section">
        <div
          className="collapsible-header"
          onClick={() => setJdOpen(!jdOpen)}
        >
          <label className="input-label" style={{ marginBottom: 0 }}>
            Job Description
          </label>
          <span className={`toggle-icon ${jdOpen ? "open" : ""}`}>
            &#9660;
          </span>
        </div>
        <div className={`collapsible-content ${jdOpen ? "expanded" : "collapsed"}`}>
          <textarea
            className="jd-textarea"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            disabled={isRunning}
          />
        </div>
      </div>

      <div className="input-section">
        <div
          className="collapsible-header"
          onClick={() => setRubricOpen(!rubricOpen)}
        >
          <label className="input-label" style={{ marginBottom: 0 }}>
            Scoring Rubric
          </label>
          <span className={`toggle-icon ${rubricOpen ? "open" : ""}`}>
            &#9660;
          </span>
        </div>
        <div className={`collapsible-content ${rubricOpen ? "expanded" : "collapsed"}`}>
          <textarea
            className="jd-textarea"
            value={rubric}
            onChange={(e) => setRubric(e.target.value)}
            disabled={isRunning}
            style={{ minHeight: 300 }}
          />
        </div>
      </div>

      <button
        className="run-button"
        onClick={handleRun}
        disabled={profiles.length === 0 || isRunning}
      >
        {isRunning
          ? "Running..."
          : `Run Scoring (${profiles.length} candidate${profiles.length !== 1 ? "s" : ""})`}
      </button>
    </div>
  );
}
