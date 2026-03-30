import { google, type sheets_v4 } from "googleapis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let sheetsClient: sheets_v4.Sheets | null = null;

function getClient(): sheets_v4.Sheets {
  if (!sheetsClient) {
    const credFile = process.env.GOOGLE_SERVICE_ACCOUNT_FILE;
    if (!credFile) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_FILE not set in .env");
    }

    const credPath = path.resolve(__dirname, credFile);
    if (!fs.existsSync(credPath)) {
      throw new Error(`Credentials file not found: ${credPath}`);
    }

    const credentials = JSON.parse(fs.readFileSync(credPath, "utf-8"));
    console.log("[Sheets] Loaded credentials for:", credentials.client_email);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    sheetsClient = google.sheets({ version: "v4", auth });
  }
  return sheetsClient;
}

// Column layout (A-R):
// A: Top 10 Rank (manual)       B: Candidate Name         C: Current Role & Company
// D: Open to Work (manual)      E: LinkedIn URL            F: Location
// G: Full-Stack Breadth (1-5)   H: Tech Stack Alignment    I: Startup Experience
// J: IC Signal (1-5)            K: Caliber & Trajectory    L: Weighted Score (Excel formula)
// M: Recommendation             N: Flight Risk (1-5)       O: Flight Risk (Manual modified)
// P: Why They're a Fit          Q: Why They Might Leave    R: Summary

const HEADERS = [
  "Top 10 Rank",
  "Candidate Name",
  "Current Role & Company",
  "Open to Work",
  "LinkedIn URL",
  "Location",
  "Full-Stack Breadth (1-5)",
  "Tech Stack Alignment (1-5)",
  "Startup Experience (1-5)",
  "IC Signal (1-5)",
  "Caliber & Trajectory (1-5)",
  "Weighted Score (0-100)",
  "Recommendation",
  "Flight Risk (1-5)",
  "Flight Risk (Manual modified)",
  "Why They're a Fit",
  "Why They Might Leave",
  "Summary",
];

export interface SheetRow {
  name: string;
  roleAndCompany: string;
  linkedinUrl: string;
  location: string;
  fullStackBreadth: number;
  techStackAlignment: number;
  startupExperience: number;
  icSignal: number;
  caliberTrajectory: number;
  recommendation: string;
  flightRisk: number;
  whyFit: string;
  whyLeave: string;
  summary: string;
}

async function ensureHeaders(spreadsheetId: string): Promise<void> {
  const sheets = getClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Sheet1!A1:R1",
  });

  if (!res.data.values || res.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Sheet1!A1:R1",
      valueInputOption: "RAW",
      requestBody: { values: [HEADERS] },
    });

    const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetId = sheetMeta.data.sheets?.[0]?.properties?.sheetId || 0;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  textFormat: { bold: true },
                  backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                },
              },
              fields: "userEnteredFormat(textFormat,backgroundColor)",
            },
          },
          {
            updateSheetProperties: {
              properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
              fields: "gridProperties.frozenRowCount",
            },
          },
        ],
      },
    });
  }
}

export async function appendRow(spreadsheetId: string, row: SheetRow): Promise<void> {
  const sheets = getClient();
  await ensureHeaders(spreadsheetId);

  const linkedinFormula = `=HYPERLINK("${row.linkedinUrl}", "Profile")`;

  // Columns A-R: leave manual columns (A, D, L, O) blank
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Sheet1!A:R",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          "",                        // A: Top 10 Rank (manual)
          row.name,                  // B: Candidate Name
          row.roleAndCompany,        // C: Current Role & Company
          "",                        // D: Open to Work (manual)
          linkedinFormula,           // E: LinkedIn URL
          row.location,              // F: Location
          row.fullStackBreadth,      // G: Full-Stack Breadth
          row.techStackAlignment,    // H: Tech Stack Alignment
          row.startupExperience,     // I: Startup Experience
          row.icSignal,              // J: IC Signal
          row.caliberTrajectory,     // K: Caliber & Trajectory
          "",                        // L: Weighted Score (Excel formula)
          row.recommendation,        // M: Recommendation
          row.flightRisk,            // N: Flight Risk
          "",                        // O: Flight Risk (Manual modified)
          row.whyFit,                // P: Why They're a Fit
          row.whyLeave,              // Q: Why They Might Leave
          row.summary,               // R: Summary
        ],
      ],
    },
  });

  console.log(`[Sheets] Appended row for: ${row.name}`);
}

