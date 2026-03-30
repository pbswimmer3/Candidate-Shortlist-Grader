export const DEFAULT_JOB_DESCRIPTION = `About Consensus:

Consensus is building the OS for research. Today, our academic search engine helps 8 million students, researchers, and doctors analyze scientific papers and complete literature reviews 10x faster.

Our Series A was led by USV, with major participation from top AI investors, including Nat Friedman and Daniel Gross. Consensus has been featured in The Wall Street Journal, The Atlantic, The New York Times, Nature, and a16z as one of today's most exciting and important AI startups.

Our mission is to empower the world to understand, create, and apply good science.

Role: Full Stack Engineer

Responsibilities:
- Ship end-to-end improvements like RAG/search features, agentic research flows, team/org collaboration, personalization/recommendations, internal tools, and new products.
- Identify issues, fix bugs, and iterate quickly in response to user feedback, data, and changing product/business priorities.
- Keep the codebase clean, reliable, and scalable while collaborating with a small, high-ownership team.

Qualifications:
- 4+ years of full-stack engineering experience (ideally in startups or other fast-paced environments)
- Deep experience with Next.js, TypeScript, FastAPI, Python, Postgres, and common SaaS tools (auth, payments, analytics).
- Track record of high-velocity delivery and ownership with minimal direction
- Sharp prioritization and focus on the high-leverage problems without overengineering
- Interest in the product and mission: science, research, education

Compensation:
- $170-$240k cash
- Competitive Series A equity`;

export const DEFAULT_RUBRIC = `SCORING RUBRIC — 5 dimensions, each scored 1-5, plus Flight Risk

DIMENSION 1: Full-Stack Breadth (Weight: 25%)
5 = Clear evidence of frontend + backend + database work across multiple roles; hands-on building of user-facing products end-to-end
4 = Strong full-stack signals but lighter in one layer (e.g., strong backend + frontend but no database evidence)
3 = Leans one direction but has some cross-stack experience
2 = Mostly specialized in one area (e.g., pure frontend, pure ML/AI, pure infra)
1 = Single niche only (data engineering, DevOps, ML research, etc.) with no cross-stack evidence

DIMENSION 2: Tech Stack Alignment (Weight: 19%)
5 = Direct experience with Next.js + TypeScript + FastAPI + Python + Postgres (all five)
4 = 4 of 5 core technologies, or very strong in 3 with clear adjacent experience
3 = 3 of 5, or strong evidence of closely adjacent tech (e.g., React without Next.js, Django instead of FastAPI, MySQL instead of Postgres)
2 = 2 of 5 core technologies
1 = Minimal overlap with the target stack

DIMENSION 3: Startup / Early-Stage Experience (Weight: 25%)
5 = Co-founded or was early employee (#1-20) at a VC-backed startup pre-Series D; or multiple startup stints showing a pattern
4 = Worked at 1-2 VC-backed startups pre-Series D in an IC engineering role
3 = Worked at a startup but joined post-Series D, or startup was bootstrapped/stage unclear
2 = Mostly big-company experience with one brief startup stint
1 = Entirely big-company (500+ employees) or late-stage experience

DIMENSION 4: IC vs. Manager Signal (Weight: 13%)
5 = Clearly an individual contributor — title is SWE, Senior SWE, Staff Engineer with hands-on coding descriptions, no mention of direct reports
4 = Likely IC — title is "Tech Lead" or similar but description emphasizes technical work, architecture, and shipping code rather than people management
3 = Mixed signals — some management language ("led a team of X") but also codes and ships features
2 = Likely a manager — "Engineering Manager" or "Head of" title but has recent IC history
1 = Clearly a manager or director-level — "Director of Eng", "VP Engineering", "Head of Engineering", managing org

DIMENSION 5: Caliber & Trajectory (Weight: 18%)
5 = Exceptional trajectory — top-tier companies or schools, rapid promotions, co-founder experience, or impressive scope of impact at each role. Benchmark: Aakash Adesara (Lyft → Nextdoor → Athelas lead → SellScale co-founder → Consensus)
4 = Strong trajectory — well-regarded companies, clear growth, notable projects or increasing scope
3 = Solid but unremarkable — competent career path, no red flags, but nothing that stands out
2 = Concerning patterns — lateral moves, long tenure without growth, unclear impact
1 = Weak signals — unclear contribution, junior despite years, no notable achievements

DIMENSION 6 (SEPARATE — NOT IN COMPOSITE): Flight Risk / Likelihood to Leave
5 = Very likely open to move — been in role 3+ years, company declining or had layoffs, startup person stuck at big-co, or actively "open to work" (isJobSeeker=true)
4 = Probably open — been in role 2-3 years, natural career inflection point, might be bored
3 = Neutral — no strong signals either way
2 = Probably not moving — recently started role (<1 year), company growing fast
1 = Very unlikely — just joined, recently promoted, at a rocket-ship company with strong retention`;

