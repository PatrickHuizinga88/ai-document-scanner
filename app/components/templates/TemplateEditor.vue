<script setup lang="ts">
import { Plus } from "lucide-vue-next";
import { useForm } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import { z } from "zod";
import type { TemplateField, ExtractionTemplate } from "~/types/template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Empty, EmptyContent, EmptyDescription } from "@/components/ui/empty";
import TemplateFieldRow from "./TemplateFieldRow.vue";

const props = defineProps<{
  template?: ExtractionTemplate | null;
}>();

const emit = defineEmits<{
  (e: "save", data: { name: string; description: string; fields: TemplateField[] }): void;
  (e: "cancel"): void;
}>();

const formSchema = toTypedSchema(
  z.object({
    name: z.string().min(1, "Template naam is verplicht"),
    description: z.string().optional(),
  }),
);

const { handleSubmit, resetForm, values } = useForm({
  validationSchema: formSchema,
  initialValues: {
    name: props.template?.name || "",
    description: props.template?.description || "",
  },
});

const fields = ref<TemplateField[]>(props.template?.fields ? [...props.template.fields] : []);

watch(
  () => props.template,
  (newTemplate) => {
    resetForm({
      values: {
        name: newTemplate?.name || "",
        description: newTemplate?.description || "",
      },
    });
    fields.value = newTemplate?.fields ? [...newTemplate.fields] : [];
  },
);

const addField = () => {
  const newField: TemplateField = {
    id: `field-${Date.now()}`,
    name: "",
    label: "",
    type: "text",
    description: "",
    required: false,
  };
  fields.value.push(newField);
};

const updateField = (index: number, field: TemplateField) => {
  fields.value[index] = field;
};

const removeField = (index: number) => {
  fields.value.splice(index, 1);
};

const fieldsValid = computed(() => {
  return (
    fields.value.length > 0 &&
    fields.value.every((f) => f.label.trim() !== "" && f.name.trim() !== "")
  );
});

const onSubmit = handleSubmit((formValues) => {
  if (!fieldsValid.value) return;
  emit("save", {
    name: formValues.name,
    description: formValues.description || "",
    fields: fields.value,
  });
});
</script>

<template>
  <form class="space-y-6" @submit="onSubmit">
    <div class="space-y-4">
      <FormField v-slot="{ componentField }" name="name">
        <FormItem>
          <FormLabel>Template naam</FormLabel>
          <FormControl>
            <Input v-bind="componentField" placeholder="bijv. Factuur, Schadeformulier" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <FormField v-slot="{ componentField }" name="description">
        <FormItem>
          <FormLabel>Beschrijving</FormLabel>
          <FormControl>
            <Input v-bind="componentField" placeholder="Korte beschrijving van dit template" />
          </FormControl>
          <FormDescription>Optioneel</FormDescription>
          <FormMessage />
        </FormItem>
      </FormField>
    </div>

    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium text-foreground">Velden</h3>
        <Button type="button" variant="outline" size="sm" @click="addField">
          <Plus class="h-4 w-4" />
          Veld toevoegen
        </Button>
      </div>

      <Empty v-if="fields.length === 0" class="border">
        <EmptyContent>
          <EmptyDescription class="text-muted-foreground">
            Nog geen velden toegevoegd
          </EmptyDescription>
          <Button type="button" variant="outline" size="sm" @click="addField">
            <Plus class="h-4 w-4" />
            Eerste veld toevoegen
          </Button>
        </EmptyContent>
      </Empty>

      <div v-else class="space-y-3">
        <TemplateFieldRow
          v-for="(field, index) in fields"
          :key="field.id"
          :field="field"
          :index="index"
          @update="updateField(index, $event)"
          @remove="removeField(index)"
        />
      </div>

      <p v-if="fields.length > 0 && !fieldsValid" class="text-sm text-destructive">
        Alle velden moeten een label hebben
      </p>
    </div>

    <div class="flex justify-end gap-2 border-t border-border pt-4">
      <Button type="button" variant="outline" @click="emit('cancel')">Annuleren</Button>
      <Button type="submit" :disabled="!fieldsValid">
        {{ template ? "Template opslaan" : "Template aanmaken" }}
      </Button>
    </div>
  </form>
</template>
