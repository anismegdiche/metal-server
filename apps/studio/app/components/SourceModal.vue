<script setup lang="ts">
import SourceConfigFields from '~/components/SourceConfigFields.vue'

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

const fieldsRef = ref<{ collectBody?: () => Record<string, any> } | null>(null)

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
  const body = fieldsRef.value?.collectBody?.()
  if (!body) return
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
        <SourceConfigFields
          ref="fieldsRef"
          v-model:provider="provider"
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
