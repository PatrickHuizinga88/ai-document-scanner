<script setup lang="ts">
import { FileText } from "lucide-vue-next";

const route = useRoute();

const navItems = [
  { path: "/", label: "Dashboard" },
  { path: "/document-scanner", label: "Scanner" },
];

const isActive = (path: string) => route.path === path;
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Navigation Bar -->
    <nav class="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center">
          <!-- Logo -->
          <div class="flex items-center gap-2">
            <div
              class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"
            >
              <FileText class="size-5" />
            </div>
            <span class="text-lg font-semibold text-foreground">AI Doc Scanner</span>
          </div>

          <!-- Navigation Links -->
          <div class="flex items-center gap-1 ml-8">
            <NuxtLink
              v-for="item in navItems"
              :key="item.path"
              :to="item.path"
              class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all"
              :class="
                isActive(item.path)
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              "
            >
              {{ item.label }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </nav>

    <!-- Page Content -->
    <main class="max-w-4xl mx-auto">
      <slot />
    </main>
  </div>
</template>
