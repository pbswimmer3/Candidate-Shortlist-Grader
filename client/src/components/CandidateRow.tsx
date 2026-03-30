import { useState } from "react";
import type { ScoredCandidate } from "../types";

interface CandidateRowProps {
  candidate: ScoredCandidate;
  rank: number;
}

const DIMENSION_LABELS: Record<string, string> = {
  full_stack_breadth: "Full-Stack Breadth",
  tech_stack_alignment: "Tech Stack Alignment",
  startup_experience: "Startup Experience",
  ic_signal: "IC Signal",
  caliber_trajectory: "Caliber & Trajectory",
  flight_risk: "Flight Risk",
};

function scoreColor(score: number): string {
  if (score >= 4) return "green";
  if (score >= 3) return "yellow";
  return "red";
}

function badgeClass(rec: string): string {
  switch (rec) {
    case "REACH OUT":
      return "badge reach-out";
    case "MAYBE":
      return "badge maybe";
    case "PASS":
      return "badge pass";
    default:
      return "badge maybe";
  }
}

export default function CandidateRow({ candidate, rank }: CandidateRowProps) {
  const [expanded, setExpanded] = useState(false);

  const dimensions = Object.entries(candidate.scores) as [string, number][];

  return (
    <>
      <tr>
        <td className="rank-cell">#{rank}</td>
        <td className="name-cell">
          {candidate.name}
          <a
            href={candidate.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="linkedin-icon"
            title="View LinkedIn Profile"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#0A66C2">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
        </td>
        <td className="role-cell">
          {candidate.role}
          {candidate.company ? ` at ${candidate.company}` : ""}
        </td>
        <td>
          <span className={badgeClass(candidate.recommendation)}>
            {candidate.recommendation}
          </span>
        </td>
        <td>
          <button
            className="expand-btn"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Collapse" : "Details"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="expanded-row">
          <td colSpan={5}>
            <div className="expanded-content">
              <div className="score-bars">
                {dimensions.map(([key, value]) => (
                  <div key={key} className="score-bar-item">
                    <span className="score-bar-label">
                      {DIMENSION_LABELS[key] || key}
                    </span>
                    <div className="score-bar-track">
                      <div
                        className={`score-bar-fill ${scoreColor(value)}`}
                        style={{ width: `${(value / 5) * 100}%` }}
                      />
                    </div>
                    <span className="score-bar-value">{value}</span>
                  </div>
                ))}
              </div>

              <div className="detail-section">
                <h4>Why they're a fit</h4>
                <p>{candidate.whyFit}</p>
              </div>

              <div className="detail-section">
                <h4>Why they might leave</h4>
                <p>{candidate.whyLeave}</p>
              </div>

              <div className="detail-section">
                <h4>Summary</h4>
                <p>{candidate.summary}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
