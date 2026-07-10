<script setup lang="ts">
const storageProviders = ref([
  {
    name: 'Local Filesystem',
    type: 'FS',
    typeIcon: 'i-lucide-hard-drive',
    status: 'connected',
    root: '/data/metal',
    usagePercent: 62,
    used: '124 GB',
    total: '200 GB'
  },
  {
    name: 'Backup FTP',
    type: 'FTP',
    typeIcon: 'i-lucide-server',
    status: 'connected',
    root: '/backups',
    usagePercent: 85,
    used: '425 GB',
    total: '500 GB'
  },
  {
    name: 'Azure Blob',
    type: 'Azure Blob',
    typeIcon: 'i-lucide-cloud',
    status: 'connected',
    root: 'metal-data-prod',
    usagePercent: 34,
    used: '68 GB',
    total: '200 GB'
  },
  {
    name: 'AWS S3',
    type: 'S3',
    typeIcon: 'i-lucide-cloud',
    status: 'disconnected',
    root: 'metal-archive',
    usagePercent: 0,
    used: '0 B',
    total: '1 TB'
  }
])

const files = ref([
  { name: 'exports/', type: 'folder', size: '—', modified: '2026-07-07 19:00', items: 12 },
  { name: 'backups/', type: 'folder', size: '—', modified: '2026-07-07 02:00', items: 45 },
  { name: 'imports/', type: 'folder', size: '—', modified: '2026-07-06 18:30', items: 8 },
  { name: 'config.yml', type: 'file', size: '2.4 KB', modified: '2026-07-01 10:00', items: null },
  { name: 'plan-results.json', type: 'file', size: '1.2 MB', modified: '2026-07-07 19:02', items: null },
  { name: 'error-dump.log', type: 'file', size: '45 KB', modified: '2026-07-07 12:00', items: null }
])

const fileColumns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'size', header: 'Size' },
  { accessorKey: 'modified', header: 'Modified' }
]
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-bold"><UIcon name="i-lucide-folder-tree ml-0 mr-2" />Storage</h1>
      <p class="text-sm text-muted">File storage providers and file browser</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <UCard v-for="provider in storageProviders" :key="provider.name">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon :name="provider.typeIcon" class="size-5 text-muted" />
              <div>
                <span class="font-medium">{{ provider.name }}</span>
                <p class="text-xs text-muted">{{ provider.type }} • {{ provider.root }}</p>
              </div>
            </div>
            <UBadge
              :color="provider.status === 'connected' ? 'success' : 'error'"
              variant="subtle"
              size="sm"
            >
              {{ provider.status }}
            </UBadge>
          </div>
        </template>
        <div v-if="provider.status === 'connected'" class="flex flex-col gap-2">
          <div class="flex justify-between text-sm">
            <span class="text-muted">{{ provider.used }} / {{ provider.total }}</span>
            <span class="font-medium">{{ provider.usagePercent }}%</span>
          </div>
          <UProgress :value="provider.usagePercent" :color="provider.usagePercent > 80 ? 'error' : provider.usagePercent > 60 ? 'warning' : 'primary'" />
        </div>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">/data/metal — File Browser</h2>
          <div class="flex items-center gap-2">
            <UButton icon="i-lucide-upload" variant="subtle" color="primary" size="sm">
              Upload
            </UButton>
            <UButton icon="i-lucide-folder-plus" variant="subtle" color="neutral" size="sm">
              New Folder
            </UButton>
          </div>
        </div>
      </template>
      <UTable :columns="fileColumns" :rows="files">
        <template #name-cell="{ row }">
          <div class="flex items-center gap-2">
            <UIcon
              :name="row.type === 'folder' ? 'i-lucide-folder' : 'i-lucide-file'"
              class="size-4"
              :class="row.type === 'folder' ? 'text-warning' : 'text-info'"
            />
            <span :class="row.type === 'folder' ? 'font-medium' : ''">{{ row.name }}</span>
          </div>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
