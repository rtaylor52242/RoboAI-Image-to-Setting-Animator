import { GoogleGenAI, VideoGenerationReferenceType } from "@google/genai";
import { LocationResult } from "../types";

// Helper to get AI client.
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// 1. Search Locations using Google Maps Grounding
export const searchLocations = async (query: string): Promise<{ text: string; locations: LocationResult[] }> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find the top 5 best locations or specific spots matching this description: "${query}". 
      Return a list of specific real-world places.`,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    const text = response.text || "No description found.";
    const candidates = response.candidates || [];
    const locations: LocationResult[] = [];

    if (candidates.length > 0) {
      const groundingMetadata = candidates[0].groundingMetadata;
      if (groundingMetadata?.groundingChunks) {
        groundingMetadata.groundingChunks.forEach((chunk) => {
          if (chunk.web?.uri && chunk.web.title) {
             // Fallback to web results if maps fail, though usually we want maps
             // locations.push({ title: chunk.web.title, uri: chunk.web.uri });
          }
        });
      }
    }

    return { text, locations }; 
  } catch (error) {
    console.error("Search Error:", error);
    throw error;
  }
};

// 2. Generate a High-Quality Background Image for the Location (Nano Banana)
export const generateLocationImage = async (locationName: string): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Create a photorealistic, high-quality 8k image of ${locationName}. Scenic, beautiful lighting, suitable for a travel postcard.`,
          },
        ],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return part.inlineData.data;
      }
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Image Gen Error:", error);
    throw error;
  }
};

// 3. Composite/Edit Image (Nano Banana)
export const compositeImages = async (
  backgroundBase64: string,
  foregroundBase64: string,
  prompt: string
): Promise<string> => {
  const ai = getAiClient();
  
  const finalPrompt = `
    Using the provided images:
    1. The first image is the BACKGROUND/SETTING.
    2. The second image is the PERSON/SUBJECT.
    
    Task: ${prompt || "Place the subject from the second image into the setting of the first image naturally. Match lighting and perspective."}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: backgroundBase64
            }
          },
          {
            inlineData: {
              mimeType: 'image/png',
              data: foregroundBase64
            }
          },
          {
            text: finalPrompt,
          },
        ],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return part.inlineData.data;
      }
    }
    throw new Error("No composite image generated");
  } catch (error) {
    console.error("Composite Error:", error);
    throw error;
  }
};

// 4. Edit Existing Image (Nano Banana)
export const editImage = async (imageBase64: string, prompt: string): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: imageBase64
            }
          },
          {
            text: prompt,
          },
        ],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return part.inlineData.data;
      }
    }
    
    // Log text response for debugging if no image found
    const textPart = parts.find(p => p.text);
    if (textPart) {
        console.warn("Model returned text instead of image:", textPart.text);
    }

    throw new Error("No edited image generated");
  } catch (error) {
    console.error("Edit Error:", error);
    throw error;
  }
};

// 5. Generate Video (Veo)
export const generateVeoVideo = async (
  imageBase64: string,
  prompt: string,
  aspectRatio: "16:9" | "9:16" = "16:9"
): Promise<string> => {
  // Helper to make the API call
  const performGeneration = async () => {
    // Create new client instance right before call to ensure fresh auth from key selection
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt || "Animate this scene naturally.",
      image: {
        imageBytes: imageBase64,
        mimeType: 'image/png',
      },
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: aspectRatio
      }
    });
  };

  let operation;
  
  try {
    // Try generation first. 
    operation = await performGeneration();
  } catch (error: any) {
    console.error("Veo generation error:", error);

    // Check for 404 "Requested entity was not found" in various formats
    // This error typically means the user hasn't selected a billing project for Veo
    const errorMsg = error?.message || error?.toString() || "";
    const nestedErrorMsg = error?.error?.message || "";
    const nestedErrorCode = error?.error?.code;
    const errorString = JSON.stringify(error);
    
    const isNotFound = 
        error.status === 404 || 
        error.code === 404 || 
        nestedErrorCode === 404 ||
        errorMsg.includes("Requested entity was not found") ||
        nestedErrorMsg.includes("Requested entity was not found") ||
        errorString.includes("Requested entity was not found");

    if (isNotFound && window.aistudio) {
        console.log("Veo 404 Error caught (Project/Key selection required). Triggering key selection...");
        // Trigger the key selection dialog
        await window.aistudio.openSelectKey();
        
        // Add a small delay to ensure the key selection state has propagated effectively
        await new Promise(resolve => setTimeout(resolve, 1000)); 
        
        // Retry the operation once after selection
        operation = await performGeneration();
    } else {
      // If not a 404 or not in AI Studio environment, rethrow
      throw error;
    }
  }

  // Poll for completion
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) throw new Error("No video URI returned");

  // Fetch the actual video bytes (proxied via the download link + API Key)
  const downloadUrl = `${videoUri}&key=${process.env.API_KEY}`;
  return downloadUrl;
};