export async function formatSheet(spreadsheetId: string): Promise<void> {
  const sheets = getClient();
  const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetId = sheetMeta.data.sheets?.[0]?.properties?.sheetId || 0;

  const dataRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Sheet1!A:A",
  });
  const rowCount = dataRes.data.values?.length || 1;

  if (rowCount <= 1) return;

  const requests: sheets_v4.Schema$Request[] = [
    // Conditional formatting: Weighted Score col L (index 11) — green/yellow/red
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex: 11, endColumnIndex: 12 }],
          booleanRule: {
            condition: { type: "NUMBER_GREATER_THAN_EQ", values: [{ userEnteredValue: "75" }] },
            format: { backgroundColor: { red: 0.776, green: 0.937, blue: 0.808 } },
          },
        },
        index: 0,
      },
    },
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex: 11, endColumnIndex: 12 }],
          booleanRule: {
            condition: {
              type: "CUSTOM_FORMULA",
              values: [{ userEnteredValue: "=AND(L2>=50,L2<75)" }],
            },
            format: { backgroundColor: { red: 1.0, green: 0.922, blue: 0.612 } },
          },
        },
        index: 1,
      },
    },
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex: 11, endColumnIndex: 12 }],
          booleanRule: {
            condition: { type: "NUMBER_LESS", values: [{ userEnteredValue: "50" }] },
            format: { backgroundColor: { red: 1.0, green: 0.78, blue: 0.808 } },
          },
        },
        index: 2,
      },
    },
    // Recommendation col M (index 12)
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex: 12, endColumnIndex: 13 }],
          booleanRule: {
            condition: { type: "TEXT_EQ", values: [{ userEnteredValue: "REACH OUT" }] },
            format: { backgroundColor: { red: 0.776, green: 0.937, blue: 0.808 } },
          },
        },
        index: 3,
      },
    },
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex: 12, endColumnIndex: 13 }],
          booleanRule: {
            condition: { type: "TEXT_EQ", values: [{ userEnteredValue: "MAYBE" }] },
            format: { backgroundColor: { red: 1.0, green: 0.922, blue: 0.612 } },
          },
        },
        index: 4,
      },
    },
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex: 12, endColumnIndex: 13 }],
          booleanRule: {
            condition: { type: "TEXT_EQ", values: [{ userEnteredValue: "PASS" }] },
            format: { backgroundColor: { red: 1.0, green: 0.78, blue: 0.808 } },
          },
        },
        index: 5,
      },
    },
    // Dimension score columns G-K (6-10) and N (13): green 4-5, yellow 3, red 1-2
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [
            { sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex: 6, endColumnIndex: 11 },
            { sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex: 13, endColumnIndex: 14 },
          ],
          booleanRule: {
            condition: { type: "NUMBER_GREATER_THAN_EQ", values: [{ userEnteredValue: "4" }] },
            format: { backgroundColor: { red: 0.776, green: 0.937, blue: 0.808 } },
          },
        },
        index: 6,
      },
    },
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [
            { sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex: 6, endColumnIndex: 11 },
            { sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex: 13, endColumnIndex: 14 },
          ],
          booleanRule: {
            condition: { type: "NUMBER_EQ", values: [{ userEnteredValue: "3" }] },
            format: { backgroundColor: { red: 1.0, green: 0.922, blue: 0.612 } },
          },
        },
        index: 7,
      },
    },
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [
            { sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex: 6, endColumnIndex: 11 },
            { sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex: 13, endColumnIndex: 14 },
          ],
          booleanRule: {
            condition: { type: "NUMBER_LESS_THAN_EQ", values: [{ userEnteredValue: "2" }] },
            format: { backgroundColor: { red: 1.0, green: 0.78, blue: 0.808 } },
          },
        },
        index: 8,
      },
    },
    // Auto-resize columns
    {
      autoResizeDimensions: {
        dimensions: {
          sheetId,
          dimension: "COLUMNS",
          startIndex: 0,
          endIndex: 18,
        },
      },
    },
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });

  console.log("[Sheets] Conditional formatting applied");
}

export function getSheetUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}
