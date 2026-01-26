<script setup lang="ts">
import { FileText, Pencil, Trash2 } from "lucide-vue-next";
import type { ExtractionTemplate } from "~~/types/template";
import { Button } from "@/components/ui/button";

const props = defineProps<{
  template: ExtractionTemplate;
}>();

const emit = defineEmits<{
  (e: "click"): void;
  (e: "edit"): void;
  (e: "delete"): void;
}>();

const fieldCount = computed(() => props.template.fields.length);
</script>

<template>
  <div
    class="group relative cursor-pointer rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
    @click="emit('click')"
  >
    <div class="flex items-start gap-4">
      <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <FileText class="h-6 w-6 text-primary" />
      </div>

      <div class="min-w-0 flex-1">
        <h3 class="font-semibold text-card-foreground">{{ template.name }}</h3>
        <p v-if="template.description" class="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {{ template.description }}
        </p>
        <p class="mt-2 text-xs text-muted-foreground">
          {{ fieldCount }} {{ fieldCount === 1 ? "veld" : "velden" }}
        </p>
      </div>
    </div>

    <div
      class="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"
      @click.stop
    >
      <Button variant="ghost" size="icon-sm" @click="emit('edit')" title="Bewerken">
        <Pencil class="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        class="text-destructive hover:text-destructive"
        @click="emit('delete')"
        title="Verwijderen"
      >
        <Trash2 class="h-4 w-4" />
      </Button>
    </div>
  </div>
</template>
