export interface LLMScores {
  full_stack_breadth: number;
  tech_stack_alignment: number;
  startup_experience: number;
  ic_signal: number;
  caliber_trajectory: number;
  flight_risk: number;
}

export interface LLMResult {
  scores: LLMScores;
  why_fit: string;
  why_leave: string;
  summary: string;
}

export function parseRecommendation(summary: string): "REACH OUT" | "MAYBE" | "PASS" {
  const upper = summary.toUpperCase();
  if (upper.includes("REACH OUT")) return "REACH OUT";
  if (upper.includes("MAYBE")) return "MAYBE";
  if (upper.includes("PASS")) return "PASS";
  return "MAYBE";
}

export function parseLLMResponse(text: string): LLMResult {
  // Try direct JSON parse first
  try {
    const parsed = JSON.parse(text);
    validateLLMResult(parsed);
    return parsed;
  } catch {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      validateLLMResult(parsed);
      return parsed;
    }
    throw new Error("LLM response parsing failed");
  }
}

function validateLLMResult(obj: unknown): asserts obj is LLMResult {
  if (!obj || typeof obj !== "object") throw new Error("Not an object");
  const result = obj as Record<string, unknown>;
  if (!result.scores || typeof result.scores !== "object") throw new Error("Missing scores");
  const scores = result.scores as Record<string, unknown>;
  const requiredDimensions = [
    "full_stack_breadth",
    "tech_stack_alignment",
    "startup_experience",
    "ic_signal",
    "caliber_trajectory",
    "flight_risk",
  ];
  for (const dim of requiredDimensions) {
    if (typeof scores[dim] !== "number" || scores[dim] < 1 || scores[dim] > 5) {
      throw new Error(`Invalid score for ${dim}: ${scores[dim]}`);
    }
  }
  if (typeof result.why_fit !== "string") throw new Error("Missing why_fit");
  if (typeof result.why_leave !== "string") throw new Error("Missing why_leave");
  if (typeof result.summary !== "string") throw new Error("Missing summary");
}
