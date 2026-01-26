<script setup lang="ts">
import { Plus } from "lucide-vue-next";
import type { ExtractionTemplate } from "~~/types/template";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

defineProps<{
  templates: ExtractionTemplate[];
  modelValue: string | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string | null): void;
  (e: "create-new"): void;
}>();

const handleChange = (value: string) => {
  if (value === "__new__") {
    emit("create-new");
  } else {
    emit("update:modelValue", value);
  }
};
</script>

<template>
  <Select :model-value="modelValue || undefined" @update:model-value="handleChange">
    <SelectTrigger>
      <SelectValue placeholder="Selecteer een template..." />
    </SelectTrigger>
    <SelectContent>
      <SelectItem v-for="template in templates" :key="template.id" :value="template.id">
        <div class="flex items-center gap-2">
          <span>{{ template.name }}</span>
          <span class="text-xs text-muted-foreground">({{ template.fields.length }} velden)</span>
        </div>
      </SelectItem>
      <template v-if="templates.length > 0">
        <SelectSeparator />
      </template>
      <SelectItem value="__new__">
        <div class="flex items-center gap-2 text-primary">
          <Plus class="h-4 w-4" />
          <span>Nieuw template maken</span>
        </div>
      </SelectItem>
    </SelectContent>
  </Select>
</template>
