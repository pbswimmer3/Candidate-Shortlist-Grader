# Candidate Shortlist Grader

An AI-powered candidate scoring system that evaluates engineering candidates against a structured rubric and exports ranked results to Google Sheets. Built as a recruiting operations tool for evaluating Full Stack Engineer candidates at [Consensus](https://consensus.app).

## What It Does

This tool takes scraped LinkedIn profile data, runs each candidate through a Claude Sonnet scoring agent against a configurable rubric, and outputs structured results to both a real-time web UI and a Google Sheet for collaborative review.

**The problem it solves:** Manually reviewing 25-50+ LinkedIn profiles against a detailed rubric is slow and inconsistent. This system standardizes evaluation across 5 scoring dimensions, provides written rationale for each candidate, and outputs a sortable spreadsheet ready for recruiter review.

## How It Works

```
Apify (manual run) --> JSON export --> Upload to UI --> Normalizer --> Claude Sonnet Scorer --> Google Sheet
                                                                              |
                                                                    Real-time results in UI
```

### Pipeline Steps

1. **Scrape profiles externally** -- Run the [Apify LinkedIn Profile Scraper](https://apify.com/dev_fusion/linkedin-profile-scraper) manually via their UI. Export the JSON output.

2. **Upload JSON** -- Drop the Apify JSON file into the web UI. Supports single profiles or arrays of up to 50 candidates.

3. **Normalize** -- A deterministic transformation step strips PII and noise fields from the raw scraper output, resolves null company names from logo URLs, and produces a clean JSON object with only the fields relevant to scoring:
   - Identity: name, headline, location, LinkedIn URL
   - Current role: title, company, company size/industry, tenure
   - Experience array: company, title, description, dates, employment type
   - Education, skills, certifications, projects, awards (if present)
   - Metadata: isJobSeeker, isCurrentlyEmployed, connections/followers

   **Fields explicitly stripped:** email, phone, photos, internal IDs, platform metadata, LinkedIn posts, recommendations, languages, volunteer work, publications, patents.

4. **Score with Claude Sonnet** -- Each normalized profile is sent to `claude-sonnet-4-20250514` with the job description, scoring rubric, and a reference caliber profile. The LLM returns structured JSON with 1-5 scores for each dimension plus written analysis.

5. **Export to Google Sheets** -- Results are appended row-by-row with conditional formatting (green/yellow/red) on score columns and recommendation badges. Manual columns (Top 10 Rank, Open to Work, Flight Risk override) are left blank for recruiter input. The weighted composite score is calculated by a Google Sheets formula, not by the system.

### Real-Time Streaming

The backend uses Server-Sent Events (SSE) to stream results as each candidate completes. The UI updates live -- you see candidates appear in the results table as they're scored, sorted by recommendation (REACH OUT first).

## Scoring Methodology

### Dimensions (each scored 1-5)

| Dimension | Weight | What It Measures |
|-----------|--------|------------------|
| **Full-Stack Breadth** | 25% | Evidence of frontend + backend + database work across roles |
| **Tech Stack Alignment** | 19% | Overlap with target stack: Next.js, TypeScript, FastAPI, Python, Postgres |
| **Startup Experience** | 25% | History at VC-backed startups pre-Series D, especially as early employee |
| **IC Signal** | 13% | Individual contributor vs. management trajectory |
| **Caliber & Trajectory** | 18% | Company quality, career growth, scope of impact over time |

**Flight Risk** (scored 1-5, separate from composite): Likelihood the candidate is open to a move based on tenure, company trajectory, and career signals.

Weights are applied in a Google Sheets formula, not in the system, allowing easy adjustment without code changes.

### Caliber Benchmark

The scoring agent uses a reference profile for caliber calibration:
> **Aakash Adesara** -- Lyft (pricing optimization) -> Nextdoor (Growth/ML) -> Athelas (Engineering Lead, healthcare startup) -> SellScale (Co-founder, AI startup) -> Consensus (AI Engineer). Strong startup trajectory with increasing ownership, full-stack with AI/ML depth.

### Recommendation Logic

The LLM produces a recommendation in its summary text, which is parsed into one of three categories:
- **REACH OUT** -- Strong fit, worth immediate outreach
- **MAYBE** -- Some fit but significant gaps or risks
- **PASS** -- Does not meet key criteria

### Written Analysis

For each candidate, the agent produces:
- **Why they're a fit** -- 1-2 sentences on strongest match points
- **Why they might leave** -- 1-2 sentences on market conditions, culture fit with a small startup, and what about Consensus might appeal to them
- **Summary** -- 2-3 sentences covering strengths, risks, and the recommendation

## Rubric

The full scoring rubric is editable in the UI. The default rubric defines detailed 1-5 scoring criteria for each dimension. For example, Full-Stack Breadth:

| Score | Definition |
|-------|-----------|
| 5 | Clear evidence of frontend + backend + database work across multiple roles; hands-on building of user-facing products end-to-end |
| 4 | Strong full-stack signals but lighter in one layer |
| 3 | Leans one direction but has some cross-stack experience |
| 2 | Mostly specialized in one area (pure frontend, pure ML/AI, pure infra) |
| 1 | Single niche only with no cross-stack evidence |

See the full rubric in [`server/src/config/defaults.ts`](server/src/config/defaults.ts).

## Google Sheets Output

The system writes to a sheet with this column layout:

| Column | Source | Description |
|--------|--------|-------------|
| A: Top 10 Rank | Manual | Recruiter's final ranking |
| B: Candidate Name | Auto | From LinkedIn profile |
| C: Current Role & Company | Auto | Current title and employer |
| D: Open to Work | Manual | Recruiter's assessment |
| E: LinkedIn URL | Auto | Clickable hyperlink to profile |
| F: Location | Auto | City/region from profile |
| G-K: Dimension Scores | Auto | 5 rubric dimensions, each 1-5 |
| L: Weighted Score | Excel Formula | Composite 0-100 calculated in the sheet |
| M: Recommendation | Auto | REACH OUT / MAYBE / PASS |
| N: Flight Risk | Auto | LLM-assessed 1-5 |
| O: Flight Risk (Modified) | Manual | Recruiter's override |
| P: Why They're a Fit | Auto | LLM analysis |
| Q: Why They Might Leave | Auto | Market/culture analysis |
| R: Summary | Auto | Full assessment with recommendation |

Conditional formatting is applied automatically: green (4-5 / >=75 / REACH OUT), yellow (3 / 50-74 / MAYBE), red (1-2 / <50 / PASS).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React + TypeScript |
| Backend | Node.js + Express + TypeScript |
| LLM | Anthropic Claude Sonnet (`claude-sonnet-4-20250514`) |
| Scraping | Apify (manual, via their UI) |
| Output | Google Sheets API (service account) |
| Streaming | Server-Sent Events (SSE) |

## Project Structure

```
/
├── client/                         # Vite + React frontend
│   └── src/
│       ├── App.tsx                 # Main layout with tabs
│       ├── App.css                 # All styles
│       ├── components/
│       │   ├── InputPanel.tsx      # JSON upload + JD/rubric editors
│       │   ├── ResultsTable.tsx    # Scored candidates table
│       │   ├── CandidateRow.tsx    # Expandable row with score bars
│       │   ├── FailedTable.tsx     # Failed candidates + retry
│       │   ├── ProgressBar.tsx     # Real-time progress indicator
│       │   └── Sidebar.tsx         # Stats + Google Sheet link
│       ├── hooks/
│       │   └── useSSE.ts          # SSE connection + state management
│       └── types/
│           └── index.ts           # TypeScript interfaces
├── server/                         # Express backend
│   └── src/
│       ├── index.ts               # Express server setup
│       ├── routes/
│       │   └── score.ts           # Pipeline orchestration + SSE
│       ├── lib/
│       │   ├── normalizer.ts      # Raw profile → clean JSON
│       │   ├── scorer.ts          # LLM response parsing + validation
│       │   ├── anthropic.ts       # Claude API client
│       │   └── sheets.ts          # Google Sheets API client
│       └── config/
│           ├── defaults.ts        # Default JD, rubric, system prompt
│           └── weights.ts         # Score dimension definitions
├── .env.example                    # Environment variable template
└── README.md
```

## Setup

### Prerequisites
- Node.js 18+
- An Anthropic API key
- A Google Cloud service account with Sheets API enabled
- An Apify account (free tier works for manual runs)

### Installation

```bash
git clone https://github.com/pbswimmer3/Candidate-Shortlist-Grader.git
cd Candidate-Shortlist-Grader

# Install dependencies
cd server && npm install
cd ../client && npm install
```

### Environment Variables

Create a `.env` file in the project root:

```
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_SHEETS_ID=your-sheet-id-from-url
GOOGLE_SERVICE_ACCOUNT_FILE=../../../google-credentials.json
```

Save your Google service account JSON key as `google-credentials.json` in the project root.

### Google Sheets Setup

1. Create a new Google Sheet
2. In Google Cloud Console, create a service account with the Google Sheets API enabled
3. Download the JSON key and save as `google-credentials.json` in the project root
4. Share the Google Sheet with the service account's email address (as Editor)
5. Copy the Sheet ID from the URL (the part between `/d/` and `/edit`) into your `.env`

### Running

```bash
# Terminal 1 -- backend
cd server && npm run dev

# Terminal 2 -- frontend
cd client && npm run dev
```

Open http://localhost:5173 in your browser.

### Getting Candidate Data

1. Go to the [Apify LinkedIn Profile Scraper](https://apify.com/dev_fusion/linkedin-profile-scraper) UI
2. Enter LinkedIn profile URLs
3. Run the scraper
4. Export results as JSON
5. Upload the JSON file to the Candidate Scorer UI

## Cost Estimate

| Component | Cost |
|-----------|------|
| Apify | ~$10 per 1,000 profiles (free tier includes some usage) |
| Claude Sonnet | ~$0.003-0.005 per candidate (~3K input + 500 output tokens) |
| **25 candidates** | **< $1 total** |
| **500 candidates** | **~$5-7 total** |

## Error Handling

- **LLM response parsing:** If Claude returns invalid JSON, the system retries once with a correction prompt. If that fails, it attempts to extract JSON from the response text. If all parsing fails, the candidate is marked as failed.
- **Google Sheets:** Sheet write failures are non-fatal -- the candidate still appears in the UI results. Errors are logged to the server console.
- **Failed candidates:** Appear in the "Failed / Retry" tab with the error message. Each candidate can be retried up to 3 times. Retry re-runs the full normalize + score + sheet write pipeline.
- **Null company names:** The normalizer extracts company names from logo URLs when the scraper returns null (e.g., `meta_logo` -> "Meta").
