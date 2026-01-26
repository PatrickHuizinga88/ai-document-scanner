<script setup lang="ts">
const supabase = useSupabaseClient();
const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const loading = ref(false);
const result = ref<any>(null);
const error = ref<string | null>(null);
const uploadedFiles = ref<Array<{ file: File; name: string; id: string }>>([]);

const ACCEPTED_FILE_TYPES = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/tiff": [".tiff", ".tif"],
};

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (files) {
    for (const file of Array.from(files)) {
      if (isValidFileType(file.type)) {
        addFile(file);
      }
    }
  }
};

const handleDrop = async (event: DragEvent) => {
  isDragging.value = false;
  const files = event.dataTransfer?.files;

  if (files) {
    let hasInvalidFile = false;
    for (const file of Array.from(files)) {
      if (isValidFileType(file.type)) {
        addFile(file);
      } else {
        hasInvalidFile = true;
      }
    }
    if (hasInvalidFile) {
      error.value =
        "Sommige bestanden zijn overgeslagen. Alleen PDF, JPG, PNG, WEBP en TIFF zijn toegestaan.";
    }
  }
};

const isValidFileType = (type: string) => {
  return Object.keys(ACCEPTED_FILE_TYPES).includes(type);
};

const addFile = (file: File) => {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  uploadedFiles.value.push({ file, name: file.name, id });
  error.value = null;
};

const removeFile = (id: string) => {
  uploadedFiles.value = uploadedFiles.value.filter((f) => f.id !== id);
};

