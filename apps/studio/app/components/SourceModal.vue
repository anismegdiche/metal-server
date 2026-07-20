<script setup lang="ts">
import { getProviderIcon } from '~/utils/constants'
import SourceModalPostgres from '~/components/SourceModalPostgres.vue'
import SourceModalMysql from '~/components/SourceModalMysql.vue'
import SourceModalMssql from '~/components/SourceModalMssql.vue'
import SourceModalMongodb from '~/components/SourceModalMongodb.vue'
import SourceModalCosmosdb from '~/components/SourceModalCosmosdb.vue'
import SourceModalMetal from '~/components/SourceModalMetal.vue'
import SourceModalMemory from '~/components/SourceModalMemory.vue'
import SourceModalPlans from '~/components/SourceModalPlans.vue'
import SourceModalWebservice from '~/components/SourceModalWebservice.vue'
import SourceModalStorage from '~/components/SourceModalStorage.vue'

interface SourceConfig {
  provider: string
  database?: string
  host?: string
  port?: number
  user?: string
  password?: string
  options?: Record<string, any>
}

const props = defineProps<{
  sources: Record<string, SourceConfig>
}>()

const emit = defineEmits<{
  saved: []
}>()

const open = defineModel<boolean>('open', { default: false })

const mode = ref<'add' | 'edit'>('add')
const name = ref('')
const provider = ref('postgres')

const PROVIDER_OPTIONS = [
  { label: 'PostgreSQL', value: 'postgres', icon: 'i-lucide-database' },
  { label: 'MySQL', value: 'mysql', icon: 'i-lucide-database' },
  { label: 'MSSQL', value: 'mssql', icon: 'i-lucide-server' },
  { label: 'MongoDB', value: 'mongodb', icon: 'i-lucide-leaf' },
  { label: 'CosmosDB', value: 'cosmosdb', icon: 'i-lucide-database' },
  { label: 'Web Service', value: 'webservice', icon: 'i-lucide-globe' },
  { label: 'Storage', value: 'storage', icon: 'i-lucide-hard-drive' },
  { label: 'Metal', value: 'metal', icon: 'i-lucide-server' },
  { label: 'Plans', value: 'plans', icon: 'i-lucide-workflow' },
  { label: 'Memory', value: 'memory', icon: 'i-lucide-cpu' },
]

const PROVIDER_COMPONENT_MAP: Record<string, any> = {
  postgres: SourceModalPostgres,
  mysql: SourceModalMysql,
  mssql: SourceModalMssql,
  mongodb: SourceModalMongodb,
  cosmosdb: SourceModalCosmosdb,
  metal: SourceModalMetal,
  memory: SourceModalMemory,
  plans: SourceModalPlans,
  webservice: SourceModalWebservice,
  storage: SourceModalStorage,
}

const providerChildRef = ref<any>(null)

const providerComponent = computed(() => {
  return PROVIDER_COMPONENT_MAP[provider.value] ?? SourceModalPostgres
})

const currentSourceConfig = computed(() => {
  if (mode.value === 'edit') return props.sources[name.value]
  return undefined
})

function resetForm() {
  name.value = ''
  provider.value = 'postgres'
}

function populateForm(sourceName: string) {
  const config = props.sources[sourceName]
  if (!config) return
  name.value = sourceName
  provider.value = config.provider
}

function openAdd() {
  mode.value = 'add'
  resetForm()
  open.value = true
}

function openEdit(sourceName: string) {
  mode.value = 'edit'
  populateForm(sourceName)
  open.value = true
}

async function saveSource() {
  if (!name.value) return
  const child = providerChildRef.value
  if (!child?.collectBody) return
  const body = child.collectBody()
  try {
    await $fetch(`/server-api/api/config/sources/${encodeURIComponent(name.value)}`, {
      method: 'PUT',
      body,
    })
    open.value = false
    emit('saved')
  } catch (e) {
    console.error('Failed to save source', e)
  }
}

defineExpose({ openAdd, openEdit })
</script>

<template>
  <UModal :ui="{ content: 'w-full sm:w-1/2 sm:max-w-none' }" v-model:open="open" :title="mode === 'add' ? 'Add Source' : 'Edit Source'">
    <template #body>
      <div class="flex flex-col gap-4">
        <UFormField label="Name" orientation="horizontal">
          <UInput v-model="name" placeholder="my-source" :disabled="mode === 'edit'" class="w-full min-w-[25ch]" />
        </UFormField>
        <UFormField label="Provider" orientation="horizontal">
          <div class="flex items-center gap-2">
            <UIcon :name="getProviderIcon(provider)" class="size-5 text-primary" />
            <USelect v-model="provider" :items="PROVIDER_OPTIONS" class="flex-1 min-w-[25ch]" />
          </div>
        </UFormField>
        <component
          :is="providerComponent"
          ref="providerChildRef"
          :source-config="currentSourceConfig"
        />
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton label="Cancel" variant="outline" @click="() => { open = false }" />
        <UButton label="Save" @click="saveSource" />
      </div>
    </template>
  </UModal>
</template>
