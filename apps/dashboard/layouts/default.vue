<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const items: NavigationMenuItem[][] = [
  [{
    label: 'Overview',
    icon: 'i-lucide-layout-dashboard',
    to: '/'
  }, {
    label: 'HTTP',
    icon: 'i-lucide-globe',
    to: '/http'
  }, {
    label: 'Plans',
    icon: 'i-lucide-workflow',
    to: '/plans'
  }, {
    label: 'Schedules',
    icon: 'i-lucide-calendar-clock',
    to: '/schedules'
  }, {
    label: 'Data Browser',
    icon: 'i-lucide-database',
    to: '/data-browser'
  }],
  [{
    label: 'Sources',
    icon: 'i-lucide-plug',
    to: '/sources'
  }, {
    label: 'Storage',
    icon: 'i-lucide-folder-tree',
    to: '/storage'
  }, {
    label: 'AI Tasks',
    icon: 'i-lucide-bot',
    to: '/ai-tasks'
  }, {
    label: 'Cache',
    icon: 'i-lucide-zap',
    to: '/cache'
  }],
  [{
    label: 'Admin',
    icon: 'i-lucide-shield',
    to: '/admin'
  }]
]
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar collapsible resizable>
      <template #header="{ collapsed }">
        <div v-if="!collapsed" class="flex items-center gap-2">
          <UIcon name="i-simple-icons-meta" class="size-5 text-primary shrink-0" />
          <span class="font-bold text-base">Metal</span>
        </div>
        <UIcon v-else name="i-simple-icons-meta" class="size-5 text-primary mx-auto" />
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :label="collapsed ? undefined : 'Search...'" color="neutral" variant="outline" block
          :square="collapsed">
          <template v-if="!collapsed" #trailing>
            <div class="flex items-center gap-0.5 ms-auto">
              <UKbd value="meta" variant="subtle" />
              <UKbd value="K" variant="subtle" />
            </div>
          </template>
        </UDashboardSearchButton>

        <UNavigationMenu :collapsed="collapsed" :items="items[0]" orientation="vertical" />

        <UNavigationMenu :collapsed="collapsed" :items="items[1]" orientation="vertical" />

        <div class="mt-auto">
          <UNavigationMenu :collapsed="collapsed" :items="items[2]" orientation="vertical" />
        </div>
      </template>

      <template #footer="{ collapsed }">
        <UButton :avatar="{
          src: 'https://api.dicebear.com/9.x/initials/svg?seed=Admin',
          loading: 'lazy'
        }" :label="collapsed ? undefined : 'Administrator'" color="neutral" variant="ghost" class="w-full"
          :block="collapsed" />
      </template>
    </UDashboardSidebar>

    <div class="p-4 flex-1 min-w-0">
      <UDashboardPanel>
        <template #header>
          <UDashboardNavbar>
            <template #leading>
              <UDashboardSidebarCollapse />
            </template>
          </UDashboardNavbar>
        </template>

        <template #body>
          <slot />
        </template>
      </UDashboardPanel>
    </div>
  </UDashboardGroup>
</template>
