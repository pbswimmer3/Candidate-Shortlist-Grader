export interface CandidateScores {
  full_stack_breadth: number;
  tech_stack_alignment: number;
  startup_experience: number;
  ic_signal: number;
  caliber_trajectory: number;
  flight_risk: number;
}

export interface ScoredCandidate {
  name: string;
  role: string;
  company: string;
  location: string;
  linkedinUrl: string;
  scores: CandidateScores;
  recommendation: "REACH OUT" | "MAYBE" | "PASS";
  whyFit: string;
  whyLeave: string;
  summary: string;
}

export interface FailedCandidate {
  name: string;
  linkedinUrl: string;
  rawProfile: Record<string, unknown>;
  error: string;
  retryCount: number;
}

export type PipelineStage = "idle" | "scoring" | "writing" | "complete";

export interface PipelineProgress {
  stage: PipelineStage;
  current: number;
  total: number;
  currentName?: string;
}

export interface BatchStats {
  total: number;
  scored: number;
  failed: number;
}
