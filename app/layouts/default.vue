<script setup lang="ts">
const route = useRoute();

const navItems = [
  { path: "/document-scanner", label: "Document Scanner", icon: "document" },
  { path: "/policy-comparison", label: "Polis Vergelijker", icon: "compare" },
];

const isActive = (path: string) => route.path === path;
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <!-- Navigation Bar -->
    <nav
      class="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md"
    >
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center justify-between">
          <!-- Logo -->
          <div class="flex items-center gap-2">
            <div
              class="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600"
            >
              <svg
                class="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <span class="text-lg font-semibold text-slate-900"
              >AI Doc Scanner</span
            >
          </div>

          <!-- Navigation Links -->
          <div class="flex items-center gap-1">
            <NuxtLink
              v-for="item in navItems"
              :key="item.path"
              :to="item.path"
              class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all"
              :class="
                isActive(item.path)
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              "
            >
              <!-- Document Icon -->
              <svg
                v-if="item.icon === 'document'"
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <!-- Compare Icon -->
              <svg
                v-if="item.icon === 'compare'"
                class="h-4 w-4"
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
              {{ item.label }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </nav>

    <!-- Page Content -->
    <main>
      <slot />
    </main>
  </div>
</template>
