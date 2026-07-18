<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()

const sidebarItems: NavigationMenuItem[] = [
  {
    label: 'Dashboard',
    icon: 'i-lucide-layout-dashboard',
    to: '/dashboard'
  },
  {
    label: 'Data',
    icon: 'i-lucide-database',
    to: '/data'
  },
  {
    label: 'Designer',
    icon: 'i-lucide-pencil-ruler',
    to: '/designer'
  },
  {
    label: 'Scheduler',
    icon: 'i-lucide-calendar-clock',
    to: '/scheduler'
  },
  {
    label: 'Config',
    icon: 'i-lucide-file-cog',
    to: '/config/info'
  },
  {
    label: 'Logs',
    icon: 'i-lucide-scroll-text',
    to: '/logs'
  },
  {
    label: 'API Docs',
    icon: 'i-lucide-book-open',
    to: '/docs'
  }
]

const dashboardTabs: NavigationMenuItem[] = [
  { label: 'Overview', to: '/dashboard' },
  { label: 'HTTP', to: '/dashboard/http' },
  { label: 'Sources', to: '/dashboard/sources' },
  { label: 'Schemas', to: '/dashboard/schemas' },
  { label: 'Plans', to: '/dashboard/plans' },
  { label: 'Schedules', to: '/dashboard/schedules' }
]

const configTabs: NavigationMenuItem[] = [
  { label: 'Info', to: '/config/info' },
  { label: 'Server', to: '/config/server' },
  { label: 'Users & Roles', to: '/config/users' }
]

const isDashboardRoute = computed(() => route.path.startsWith('/dashboard'))
const isConfigRoute = computed(() => route.path.startsWith('/config'))

const headerTabs = computed(() => {
  if (isDashboardRoute.value) return dashboardTabs
  if (isConfigRoute.value) return configTabs
  return null
})
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar collapsible resizable>
      <template #header="{ collapsed }">
        <AppLogo :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu :collapsed="collapsed" :items="sidebarItems" orientation="vertical" />
      </template>

      <template #footer="{ collapsed }">
        <div class="flex flex-col gap-1">
          <UButton :avatar="{
            src: 'https://api.dicebear.com/9.x/initials/svg?seed=Admin',
            loading: 'lazy'
          }" :label="collapsed ? undefined : 'Administrator'" color="neutral" variant="ghost" class="w-full"
            :block="collapsed" />
        </div>
      </template>
    </UDashboardSidebar>

    <UDashboardPanel :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <UDashboardNavbar :ui="{ root: 'px-2' }">
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>

          <template #trailing>
            <div class="flex-1 flex justify-center">
              <UNavigationMenu v-if="headerTabs" :items="headerTabs" highlight query :ui="{ list: 'gap-0' }" />
            </div>
          </template>

          <template #right>
            <UButton icon="i-lucide-user" color="neutral" variant="ghost" size="sm" />
            <UColorModeButton />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="overflow-auto h-full p-4">
          <slot />
          <p class="text-[0.7rem] text-muted text-center p-6">Released under the GNU v3 License. Copyright &copy;
            2026-present Anis Megdiche</p>
        </div>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
