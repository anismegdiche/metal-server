<script setup lang="ts">
import { FAKER_METHODS } from '~/utils/faker-methods'

const props = defineProps<{
  sourceConfig?: Record<string, any>
}>()

interface FieldDef {
  name: string
  expression: string
  useCustom: boolean
}

interface EntityDef {
  name: string
  locale: string
  rows: number
  fields: FieldDef[]
}

const LOCALES = [
  { label: 'Afrikaans', value: 'af_ZA' },
  { label: 'Arabic', value: 'ar_AR' },
  { label: 'Armenian', value: 'hy_HY' },
  { label: 'Azerbaijani', value: 'az_AZ' },
  { label: 'Bengali', value: 'bn_BD' },
  { label: 'Chinese (Simplified)', value: 'zh_CN' },
  { label: 'Chinese (Traditional)', value: 'zh_TW' },
  { label: 'Croatian', value: 'hr_HR' },
  { label: 'Czech', value: 'cs_CZ' },
  { label: 'Danish', value: 'da_DA' },
  { label: 'Divehi', value: 'dv_DV' },
  { label: 'Dutch', value: 'nl_NL' },
  { label: 'Dutch (Belgium)', value: 'nl_BE' },
  { label: 'English', value: 'en_EN' },
  { label: 'English (Australia)', value: 'en_AU' },
  { label: 'English (Bork)', value: 'en_BORK' },
  { label: 'English (Canada)', value: 'en_CA' },
  { label: 'English (Ghana)', value: 'en_GH' },
  { label: 'English (Hong Kong)', value: 'en_HK' },
  { label: 'English (India)', value: 'en_IN' },
  { label: 'English (Ireland)', value: 'en_IE' },
  { label: 'English (Nigeria)', value: 'en_NG' },
  { label: 'English (South Africa)', value: 'en_ZA' },
  { label: 'English (UK)', value: 'en_GB' },
  { label: 'English (US)', value: 'en_US' },
  { label: 'Esperanto', value: 'eo_EO' },
  { label: 'Finnish', value: 'fi_FI' },
  { label: 'French', value: 'fr_FR' },
  { label: 'French (Belgium)', value: 'fr_BE' },
  { label: 'French (Canada)', value: 'fr_CA' },
  { label: 'French (Luxembourg)', value: 'fr_LU' },
  { label: 'French (Senegal)', value: 'fr_SN' },
  { label: 'French (Switzerland)', value: 'fr_CH' },
  { label: 'Georgian', value: 'ka_GE' },
  { label: 'German', value: 'de_DE' },
  { label: 'German (Austria)', value: 'de_AT' },
  { label: 'German (Switzerland)', value: 'de_CH' },
  { label: 'Greek', value: 'el_EL' },
  { label: 'Hebrew', value: 'he_HE' },
  { label: 'Hungarian', value: 'hu_HU' },
  { label: 'Indonesian', value: 'id_ID' },
  { label: 'Italian', value: 'it_IT' },
  { label: 'Japanese', value: 'ja_JA' },
  { label: 'Korean', value: 'ko_KO' },
  { label: 'Latvian', value: 'lv_LV' },
  { label: 'Macedonian', value: 'mk_MK' },
  { label: 'Nepali', value: 'ne_NE' },
  { label: 'Norwegian Bokmål', value: 'nb_NO' },
  { label: 'Persian', value: 'fa_FA' },
  { label: 'Polish', value: 'pl_PL' },
  { label: 'Portuguese', value: 'pt_PT' },
  { label: 'Portuguese (Brazil)', value: 'pt_BR' },
  { label: 'Romanian', value: 'ro_RO' },
  { label: 'Romanian (Moldova)', value: 'ro_MD' },
  { label: 'Russian', value: 'ru_RU' },
  { label: 'Serbian (Latin)', value: 'sr_RS' },
  { label: 'Slovak', value: 'sk_SK' },
  { label: 'Spanish', value: 'es_ES' },
  { label: 'Spanish (Mexico)', value: 'es_MX' },
  { label: 'Swedish', value: 'sv_SV' },
  { label: 'Tamil', value: 'ta_IN' },
  { label: 'Thai', value: 'th_TH' },
  { label: 'Turkish', value: 'tr_TR' },
  { label: 'Ukrainian', value: 'uk_UK' },
  { label: 'Urdu', value: 'ur_UR' },
  { label: 'Uzbek (Latin)', value: 'uz_UZ' },
  { label: 'Vietnamese', value: 'vi_VI' },
  { label: 'Welsh', value: 'cy_CY' },
  { label: 'Yoruba', value: 'yo_NG' },
  { label: 'Zulu', value: 'zu_ZA' },
]

const fakerSelectItems = Object.values(
  FAKER_METHODS.reduce<Record<string, Array<{ type: 'label', label: string } | { label: string, value: string, module: string }>>>((groups, m) => {
    if (!groups[m.module]) groups[m.module] = [{ type: 'label', label: m.module }]
    groups[m.module]!.push({ label: m.label, value: m.value, module: m.module })
    return groups
  }, {}),
)

const fakerValueItems = FAKER_METHODS.map(m => ({ label: m.label, value: m.value, module: m.module }))

const form = reactive({
  seed: undefined as number | undefined,
  autocreate: true,
  entities: [] as EntityDef[],
})

onMounted(() => {
  if (props.sourceConfig?.options?.entities) {
    const entities = props.sourceConfig.options.entities
    for (const [name, def] of Object.entries(entities) as [string, any][]) {
      const fields: FieldDef[] = []
      if (def.fields) {
        for (const [fname, expr] of Object.entries(def.fields) as [string, string][]) {
          const isBuiltin = FAKER_METHODS.some(m => m.value === expr)
          fields.push({ name: fname, expression: expr, useCustom: !isBuiltin })
        }
      }
      form.entities.push({
        name,
        locale: def.locale ?? 'en',
        rows: def.rows ?? 100,
        fields,
      })
    }
    form.seed = props.sourceConfig.options.seed ?? undefined
    form.autocreate = props.sourceConfig.options.autocreate ?? true
  }
})

