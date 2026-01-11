
import { GoogleGenAI, Type } from "@google/genai";
import { UserData, FinancialHealth, FinanceEntry, EntryType, GroundingSource } from "../types";

export interface ValuationResult {
  estimatedValue: number;
  currency: string;
  reasoning: string;
  sources: GroundingSource[];
}

export const fetchExchangeRates = async (baseCurrency: string, targetCurrencies: string[]): Promise<Record<string, number>> => {
  if (targetCurrencies.length === 0) return { [baseCurrency]: 1 };
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const targets = Array.from(new Set(targetCurrencies)).filter(c => c !== baseCurrency);
  
  if (targets.length === 0) return { [baseCurrency]: 1 };

  const prompt = `Find the current real-time exchange rates for 1 ${baseCurrency} to the following currencies: ${targets.join(', ')}. 
  Return the results as a JSON object with a 'rates' key containing an array of objects.
  Base currency: ${baseCurrency}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          rates: {
            type: Type.ARRAY,
            description: "List of exchange rates relative to the base currency",
            items: {
              type: Type.OBJECT,
              properties: {
                code: {
                  type: Type.STRING,
                  description: "The currency code (e.g., USD, EUR, GBP)",
                },
                rate: {
                  type: Type.NUMBER,
                  description: "The conversion rate from the base currency",
                }
              },
              required: ["code", "rate"],
              propertyOrdering: ["code", "rate"]
            }
          }
        },
        required: ["rates"]
      }
    },
  });

  try {
    const data = JSON.parse(response.text || '{}');
    const rawRates = data.rates || [];
    const rates: Record<string, number> = { [baseCurrency]: 1 };
    if (Array.isArray(rawRates)) {
      rawRates.forEach((item: any) => {
        if (item.code && typeof item.rate === 'number') {
          rates[item.code] = item.rate;
        }
      });
    }
    return rates;
  } catch (e) {
    console.error("Failed to parse exchange rates", e);
    return { [baseCurrency]: 1 };
  }
};

export const estimatePropertyValuation = async (
  address: string, 
  plotSize?: string, 
  propertyType?: string
): Promise<ValuationResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const typeStr = propertyType ? `a ${propertyType}` : 'a property';
  const sizeStr = plotSize ? ` with a size of ${plotSize}` : '';
  
  const prompt = `Research the current market value for ${typeStr} at: ${address}${sizeStr}. 
  Find recent sales of similar properties in the immediate vicinity. Factor in the land size/plot size if provided.
  Search for current real estate listings and neighborhood price-per-square-foot trends.
  Return an estimated total market value in numerical form and a brief explanation of how the size and location influenced this number.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources: GroundingSource[] = groundingChunks
    .filter((chunk: any) => chunk.web)
    .map((chunk: any) => ({
      title: chunk.web.title || 'Source',
      uri: chunk.web.uri
    }));

  let estimatedValue = 0;
  let currency = 'USD';
  let reasoning = response.text || '';

  const priceMatch = reasoning.match(/\$?(\d{1,3}(,\d{3})*(\.\d+)?)/);
  if (priceMatch) {
    estimatedValue = parseFloat(priceMatch[1].replace(/,/g, ''));
  }

  return { estimatedValue, currency, reasoning, sources };
};

export const analyzeFinancialHealth = async (data: UserData): Promise<FinancialHealth> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Act as a supportive financial coach for ${data.settings.userName}. 
  Analyze entries (Normalized to ${data.settings.currency}): ${JSON.stringify(data.entries)}.
  Goals: ${JSON.stringify(data.goals)}.
  Rule: Use a warm, encouraging tone. Output strictly JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          safetyNetScore: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          netWorth: { type: Type.NUMBER },
          monthlyCashFlow: { type: Type.NUMBER },
          liquidityRatio: { type: Type.NUMBER },
          gapAnalysis: {
            type: Type.OBJECT,
            properties: {
              missingInsurance: { type: Type.ARRAY, items: { type: Type.STRING } },
              riskWarnings: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["missingInsurance", "riskWarnings"]
          }
        },
        required: ["score", "safetyNetScore", "summary", "recommendations", "netWorth", "monthlyCashFlow", "liquidityRatio", "gapAnalysis"]
      }
    }
  });

  return JSON.parse(response.text || '{}') as FinancialHealth;
};

export const processDocument = async (base64Data: string, mimeType: string): Promise<Partial<FinanceEntry>[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `EXTRACT EVERY TRANSACTION FROM THIS FINANCIAL STATEMENT.
  
  CONTEXT: This may be a multi-page document. Ensure you capture items from the start to the end of the visible ledger.
  
  DATA FIELDS:
  - 'name': Merchant or primary description (clean, no reference codes).
  - 'amount': Absolute numerical value.
  - 'currency': ISO code (USD, GBP, EUR, etc.).
  - 'date': YYYY-MM-DD.
  
  STRATEGIC CATEGORIZATION:
  You MUST categorize every entry into exactly ONE of:
  - 'Income': Salary, dividends, interest, deposits.
  - 'Needs': Rent, utilities, groceries, transport, essential insurance.
  - 'Wants': Dining, leisure, travel, shopping.
  - 'Debt': Loan repayments, mortgage interest, credit card fees.
  - 'Savings': Transfers to savings accounts, emergency funds.
  - 'Investments': Stock purchases, real estate capital, pension contributions.

  ENTRY TYPE:
  - 'ASSET' for all deposits or positive cash movements.
  - 'EXPENSE' for all withdrawals or negative cash movements.
  
  OUTPUT: Return a JSON object with a 'transactions' key containing an array.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          transactions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                currency: { type: Type.STRING },
                date: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['ASSET', 'EXPENSE', 'BILL', 'LIABILITY'] },
                category: { type: Type.STRING, enum: ['Income', 'Needs', 'Wants', 'Debt', 'Savings', 'Investments'] },
                referenceNumber: { type: Type.STRING }
              },
              required: ["name", "amount", "date", "type", "category"]
            }
          }
        },
        required: ["transactions"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text || '{}');
    return data.transactions || [];
  } catch (e) {
    console.error("OCR Parse error", e);
    return [];
  }
};
