<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const navItems: NavigationMenuItem[] = [
  { label: 'Overview', icon: 'i-lucide-layout-dashboard', to: '/' },
  { label: 'HTTP', icon: 'i-lucide-globe', to: '/http' },
  { label: 'Sources', icon: 'i-lucide-plug', to: '/sources' },
  { label: 'Plans', icon: 'i-lucide-workflow', to: '/plans' },
  { label: 'Schedules', icon: 'i-lucide-calendar-clock', to: '/schedules' },
  { label: 'Data Browser', icon: 'i-lucide-database', to: '/data-browser' },
  { label: 'Storage', icon: 'i-lucide-folder-tree', to: '/storage' },
  { label: 'AI Tasks', icon: 'i-lucide-bot', to: '/ai-tasks' },
  { label: 'Cache', icon: 'i-lucide-zap', to: '/cache' },
  { label: 'Admin', icon: 'i-lucide-shield', to: '/admin' }
]

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

useSeoMeta({
  title: 'Metal Dashboard',
  description: 'Metal Server Dashboard — Monitor plans, schedules, sources, and more.'
})
</script>

<template>
  <UApp>
    <UHeader>
      <template #left>
        <AppLogo class="w-auto h-6 shrink-0" />
      </template>

      <UNavigationMenu :items="navItems" orientation="horizontal" />

      <template #right>
        <UColorModeButton />
      </template>
    </UHeader>

    <UMain>
      <div class="p-6 md:p-6 lg:p-6">
        <NuxtLayout>
          <NuxtPage />
        </NuxtLayout>
      </div>
    </UMain>

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">
          Released under the GNU v3 License. Copyright © 2026-present Anis Megdiche
        </p>
      </template>
    </UFooter>

  </UApp>
</template>
