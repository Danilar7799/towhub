/*
 * Transcript Parser — robust extraction of job details from AI dispatcher calls
 * 
 * Strategy:
 * 1. Fast regex parsing (works for clear, structured transcripts)
 * 2. LLM fallback (Gemini/Groq) for messy, conversational, or ambiguous transcripts
 */

export interface ParsedTranscript {
  customerName?: string;
  pickupAddress?: string;
  destinationAddress?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  vehiclePlate?: string;
  serviceType?: string;
  urgency?: string;
  confidence?: number;
}

/**
 * Regex-based parsing - fast, no API costs, works for structured transcripts
 */
export function parseTranscriptRegex(text: string): ParsedTranscript {
  const lower = text.toLowerCase();

  // Customer name patterns
  const namePatterns = [
    /(?:my name is|i'm|this is|calling for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /(?:customer|client|name):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
  ];
  let customerName: string | undefined;
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) { customerName = match[1].trim(); break; }
  }

  // Address patterns - pickup
  const pickupPatterns = [
    /(?:pickup|pick up|come to|at|from|located at|address is|tow from)\s+(.+?)(?:\.|,|$)/i,
    /(\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|highway|hwy|freeway|fwy))\b/i,
    /(?:at|near|by)\s+(\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct))/i,
  ];
  let pickupAddress: string | undefined;
  for (const pattern of pickupPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) { pickupAddress = match[1].trim().slice(0, 200); break; }
  }

  // Destination address
  const destPatterns = [
    /(?:to|going to|destination|drop off|deliver to|take it to)\s+(.+?)(?:\.|,|$)/i,
    /(\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct))\b/i,
  ];
  let destinationAddress: string | undefined;
  for (const pattern of destPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) { destinationAddress = match[1].trim().slice(0, 200); break; }
  }

  // Vehicle year
  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  const vehicleYear = yearMatch ? parseInt(yearMatch[0]) : undefined;

  // Vehicle make
  const makes = ["honda", "toyota", "ford", "chevy", "chevrolet", "nissan", "bmw", "mercedes", "audi", "hyundai", "kia", "mazda", "subaru", "dodge", "ram", "gmc", "jeep", "lexus", "acura", "volkswagen", "vw", "volvo", "tesla", "rivian", "lucid", "cadillac", "buick", "chrysler", "fiat", "alfa romeo", "maserati", "ferrari", "lamborghini", "porsche", "bentley", "rolls royce", "mini", "smart", "mitsubishi", "suzuki", "isuzu"];
  const vehicleMake = makes.find(m => lower.includes(m));

  // Vehicle model - try to find make + following words
  let vehicleModel: string | undefined;
  if (vehicleMake) {
    const modelRegex = new RegExp(`${vehicleMake}\\s+([a-zA-Z0-9\\s\\-]+?)(?:\\s|,|\\.|$)`, "i");
    const modelMatch = text.match(modelRegex);
    vehicleModel = modelMatch?.[1]?.trim().slice(0, 50);
  }

  // Vehicle color
  const colors = ["black", "white", "silver", "gray", "grey", "red", "blue", "green", "yellow", "orange", "brown", "beige", "gold", "purple", "pink", "maroon", "navy", "teal"];
  const vehicleColor = colors.find(c => lower.includes(c));

  // License plate - common patterns
  const platePatterns = [
    /(?:plate|license|tag)\s+(?:is\s+)?([A-Z0-9]{4,8})/i,
    /\b([A-Z]{1,3}\d{1,4}[A-Z]?)\b/,
    /\b(\d{1,4}[A-Z]{1,4})\b/,
  ];
  let vehiclePlate: string | undefined;
  for (const pattern of platePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) { vehiclePlate = match[1].toUpperCase(); break; }
  }

  // Service type
  const serviceTypes = ["tow", "lockout", "jump start", "jumpstart", "tire change", "fuel delivery", "winch out", "winchout", "impound release"];
  const serviceType = serviceTypes.find(s => lower.includes(s.toLowerCase()));

  // Urgency
  const urgencyKeywords = ["emergency", "urgent", "asap", "right now", "immediately", "stuck", "broken down", "accident", "crash"];
  const urgency = urgencyKeywords.some(k => lower.includes(k)) ? "high" : "normal";

  return {
    customerName,
    pickupAddress,
    destinationAddress,
    vehicleMake,
    vehicleModel,
    vehicleYear,
    vehicleColor,
    vehiclePlate,
    serviceType,
    urgency,
    confidence: calculateRegexConfidence({ customerName, pickupAddress, destinationAddress, vehicleMake, vehicleModel }),
  };
}

