import type { BatchStats } from "../types";

interface SidebarProps {
  stats: BatchStats;
  sheetUrl: string | null;
}

export default function Sidebar({ stats, sheetUrl }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-title">
        <div className="logo-icon">CS</div>
        Candidate Scorer
      </div>

      {sheetUrl && (
        <div className="sidebar-section">
          <div className="sidebar-label">Output</div>
          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-link"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Google Sheet
          </a>
        </div>
      )}

      <div className="sidebar-section">
        <div className="sidebar-label">Batch Stats</div>
        <div className="sidebar-stat">
          <span>Uploaded</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="sidebar-stat">
          <span>Scored</span>
          <span className="stat-value">{stats.scored}</span>
        </div>
        <div className="sidebar-stat">
          <span>Failed</span>
          <span className="stat-value">{stats.failed}</span>
        </div>
      </div>
    </aside>
  );
}
