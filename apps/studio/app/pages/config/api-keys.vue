<script setup lang="ts">
const toast = useToast()

type ApiKeyInfo = {
  id: string
  userId: string
  name: string
  prefix: string
  scopes: string[]
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

type ApiKeyCreated = ApiKeyInfo & {
  key: string
}

const keys = ref<ApiKeyInfo[]>([])
const createModalOpen = ref(false)
const keyRevealModalOpen = ref(false)
const revokeModalOpen = ref(false)
const revokeKeyId = ref<string | null>(null)
const saving = ref(false)
const createdKey = ref<string>('')

const createForm = reactive({
  name: '',
  scopes: '' as string,
})

const columns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'prefix', header: 'Key Prefix' },
  { accessorKey: 'userId', header: 'User' },
  { accessorKey: 'scopes', header: 'Scopes' },
  { accessorKey: 'createdAt', header: 'Created' },
  { accessorKey: 'lastUsedAt', header: 'Last Used' },
  { accessorKey: 'actions', header: '' },
]

const tableData = computed(() =>
  keys.value.map(k => ({
    ...k,
    scopesDisplay: k.scopes.length ? k.scopes : [],
    createdDisplay: new Date(k.createdAt).toLocaleDateString(),
    lastUsedDisplay: k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never',
    isRevoked: !!k.revokedAt,
  }))
)

async function fetchKeys() {
  try {
    keys.value = await $fetch<ApiKeyInfo[]>('/server-api/api/keys')
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message ?? 'Failed to load API keys', color: 'error' })
  }
}

function openCreateModal() {
  createForm.name = ''
  createForm.scopes = ''
  createModalOpen.value = true
}

async function createKey() {
  saving.value = true
  try {
    const scopes = createForm.scopes
      ? createForm.scopes.split(',').map(s => s.trim()).filter(Boolean)
      : []
    const result = await $fetch<ApiKeyCreated>('/server-api/api/keys', {
      method: 'POST',
      body: { name: createForm.name, scopes },
    })
    createdKey.value = result.key
    createModalOpen.value = false
    keyRevealModalOpen.value = true
    await fetchKeys()
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message ?? 'Failed to create API key', color: 'error' })
  } finally {
    saving.value = false
  }
}

function copyKey() {
  navigator.clipboard.writeText(createdKey.value)
  toast.add({ title: 'Copied to clipboard', color: 'success' })
}

function confirmRevoke(id: string) {
  revokeKeyId.value = id
  revokeModalOpen.value = true
}

async function revokeKey() {
  if (!revokeKeyId.value) return
  try {
    await $fetch(`/server-api/api/keys/${revokeKeyId.value}`, { method: 'DELETE' })
    toast.add({ title: 'Key revoked', color: 'success' })
    revokeModalOpen.value = false
    revokeKeyId.value = null
    await fetchKeys()
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message ?? 'Failed to revoke key', color: 'error' })
  }
}

await fetchKeys()
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <PageHeader icon="i-lucide-key" title="API Keys" description="Manage API keys for programmatic access" />
      <div class="flex gap-2">
        <UButton icon="i-lucide-refresh-cw" label="Refresh" size="sm" variant="outline" @click="fetchKeys" />
        <UButton icon="i-lucide-plus" label="Create Key" size="sm" @click="openCreateModal" />
      </div>
    </div>

    <UCard class="bg-metal-gradient">
      <UTable :columns="columns" :data="tableData" :ui="{ th: 'px-2', td: 'px-2 py-2' }">
        <template #prefix-cell="{ row }">
          <code class="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{{ row.original.prefix }}***</code>
        </template>
        <template #scopes-cell="{ row }">
          <div class="flex flex-wrap gap-1">
            <UBadge v-for="s in row.original.scopesDisplay" :key="s" variant="subtle" size="sm" color="neutral">
              {{ s }}
            </UBadge>
            <span v-if="!row.original.scopesDisplay.length" class="text-xs text-muted">all</span>
          </div>
        </template>
        <template #lastUsedAt-cell="{ row }">
          <span :class="row.original.lastUsedAt === 'Never' ? 'text-muted' : ''">
            {{ row.original.lastUsedDisplay }}
          </span>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex gap-1">
            <UBadge v-if="row.original.isRevoked" variant="subtle" size="xs" color="error">
              Revoked
            </UBadge>
            <UButton
              v-else
              icon="i-lucide-ban"
              size="xs"
              variant="ghost"
              color="error"
              label="Revoke"
              @click="confirmRevoke(row.original.id)"
            />
          </div>
        </template>
      </UTable>

      <div v-if="!keys.length" class="text-center py-8 text-muted text-sm">
        No API keys yet. Create one to get started.
      </div>
    </UCard>

    <!-- Create Key Modal -->
    <UModal v-model:open="createModalOpen" title="Create API Key">
      <template #body>
        <div class="flex flex-col gap-4">
          <UFormField label="Name">
            <UInput v-model="createForm.name" placeholder="e.g. CI/CD Pipeline" />
          </UFormField>
          <UFormField label="Scopes (comma-separated, optional)">
            <UInput v-model="createForm.scopes" placeholder="e.g. read, write" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancel" variant="outline" size="sm" @click="createModalOpen = false" />
          <UButton label="Create" size="sm" :loading="saving" :disabled="!createForm.name" @click="createKey" />
        </div>
      </template>
    </UModal>

    <!-- Key Reveal Modal -->
    <UModal v-model:open="keyRevealModalOpen" title="API Key Created">
      <template #body>
        <div class="flex flex-col gap-4">
          <div class="rounded-lg border border-warning/50 bg-warning/5 p-4 text-sm text-warning">
            <strong>Copy this key now.</strong> You won't be able to see it again.
          </div>
          <UTextarea :model-value="createdKey" readonly :rows="3" class="font-mono text-xs" />
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Copy Key" icon="i-lucide-copy" size="sm" @click="copyKey" />
          <UButton label="Close" variant="outline" size="sm" @click="keyRevealModalOpen = false" />
        </div>
      </template>
    </UModal>

    <!-- Revoke Confirmation Modal -->
    <UModal v-model:open="revokeModalOpen" title="Revoke API Key">
      <template #body>
        <p class="text-sm">Are you sure you want to revoke this API key? This action cannot be undone.</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancel" variant="outline" size="sm" @click="revokeModalOpen = false" />
          <UButton label="Revoke" color="error" size="sm" @click="revokeKey" />
        </div>
      </template>
    </UModal>
  </div>
</template>
