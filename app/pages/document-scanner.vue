<script setup lang="ts">
import { CloudUpload, Code, Check, Pencil } from "lucide-vue-next";
import type { ExtractionTemplate, TemplateField, ScanResult } from "~/types/template";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import TemplateSelector from "@/components/templates/TemplateSelector.vue";
import TemplateEditor from "@/components/templates/TemplateEditor.vue";
import ScanResultField from "@/components/scanner/ScanResultField.vue";
import CopyButton from "@/components/scanner/CopyButton.vue";

const supabase = useSupabaseClient();
const route = useRoute();

const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const loading = ref(false);
const result = ref<ScanResult | null>(null);
const error = ref<string | null>(null);

const selectedTemplateId = ref<string | null>((route.query.template as string) || null);
const showEditorDialog = ref(false);
const editingTemplate = ref<ExtractionTemplate | null>(null);
const savingTemplate = ref(false);

const showRawJson = ref(false);

const ACCEPTED_FILE_TYPES = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/tiff": [".tiff", ".tif"],
};

const { data: templates, status } = useLazyAsyncData(
  "scanner-templates",
  async () => {
    const { data, error: fetchError } = await supabase
      .from("extraction_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) throw fetchError;
    return data as ExtractionTemplate[];
  },
  { default: () => [] },
);

const currentTemplate = computed(() => {
  if (!selectedTemplateId.value) return null;
  return templates.value.find((t) => t.id === selectedTemplateId.value) || null;
});

watch(selectedTemplateId, () => {
  result.value = null;
  error.value = null;
});

const openCreateDialog = () => {
  editingTemplate.value = null;
  showEditorDialog.value = true;
};

const openEditDialog = () => {
  if (currentTemplate.value) {
    editingTemplate.value = currentTemplate.value;
    showEditorDialog.value = true;
  }
};

const closeEditorDialog = () => {
  showEditorDialog.value = false;
  editingTemplate.value = null;
};

const handleSaveTemplate = async (data: {
  name: string;
  description: string;
  fields: TemplateField[];
}) => {
  savingTemplate.value = true;
  try {
    const fieldsWithIds: TemplateField[] = data.fields.map((field, index) => ({
      ...field,
      id: field.id || crypto.randomUUID(),
    }));

    if (editingTemplate.value) {
      const { data: updated, error: updateError } = await supabase
        .from("extraction_templates")
        .update({
          name: data.name,
          description: data.description || null,
          fields: fieldsWithIds,
        })
        .eq("id", editingTemplate.value.id)
        .select()
        .single();

      if (updateError) throw updateError;

      const index = templates.value.findIndex((t) => t.id === updated.id);
      if (index !== -1) {
        templates.value[index] = updated as ExtractionTemplate;
      }
    } else {
      const { data: created, error: createError } = await supabase
        .from("extraction_templates")
        .insert({
          name: data.name,
          description: data.description || null,
          fields: fieldsWithIds,
        })
        .select()
        .single();

      if (createError) throw createError;

      templates.value.unshift(created as ExtractionTemplate);
      selectedTemplateId.value = created.id;
    }
    closeEditorDialog();
  } catch (err) {
    console.error("Failed to save template:", err);
  } finally {
    savingTemplate.value = false;
  }
};

const isValidFileType = (type: string) => {
  return Object.keys(ACCEPTED_FILE_TYPES).includes(type);
};

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    await scanDocument(file);
  }
};

const handleDrop = async (event: DragEvent) => {
  isDragging.value = false;
  const file = event.dataTransfer?.files?.[0];

  if (file && isValidFileType(file.type)) {
    await scanDocument(file);
  } else {
    error.value = "Upload een geldig document (PDF, JPG, PNG, WEBP of TIFF)";
  }
};

