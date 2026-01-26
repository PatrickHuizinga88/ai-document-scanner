import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const { openaiApiKey } = useRuntimeConfig();

const openai = createOpenAI({
  apiKey: openaiApiKey,
});

interface DocumentInput {
  url: string;
  type: string;
  name: string;
}

export default eventHandler(async (event) => {
  const { documents } = await readBody<{ documents: DocumentInput[] }>(event);

  if (!documents || documents.length < 2) {
    return { error: "Minimaal 2 documenten vereist voor vergelijking" };
  }

  try {
    // Fetch and convert all documents to base64
    const documentContents = await Promise.all(
      documents.map(async (doc) => {
        const fileResponse = await fetch(doc.url);
        const fileBuffer = await fileResponse.arrayBuffer();
        const base64Data = Buffer.from(fileBuffer).toString("base64");
        return {
          name: doc.name,
          type: doc.type,
          data: base64Data,
        };
      }),
    );

    // Build content array with all documents using the correct format
    const userContent: Array<
      | { type: "text"; text: string }
      | { type: "image"; image: string; mimeType?: string }
      | { type: "file"; data: string; mimeType: string }
    > = [
      {
        type: "text",
        text: `Analyseer en vergelijk de volgende ${documents.length} verzekeringsdocumenten/polissen. Geef een gedetailleerde vergelijking.`,
      },
    ];

    // Add each document to the content
    documentContents.forEach((doc, index) => {
      userContent.push({
        type: "text",
        text: `\n--- Document ${index + 1}: ${doc.name} ---`,
      });

      // Check if it's an image or PDF
      if (doc.type.startsWith("image/")) {
        userContent.push({
          type: "image",
          image: `data:${doc.type};base64,${doc.data}`,
          mimeType: doc.type,
        });
      } else {
        // For PDFs and other files
        userContent.push({
          type: "file",
          data: `data:${doc.type};base64,${doc.data}`,
          mimeType: doc.type,
        });
      }
    });

    const systemPrompt = `Je bent een expert verzekeringsadviseur die gespecialiseerd is in het vergelijken van verzekeringspolissen.

Analyseer de geüploade polisdocumenten en maak een uitgebreide vergelijking. Gebruik de volgende structuur in je antwoord:

## 📋 Overzicht Polissen
Geef een korte samenvatting van elke polis (verzekeraar, type, ingangsdatum, etc.)

## 💰 Premievergelijking
Vergelijk de premies/kosten van de verschillende polissen

## ✅ Dekkingen
Maak een overzichtelijke vergelijking van wat wel en niet gedekt is per polis. Gebruik waar mogelijk tabellen of lijsten.

## ⚠️ Belangrijke Verschillen
Highlight de belangrijkste verschillen tussen de polissen die impact kunnen hebben op de keuze

## 🔍 Eigen Risico & Voorwaarden
Vergelijk eigen risico's, uitsluitingen en speciale voorwaarden

## 💡 Aanbeveling
Geef een objectief advies over welke polis het beste past bij verschillende situaties/behoeften

## 📝 Opmerkingen
Eventuele aanvullende opmerkingen of aandachtspunten

Gebruik duidelijke Nederlandse taal en maak het overzichtelijk met markdown formatting.
Als je bepaalde informatie niet kunt vinden in de documenten, geef dit dan duidelijk aan.`;

    const { text: comparisonResult } = await generateText({
      model: openai("gpt-4o"),
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userContent,
        },
      ],
    });

    return {
      success: true,
      comparison: comparisonResult,
      documentsCompared: documents.length,
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Onbekende fout opgetreden";
    return { error: errorMessage };
  }
});