function calculateRegexConfidence(parsed: ParsedTranscript): number {
  let score = 0;
  if (parsed.customerName) score += 20;
  if (parsed.pickupAddress) score += 30;
  if (parsed.destinationAddress) score += 15;
  if (parsed.vehicleMake) score += 15;
  if (parsed.vehicleModel) score += 10;
  if (parsed.vehicleYear) score += 5;
  if (parsed.vehicleColor) score += 5;
  return Math.min(score, 100);
}

/**
 * LLM-based parsing - handles conversational, messy, or ambiguous transcripts
 * Uses free Gemini API or Groq for fast inference
 */
export async function parseTranscriptWithLLM(text: string): Promise<ParsedTranscript | null> {
  // Try Groq first (free, fast)
  const groqResult = await tryGroqParse(text);
  if (groqResult) return groqResult;

  // Fallback to Gemini (free tier)
  const geminiResult = await tryGeminiParse(text);
  if (geminiResult) return geminiResult;

  return null;
}

async function tryGroqParse(text: string): Promise<ParsedTranscript | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const prompt = buildParsePrompt(text);
    
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant", // Fast, free model
        messages: [
          { role: "system", content: "You are a transcript parser for a towing dispatch system. Extract structured data from call transcripts. Return ONLY valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      console.warn("[LLM Parse] Groq API error:", res.status);
      return null;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    return validateParsedTranscript(parsed);
  } catch (err) {
    console.warn("[LLM Parse] Groq failed:", err);
    return null;
  }
}

async function tryGeminiParse(text: string): Promise<ParsedTranscript | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return null;

  try {
    const prompt = buildParsePrompt(text);
    
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      console.warn("[LLM Parse] Gemini API error:", res.status);
      return null;
    }

    const data = await res.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) return null;

    const parsed = JSON.parse(content);
    return validateParsedTranscript(parsed);
  } catch (err) {
    console.warn("[LLM Parse] Gemini failed:", err);
    return null;
  }
}

function buildParsePrompt(text: string): string {
  return `Extract structured job details from this towing dispatch call transcript. Return ONLY valid JSON with these fields (all optional):

{
  "customerName": "string or null",
  "pickupAddress": "string or null", 
  "destinationAddress": "string or null",
  "vehicleMake": "string or null",
  "vehicleModel": "string or null",
  "vehicleYear": number or null,
  "vehicleColor": "string or null",
  "vehiclePlate": "string or null",
  "serviceType": "tow|lockout|jump_start|tire_change|fuel_delivery|winch_out|impound_release|other|null",
  "urgency": "high|normal",
  "confidence": 0-100
}

Rules:
- pickupAddress: exact address or cross streets where vehicle is located
- destinationAddress: where to tow the vehicle (repair shop, home, impound lot, etc.)
- vehicleMake/Model/Year/Color/Plate: from customer description
- serviceType: what service they need
- urgency: "high" if emergency/accident/ASAP/stuck, else "normal"
- confidence: your confidence 0-100

Transcript:
${text}`;
}

function validateParsedTranscript(obj: unknown): ParsedTranscript | null {
  if (!obj || typeof obj !== "object") return null;
  
  const parsed = obj as Record<string, unknown>;
  const result: ParsedTranscript = {};
  
  if (typeof parsed.customerName === "string") result.customerName = parsed.customerName.slice(0, 100);
  if (typeof parsed.pickupAddress === "string") result.pickupAddress = parsed.pickupAddress.slice(0, 200);
  if (typeof parsed.destinationAddress === "string") result.destinationAddress = parsed.destinationAddress.slice(0, 200);
  if (typeof parsed.vehicleMake === "string") result.vehicleMake = parsed.vehicleMake.toLowerCase().slice(0, 30);
  if (typeof parsed.vehicleModel === "string") result.vehicleModel = parsed.vehicleModel.slice(0, 50);
  if (typeof parsed.vehicleYear === "number" && parsed.vehicleYear >= 1900 && parsed.vehicleYear <= 2030) result.vehicleYear = parsed.vehicleYear;
  if (typeof parsed.vehicleColor === "string") result.vehicleColor = parsed.vehicleColor.toLowerCase().slice(0, 20);
  if (typeof parsed.vehiclePlate === "string") result.vehiclePlate = parsed.vehiclePlate.toUpperCase().slice(0, 15);
  if (typeof parsed.serviceType === "string") result.serviceType = parsed.serviceType;
  if (typeof parsed.urgency === "string") result.urgency = parsed.urgency;
  if (typeof parsed.confidence === "number") result.confidence = Math.max(0, Math.min(100, parsed.confidence));
  
  return result;
}