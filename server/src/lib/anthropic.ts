import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "../config/defaults.js";
import { parseLLMResponse, type LLMResult } from "./scorer.js";
import type { NormalizedProfile } from "./normalizer.js";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export async function scoreCandidate(
  profile: NormalizedProfile,
  jobDescription: string,
  rubric: string
): Promise<LLMResult> {
  const anthropic = getClient();

  const userPrompt = `## Job Description
${jobDescription}

## Scoring Rubric
${rubric}

## Reference Caliber Profile
For caliber benchmarking, here is an example of the type of candidate Consensus considers exceptional:
- Aakash Adesara (linkedin.com/in/aaadesara): Co-founded SellScale (AI startup, 3 years as CEO/co-founder), previously Engineering Lead for Growth at Athelas (healthcare startup), Engineer at Nextdoor (Growth/ML), Engineer at Lyft (pricing optimization). Now at Consensus as AI Engineer. Trajectory: Lyft → Nextdoor → Athelas (lead) → SellScale (co-founder) → Consensus. Strong startup trajectory with increasing ownership, full-stack with AI/ML depth, shipped growth products end-to-end.

## Candidate Profile Data
${JSON.stringify(profile, null, 2)}

Score this candidate now.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    return parseLLMResponse(text);
  } catch {
    // Retry once with correction prompt
    const retryResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: userPrompt },
        { role: "assistant", content: text },
        {
          role: "user",
          content:
            "Your previous response was not valid JSON. Please respond with ONLY a valid JSON object, no markdown formatting or backticks.",
        },
      ],
    });

    const retryText =
      retryResponse.content[0].type === "text"
        ? retryResponse.content[0].text
        : "";

    return parseLLMResponse(retryText);
  }
}