function newEntity(): EntityDef {
  return { name: '', locale: 'en', rows: 100, fields: [] }
}

function newField(): FieldDef {
  return { name: '', expression: 'string.uuid', useCustom: false }
}

function addEntity() {
  form.entities.push(newEntity())
}

function removeEntity(index: number) {
  form.entities.splice(index, 1)
}

function addField(entity: EntityDef) {
  entity.fields.push(newField())
}

function removeField(entity: EntityDef, index: number) {
  entity.fields.splice(index, 1)
}

function collectBody() {
  const body: Record<string, any> = { provider: 'fake-data' }
  const options: Record<string, any> = {}
  if (form.seed !== undefined && form.seed !== null) options.seed = form.seed
  if (!form.autocreate) options.autocreate = false
  if (form.entities.length > 0) {
    const entities: Record<string, any> = {}
    for (const entity of form.entities) {
      if (!entity.name) continue
      const entityBody: Record<string, any> = {}
      if (entity.locale && entity.locale !== 'en') entityBody.locale = entity.locale
      if (entity.rows !== 100) entityBody.rows = entity.rows
      if (entity.fields.length > 0) {
        const fields: Record<string, string> = {}
        for (const field of entity.fields) {
          if (!field.name) continue
          fields[field.name] = field.expression
        }
        if (Object.keys(fields).length > 0) entityBody.fields = fields
      }
      entities[entity.name] = entityBody
    }
    if (Object.keys(entities).length > 0) options.entities = entities
  }
  if (Object.keys(options).length > 0) body.options = options
  return body
}

defineExpose({ collectBody })
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Seed" orientation="horizontal" :ui="{ description: 'text-xs' }"
        description="Seed for reproducible generation. Leave empty for random." class="col-span-2">
        <UInput v-model.number="form.seed" type="number" placeholder="random" class="w-full" />
      </UFormField>
      <UFormField label="Autocreate" orientation="horizontal" :ui="{ description: 'text-xs' }"
        description="Auto-create empty entities on first select (default: yes)" class="col-span-2">
        <div class="flex items-center gap-2">
          <USwitch v-model="form.autocreate" />
          <span class="text-xs text-muted">{{ form.autocreate ? 'Yes' : 'No' }}</span>
        </div>
      </UFormField>
    </div>

    <div class="border-t border-default pt-4">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium">Entities</span>
          <span class="text-[10px] text-muted">({{ form.entities.length }})</span>
        </div>
        <UButton label="Add Entity" icon="i-lucide-plus" size="xs" variant="outline" @click="addEntity" />
      </div>

      <div v-if="form.entities.length === 0" class="text-xs text-muted italic py-2">
        No entities defined. Click "Add Entity" to create one, or configure them in the YAML source config under
        <code>options.entities</code>.
      </div>

      <div class="flex flex-col gap-2">
        <div v-for="(entity, ei) in form.entities" :key="ei"
          class="border border-default rounded-lg p-3 flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <UInput v-model="entity.name" placeholder="Entity name" class="flex-1" :ui="{ base: 'font-medium' }" />
            <USelect v-model="entity.locale" :items="LOCALES" class="w-48" placeholder="Locale" />
            <UInput v-model.number="entity.rows" type="number" :min="0" placeholder="Rows" class="w-20" />
            <UButton icon="i-lucide-trash-2" size="xs" color="primary" variant="ghost" @click="removeEntity(ei)" />
          </div>

          <UCollapsible :default-open="true" class="ml-2">
            <template #default>
              <UButton label="Fields" variant="ghost" color="neutral" trailing-icon="i-lucide-chevron-down"
                class="justify-between w-full text-xs font-medium mb-2" />
            </template>

            <template #content>
              <div class="flex flex-col gap-1">
                <div v-for="(field, fi) in entity.fields" :key="fi" class="flex items-center gap-1">
                  <UInput v-model="field.name" placeholder="fieldName" class="w-32" size="sm" />
                  <template v-if="!field.useCustom">
                    <USelectMenu :model-value="fakerValueItems.find(i => i.value === field.expression) ?? undefined"
                      :items="fakerSelectItems" by="value" placeholder="Search faker methods…" icon="i-lucide-search"
                      :search-input="{ placeholder: 'Search faker methods…', icon: 'i-lucide-search' }" class="flex-1"
                      @update:model-value="(v: any) => { field.expression = v?.value ?? '' }" :content="{ side: 'top' }"
                      size="sm" />
                  </template>
                  <template v-else>
                    <UInput v-model="field.expression" placeholder="e.g. person.firstName('male')" class="flex-1"
                      size="sm" :ui="{
                        base: 'bg-metal-primary-50'
                      }" />
                  </template>
                  <UButton :icon="field.useCustom ? 'i-lucide-list' : 'i-lucide-braces'" size="xs" variant="ghost"
                    :color="field.useCustom ? 'warning' : 'info'"
                    :title="field.useCustom ? 'Switch to dropdown' : 'Switch to custom expression'"
                    @click="field.useCustom = !field.useCustom; undefined" />
                  <UButton icon="i-lucide-trash-2" size="xs" color="primary" variant="ghost"
                    @click="removeField(entity, fi)" />
                </div>
                <UButton label="Add Field" icon="i-lucide-plus" size="xs" variant="ghost" @click="addField(entity)"
                  class="w-32" />
              </div>
            </template>
          </UCollapsible>
        </div>
      </div>
    </div>
  </div>
</template>
