import { generateObject } from "ai";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import type { TemplateField, ScanRequest } from "~~/types/template";

// const numberSchema = z.preprocess((val) => {
//   if (val === null || val === undefined || val === "") return undefined;
//   if (typeof val === "number") return val;
//   if (typeof val === "string") {
//     const parsed = parseFloat(val.replace(/[^\d.-]/g, ""));
//     return isNaN(parsed) ? undefined : parsed;
//   }
//   return undefined;
// }, z.number().optional());

const { openaiApiKey } = useRuntimeConfig();

const openai = createOpenAI({
  apiKey: openaiApiKey,
});

const buildDynamicSchema = (fields: TemplateField[]) => {
  const schemaShape: Record<string, z.ZodTypeAny> = {
    success: z.boolean().describe("Whether the document was successfully parsed"),
  };

  for (const field of fields) {
    let fieldSchema: z.ZodTypeAny;

    switch (field.type) {
      case "text":
        fieldSchema = z.string().describe(field.description);
        break;
      case "number":
        // fieldSchema = numberSchema.describe(field.description);
        fieldSchema = z.number().describe(field.description);
        break;
      case "date":
        fieldSchema = z
          .string()
          .describe(`${field.description} (ISO date format or original format from document)`);
        break;
      case "boolean":
        fieldSchema = z.boolean().describe(field.description);
        break;
      case "array":
        fieldSchema = z.array(z.string()).describe(field.description);
        break;
      default:
        fieldSchema = z.string().describe(field.description);
    }

    // if (!field.required) {
    //   fieldSchema = fieldSchema.optional().nullable();
    // }

    schemaShape[field.name] = fieldSchema;
  }

  return z.object(schemaShape);
};

const buildSystemPrompt = (fields: TemplateField[]): string => {
  const fieldDescriptions = fields
    .map((f) => `- ${f.label} (${f.name}): ${f.description}${f.required ? " [REQUIRED]" : ""}`)
    .join("\n");

  return `You are a document scanning assistant. Extract the following information from the provided document:

${fieldDescriptions}

Instructions:
- Extract values exactly as they appear in the document when appropriate
- For dates, preserve the original format or use ISO format (YYYY-MM-DD)
- For numbers, extract the numeric value only
- For arrays, extract all relevant items as a list
- For booleans, determine true/false based on the document content
- Set success to true if you could extract at least some of the requested fields
- Set success to false only if the document is unreadable or completely irrelevant`;
};

export default eventHandler(async (event) => {
  const body = await readBody<ScanRequest>(event);
  const { documentUrl, documentType, fields } = body;

  if (!documentUrl || !documentType) {
    return { error: "Geen document of document type opgegeven" };
  }

  if (!fields || fields.length === 0) {
    return { error: "Geen velden opgegeven" };
  }

  const fileResponse = await fetch(documentUrl);
  const fileBuffer = await fileResponse.arrayBuffer();
  const base64Data = Buffer.from(fileBuffer).toString("base64");

  const dynamicSchema = buildDynamicSchema(fields);
  const systemPrompt = buildSystemPrompt(fields);

  const messages = [
    {
      role: "system" as const,
      content: systemPrompt,
    },
    {
      role: "user" as const,
      content: [
        {
          type: "text" as const,
          text: "Please scan this document and extract the requested information. Return valid JSON only.",
        },
        {
          type: "file" as const,
          mediaType: documentType,
          data: base64Data,
        },
      ],
    },
  ];

  try {
    const { object: response } = await generateObject({
      model: openai("gpt-5-mini"),
      schemaName: "extractedData",
      schemaDescription: "Structured data extracted from a document based on user-defined template",
      schema: dynamicSchema,
      messages,
    });

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Onbekende fout";
    return { error: errorMessage, success: false };
  }
});
