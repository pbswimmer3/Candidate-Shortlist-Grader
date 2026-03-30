import type { ScoredCandidate } from "../types";
import CandidateRow from "./CandidateRow";

interface ResultsTableProps {
  candidates: ScoredCandidate[];
}

export default function ResultsTable({ candidates }: ResultsTableProps) {
  if (candidates.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">&#128202;</div>
        <div>No scored candidates yet</div>
        <div style={{ fontSize: 12 }}>
          Upload Apify JSON and click Run Scoring
        </div>
      </div>
    );
  }

  return (
    <table className="results-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Name</th>
          <th>Current Role & Company</th>
          <th>Recommendation</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {candidates.map((c, i) => (
          <CandidateRow key={`${c.name}-${i}`} candidate={c} rank={i + 1} />
        ))}
      </tbody>
    </table>
  );
}
