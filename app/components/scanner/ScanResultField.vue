<script setup lang="ts">
import type { FieldType } from "~/types/template";
import CopyButton from "./CopyButton.vue";

const props = defineProps<{
  label: string;
  name: string;
  value: unknown;
  type: FieldType;
}>();

const formattedValue = computed(() => {
  if (props.value === null || props.value === undefined) {
    return "-";
  }

  if (props.type === "array" && Array.isArray(props.value)) {
    return props.value.join(", ");
  }

  if (props.type === "boolean") {
    return props.value ? "Ja" : "Nee";
  }

  if (props.type === "number") {
    return String(props.value);
  }

  return String(props.value);
});

const copyValue = computed(() => {
  if (props.value === null || props.value === undefined) {
    return "";
  }

  if (props.type === "array" && Array.isArray(props.value)) {
    return props.value.join("\n");
  }

  return String(props.value);
});

const hasValue = computed(() => {
  return props.value !== null && props.value !== undefined && props.value !== "";
});
</script>

<template>
  <div class="flex items-start justify-between gap-2 rounded-lg border border-border p-4">
    <div class="min-w-0 flex-1">
      <p class="text-sm font-medium text-muted-foreground">{{ label }}</p>
      <p class="mt-1 break-words text-foreground" :class="{ 'text-muted-foreground': !hasValue }">
        {{ formattedValue }}
      </p>
    </div>
    <CopyButton v-if="hasValue" :value="copyValue" />
  </div>
</template>
