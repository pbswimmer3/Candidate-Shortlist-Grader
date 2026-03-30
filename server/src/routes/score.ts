import { Router, type Request, type Response } from "express";
import { normalizeProfile } from "../lib/normalizer.js";
import { scoreCandidate } from "../lib/anthropic.js";
import { parseRecommendation } from "../lib/scorer.js";
import { appendRow, formatSheet, getSheetUrl, type SheetRow } from "../lib/sheets.js";
import { DEFAULT_JOB_DESCRIPTION, DEFAULT_RUBRIC } from "../config/defaults.js";

const router = Router();

interface ScoreRequest {
  profiles: Record<string, unknown>[];
  jobDescription?: string;
  rubric?: string;
}

function sendSSE(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function generateStreamId(): string {
  return Math.random().toString(36).substring(2, 15);
}

const pipelineQueue = new Map<
  string,
  { profiles: Record<string, unknown>[]; jobDescription: string; rubric: string }
>();

// POST /api/score — starts the pipeline and returns a stream ID
router.post("/", (req: Request, res: Response) => {
  const { profiles, jobDescription, rubric } = req.body as ScoreRequest;

  if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
    res.status(400).json({ error: "No profiles provided" });
    return;
  }

  if (profiles.length > 50) {
    res.status(400).json({ error: "Maximum 50 profiles allowed" });
    return;
  }

  const streamId = generateStreamId();

  pipelineQueue.set(streamId, {
    profiles,
    jobDescription: jobDescription || DEFAULT_JOB_DESCRIPTION,
    rubric: rubric || DEFAULT_RUBRIC,
  });

  res.json({ streamId });
});

// GET /api/score/stream/:id — SSE endpoint
router.get("/stream/:id", (req: Request, res: Response) => {
  const streamId = req.params.id as string;
  const config = pipelineQueue.get(streamId);

  if (!config) {
    res.status(404).json({ error: "Stream not found" });
    return;
  }

  pipelineQueue.delete(streamId);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const stream = { res, aborted: false };

  req.on("close", () => {
    stream.aborted = true;
  });

  runPipeline(stream, config.profiles, config.jobDescription, config.rubric);
});

// POST /api/score/retry — retry failed candidates
router.post("/retry", (req: Request, res: Response) => {
  const { profiles, jobDescription, rubric } = req.body as ScoreRequest;

  if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
    res.status(400).json({ error: "No profiles provided" });
    return;
  }

  const streamId = generateStreamId();
  pipelineQueue.set(streamId, {
    profiles,
    jobDescription: jobDescription || DEFAULT_JOB_DESCRIPTION,
    rubric: rubric || DEFAULT_RUBRIC,
  });

  res.json({ streamId });
});

async function runPipeline(
  stream: { res: Response; aborted: boolean },
  profiles: Record<string, unknown>[],
  jobDescription: string,
  rubric: string
) {
  const total = profiles.length;
  let scored = 0;
  let failed = 0;
  const sheetId = process.env.GOOGLE_SHEETS_ID;

  console.log(`[Pipeline] Starting scoring for ${total} candidates`);
  if (!sheetId) {
    console.warn("[Pipeline] GOOGLE_SHEETS_ID not set — skipping sheet writes");
  }

  for (let i = 0; i < profiles.length; i++) {
    if (stream.aborted) return;

    const rawProfile = profiles[i];
    const index = i + 1;
    const profileName = (rawProfile.fullName as string) || "Unknown";
    const profileUrl = (rawProfile.linkedinPublicUrl as string) ||
      (rawProfile.linkedinUrl as string) || "";

    // Normalize
    const normalized = normalizeProfile(rawProfile as any);
    console.log(`[Pipeline] (${index}/${total}) Scoring: ${normalized.fullName}`);

    // Score with LLM
    sendSSE(stream.res, "score_start", { index, total, name: profileName });

    try {
      const llmResult = await scoreCandidate(normalized, jobDescription, rubric);
      const recommendation = parseRecommendation(llmResult.summary);

      const result = {
        name: normalized.fullName,
        role: normalized.jobTitle || "",
        company: normalized.companyName || "",
        location: normalized.addressWithoutCountry || normalized.addressWithCountry || "",
        linkedinUrl: normalized.linkedinPublicUrl || normalized.linkedinUrl || "",
        scores: llmResult.scores,
        recommendation,
        whyFit: llmResult.why_fit,
        whyLeave: llmResult.why_leave,
        summary: llmResult.summary,
      };

      sendSSE(stream.res, "score_complete", { index, result });
      scored++;
      console.log(`[Pipeline] Scored ${normalized.fullName}: ${recommendation}`);

      // Write to Google Sheet
      if (sheetId) {
        try {
          const sheetRow: SheetRow = {
            name: result.name,
            roleAndCompany: `${result.role} at ${result.company}`.trim(),
            linkedinUrl: result.linkedinUrl,
            location: result.location,
            fullStackBreadth: llmResult.scores.full_stack_breadth,
            techStackAlignment: llmResult.scores.tech_stack_alignment,
            startupExperience: llmResult.scores.startup_experience,
            icSignal: llmResult.scores.ic_signal,
            caliberTrajectory: llmResult.scores.caliber_trajectory,
            recommendation,
            flightRisk: llmResult.scores.flight_risk,
            whyFit: llmResult.why_fit,
            whyLeave: llmResult.why_leave,
            summary: llmResult.summary,
          };
          await appendRow(sheetId, sheetRow);
          sendSSE(stream.res, "sheet_written", { index });
        } catch (err) {
          console.error("[Pipeline] Sheet write error:", err);
          sendSSE(stream.res, "sheet_error", {
            index,
            error: err instanceof Error ? err.message : "Sheet write failed",
          });
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown scoring error";
      console.error(`[Pipeline] Score failed for ${profileName}:`, error);
      sendSSE(stream.res, "score_fail", {
        index,
        name: profileName,
        linkedinUrl: profileUrl,
        error,
      });
      failed++;
    }
  }

  // Apply conditional formatting after all candidates
  if (sheetId && scored > 0) {
    try {
      await formatSheet(sheetId);
    } catch (err) {
      console.error("[Pipeline] Sheet formatting error:", err);
    }
  }

  sendSSE(stream.res, "batch_complete", {
    total,
    scored,
    failed,
    sheetUrl: sheetId ? getSheetUrl(sheetId) : null,
  });

  stream.res.end();
}

// GET /api/defaults — return default JD and rubric for the frontend
router.get("/defaults", (_req: Request, res: Response) => {
  res.json({
    jobDescription: DEFAULT_JOB_DESCRIPTION,
    rubric: DEFAULT_RUBRIC,
  });
});

export default router;
