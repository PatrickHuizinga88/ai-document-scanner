<script setup lang="ts">
import { Plus, FileText } from "lucide-vue-next";
import type { ExtractionTemplate, TemplateField } from "~/types/template";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import TemplateCard from "@/components/templates/TemplateCard.vue";
import TemplateEditor from "@/components/templates/TemplateEditor.vue";

const supabase = useSupabaseClient();

const { data: templates, status } = useLazyAsyncData(
  "templates",
  async () => {
    const { data, error } = await supabase
      .from("extraction_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as ExtractionTemplate[];
  },
  { default: () => [] },
);

const loading = computed(() => status.value === "pending");

const showDialog = ref(false);
const editingTemplate = ref<ExtractionTemplate | null>(null);
const saving = ref(false);
const deleteConfirmId = ref<string | null>(null);

const openCreateDialog = () => {
  editingTemplate.value = null;
  showDialog.value = true;
};

const openEditDialog = (template: ExtractionTemplate) => {
  editingTemplate.value = template;
  showDialog.value = true;
};

const closeDialog = () => {
  showDialog.value = false;
  editingTemplate.value = null;
};

const handleSave = async (data: { name: string; description: string; fields: TemplateField[] }) => {
  saving.value = true;
  try {
    const fieldsWithIds: TemplateField[] = data.fields.map((field, index) => ({
      ...field,
      id: field.id || `field-${Date.now()}-${index}`,
    }));

    if (editingTemplate.value) {
      const { data: updated, error } = await supabase
        .from("extraction_templates")
        .update({
          name: data.name,
          description: data.description || null,
          fields: fieldsWithIds,
        })
        .eq("id", editingTemplate.value.id)
        .select()
        .single();

      if (error) throw error;

      const index = templates.value.findIndex((t) => t.id === updated.id);
      if (index !== -1) {
        templates.value[index] = updated as ExtractionTemplate;
      }
    } else {
      const { data: created, error } = await supabase
        .from("extraction_templates")
        .insert({
          name: data.name,
          description: data.description || null,
          fields: fieldsWithIds,
        })
        .select()
        .single();

      if (error) throw error;
      templates.value.unshift(created as ExtractionTemplate);
    }
    closeDialog();
  } catch (err) {
    console.error("Failed to save template:", err);
  } finally {
    saving.value = false;
  }
};

const confirmDelete = (id: string) => {
  deleteConfirmId.value = id;
};

const handleDelete = async () => {
  if (!deleteConfirmId.value) return;
  try {
    const { error } = await supabase
      .from("extraction_templates")
      .delete()
      .eq("id", deleteConfirmId.value);

    if (error) throw error;

    templates.value = templates.value.filter((t) => t.id !== deleteConfirmId.value);
    deleteConfirmId.value = null;
  } catch (err) {
    console.error("Failed to delete template:", err);
  }
};

const navigateToScanner = (templateId: string) => {
  navigateTo(`/document-scanner?template=${templateId}`);
};
</script>

<template>
  <div class="p-8">
    <div class="mx-auto max-w-6xl">
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-foreground">Jouw Templates</h1>
          <p class="mt-1 text-muted-foreground">
            Maak templates om te bepalen welke gegevens uit documenten worden geëxtraheerd
          </p>
        </div>
        <Button @click="openCreateDialog">
          <Plus class="h-4 w-4" />
          Nieuw template
        </Button>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
      </div>

      <Empty v-else-if="templates.length === 0" class="border border-border bg-card">
        <EmptyContent>
          <EmptyMedia variant="icon">
            <FileText class="h-5 w-5" />
          </EmptyMedia>
          <EmptyTitle>Nog geen templates</EmptyTitle>
          <EmptyDescription> Maak je eerste template om documenten te scannen </EmptyDescription>
          <Button class="mt-2" @click="openCreateDialog">
            <Plus class="h-4 w-4" />
            Eerste template maken
          </Button>
        </EmptyContent>
      </Empty>

      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TemplateCard
          v-for="template in templates"
          :key="template.id"
          :template="template"
          @click="navigateToScanner(template.id)"
          @edit="openEditDialog(template)"
          @delete="confirmDelete(template.id)"
        />
      </div>
    </div>

    <Dialog v-model:open="showDialog">
      <DialogContent class="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {{ editingTemplate ? "Template bewerken" : "Nieuw template maken" }}
          </DialogTitle>
          <DialogDescription>
            Definieer welke velden uit je documenten moeten worden geëxtraheerd
          </DialogDescription>
        </DialogHeader>
        <TemplateEditor :template="editingTemplate" @save="handleSave" @cancel="closeDialog" />
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="deleteConfirmId">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Template verwijderen?</DialogTitle>
          <DialogDescription>
            Weet je zeker dat je dit template wilt verwijderen? Dit kan niet ongedaan worden
            gemaakt.
          </DialogDescription>
        </DialogHeader>
        <div class="flex justify-end gap-2 pt-4">
          <Button variant="outline" @click="deleteConfirmId = null">Annuleren</Button>
          <Button variant="destructive" @click="handleDelete">Verwijderen</Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
