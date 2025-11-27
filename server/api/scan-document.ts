import { generateObject } from "ai";
import { z } from "zod";
import {createOpenAI} from "@ai-sdk/openai";

const { openaiApiKey } = useRuntimeConfig()

const openai = createOpenAI({
  apiKey: openaiApiKey,
});

const invoiceSchema = z.object({
  success: z.boolean().describe("Whether the document was successfully parsed"),
  documentType: z.string().describe("Type of document (invoice, receipt, contract, etc.)"),
  invoiceNumber: z.string().optional().describe("Invoice or document number"),
  date: z.string().optional().describe("Invoice or document date"),
  dueDate: z.string().optional().describe("Payment due date if applicable"),
  vendor: z.object({
    name: z.string().optional(),
    address: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    taxId: z.string().optional().describe("VAT or tax identification number"),
  }).optional(),
  customer: z.object({
    name: z.string().optional(),
    address: z.string().optional(),
  }).optional(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number().optional(),
    unitPrice: z.number().optional(),
    total: z.number().optional(),
  })).optional().describe("Line items from the document"),
  subtotal: z.number().optional(),
  tax: z.number().optional(),
  total: z.number().optional(),
  currency: z.string().optional().describe("Currency code (EUR, USD, etc.)"),
  paymentDetails: z.object({
    iban: z.string().optional(),
    bankName: z.string().optional(),
  }).optional(),
});

export default eventHandler(async (event) => {
  const { documentUrl, documentType } = await readBody(event);

  if (!documentUrl || !documentType) {
    return { error: "Geen document of document type opgegeven" };
  }

  try {
    const fileResponse = await fetch(documentUrl);
    const fileBuffer = await fileResponse.arrayBuffer();
    const base64Data = Buffer.from(fileBuffer).toString('base64');

    const { object: response } = await generateObject({
      model: openai('gpt-5-mini'),
      schemaName: 'documentContent',
      schemaDescription: 'Structured data extracted from a document',
      schema: invoiceSchema,
      messages: [
        {
          role: 'system',
          content: `You are a document scanning assistant. Extract all relevant information from the provided document image.
          Focus on invoices, receipts, and financial documents.
          Extract dates, amounts, vendor details, line items, and payment information.
          Return structured data according to the schema. Set success to false if the document cannot be parsed.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Please scan this document and extract all relevant information including vendor details, amounts, dates, and line items.`,
            },
            {
              type: 'file',
              mediaType: documentType,
              data: base64Data
            },
          ],
        },
      ],
    });

    if (!response || !response.success) {
      throw new Error("Document kon niet worden gescand");
    }

    return response;
  } catch (error) {
    return { error: error.message };
  }
});