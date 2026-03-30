export const SCORE_DIMENSIONS = [
  "full_stack_breadth",
  "tech_stack_alignment",
  "startup_experience",
  "ic_signal",
  "caliber_trajectory",
  "flight_risk",
] as const;

export type ScoreDimension = (typeof SCORE_DIMENSIONS)[number];