const scanDocument = async (file: File) => {
  if (!currentTemplate.value) {
    error.value = "Selecteer eerst een template";
    return;
  }

  loading.value = true;
  error.value = null;
  result.value = null;

  try {
    const fileName = `${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("documents")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("documents")
      .createSignedUrl(uploadData.path, 300);

    if (signedUrlError) throw signedUrlError;

    const response = await $fetch<ScanResult>("/api/scan-document", {
      method: "POST",
      body: {
        documentUrl: signedUrlData.signedUrl,
        documentType: file.type,
        fields: currentTemplate.value.fields,
      },
    });

    if ("error" in response && response.error) {
      error.value = response.error as string;
    } else {
      result.value = response;
    }

    await supabase.storage.from("documents").remove([uploadData.path]);
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Document scannen mislukt. Probeer het opnieuw.";
  } finally {
    loading.value = false;
  }
};

const reset = () => {
  result.value = null;
  error.value = null;
  showRawJson.value = false;
  if (fileInput.value) {
    fileInput.value.value = "";
  }
};

const rawJsonString = computed(() => {
  if (!result.value) return "";
  return JSON.stringify(result.value, null, 2);
});

const resultFields = computed(() => {
  if (!result.value || !currentTemplate.value) return [];
  return currentTemplate.value.fields.map((field) => ({
    ...field,
    value: result.value?.[field.name],
  }));
});
</script>

<template>
  <div class="p-8">
    <div class="mx-auto max-w-4xl">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-foreground">Document Scanner</h1>
        <p class="mt-1 text-muted-foreground">
          Selecteer een template en upload een document om gegevens te extraheren
        </p>
      </div>

      <!-- Template Selection -->
      <div class="mb-6 rounded-xl bg-card p-4">
        <div class="flex items-center gap-3">
          <div class="flex-1">
            <label class="mb-1.5 block text-sm font-medium text-foreground">Template</label>
            <TemplateSelector
              v-model="selectedTemplateId"
              :templates="templates"
              @create-new="openCreateDialog"
            />
          </div>
          <Button v-if="currentTemplate" variant="outline" class="mt-6" @click="openEditDialog">
            <Pencil class="h-4 w-4" />
            Bewerken
          </Button>
        </div>

        <!-- Template Fields Preview -->
        <div v-if="currentTemplate && !result" class="mt-4 border-t border-border pt-4">
          <p class="mb-2 text-sm font-medium text-muted-foreground">
            Velden die worden geëxtraheerd:
          </p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="field in currentTemplate.fields"
              :key="field.id"
              class="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground"
            >
              {{ field.label }}
              <span v-if="field.required" class="text-destructive">*</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Upload Area -->
      <div
        v-if="currentTemplate && !result && !loading"
        class="relative rounded-xl border-2 border-dashed border-border bg-card p-12 text-center transition-all hover:border-muted-foreground"
        :class="{ 'border-primary bg-accent': isDragging }"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
      >
        <input
          ref="fileInput"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.tiff,.tif"
          class="hidden"
          @change="handleFileSelect"
        />

        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <CloudUpload class="h-8 w-8 text-muted-foreground" />
        </div>

        <p class="mb-2 text-lg font-medium text-card-foreground">
          Sleep je document hierheen of
          <button @click="fileInput?.click()" class="text-primary hover:text-primary/80">
            blader
          </button>
        </p>
        <p class="text-sm text-muted-foreground">PDF, JPG, PNG, WEBP of TIFF bestanden</p>
      </div>

      <!-- No Template Selected -->
      <div
        v-else-if="!currentTemplate && !loading"
        class="rounded-xl border border-dashed border-border bg-card p-12 text-center"
      >
        <p class="text-muted-foreground">
          Selecteer een template hierboven of
          <button class="text-primary hover:text-primary/80" @click="openCreateDialog">
            maak een nieuw template
          </button>
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="rounded-xl bg-card p-12 text-center">
        <div
          class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary"
        ></div>
        <p class="text-lg font-medium text-card-foreground">Document wordt gescand...</p>
        <p class="mt-1 text-sm text-muted-foreground">Dit kan even duren</p>
      </div>

      <!-- Results -->
      <div v-if="result && !loading" class="space-y-4">
        <div class="flex items-center justify-between rounded-lg bg-card p-4">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-chart-2/20">
              <Check class="h-5 w-5 text-chart-2" />
            </div>
            <div>
              <p class="font-medium text-card-foreground">Scan Voltooid</p>
              <p class="text-sm text-muted-foreground">
                {{ currentTemplate?.name }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Button variant="outline" size="sm" @click="showRawJson = !showRawJson">
              <Code class="h-4 w-4" />
              {{ showRawJson ? "Verberg" : "Toon" }} JSON
            </Button>
            <Button variant="secondary" size="sm" @click="reset"> Nieuw document scannen </Button>
          </div>
        </div>

        <!-- Raw JSON View -->
        <div v-if="showRawJson" class="rounded-xl bg-card p-4">
          <div class="mb-2 flex items-center justify-between">
            <p class="text-sm font-medium text-muted-foreground">Ruwe JSON output</p>
            <CopyButton :value="rawJsonString" />
          </div>
          <pre class="overflow-x-auto rounded-lg bg-muted p-4 text-sm text-foreground">{{
            rawJsonString
          }}</pre>
        </div>

        <!-- Extracted Fields -->
        <div class="rounded-xl bg-card p-6">
          <h2 class="mb-4 text-xl font-semibold text-card-foreground">Geëxtraheerde Informatie</h2>
          <div class="grid gap-3 sm:grid-cols-2">
            <ScanResultField
              v-for="field in resultFields"
              :key="field.id"
              :label="field.label"
              :name="field.name"
              :value="field.value"
              :type="field.type"
            />
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-if="error" class="mt-4 rounded-xl bg-destructive/10 p-6 text-center">
        <div
          class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20"
        >
          <svg
            class="h-6 w-6 text-destructive"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <p class="font-medium text-destructive">{{ error }}</p>
        <button @click="reset" class="mt-4 text-sm text-destructive hover:text-destructive/80">
          Probeer opnieuw
        </button>
      </div>
    </div>

    <!-- Template Editor Dialog -->
    <Dialog v-model:open="showEditorDialog">
      <DialogContent class="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {{ editingTemplate ? "Template bewerken" : "Nieuw template maken" }}
          </DialogTitle>
          <DialogDescription>
            Definieer welke velden uit je documenten moeten worden geëxtraheerd
          </DialogDescription>
        </DialogHeader>
        <TemplateEditor
          :template="editingTemplate"
          @save="handleSaveTemplate"
          @cancel="closeEditorDialog"
        />
      </DialogContent>
    </Dialog>
  </div>
</template>
