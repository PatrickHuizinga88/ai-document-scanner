<script setup lang="ts">
import { Trash2 } from "lucide-vue-next";
import type { TemplateField, FieldType } from "~~/types/template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const props = defineProps<{
  field: TemplateField;
  index: number;
}>();

const emit = defineEmits<{
  (e: "update", field: TemplateField): void;
  (e: "remove"): void;
}>();

const fieldTypes: { value: FieldType; label: string }[] = [
  { value: "text", label: "Tekst" },
  { value: "number", label: "Getal" },
  { value: "date", label: "Datum" },
  { value: "boolean", label: "Ja/Nee" },
  { value: "array", label: "Lijst" },
];

const updateField = (key: keyof TemplateField, value: unknown) => {
  emit("update", { ...props.field, [key]: value });
};

const updateName = (label: string) => {
  const name = label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "");
  emit("update", { ...props.field, label, name: name || props.field.name });
};
</script>

<template>
  <div class="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
    <div class="flex items-start justify-between gap-2">
      <span class="text-sm font-medium text-muted-foreground">Veld {{ index + 1 }}</span>
      <Button
        variant="ghost"
        size="icon-sm"
        @click="emit('remove')"
        class="text-destructive hover:text-destructive"
      >
        <Trash2 class="h-4 w-4" />
      </Button>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <div class="space-y-2">
        <Label class="text-sm font-medium text-foreground">Label</Label>
        <Input
          :model-value="field.label"
          @update:model-value="updateName($event as string)"
          placeholder="bijv. Factuurnummer"
        />
      </div>

      <div class="space-y-2">
        <Label class="text-sm font-medium text-foreground">Type</Label>
        <Select :model-value="field.type" @update:model-value="updateField('type', $event)">
          <SelectTrigger>
            <SelectValue placeholder="Selecteer type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="ft in fieldTypes" :key="ft.value" :value="ft.value">
              {{ ft.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div class="space-y-2">
      <Label class="text-sm font-medium text-foreground">Beschrijving (instructie voor AI)</Label>
      <Input
        :model-value="field.description"
        @update:model-value="updateField('description', $event)"
        placeholder="bijv. Het unieke nummer van de factuur"
      />
    </div>

    <div class="flex items-center gap-2">
      <Checkbox
        :id="`required-${field.id}`"
        :checked="field.required"
        @update:checked="updateField('required', $event)"
      />
      <Label :for="`required-${field.id}`" class="text-sm text-foreground cursor-pointer">
        Verplicht veld
      </Label>
    </div>
  </div>
</template>
