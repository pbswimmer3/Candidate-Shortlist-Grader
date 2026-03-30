const APIFY_ACTOR_ID = "dev_fusion~linkedin-profile-scraper";
const SCRAPE_TIMEOUT_S = 120;

interface ApifyRunResponse {
  data: {
    id: string;
    status: string;
    defaultDatasetId: string;
  };
}

interface ApifyDatasetItem {
  succeeded?: boolean;
  error?: string;
  [key: string]: unknown;
}

export async function scrapeLinkedInProfile(
  url: string,
  apiToken: string
): Promise<Record<string, unknown>> {
  // Start the actor run and wait for it to finish (synchronous call)
  const startRes = await fetch(
    `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs?token=${apiToken}&waitForFinish=${SCRAPE_TIMEOUT_S}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileUrls: [url] }),
    }
  );

  if (!startRes.ok) {
    const errText = await startRes.text();
    throw new Error(`Apify API error (${startRes.status}): ${errText}`);
  }

  const runData: ApifyRunResponse = await startRes.json();
  const runStatus = runData.data.status;
  const datasetId = runData.data.defaultDatasetId;

  if (runStatus !== "SUCCEEDED") {
    throw new Error(`Apify run ${runStatus.toLowerCase()}`);
  }

  // Fetch results from dataset
  const datasetRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiToken}`
  );
  if (!datasetRes.ok) {
    throw new Error(`Failed to fetch dataset: ${datasetRes.status}`);
  }

  const items: ApifyDatasetItem[] = await datasetRes.json();

  // Log raw response for debugging
  console.log(`[Apify] Raw response for ${url}:`);
  console.log(JSON.stringify(items, null, 2).slice(0, 3000));

  if (!items || items.length === 0) {
    throw new Error("No profile data returned");
  }

  const profile = items[0];
  if (profile.succeeded === false) {
    throw new Error(profile.error || "Profile scrape failed");
  }

  // Log the top-level keys so we can see the data structure
  console.log(`[Apify] Top-level keys: ${Object.keys(profile).join(", ")}`);
  console.log(`[Apify] fullName: ${profile.fullName}, headline: ${profile.headline}`);

  return profile as Record<string, unknown>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
