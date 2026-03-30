import type { FailedCandidate } from "../types";

const MAX_RETRIES = 3;

interface FailedTableProps {
  candidates: FailedCandidate[];
  isRunning: boolean;
  onRetry: (candidate: FailedCandidate) => void;
  onRetryAll: () => void;
}

export default function FailedTable({
  candidates,
  isRunning,
  onRetry,
  onRetryAll,
}: FailedTableProps) {
  if (candidates.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">&#10003;</div>
        <div>No failed candidates</div>
      </div>
    );
  }

  const hasRetryable = candidates.some((c) => c.retryCount < MAX_RETRIES);

  return (
    <div>
      {hasRetryable && (
        <button
          className="retry-all-btn"
          onClick={onRetryAll}
          disabled={isRunning}
        >
          Retry All Failed
        </button>
      )}
      <table className="failed-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>LinkedIn URL</th>
            <th>Error</th>
            <th>Retries</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c, i) => (
            <tr key={`${c.name}-${i}`}>
              <td>{c.name}</td>
              <td className="url-cell">
                {c.linkedinUrl ? (
                  <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer">
                    {c.linkedinUrl}
                  </a>
                ) : (
                  "—"
                )}
              </td>
              <td className="error-cell">{c.error}</td>
              <td>
                <span className="retry-count-badge">
                  {c.retryCount}/{MAX_RETRIES}
                </span>
              </td>
              <td>
                <button
                  className="retry-btn"
                  onClick={() => onRetry(c)}
                  disabled={isRunning || c.retryCount >= MAX_RETRIES}
                >
                  {c.retryCount >= MAX_RETRIES ? "Max retries" : "Retry"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