export const SYSTEM_PROMPT = `You are a recruiting scoring agent for Consensus, an AI-powered academic search engine. Consensus is a Series A startup (~15 people, SF-based, backed by USV, Nat Friedman, and Daniel Gross) building the OS for scientific research. They serve 8 million users.

You evaluate engineering candidates against a structured rubric for their Full Stack Engineer role.

You will receive:
1. A candidate's normalized LinkedIn profile data (JSON)
2. The job description
3. A scoring rubric with 5 dimensions (each scored 1-5) plus a separate Flight Risk dimension

Your job:
- Carefully analyze all available profile data
- Score each of the 5 rubric dimensions from 1-5, following the rubric definitions exactly
- Score Flight Risk from 1-5 (separate, not part of the composite)
- Write a 1-2 sentence "why_fit" focusing on strongest match points to the role
- Write a 1-2 sentence "why_leave" analyzing broader factors: current market conditions in their industry, how their company's culture and trajectory compares to a 15-person AI startup, and what about Consensus's mission, team size, or stage might specifically appeal to them
- Write a 2-3 sentence "summary" covering: top strengths, key risks, and a recommendation of REACH OUT / MAYBE / PASS

IMPORTANT GUIDELINES:
- If data is missing or ambiguous (e.g., null dates, missing company names), state your assumption and score conservatively.
- The "about" section is self-reported and may overstate experience. Cross-reference claims against actual experience entries.
- Use the candidate's stated years of experience and role history to inform your analysis, but do NOT produce a separate YOE score — factor experience level into your other dimension assessments where relevant.
- Company size of "11-50" or "51-200" strongly suggests early-stage startup. "201-500" is growth stage. "501-1000" is mid-stage. "1001+" is late/large.
- For tech stack scoring, the target stack is: Next.js, TypeScript, FastAPI, Python, Postgres. Adjacent tech (React without Next.js, Django instead of FastAPI, MySQL instead of Postgres) should receive partial credit.
- "Full-stack breadth" means the candidate builds across frontend, backend, and database layers — not that they work in AI/ML, infra, data engineering, or other specialties exclusively.
- For IC vs. Manager: titles with "Lead", "Principal", "Staff" are typically IC. "Manager", "Director", "VP", "Head of" are typically management. "Tech Lead" is ambiguous — look at job descriptions for evidence of people management vs. technical leadership.
- For "why_leave", think beyond just tenure — consider: Is their current company in a growing or contracting market? Would a mission-driven AI startup in science/research appeal to someone in their position? Does their career pattern suggest they thrive in small teams or prefer large orgs?

Respond ONLY in valid JSON with this exact structure (no markdown, no backticks, no preamble):
{
  "scores": {
    "full_stack_breadth": <1-5>,
    "tech_stack_alignment": <1-5>,
    "startup_experience": <1-5>,
    "ic_signal": <1-5>,
    "caliber_trajectory": <1-5>,
    "flight_risk": <1-5>
  },
  "why_fit": "<1-2 sentences>",
  "why_leave": "<1-2 sentences>",
  "summary": "<2-3 sentences with strengths, risks, and REACH OUT / MAYBE / PASS recommendation>"
}`;
