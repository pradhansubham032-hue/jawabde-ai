import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const status = (err as { status?: number })?.status;
      const isRetryable = status === 429 || (typeof status === 'number' && status >= 500);
      if (!isRetryable || attempt === maxRetries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 700 * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

function formatApiError(err: unknown): { status: number; message: string } {
  const e = err as { status?: number; message?: string };
  const msg = e?.message || 'Unexpected AI service error.';
  if (e?.status === 403 || msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      message:
        'Gemini API authentication failed. Please verify GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (e?.status === 429 || msg.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'Gemini API rate limit reached. Please retry in a few moments.',
    };
  }
  return {
    status: typeof e?.status === 'number' && e.status >= 400 ? e.status : 500,
    message: msg,
  };
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi (Devanagari script)',
  or: 'Odia (Odia script)',
  bn: 'Bengali (Bengali script)',
  ta: 'Tamil (Tamil script)',
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '18mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // 3-Step AI Contractor Warranty & Legal Audit
  app.post('/api/audit', async (req, res) => {
    try {
      const {
        description,
        imageBase64,
        imageMimeType,
        city,
        state,
        pinCode,
        lat,
        lng,
        ticketId,
        language = 'en',
      } = req.body as {
        description: string;
        imageBase64?: string;
        imageMimeType?: string;
        city: string;
        state: string;
        pinCode: string;
        lat: number;
        lng: number;
        ticketId?: string;
        language?: string;
      };

      if (!description && !imageBase64) {
        res.status(400).json({ error: 'Please provide an infrastructure photo or complaint description.' });
        return;
      }

      const ai = getAiClient();
      const targetLang = LANGUAGE_NAMES[language] || 'English';
      const todayIso = new Date().toISOString().split('T')[0];

      const promptText = `You are JawabDe AI, an authoritative Indian municipal engineering auditor and RTI Act 2005 civic legal analyst.
Analyze the submitted citizen evidence for an infrastructure failure in India.

Location Context:
- City/District: ${city}
- State: ${state}
- PIN Code: ${pinCode}
- Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}
- Existing Ignored Grievance / CPGRAMS ID: ${ticketId ? ticketId : 'None provided'}
- Citizen Description: ${description || 'Refer to attached site photograph.'}
- Current Date: ${todayIso}
- Requested Output Language for human-readable summaries (engineeringFindings, immediateRisk, defectSummary, localNote): ${targetLang}. Keep official IDs, Indian Rupee figures (e.g., ₹18.4 Lakhs), dates (DD MMM YYYY), contractor legal entity names, and official Indian department/PIO designations crisp and clear (in English or bilingual as standard in Indian municipal orders).

Perform a 3-step civic audit:
1. Severity Triage: Assign an objective Safety Score from 1 to 10 (10 = extreme public hazard), a crisp Hazard Category (e.g., "Premature Bituminous Road Failure", "Uncovered Storm Water Drain Hazard", "Pressurized Municipal Water Main Rupture"), visual/engineering findings grounded in the photo and text, and immediate citizen safety risk.
2. Contractor Warranty (Defect Liability Period) Record: Based on standard Indian Municipal Corporation / State PWD / PHE tender records for ${city}, ${state}, construct a realistic, domain-authentic Defect Liability Period (DLP) record for this civil work (typically 24 to 36 months DLP for urban roads/drains/pipelines under CPWD/State PWD Manual). Ensure completionDate is within the last 2–8 months before ${todayIso} and warrantyExpiryDate is 24–36 months after completionDate so the work is clearly within active warranty. Include realistic Indian civic contractor name (e.g., "Kalinga Infra Projects Pvt. Ltd." for Odisha, "Magadh Civil Works LLP" for Bihar, "Cauvery Urban Infra Ltd." for Karnataka, etc. localized to ${state}), a realistic work order ID matching ${state} municipal/PWD conventions, sanctioned amount in ₹ Lakhs (e.g., "₹18.4 Lakhs"), daysSinceCompletion, and the specific CPWD/PWD Defect Liability Clause breached.
3. Jurisdiction & PIO Lookup: Identify the exact responsible real-world Indian urban local body or state engineering department for ${city}, ${state} (PIN ${pinCode}) — e.g., Bhubaneswar Municipal Corporation (BMC) / Odisha Works Dept, Patna Municipal Corporation (PMC) / Bihar RCD, Bruhat Bengaluru Mahanagara Palike (BBMP), Varanasi Nagar Nigam (VNN), Guwahati Municipal Corporation (GMC), or the accurate Municipal Corporation / PWD Division for any other searched Indian city — along with the proper Public Information Officer (PIO) designation, office address in ${city}, First Appellate Authority (FAA) designation, statutory SLA days for urgent repair, and relevant civic portal/helpline.`;

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
      if (imageBase64 && imageMimeType) {
        parts.push({
          inlineData: {
            mimeType: imageMimeType,
            data: imageBase64,
          },
        });
      }
      parts.push({ text: promptText });

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: { parts },
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: {
                  type: Type.STRING,
                  description: 'Concise 5-8 word civic issue headline.',
                },
                safetyScore: {
                  type: Type.INTEGER,
                  description: 'Public safety hazard score from 1 to 10.',
                },
                hazardCategory: {
                  type: Type.STRING,
                  description: 'Infrastructure defect category.',
                },
                engineeringFindings: {
                  type: Type.STRING,
                  description: '2-3 sentence technical inspection summary based on photo/report.',
                },
                immediateRisk: {
                  type: Type.STRING,
                  description: '1 sentence public safety risk to commuters/residents.',
                },
                projectWorkId: {
                  type: Type.STRING,
                  description: 'Official format work order / tender ID localized to the state/city.',
                },
                contractorName: {
                  type: Type.STRING,
                  description: 'Registered Indian civil contractor entity name.',
                },
                sanctionedAmount: {
                  type: Type.STRING,
                  description: 'Sanctioned public funds in Indian Rupees, e.g. ₹18.4 Lakhs.',
                },
                sanctionedLakhs: {
                  type: Type.NUMBER,
                  description: 'Numeric value in lakhs, e.g. 18.4.',
                },
                completionDate: {
                  type: Type.STRING,
                  description: 'Formatted date such as 14 Aug 2026.',
                },
                warrantyExpiryDate: {
                  type: Type.STRING,
                  description: 'Formatted DLP expiry date 2-3 years later, e.g. 14 Aug 2029.',
                },
                dlpMonths: {
                  type: Type.INTEGER,
                  description: 'Defect Liability Period duration in months (24 or 36).',
                },
                daysSinceCompletion: {
                  type: Type.INTEGER,
                  description: 'Days elapsed between work completion and defect report.',
                },
                violationClause: {
                  type: Type.STRING,
                  description: 'Specific PWD/CPWD Defect Liability clause invoked.',
                },
                departmentName: {
                  type: Type.STRING,
                  description: 'Real responsible Indian Municipal/PWD/Water department for this city.',
                },
                pioDesignation: {
                  type: Type.STRING,
                  description: 'Official Public Information Officer (PIO) title for RTI Act 2005.',
                },
                pioOfficeAddress: {
                  type: Type.STRING,
                  description: 'Official municipal/department office address with city and PIN.',
                },
                appellateAuthority: {
                  type: Type.STRING,
                  description: 'First Appellate Authority under Section 19(1) RTI Act 2005.',
                },
                statutorySlaDays: {
                  type: Type.INTEGER,
                  description: 'Standard SLA response days (e.g. 7 or 15).',
                },
                wardLabel: {
                  type: Type.STRING,
                  description: 'Ward / locality zone label within the city.',
                },
                defectSummaryForLegal: {
                  type: Type.STRING,
                  description: 'Formal 2-sentence factual description suitable for RTI and legal notice.',
                },
              },
              required: [
                'title',
                'safetyScore',
                'hazardCategory',
                'engineeringFindings',
                'immediateRisk',
                'projectWorkId',
                'contractorName',
                'sanctionedAmount',
                'sanctionedLakhs',
                'completionDate',
                'warrantyExpiryDate',
                'dlpMonths',
                'daysSinceCompletion',
                'violationClause',
                'departmentName',
                'pioDesignation',
                'pioOfficeAddress',
                'appellateAuthority',
                'statutorySlaDays',
                'wardLabel',
                'defectSummaryForLegal',
              ],
            },
          },
        })
      );

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({ error: 'Audit engine returned an empty response. Please retry.' });
        return;
      }

      const parsed = JSON.parse(rawText);
      res.json({ audit: parsed });
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  // Multimodal AI "Before vs. After" Closure Auditor
  app.post('/api/verify-closure', async (req, res) => {
    try {
      const {
        beforeImageBase64,
        beforeMimeType,
        afterImageBase64,
        afterMimeType,
        issueTitle,
        locationLabel,
        language = 'en',
      } = req.body as {
        beforeImageBase64: string;
        beforeMimeType: string;
        afterImageBase64: string;
        afterMimeType: string;
        issueTitle: string;
        locationLabel: string;
        language?: string;
      };

      if (!beforeImageBase64 || !afterImageBase64) {
        res.status(400).json({ error: 'Both Before and After photographs are required for closure audit.' });
        return;
      }

      const ai = getAiClient();
      const targetLang = LANGUAGE_NAMES[language] || 'English';

      const promptText = `You are JawabDe AI's Forensic Visual Closure Auditor for Indian municipal infrastructure works.
You are given TWO photographs:
- Image 1 (BEFORE): Original citizen complaint evidence for "${issueTitle}" at ${locationLabel}.
- Image 2 (AFTER): Contractor's submitted "repair completion" proof photo.

Your job is to catch fraudulent/fake ticket closures (where contractors upload a photo of a totally different road, highway, flyover, or stock street) AND approve genuine repairs (where the street scale, curb style, trees/residential context, and geometry are consistent with the same neighborhood street and the defect—cracks/potholes/drain/leak—has been properly rectified).

Evaluate rigorously:
1. Landmark & Contextual Consistency: Do surrounding cues (street type/width, painted curb style, trees, residential walls/gates vs. elevated expressways/skyscrapers) plausibly match the same neighborhood corridor?
2. Geometry & Perspective Match: Is the road class and street geometry consistent (e.g., both are a two-lane residential ward street vs. a 6-lane concrete expressway flyover)?
3. Defect Resolution: Is the original defect (potholes, alligator cracking, broken drain cover, or water main leak) visibly repaired with proper workmanship?

Rules for verdict:
- If Image 2 clearly shows a completely different environment/road class (such as a highway/flyover, commercial district, or incompatible geometry/landmarks), you MUST set verdict to "REJECTED_FAKE_CLOSURE", landmarkMatch to false, geometryMatch to false, and headline to "Landmark & Geometry Mismatch — Fake Closure Blocked".
- If Image 2 shows the defect still unrepaired, set verdict to "REJECTED_FAKE_CLOSURE" and defectResolved to false.
- If Image 2 plausibly matches the same residential/ward street setting (matching curb/trees/street scale) AND shows a clean, properly resurfaced/repaired surface with the defect resolved, set verdict to "APPROVED_REPAIR", landmarkMatch to true, geometryMatch to true, defectResolved to true, and headline to "Verified Repaired — Authentic Closure Approved".

Provide detailedAnalysis and recommendedAction in ${targetLang} (keeping technical terms clear).`;

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: {
            parts: [
              { text: 'IMAGE 1 (BEFORE — Original Citizen Defect Evidence):' },
              {
                inlineData: {
                  mimeType: beforeMimeType || 'image/jpeg',
                  data: beforeImageBase64,
                },
              },
              { text: 'IMAGE 2 (AFTER — Contractor Submitted Closure Photo):' },
              {
                inlineData: {
                  mimeType: afterMimeType || 'image/jpeg',
                  data: afterImageBase64,
                },
              },
              { text: promptText },
            ],
          },
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                verdict: {
                  type: Type.STRING,
                  description: 'Must be exactly APPROVED_REPAIR or REJECTED_FAKE_CLOSURE',
                },
                confidenceScore: {
                  type: Type.INTEGER,
                  description: 'Audit confidence percentage from 1 to 100.',
                },
                landmarkMatch: {
                  type: Type.BOOLEAN,
                  description: 'Whether surrounding landmarks and environment match.',
                },
                geometryMatch: {
                  type: Type.BOOLEAN,
                  description: 'Whether road width, curb profile, and street geometry match.',
                },
                defectResolved: {
                  type: Type.BOOLEAN,
                  description: 'Whether the reported infrastructure defect is genuinely repaired.',
                },
                headline: {
                  type: Type.STRING,
                  description: 'Short clear verdict banner title.',
                },
                detailedAnalysis: {
                  type: Type.STRING,
                  description: '2-3 sentence visual forensic comparison citing specific objects/features seen in both photos.',
                },
                recommendedAction: {
                  type: Type.STRING,
                  description: 'Concrete next civic/legal action based on verdict.',
                },
              },
              required: [
                'verdict',
                'confidenceScore',
                'landmarkMatch',
                'geometryMatch',
                'defectResolved',
                'headline',
                'detailedAnalysis',
                'recommendedAction',
              ],
            },
          },
        })
      );

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({ error: 'Visual closure auditor returned an empty response.' });
        return;
      }

      const parsed = JSON.parse(rawText);
      res.json({ result: parsed });
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  // Optional Google Apps Script Webhook Forwarder (prevents CORS issues during live demos)
  app.post('/api/webhook-proxy', async (req, res) => {
    try {
      const { webhookUrl, payload } = req.body as {
        webhookUrl: string;
        payload: Record<string, unknown>;
      };

      if (!webhookUrl || !webhookUrl.startsWith('https://script.google.com/')) {
        res.status(400).json({
          error: 'Webhook URL must be a valid https://script.google.com/ Google Apps Script Web App URL.',
        });
        return;
      }

      const upstream = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        redirect: 'follow',
      });

      const responseText = await upstream.text();
      res.json({
        ok: upstream.ok,
        status: upstream.status,
        body: responseText.slice(0, 300),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reach Google Apps Script webhook.';
      res.status(502).json({ error: message });
    }
  });

  if (isProduction) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`JawabDe AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
