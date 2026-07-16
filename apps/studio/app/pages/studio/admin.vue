<script setup lang="ts">

const activeTab = ref('users')

const users = ref([
  { username: 'admin', role: 'admin', permissions: 'a c r u d l', lastLogin: '2026-07-07T19:00:00Z', status: 'active' },
  { username: 'alice', role: 'editor', permissions: 'c r u l', lastLogin: '2026-07-07T15:30:00Z', status: 'active' },
  { username: 'bob', role: 'viewer', permissions: 'r l', lastLogin: '2026-07-06T10:00:00Z', status: 'active' },
  { username: 'carol', role: 'operator', permissions: 'c r u d l', lastLogin: '2026-07-05T08:00:00Z', status: 'active' },
  { username: 'inactive_user', role: 'viewer', permissions: 'r l', lastLogin: '2026-06-01T00:00:00Z', status: 'inactive' }
])

const logEntries = ref([
  { time: '2026-07-07T19:02:20Z', level: 'info', message: 'Plan myplan started execution' },
  { time: '2026-07-07T19:02:21Z', level: 'info', message: 'Step 0 (select) completed: 2 rows' },
  { time: '2026-07-07T19:02:21Z', level: 'info', message: 'Step 1 (map) completed: 2 rows transformed' },
  { time: '2026-07-07T19:02:21Z', level: 'info', message: 'Step 2 (insert) running...' },
  { time: '2026-07-07T18:00:00Z', level: 'warn', message: 'Source staging-mysql connection timeout, retrying...' },
  { time: '2026-07-07T12:00:00Z', level: 'error', message: 'Plan data-cleanup failed: constraint violation on table archive' },
  { time: '2026-07-07T10:00:00Z', level: 'info', message: 'Cache clean: 142 expired entries removed' },
  { time: '2026-07-07T08:00:00Z', level: 'warn', message: 'Disk usage at 78% on data volume' }
])

const configSections = ref([
  { key: 'server.port', value: '3000', type: 'number' },
  { key: 'server.host', value: '0.0.0.0', type: 'string' },
  { key: 'server.rate-limit', value: '600', type: 'number' },
  { key: 'cors.allowed-origins', value: '*', type: 'string' },
  { key: 'auth.provider', value: 'local', type: 'string' },
  { key: 'cache.ttl', value: '3600', type: 'number' },
  { key: 'log.level', value: 'info', type: 'string' }
])

const userColumns = [
  { accessorKey: 'username', header: 'Username' },
  { accessorKey: 'role', header: 'Role' },
  { accessorKey: 'permissions', header: 'Permissions' },
  { accessorKey: 'lastLogin', header: 'Last Login' },
  { accessorKey: 'status', header: 'Status' }
]

const logColumns = [
  { accessorKey: 'time', header: 'Time' },
  { accessorKey: 'level', header: 'Level' },
  { accessorKey: 'message', header: 'Message' }
]

const configColumns = [
  { accessorKey: 'key', header: 'Key' },
  { accessorKey: 'value', header: 'Value' },
  { accessorKey: 'type', header: 'Type' }
]
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-bold"><UIcon name="i-lucide-shield" class="ml-0 mr-2" />Admin</h1>
      <p class="text-sm text-muted">User management, logs, and server configuration</p>
    </div>

    <UTabs
      v-model="activeTab"
      :items="[
        { label: 'Users', icon: 'i-lucide-users', slot: 'Users', value: 'users' },
        { label: 'Logs', icon: 'i-lucide-scroll-text', slot: 'Logs', value: 'logs' },
        { label: 'Config', icon: 'i-lucide-settings', slot: 'Config', value: 'config' }
      ]"
    >
      <template #Users>
        <UCard>
          <UTable :columns="userColumns" :data="users">
            <template #status-cell="{ row }">
              <UBadge
                :color="row.original.status === 'active' ? 'success' : 'neutral'"
                variant="subtle"
                size="sm"
              >
                {{ row.original.status }}
              </UBadge>
            </template>
            <template #permissions-cell="{ row }">
              <div class="flex gap-1">
                <UKbd v-for="perm in row.original.permissions.split(' ')" :key="perm" variant="subtle" size="sm">
                  {{ perm }}
                </UKbd>
              </div>
            </template>
            <template #lastLogin-cell="{ row }">
              <span class="text-sm">{{ new Date(row.original.lastLogin).toLocaleString() }}</span>
            </template>
          </UTable>
        </UCard>
      </template>

      <template #Logs>
        <UCard>
          <UTable :columns="logColumns" :data="logEntries">
            <template #level-cell="{ row }">
              <UBadge
                :color="row.original.level === 'error' ? 'error' : row.original.level === 'warn' ? 'warning' : 'info'"
                variant="subtle"
                size="sm"
              >
                {{ row.original.level }}
              </UBadge>
            </template>
            <template #time-cell="{ row }">
              <span class="text-sm">{{ new Date(row.original.time).toLocaleString() }}</span>
            </template>
          </UTable>
        </UCard>
      </template>

      <template #Config>
        <UCard>
          <div class="flex justify-between items-center mb-4">
            <p class="text-sm text-muted">Current server configuration</p>
            <UButton color="warning" variant="subtle" icon="i-lucide-refresh-cw" size="sm">
              Reload Config
            </UButton>
          </div>
          <UTable :columns="configColumns" :data="configSections" />
        </UCard>
      </template>
    </UTabs>
  </div>
</template>
