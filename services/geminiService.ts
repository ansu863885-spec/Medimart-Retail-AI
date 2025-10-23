import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { ExtractedPurchaseBill } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAiInsights = async (): Promise<string[]> => {
  try {
    const prompt = `
      You are an AI assistant for Medimart, a pharmacy ERP system.
      Analyze the following daily data summary and provide 3 brief, actionable insights for the pharmacy manager.
      The insights should be concise, direct, and under 25 words each.
      Format the output as a JSON array of strings.

      Data Summary:
      - Today's Sales: ₹45,231 (12.5% higher than yesterday)
      - Gross Margin: 25%
      - Low Stock Items: 15
      - Near Expiry Items (next 30 days): 8
      - Top selling category: Over-the-Counter (OTC)
      - Fast-moving items: Crocin, Dolo 650, Volini Gel
      - Slow-moving items: 'BrandX Cough Syrup', 'HealthPlus Multivitamins'

      Example JSON output:
      ["Insight 1 text.", "Insight 2 text.", "Insight 3 text."]
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          },
        },
      },
    });
    
    const insights: string[] = JSON.parse(response.text);

    if (!Array.isArray(insights) || insights.some(i => typeof i !== 'string')) {
        throw new Error("AI response is not in the expected format.");
    }

    return insights;

  } catch (error) {
    console.error("Error fetching AI insights:", error);
    return [
      "AI insight generation failed. Consider promotions on fast-moving items like Dolo 650.",
      "Check inventory for items nearing expiry within the next 30 days.",
      "Sales are trending up. Ensure you have enough stock of OTC products.",
    ];
  }
};

export const generateTextToSpeech = async (text: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            return base64Audio;
        }
        throw new Error("No audio data received from TTS API.");
    } catch (error) {
        console.error("Error generating text to speech:", error);
        throw error;
    }
};

export const extractPurchaseDetailsFromBill = async (billImageBase64: string): Promise<ExtractedPurchaseBill> => {
    try {
        const imagePart = {
            inlineData: {
                mimeType: 'image/jpeg',
                data: billImageBase64,
            },
        };

        const textPart = {
            text: `Analyze this pharmacy purchase bill image. Extract the supplier name, invoice number, and bill date. Also, extract all line items with their name, category (e.g., Pain Relief, Vitamins, First Aid, Cold & Cough, Personal Care), batch number, expiry date (in YYYY-MM-DD format), quantity, purchase price (price per unit before tax), MRP (Maximum Retail Price per unit), and GST percentage. Provide the response in the specified JSON format. If a value is not found, use an appropriate empty or default value (e.g., empty string, 0).`,
        };

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                supplier: { type: Type.STRING, description: "Supplier's name" },
                invoiceNumber: { type: Type.STRING, description: "Invoice or Bill number" },
                date: { type: Type.STRING, description: "Bill date in YYYY-MM-DD format" },
                items: {
                    type: Type.ARRAY,
                    description: "List of purchased items",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING, description: "Product name" },
                            category: { type: Type.STRING, description: "Product category (e.g., Pain Relief, Vitamins)" },
                            batch: { type: Type.STRING, description: "Batch number" },
                            expiry: { type: Type.STRING, description: "Expiry date (YYYY-MM-DD)" },
                            quantity: { type: Type.NUMBER, description: "Quantity purchased" },
                            purchasePrice: { type: Type.NUMBER, description: "Price per unit without tax" },
                            mrp: { type: Type.NUMBER, description: "Maximum Retail Price per unit" },
                            gstPercent: { type: Type.NUMBER, description: "GST percentage for the item" },
                        },
                        required: ["name", "category", "quantity", "purchasePrice", "mrp"]
                    }
                }
            },
            required: ["supplier", "invoiceNumber", "date", "items"],
        };
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema,
            },
        });

        const extractedData = JSON.parse(response.text);
        
        if (!extractedData.supplier || !Array.isArray(extractedData.items)) {
            throw new Error("Invalid data structure received from AI.");
        }

        return extractedData as ExtractedPurchaseBill;

    } catch (error) {
        console.error("Error extracting bill details:", error);
        return {
            supplier: 'Error Reading Bill',
            invoiceNumber: '',
            date: new Date().toISOString().split('T')[0],
            items: [],
        };
    }
};