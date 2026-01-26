export type FieldType = "text" | "number" | "date" | "boolean" | "array";

export interface TemplateField {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  description: string;
  required: boolean;
}

export interface ExtractionTemplate {
  id: string;
  name: string;
  description: string | null;
  fields: TemplateField[];
  created_at: string;
  updated_at: string;
}

export interface CreateTemplatePayload {
  name: string;
  description?: string;
  fields: Omit<TemplateField, "id">[];
}

export interface UpdateTemplatePayload {
  name?: string;
  description?: string;
  fields?: TemplateField[];
}

export interface ScanRequest {
  documentUrl: string;
  documentType: string;
  fields: TemplateField[];
}

export interface ScanResult {
  success: boolean;
  [key: string]: unknown;
}
