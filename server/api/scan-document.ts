import { generateObject, generateText } from "ai";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";

// Helper voor robuuste number parsing (model geeft soms strings terug)
const numberSchema = z.preprocess((val) => {
  if (val === null || val === undefined || val === "") return undefined;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = parseFloat(val.replace(/[^\d.-]/g, ""));
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}, z.number().optional());

const { openaiApiKey } = useRuntimeConfig();

const openai = createOpenAI({
  apiKey: openaiApiKey,
});

const invoiceSchema = z.object({
  success: z.boolean().describe("Whether the document was successfully parsed"),
  documentType: z
    .string()
    .describe("Type of document (invoice, receipt, contract, etc.)"),
  invoiceNumber: z
    .string()
    .optional()
    .nullable()
    .describe("Invoice or document number"),
  date: z.string().optional().nullable().describe("Invoice or document date"),
  dueDate: z
    .string()
    .optional()
    .nullable()
    .describe("Payment due date if applicable"),
  vendor: z
    .object({
      name: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      email: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      taxId: z
        .string()
        .optional()
        .nullable()
        .describe("VAT or tax identification number"),
    })
    .optional()
    .nullable(),
  customer: z
    .object({
      name: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  items: z
    .array(
      z.object({
        description: z.string(),
        quantity: numberSchema,
        unitPrice: numberSchema,
        total: numberSchema,
      }),
    )
    .optional()
    .nullable()
    .describe("Line items from the document"),
  subtotal: numberSchema,
  tax: numberSchema,
  total: numberSchema,
  currency: z
    .string()
    .optional()
    .nullable()
    .describe("Currency code (EUR, USD, etc.)"),
  paymentDetails: z
    .object({
      iban: z.string().optional().nullable(),
      bankName: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
});

export default eventHandler(async (event) => {
  const { documentUrl, documentType, debug } = await readBody(event);

  if (!documentUrl || !documentType) {
    return { error: "Geen document of document type opgegeven" };
  }

  const fileResponse = await fetch(documentUrl);
  const fileBuffer = await fileResponse.arrayBuffer();
  const base64Data = Buffer.from(fileBuffer).toString("base64");

  const messages = [
    {
      role: "system" as const,
      content: `You are a document scanning assistant. Extract all relevant information from the provided document image.
      Focus on invoices, receipts, and financial documents.
      Extract dates, amounts, vendor details, line items, and payment information.
      Return structured data according to the schema. Set success to false if the document cannot be parsed.`,
    },
    {
      role: "user" as const,
      content: [
        {
          type: "text" as const,
          text: `Please scan this document and extract all relevant information including vendor details, amounts, dates, and line items. Return valid JSON only.`,
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
      model: openai("gpt-4o-mini"),
      schemaName: "documentContent",
      schemaDescription: "Structured data extracted from a document",
      schema: invoiceSchema,
      messages,
    });

    if (!response || !response.success) {
      throw new Error("Document kon niet worden gescand");
    }

    return response;
  } catch (error) {
    // Debug mode: haal ruwe response op om te zien wat het model teruggeeft
    if (debug) {
      try {
        const { text: rawResponse } = await generateText({
          model: openai("gpt-4o-mini"),
          messages: [
            ...messages,
            {
              role: "user" as const,
              content:
                "Return the extracted data as a JSON object with these fields: success (boolean), documentType (string), invoiceNumber, date, dueDate, vendor (object with name, address, email, phone, taxId), customer (object with name, address), items (array of objects with description, quantity, unitPrice, total), subtotal, tax, total, currency, paymentDetails (object with iban, bankName).",
            },
          ],
        });

        // Probeer de ruwe response te parsen
        let parsedRaw = null;
        try {
          // Zoek JSON in de response
          const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedRaw = JSON.parse(jsonMatch[0]);
          }
        } catch {
          // Parse failed, geef ruwe tekst terug
        }

        return {
          error: error.message,
          debug: {
            rawResponse,
            parsedRaw,
            validationError: error.cause || error.message,
          },
        };
      } catch (debugError) {
        return {
          error: error.message,
          debugError: debugError.message,
        };
      }
    }

    return { error: error.message };
  }
});
