<script setup lang="ts">
import { getProviderIcon } from '~/utils/constants'
import SourceModalPostgres from '~/components/SourceModalPostgres.vue'
import SourceModalMysql from '~/components/SourceModalMysql.vue'
import SourceModalMssql from '~/components/SourceModalMssql.vue'
import SourceModalAzureSqldb from '~/components/SourceModalAzureSqldb.vue'
import SourceModalMongodb from '~/components/SourceModalMongodb.vue'
import SourceModalCosmosdb from '~/components/SourceModalCosmosdb.vue'
import SourceModalMetal from '~/components/SourceModalMetal.vue'
import SourceModalMemory from '~/components/SourceModalMemory.vue'
import SourceModalPlans from '~/components/SourceModalPlans.vue'
import SourceModalWebservice from '~/components/SourceModalWebservice.vue'
import SourceModalStorage from '~/components/SourceModalStorage.vue'

const props = defineProps<{
  sourceConfig?: Record<string, any>
  providers?: string[]
}>()

const provider = defineModel<string>('provider', { default: 'postgres' })

const PROVIDER_OPTIONS = [
  { label: 'PostgreSQL', value: 'postgres', icon: 'i-lucide-database' },
  { label: 'MySQL', value: 'mysql', icon: 'i-lucide-database' },
  { label: 'MongoDB', value: 'mongodb', icon: 'i-lucide-leaf' },
  { label: 'MS SQL', value: 'mssql', icon: 'i-lucide-server' },
  { label: 'Azure SQL DB', value: 'azure-sqldb', icon: 'i-lucide-server' },
  { label: 'Azure Cosmos DB', value: 'azure-cosmosdb', icon: 'i-lucide-database' },
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
  'azure-sqldb': SourceModalAzureSqldb,
  mongodb: SourceModalMongodb,
  'azure-cosmosdb': SourceModalCosmosdb,
  metal: SourceModalMetal,
  memory: SourceModalMemory,
  plans: SourceModalPlans,
  webservice: SourceModalWebservice,
  storage: SourceModalStorage,
}

const providerChildRef = ref<any>(null)

const providerOptions = computed(() => {
  if (!props.providers?.length) return PROVIDER_OPTIONS
  return PROVIDER_OPTIONS.filter((o) => props.providers!.includes(o.value))
})

watch(providerOptions, (options) => {
  if (options.length > 0 && !options.some((o) => o.value === provider.value)) {
    provider.value = options[0].value
  }
}, { immediate: true })

const providerComponent = computed(() => {
  return PROVIDER_COMPONENT_MAP[provider.value] ?? SourceModalPostgres
})

function collectBody() {
  return providerChildRef.value?.collectBody?.()
}

defineExpose({ collectBody })
</script>

<template>
  <div class="flex flex-col gap-4">
    <UFormField label="Provider" orientation="horizontal">
      <div class="flex items-center gap-2">
        <UIcon :name="getProviderIcon(provider)" class="size-5 text-primary" />
        <USelect v-model="provider" :items="providerOptions" class="flex-1 min-w-[25ch]" />
      </div>
    </UFormField>
    <component
      :is="providerComponent"
      ref="providerChildRef"
      :source-config="props.sourceConfig"
    />
  </div>
</template>
