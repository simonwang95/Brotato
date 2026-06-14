import { parseScreenshotWithOpenAi } from "../src/ocrService.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { imageDataUrl, selectedCharacter } =
      typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
    const result = await parseScreenshotWithOpenAi({
      env: process.env,
      imageDataUrl,
      selectedCharacter,
    });

    response.status(result.status).json(result.body);
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
}
