import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface DistanceResult {
  from: string;
  to: string;
  distanceKm: number;
}

export async function estimateTripDuration(from: string, to: string, operationType: string): Promise<number> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is missing. Falling back to heuristic estimation.");
    return estimateHeuristically(operationType);
  }

  try {
    const prompt = `Estimate the typical duration in hours for a transport trip in Egypt (tourism sector) with the following details:
From: ${from}
To: ${to}
Operation Type: ${operationType}

Return only the estimated number of hours (can be decimal like 1.5). Consider traffic and type of operation.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hours: {
              type: Type.NUMBER,
              description: "Estimated duration in hours."
            }
          },
          required: ["hours"]
        }
      }
    });

    const data = JSON.parse(response.text || '{"hours": 0}');
    return data.hours || estimateHeuristically(operationType);
  } catch (error) {
    console.error("Gemini Estimation Error:", error);
    return estimateHeuristically(operationType);
  }
}

export async function batchEstimateDistances(pairs: { from: string, to: string }[]): Promise<DistanceResult[]> {
  if (!process.env.GEMINI_API_KEY) {
    return pairs.map(p => ({ ...p, distanceKm: 10 })); // dummy
  }

  try {
    const uniquePairs = Array.from(new Set(pairs.map(p => `${p.from}|${p.to}`))).map(s => {
      const [from, to] = s.split('|');
      return { from, to };
    }).slice(0, 20); // Limit to 20 unique pairs to avoid token limits

    const prompt = `For each of the following location pairs in Egypt, estimate the travel distance in Kilometers.
Return as a JSON array of objects with "from", "to", and "distanceKm" (number).
Pairs: ${JSON.stringify(uniquePairs)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              from: { type: Type.STRING },
              to: { type: Type.STRING },
              distanceKm: { type: Type.NUMBER }
            },
            required: ["from", "to", "distanceKm"]
          }
        }
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Batch Gemini Error:", error);
    return pairs.map(p => ({ ...p, distanceKm: 0 }));
  }
}

function estimateHeuristically(operationType: string): number {
  const durations: Record<string, number> = {
    'arrival': 1.5,
    'departure': 1.5,
    'overday_luxor': 14,
    'overday_cairo': 20,
    'transfer_cairo': 6,
    'transfer_aswan': 4,
    'transfer_abu_simbel': 9,
    'internal_transfer': 1,
    'city_tour': 4,
    'sea_trip': 8,
    'safari': 4
  };
  return durations[operationType] || 2;
}
