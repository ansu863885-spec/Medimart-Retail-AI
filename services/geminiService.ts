import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { ExtractedPurchaseBill } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const urlToBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            // Return only the base64 part
            resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

interface DailyDataSummary {
    todaySales: number;
    yesterdaySales: number;
    lowStockItemsCount: number;
    lowStockItemExamples: string[];
    nearExpiryItemsCount: number;
    nearExpiryItemExamples: string[];
    topSellingCategory: string;
    fastMovingItemExamples: string[];
}


export const getAiInsights = async (summary: DailyDataSummary): Promise<string[]> => {
  try {
    const prompt = `
      You are an AI assistant for Medimart, a pharmacy ERP system.
      Analyze the following daily data summary and provide 3 brief, actionable insights for the pharmacy manager.
      The insights should be concise, direct, and under 25 words each. They should suggest actions the user can take within the app.
      Format the output as a JSON array of strings.

      Data Summary:
      - Today's Sales: ₹${summary.todaySales.toFixed(2)}
      - Yesterday's Sales: ₹${summary.yesterdaySales.toFixed(2)}
      - Low Stock Items: ${summary.lowStockItemsCount} items are low on stock. Examples: ${summary.lowStockItemExamples.join(', ') || 'None'}.
      - Near Expiry Items (next 30 days): ${summary.nearExpiryItemsCount} items. Examples: ${summary.nearExpiryItemExamples.join(', ') || 'None'}.
      - Top selling category today: ${summary.topSellingCategory || 'N/A'}
      - Fast-moving items today: ${summary.fastMovingItemExamples.join(', ') || 'None'}

      Example insights (tailor them to the data):
      - "Sales are up from yesterday! Check the Sales History for top-selling products."
      - "You have ${summary.lowStockItemsCount} low stock items. Go to Inventory to create a Purchase Order."
      - "${summary.nearExpiryItemExamples.length > 0 ? summary.nearExpiryItemExamples[0] : 'An item'} is expiring soon. Consider creating a promotion for it."
      - "${summary.topSellingCategory} is your top category. Ensure stock levels are high for these products."

      Generate 3 new insights based on the provided data summary.
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
      "Review your sales trends in the 'Reports' section.",
      "Check inventory for low-stock items that may need reordering.",
      "Consider creating a promotion for slow-moving products.",
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

export const generatePromotionalImage = async (prompt: string, logoUrl: string): Promise<string> => {
    try {
        let logoBase64: string;
        let mimeType = 'image/png'; // default

        if (logoUrl.startsWith('data:')) {
            const parts = logoUrl.match(/^data:(image\/[a-z]+);base64,(.*)$/);
            if (!parts || parts.length < 3) {
                throw new Error("Invalid data URL for logo.");
            }
            mimeType = parts[1];
            logoBase64 = parts[2];
        } else {
            // It's a regular URL, fetch and convert
            logoBase64 = await urlToBase64(logoUrl);
        }
        
        const imagePart = {
            inlineData: {
                mimeType,
                data: logoBase64,
            },
        };

        const textPart = {
            text: `You are a creative designer for an Indian pharmacy. Create a professional and appealing promotional image based on the following request. The image should be suitable for Indian festivals and offers. Please incorporate the provided pharmacy logo naturally into the design.

            Request: "${prompt}"`,
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        
        throw new Error("No image was generated by the AI.");

    } catch (error) {
        console.error("Error generating promotional image:", error);
        throw new Error("Failed to generate the promotional image. Please try again.");
    }
};

export const extractPurchaseDetailsFromBill = async (billImageBase64: string, buyerName: string): Promise<ExtractedPurchaseBill> => {
    try {
        const imagePart = {
            inlineData: {
                mimeType: 'image/jpeg',
                data: billImageBase64,
            },
        };

        const textPart = {
            text: `You are an expert pharmacy data entry assistant. Your task is to meticulously analyze the provided pharmacy purchase bill image.

This is a purchase bill for a pharmacy named "${buyerName}". Your goal is to extract the details of the **SELLER (Supplier/Distributor)**. Do not extract details for the buyer, which is "${buyerName}".

**Supplier (Seller) Information:**
1.  **Supplier Name:** The name of the distributor or company that issued the invoice. This is the **SELLER**. It must NOT be "${buyerName}".
2.  **Supplier GSTIN:** The GST Identification Number of the supplier/seller.
3.  **Invoice Number:** The unique bill or invoice number.
4.  **Bill Date:** The date of the invoice. Parse any format (e.g., DD-MM-YYYY, MM/DD/YY, DD Mon YYYY) and return it strictly in **YYYY-MM-DD** format.

**Line Items:**
For each product listed, extract the following details. Be very precise.

*   **name:** The primary name of the product.
*   **brand:** The brand or manufacturer of the product.
*   **category:** Classify the product into one of these categories: "Pain Relief", "Vitamins & Supplements", "First Aid", "Cold & Cough", "Personal Care", "Baby Care", "Prescription Drugs", "Herbal & Ayurvedic", "Medical Devices", "General".
*   **hsnCode:** The HSN/SAC code. If not present, leave it as an empty string.
*   **batch:** The batch number or lot number.
*   **expiry:** The expiry date. Convert it to **YYYY-MM-DD** format.
*   **quantity:** The number of units purchased. This is crucial. It is often labeled 'Qty'. If the quantity is written in a format like "10+2" or "7+1", this signifies a scheme where you get free items. **Only extract the first number (the purchased quantity), not the free quantity.** For example, for "10+2", you must extract \`10\`. For "7+1", extract \`7\`. Do not add them together. Distinguish the quantity from other numbers on the line like rate, price, or total amount.
*   **purchasePrice:** The **price per single unit** *before* any taxes (GST). Do not use the total line item amount.
*   **mrp:** The Maximum Retail Price **per single unit**.
*   **gstPercent:** The GST percentage applied to the item (e.g., 5, 12, 18).

**Instructions:**
*   Pay close attention to unit prices versus total amounts.
*   Provide the response strictly in the specified JSON format.
*   If a specific value for a field is not found on the bill, use an appropriate empty or default value (e.g., an empty string for text, 0 for numbers).`,
        };

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                supplier: { type: Type.STRING, description: "Supplier's name" },
                supplierGstNumber: { type: Type.STRING, description: "Supplier's GST Identification Number" },
                invoiceNumber: { type: Type.STRING, description: "Invoice or Bill number" },
                date: { type: Type.STRING, description: "Bill date in YYYY-MM-DD format" },
                items: {
                    type: Type.ARRAY,
                    description: "List of purchased items",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING, description: "Product name" },
                            brand: { type: Type.STRING, description: "Product brand or manufacturer" },
                            category: { type: Type.STRING, description: "Product category (e.g., Pain Relief, Vitamins)" },
                            hsnCode: { type: Type.STRING, description: "HSN/SAC code for the product" },
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