import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { ExtractedPurchaseBill, PurchaseItem } from "../types";

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

export const extractPurchaseDetailsFromBill = async (billImagesBase64: string[], buyerName: string): Promise<ExtractedPurchaseBill> => {
    try {
        const imageParts = billImagesBase64.map(imgBase64 => ({
            inlineData: {
                mimeType: 'image/jpeg', // Assuming JPEG, can be inferred if needed
                data: imgBase64,
            },
        }));

        const prompt = `
You are a meticulous, hyper-attentive data entry specialist for an Indian pharmacy ERP system. Your ONLY task is to extract structured data from an image of a purchase bill (invoice). You must be extremely accurate.

**Core Principles (NON-NEGOTIABLE):**
1.  **Item Uniqueness:** Every single line item on the invoice is unique. Even if two lines have the same product name, if they have different batch numbers, prices, or expiry dates, they MUST be extracted as separate items in the final JSON array. Do NOT merge them. This is critical for accurate batch tracking.
2.  **Mathematical Supremacy (The Golden Rule):** For EVERY single item, you MUST verify your extracted unit price. The unit price (often 'Rate' or 'Pur. Rate') is the most critical and error-prone field.
    - **Process:** Calculate \`Quantity × Unit Price\`.
    - **Verification:** This result should closely match the 'Amount' or 'Total' for that line item *before* tax.
    - **Correction:** If it doesn't match, you MUST re-examine the image to find the correct unit price. Do NOT invent a price. If a price seems inclusive of tax, calculate the pre-tax base price. If you cannot find a price that satisfies the math, flag it. This step is CRITICAL.
3.  **Buyer Identification:** The buyer is "${buyerName}". Ensure you are not extracting items billed to a different entity.
4.  **Strict Schema Adherence:** Your final output MUST be a single, valid JSON object matching the provided schema. Do not add extra keys or commentary.

**Step-by-Step Thinking Process (MANDATORY):**
1.  **Layout Analysis:** First, analyze the image's overall layout. Identify supplier details (name, GSTIN), invoice number, and date. Identify the main item table and its columns.
2.  **Line-by-Line Extraction & The Golden Rule:** Go through the item table row by row. Extract all details for each line as a distinct object. APPLY THE GOLDEN RULE to validate the \`purchasePrice\`. If it doesn't match, re-evaluate. Is there a discount? Is the price tax-inclusive? Find the correct base unit price.
3.  **Final Review:** Review your entire JSON output against the image one last time, ensuring each line item from the bill corresponds to one object in the "items" array.

**Field-Specific Rules:**
-   \`supplier\`: Supplier/Distributor name.
-   \`invoiceNumber\`: Bill/Invoice number.
-   \`date\`: Bill/Invoice date. Format as YYYY-MM-DD. If year is missing, assume current year.
-   \`supplierGstNumber\`: Supplier's GSTIN, if visible.
-   \`items\`: An array of objects. **Each object represents ONE line item from the bill.**
    -   \`name\`: The product name. Be precise.
    -   \`batch\`: Batch number.
    -   \`expiry\`: Expiry date. Convert "12/25" or "Dec 25" to "2025-12-31".
    -   \`quantity\`: The number of units/strips/bottles purchased.
    -   \`purchasePrice\`: The price PER UNIT *before* GST. This is the most important field. Double-check with the Golden Rule.
    -   \`mrp\`: Maximum Retail Price per unit.
    -   \`gstPercent\`: GST percentage (e.g., 12). If not present, default to 5.
    -   \`hsnCode\`: HSN code for the item.
    -   \`discountPercent\`: Item-level discount percentage. Default to 0 if not present.
    -   \`brand\`: If a brand/company name is distinct from the product name, put it here. Otherwise, leave it empty.
`;

        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart, ...imageParts] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        supplier: { type: Type.STRING },
                        invoiceNumber: { type: Type.STRING },
                        date: { type: Type.STRING, description: "YYYY-MM-DD format" },
                        supplierGstNumber: { type: Type.STRING, nullable: true },
                        items: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    batch: { type: Type.STRING },
                                    expiry: { type: Type.STRING, description: "YYYY-MM-DD format" },
                                    quantity: { type: Type.NUMBER },
                                    purchasePrice: { type: Type.NUMBER },
                                    mrp: { type: Type.NUMBER },
                                    gstPercent: { type: Type.NUMBER },
                                    hsnCode: { type: Type.STRING, nullable: true },
                                    discountPercent: { type: Type.NUMBER, nullable: true },
                                    packType: { type: Type.STRING, nullable: true },
                                    oldMrp: { type: Type.NUMBER, nullable: true },
                                    brand: { type: Type.STRING, nullable: true },
                                    composition: { type: Type.STRING, nullable: true },
                                },
                                required: ["name", "batch", "expiry", "quantity", "purchasePrice", "mrp", "gstPercent"]
                            }
                        }
                    },
                    required: ["supplier", "invoiceNumber", "date", "items"]
                },
            },
        });

        const result: ExtractedPurchaseBill = JSON.parse(response.text);

        if (!result || !result.items) {
            throw new Error("AI could not extract valid data. The response was empty or malformed.");
        }

        return result;

    } catch (error) {
        console.error("Error extracting details from bill:", error);
        if (error instanceof Error) {
            // Provide a more user-friendly message for common errors
            if (error.message.includes("JSON")) {
                throw new Error("Extraction failed: The AI returned an invalid format. Please try again with a clearer image.");
            }
             throw new Error(`Extraction failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during bill extraction.");
    }
};
