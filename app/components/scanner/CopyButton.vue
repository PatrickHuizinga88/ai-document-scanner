<script setup lang="ts">
import { Check, Copy } from "lucide-vue-next";

const props = defineProps<{
  value: string;
}>();

const copied = ref(false);

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(props.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    console.error("Failed to copy:", err);
  }
};
</script>

<template>
  <button
    type="button"
    @click="copyToClipboard"
    class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    :title="copied ? 'Gekopieerd!' : 'Kopieer naar klembord'"
  >
    <Check v-if="copied" class="h-4 w-4 text-chart-2" />
    <Copy v-else class="h-4 w-4" />
  </button>
</template>