const comparePolicies = async () => {
  if (uploadedFiles.value.length < 2) {
    error.value = "Upload minimaal 2 polissen om te vergelijken.";
    return;
  }

  loading.value = true;
  error.value = null;
  result.value = null;

  try {
    const documents: Array<{ url: string; type: string; name: string }> = [];

    // Upload all files to Supabase Storage
    for (const { file, name } of uploadedFiles.value) {
      const fileName = `${Date.now()}-${name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get signed URL
      const { data: signedUrlData, error: signedUrlError } =
        await supabase.storage
          .from("documents")
          .createSignedUrl(uploadData.path, 300);

      if (signedUrlError) throw signedUrlError;

      documents.push({
        url: signedUrlData.signedUrl,
        type: file.type,
        name: name,
      });
    }

    // Send to API endpoint
    const response = await $fetch("/api/compare-policies", {
      method: "POST",
      body: { documents },
    });

    if (response.error) {
      error.value = response.error;
    } else {
      result.value = response;
    }
  } catch (err: any) {
    error.value = err.message || "Vergelijking mislukt. Probeer het opnieuw.";
  } finally {
    loading.value = false;
  }
};

const reset = () => {
  result.value = null;
  error.value = null;
  uploadedFiles.value = [];
  if (fileInput.value) {
    fileInput.value.value = "";
  }
};
</script>

<template>
  <div class="p-8">
    <div class="mx-auto max-w-6xl">
      <div class="mb-8 text-center">
        <h1 class="text-3xl font-bold text-slate-900">Polis Vergelijker</h1>
        <p class="mt-2 text-slate-600">
          Upload 2 of meer polissen om een gedetailleerde vergelijking te maken
        </p>
      </div>

      <!-- Upload Area -->
      <div v-if="!result && !loading" class="space-y-6">
        <div
          class="relative rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center transition-all hover:border-slate-400"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
          :class="{ 'border-blue-400 bg-blue-50': isDragging }"
        >
          <input
            ref="fileInput"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.tiff,.tif"
            multiple
            class="hidden"
            @change="handleFileSelect"
          />

          <div
            class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100"
          >
            <svg
              class="h-8 w-8 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
          </div>

          <p class="mb-2 text-lg font-medium text-slate-700">
            Sleep je polissen hierheen of
            <button
              @click="($refs.fileInput as HTMLInputElement).click()"
              class="text-blue-600 hover:text-blue-700"
            >
              browse
            </button>
          </p>
          <p class="text-sm text-slate-500">
            PDF, JPG, PNG, WEBP of TIFF bestanden (minimaal 2)
          </p>
        </div>

        <!-- Uploaded Files List -->
        <div v-if="uploadedFiles.length > 0" class="rounded-2xl bg-white p-6">
          <h3 class="mb-4 text-lg font-semibold text-slate-900">
            Geüploade polissen ({{ uploadedFiles.length }})
          </h3>
          <div class="space-y-3">
            <div
              v-for="(uploadedFile, index) in uploadedFiles"
              :key="uploadedFile.id"
              class="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <div class="flex items-center gap-3">
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 font-semibold"
                >
                  {{ index + 1 }}
                </div>
                <div>
                  <p class="font-medium text-slate-900">
                    {{ uploadedFile.name }}
                  </p>
                  <p class="text-sm text-slate-500">
                    {{ (uploadedFile.file.size / 1024).toFixed(1) }} KB
                  </p>
                </div>
              </div>
              <button
                @click="removeFile(uploadedFile.id)"
                class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <svg
                  class="h-5 w-5"
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
              </button>
            </div>
          </div>

          <button
            @click="comparePolicies"
            :disabled="uploadedFiles.length < 2"
            class="mt-6 w-full rounded-xl bg-blue-600 py-4 font-semibold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <span v-if="uploadedFiles.length < 2"
              >Upload nog {{ 2 - uploadedFiles.length }} polis(sen)</span
            >
            <span v-else>Vergelijk {{ uploadedFiles.length }} polissen</span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="rounded-2xl bg-white p-12 text-center">
        <div
          class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"
        ></div>
        <p class="text-lg font-medium text-slate-700">
          Polissen worden vergeleken...
        </p>
        <p class="mt-1 text-sm text-slate-500">
          Dit kan even duren afhankelijk van het aantal documenten
        </p>
      </div>

      <!-- Results -->
      <div v-if="result && !loading" class="space-y-6">
        <div class="flex items-center justify-between rounded-xl bg-white p-4">
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-full bg-green-100"
            >
              <svg
                class="h-5 w-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <p class="font-medium text-slate-900">Vergelijking Compleet</p>
              <p class="text-sm text-slate-500">
                {{ result.documentsCompared || 0 }} polissen vergeleken
              </p>
            </div>
          </div>
          <button
            @click="reset"
            class="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
          >
            Nieuwe Vergelijking
          </button>
        </div>

        <!-- Comparison Results - Markdown Content -->
        <div
          v-if="result.comparison"
          class="rounded-2xl bg-white p-6 shadow-sm"
        >
          <div class="prose prose-slate max-w-none">
            <div v-html="renderMarkdown(result.comparison)"></div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div
        v-if="error && !loading"
        class="rounded-2xl bg-red-50 p-6 text-center"
      >
        <div
          class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100"
        >
          <svg
            class="h-6 w-6 text-red-600"
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
        <p class="font-medium text-red-900">{{ error }}</p>
        <button
          @click="error = null"
          class="mt-4 text-sm text-red-600 hover:text-red-700"
        >
          Probeer opnieuw
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
// Simple markdown renderer for the comparison results
function renderMarkdown(text: string): string {
  if (!text) return "";

  return (
    text
      // Escape HTML first
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      // Headers
      .replace(
        /^### (.*$)/gim,
        '<h3 class="text-lg font-semibold text-slate-900 mt-6 mb-2">$1</h3>',
      )
      .replace(
        /^## (.*$)/gim,
        '<h2 class="text-xl font-bold text-slate-900 mt-8 mb-3 pb-2 border-b border-slate-200">$1</h2>',
      )
      .replace(
        /^# (.*$)/gim,
        '<h1 class="text-2xl font-bold text-slate-900 mt-8 mb-4">$1</h1>',
      )
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Unordered lists
      .replace(/^\s*[-*]\s+(.*)$/gim, '<li class="ml-4 text-slate-700">$1</li>')
      // Wrap consecutive li elements in ul
      .replace(
        /(<li.*<\/li>\n?)+/g,
        '<ul class="list-disc list-inside space-y-1 my-3">$&</ul>',
      )
      // Tables - basic support
      .replace(/\|(.+)\|/g, (match) => {
        const cells = match.split("|").filter((c) => c.trim());
        const isHeader = cells.some((c) => c.includes("---"));
        if (isHeader) return "";
        const cellHtml = cells
          .map(
            (c) =>
              `<td class="px-3 py-2 border border-slate-200">${c.trim()}</td>`,
          )
          .join("");
        return `<tr>${cellHtml}</tr>`;
      })
      // Paragraphs - wrap lines that aren't already wrapped
      .replace(
        /^(?!<[hul]|<tr)(.+)$/gim,
        '<p class="text-slate-700 my-2">$1</p>',
      )
      // Line breaks
      .replace(/\n\n/g, "<br/>")
  );
}

export default {
  methods: {
    renderMarkdown,
  },
};
</script>

<style>
.prose h2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.prose table {
  width: 100%;
  border-collapse: collapse;
  border-radius: 0.5rem;
  overflow: hidden;
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.prose tr:first-child td {
  background-color: rgb(248 250 252);
  font-weight: 600;
}

.prose tr:hover td {
  background-color: rgb(248 250 252);
}
</style>
