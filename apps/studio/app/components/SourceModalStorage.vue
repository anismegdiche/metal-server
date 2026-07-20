<script setup lang="ts">
const props = defineProps<{
  sourceConfig?: Record<string, any>
}>()

const form = reactive({
  host: '',
  storageMode: 'files',
  storageType: 'fs',
  autocreate: false,
  allowDelete: false,
})

const STORAGE_CONTENT_TYPES = [
  { label: 'JSON', value: 'json' },
  { label: 'CSV', value: 'csv' },
  { label: 'XLS (Excel)', value: 'xls' },
  { label: 'XML', value: 'xml' },
  { label: 'Parquet', value: 'parquet' },
]

interface StorageContentEntry {
  pattern: string
  contentType: string
  jsonPath: string
  csvDelimiter: string
  csvNewline: string
  csvHeader: boolean
  csvQuote: string
  csvSkipEmptyLines: boolean
  xlsSheet: string
  xlsStartingCell: string
  xlsDefault: string
  xlsParseDates: boolean
  xlsDateFormat: string
  xmlPath: string
  xmlIgnoreAttributes: boolean
  xmlAttributePrefix: string
  xmlRemoveNsPrefix: boolean
  parquetUtf8: boolean
}

const contentEntries = ref<StorageContentEntry[]>([])
const contentOpen = ref(false)

const STORAGE_TYPE_FIELDS: Record<string, { label: string; value: string; type?: string; placeholder?: string; description?: string }[]> = {
  'azure-blob': [
    { label: 'Connection String', value: 'connection-string', type: 'password', placeholder: 'DefaultEndpointsProtocol=https;...', description: 'Azure Blob Storage connection string' },
    { label: 'Container', value: 'container', placeholder: 'mycontainer', description: 'Azure Blob container name' },
  ],
  'azure-file': [
    { label: 'Connection String', value: 'connection-string', type: 'password', placeholder: 'DefaultEndpointsProtocol=https;...', description: 'Azure Storage connection string' },
    { label: 'Share Name', value: 'share-name', placeholder: 'myshare', description: 'Azure File Share name' },
    { label: 'Folder', value: 'folder', placeholder: '/path/to/files', description: 'Remote folder in the share (default: /)' },
  ],
  'azure-datalake': [
    { label: 'Connection String', value: 'connection-string', type: 'password', placeholder: 'DefaultEndpointsProtocol=https;...', description: 'Azure Storage connection string' },
    { label: 'Container', value: 'container', placeholder: 'mycontainer', description: 'Name of the container to store files in' },
  ],
  'aws-s3': [
    { label: 'Region', value: 'region', placeholder: 'us-east-1', description: 'AWS region where the S3 bucket is located' },
    { label: 'Bucket', value: 'bucket', placeholder: 'my-bucket', description: 'Name of the S3 bucket to store files in' },
    { label: 'Access Key ID', value: 'access-key-id', type: 'password', placeholder: 'AKIA...', description: 'AWS access key ID (optional, can use IAM roles)' },
    { label: 'Secret Access Key', value: 'secret-access-key', type: 'password', placeholder: 'secret...', description: 'AWS secret access key (optional, can use IAM roles)' },
    { label: 'Endpoint', value: 'endpoint', placeholder: 'http://localhost:9000', description: 'Optional endpoint URL for S3-compatible services' },
    { label: 'Profile', value: 'profile', placeholder: 'my-aws-profile', description: 'AWS profile name (optional)' },
  ],
  ftp: [
    { label: 'Host', value: 'host', placeholder: 'ftp.server.com', description: 'FTP server host' },
    { label: 'Port', value: 'port', type: 'number', placeholder: '21', description: 'FTP server port (default: 21)' },
    { label: 'User', value: 'user', placeholder: 'ftpuser', description: 'FTP server username' },
    { label: 'Password', value: 'password', type: 'password', placeholder: 'ftppass', description: 'FTP server password' },
    { label: 'Secure (FTPS)', value: 'secure', type: 'boolean', description: 'Enable Secure FTP connection (default: false)' },
    { label: 'Folder', value: 'folder', placeholder: '/', description: 'Remote folder on the FTP server (default: /)' },
  ],
  sftp: [
    { label: 'Host', value: 'host', placeholder: 'sftp.server.com', description: 'SFTP server host' },
    { label: 'Port', value: 'port', type: 'number', placeholder: '22', description: 'SFTP server port (default: 22)' },
    { label: 'User', value: 'user', placeholder: 'sftpuser', description: 'SFTP server username' },
    { label: 'Password', value: 'password', type: 'password', placeholder: 'sftppass', description: 'SFTP server password' },
    { label: 'Folder', value: 'folder', placeholder: '/', description: 'Remote folder on the SFTP server (default: /)' },
  ],
  fs: [
    { label: 'Folder', value: 'folder', placeholder: './data/', description: 'The path where files are stored' },
  ],
}

const storageTypeFields = computed(() => STORAGE_TYPE_FIELDS[form.storageType] ?? [])

// Local reactive state for storage type field values
const storageTypeValues = ref<Record<string, string>>({})

function getStorageTypeFieldValue(key: string) {
  return storageTypeValues.value[key] ?? ''
}

function setStorageTypeFieldValue(key: string, val: string) {
  storageTypeValues.value[key] = val
}

function newStorageContentEntry(): StorageContentEntry {
  return {
    pattern: '*', contentType: 'json', jsonPath: '',
    csvDelimiter: ';', csvNewline: '\\r\\n', csvHeader: true, csvQuote: '"', csvSkipEmptyLines: true,
    xlsSheet: '', xlsStartingCell: 'A1', xlsDefault: '', xlsParseDates: false, xlsDateFormat: 'dd/mm/yyyy',
    xmlPath: '', xmlIgnoreAttributes: true, xmlAttributePrefix: '@', xmlRemoveNsPrefix: true,
    parquetUtf8: true,
  }
}

function addStorageContentEntry() {
  contentEntries.value.push(newStorageContentEntry())
}

function removeStorageContentEntry(idx: number) {
  contentEntries.value.splice(idx, 1)
}

function storageContentToConfig(entries: StorageContentEntry[]): Record<string, any> | undefined {
  if (entries.length === 0) return undefined
  const content: Record<string, any> = {}
  for (const e of entries) {
    if (!e.pattern) continue
    const entry: Record<string, any> = { 'content-type': e.contentType }
    if (e.contentType === 'json' && e.jsonPath) entry['json-path'] = e.jsonPath
    if (e.contentType === 'csv') {
      if (e.csvDelimiter !== ';') entry['csv-delimiter'] = e.csvDelimiter
      if (e.csvNewline !== '\\r\\n') entry['csv-newline'] = e.csvNewline
      if (!e.csvHeader) entry['csv-header'] = false
      if (e.csvQuote !== '"') entry['csv-quote'] = e.csvQuote
      if (!e.csvSkipEmptyLines) entry['csv-skip-empty-lines'] = false
    }
    if (e.contentType === 'xls') {
      if (e.xlsSheet) entry['xls-sheet'] = e.xlsSheet
      if (e.xlsStartingCell !== 'A1') entry['xls-starting-cell'] = e.xlsStartingCell
      if (e.xlsDefault) entry['xls-default'] = e.xlsDefault
      if (e.xlsParseDates) entry['xls-parse-dates'] = true
      if (e.xlsDateFormat !== 'dd/mm/yyyy') entry['xls-date-format'] = e.xlsDateFormat
    }
    if (e.contentType === 'xml') {
      if (e.xmlPath) entry['xml-path'] = e.xmlPath
      if (!e.xmlIgnoreAttributes) entry['xml-ignore-attributes'] = false
      if (e.xmlAttributePrefix !== '@') entry['xml-attribute-prefix'] = e.xmlAttributePrefix
      if (!e.xmlRemoveNsPrefix) entry['xml-remove-ns-prefix'] = false
    }
    if (e.contentType === 'parquet') {
      if (!e.parquetUtf8) entry['parquet-utf8'] = false
    }
    content[e.pattern] = entry
  }
  return Object.keys(content).length > 0 ? content : undefined
}

function configToStorageContent(config: Record<string, any>): StorageContentEntry[] {
  if (!config || typeof config !== 'object') return []
  return Object.entries(config).map(([pattern, val]) => {
    const v = val as Record<string, any>
    const ct = v['content-type'] ?? 'json'
    return {
      pattern,
      contentType: ct,
      jsonPath: v['json-path'] ?? '',
      csvDelimiter: v['csv-delimiter'] ?? ';',
      csvNewline: v['csv-newline'] ?? '\\r\\n',
      csvHeader: v['csv-header'] !== false,
      csvQuote: v['csv-quote'] ?? '"',
      csvSkipEmptyLines: v['csv-skip-empty-lines'] !== false,
      xlsSheet: v['xls-sheet'] ?? '',
      xlsStartingCell: v['xls-starting-cell'] ?? 'A1',
      xlsDefault: v['xls-default'] ?? '',
      xlsParseDates: v['xls-parse-dates'] === true,
      xlsDateFormat: v['xls-date-format'] ?? 'dd/mm/yyyy',
      xmlPath: v['xml-path'] ?? '',
      xmlIgnoreAttributes: v['xml-ignore-attributes'] !== false,
      xmlAttributePrefix: v['xml-attribute-prefix'] ?? '@',
      xmlRemoveNsPrefix: v['xml-remove-ns-prefix'] !== false,
      parquetUtf8: v['parquet-utf8'] !== false,
    }
  })
}

onMounted(() => {
  if (props.sourceConfig) {
    const c = props.sourceConfig
    form.host = c.host ?? ''
    const o = c.options ?? {}
    form.storageMode = o['storage-mode'] ?? 'files'
    form.storageType = o['storage-type'] ?? 'fs'
    form.autocreate = o.autocreate ?? false
    form.allowDelete = o['allow-delete'] ?? false
    // Load storage type field values
    const fields = STORAGE_TYPE_FIELDS[form.storageType] ?? []
    for (const f of fields) {
      if (o[f.value] !== undefined) {
        storageTypeValues.value[f.value] = String(o[f.value])
      }
    }
    contentEntries.value = configToStorageContent(o.content)
  }
})

function collectBody() {
  const body: Record<string, any> = { provider: 'storage' }
  if (form.host) body.host = form.host
  body.options = {
    'storage-mode': form.storageMode,
    'storage-type': form.storageType,
  }
  if (form.autocreate) body.options.autocreate = true
  if (form.allowDelete) body.options['allow-delete'] = true
  // Storage type fields
  for (const f of storageTypeFields.value) {
    const val = storageTypeValues.value[f.value]
    if (val !== undefined && val !== '') {
      if (f.type === 'number') body.options[f.value] = Number(val)
      else if (f.type === 'boolean') body.options[f.value] = val === 'true'
      else body.options[f.value] = val
    }
  }
  // Content patterns
  if (form.storageMode === 'files') {
    const content = storageContentToConfig(contentEntries.value)
    if (content) body.options.content = content
  }
  return body
}

defineExpose({ collectBody })
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Storage Mode" orientation="horizontal" :ui="{ description: 'text-xs' }"
        description="Working mode: files (treat files as data) or folders (manage folders as data)">
        <USelect v-model="form.storageMode"
          :items="[{ label: 'Files', value: 'files' }, { label: 'Folders', value: 'folders' }]" class="w-full" />
      </UFormField>
      <UFormField label="Storage Type" orientation="horizontal" :ui="{ description: 'text-xs' }"
        description="Backend storage type">
        <USelect v-model="form.storageType" :items="[
          { label: 'Filesystem (fs)', value: 'fs' },
          { label: 'Azure Blob Storage', value: 'azure-blob' },
          { label: 'Azure File Share', value: 'azure-file' },
          { label: 'Azure Data Lake Gen2', value: 'azure-datalake' },
          { label: 'Amazon S3', value: 'aws-s3' },
          { label: 'FTP Server', value: 'ftp' },
          { label: 'SFTP Server', value: 'sftp' },
        ]" class="w-full" />
      </UFormField>
      <UFormField label="Autocreate" orientation="horizontal" :ui="{ description: 'text-xs' }"
        description="Auto-create entities on first interaction (default: false)" class="col-span-2">
        <div class="flex items-center gap-2">
          <USwitch v-model="form.autocreate" />
          <span class="text-xs text-muted">{{ form.autocreate ? 'Yes' : 'No' }}</span>
        </div>
      </UFormField>
      <UFormField label="Allow Delete" orientation="horizontal" :ui="{ description: 'text-xs' }"
        description="Allow deleting entities (default: false)" class="col-span-2">
        <div class="flex items-center gap-2">
          <USwitch v-model="form.allowDelete" />
          <span class="text-xs text-muted">{{ form.allowDelete ? 'Yes' : 'No' }}</span>
        </div>
      </UFormField>
    </div>
    <div v-if="storageTypeFields.length > 0" class="border-t border-default pt-4">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-sm font-medium">{{ form.storageType }} Connection</span>
        <span class="text-[10px] text-muted">({{ storageTypeFields.length }} parameters)</span>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <template v-for="field in storageTypeFields" :key="field.value">
          <UFormField orientation="horizontal" :ui="{ description: 'text-xs' }" :label="field.label"
            :description="field.description"
            :class="storageTypeFields.length % 2 !== 0 && field === storageTypeFields[storageTypeFields.length - 1] ? 'col-span-2' : ''">
            <template v-if="field.type === 'boolean'">
              <div class="flex items-center gap-2">
                <USwitch :model-value="getStorageTypeFieldValue(field.value) === 'true'"
                  @update:model-value="(v: boolean) => setStorageTypeFieldValue(field.value, String(v))" />
                <span class="text-xs text-muted">{{ getStorageTypeFieldValue(field.value) === 'true' ? 'Yes' : 'No'
                  }}</span>
              </div>
            </template>
            <template v-else>
              <UInput :model-value="getStorageTypeFieldValue(field.value)"
                :type="field.type === 'number' ? 'number' : (field.type === 'password' ? 'password' : 'text')"
                :placeholder="field.placeholder ?? ''" class="w-full"
                @update:model-value="(v: string) => setStorageTypeFieldValue(field.value, v)" />
            </template>
          </UFormField>
        </template>
      </div>
    </div>
    <div v-if="form.storageMode === 'files'" class="border-t border-default pt-4">
      <div class="flex items-center gap-2 cursor-pointer select-none" @click="contentOpen = !contentOpen">
        <UIcon :name="contentOpen ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-3 text-muted" />
        <span class="text-sm font-medium">File Content Types</span>
        <span class="text-[10px] text-muted">({{ contentEntries.length }} patterns)</span>
      </div>
      <div v-if="contentOpen" class="mt-3 space-y-3">
        <div v-if="contentEntries.length === 0" class="text-xs text-muted italic py-1">No content patterns defined</div>
        <div v-for="(entry, idx) in contentEntries" :key="idx" class="p-3 bg-elevated/30 rounded space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 flex-1">
              <UInput v-model="entry.pattern" placeholder="*.csv" size="sm" class="w-32" />
              <USelect v-model="entry.contentType" :items="STORAGE_CONTENT_TYPES" size="sm" />
              <span class="text-[10px] text-muted">{{ entry.pattern }}</span>
            </div>
            <UButton icon="i-lucide-x" size="xs" variant="ghost" color="error"
              @click="removeStorageContentEntry(idx)" />
          </div>
          <div v-if="entry.contentType === 'json'" class="grid grid-cols-1 gap-3">
            <UFormField label="JSON Path" orientation="horizontal" :ui="{ description: 'text-xs' }"
              description="Path to data array (e.g. rows, data.items)">
              <UInput v-model="entry.jsonPath" placeholder="(root)" size="sm" class="w-full" />
            </UFormField>
          </div>
          <div v-if="entry.contentType === 'csv'" class="grid grid-cols-1 gap-3">
            <UFormField label="Delimiter" orientation="horizontal" :ui="{ description: 'text-xs' }"
              description="The delimiting character (default: ;)">
              <UInput v-model="entry.csvDelimiter" placeholder=";" size="sm" class="w-full" />
            </UFormField>
            <UFormField label="Quote" orientation="horizontal" :ui="{ description: 'text-xs' }"
              description='The character used to quote fields (default: ")'>
              <UInput v-model="entry.csvQuote" placeholder='"' size="sm" class="w-full" />
            </UFormField>
            <UFormField label="Newline" orientation="horizontal" :ui="{ description: 'text-xs' }"
              description="The newline sequence. Must be one of \r, \n, or \r\n (default: \r\n)">
              <UInput v-model="entry.csvNewline" placeholder="\r\n" size="sm" class="w-full" />
            </UFormField>
            <UFormField label="Header Row" orientation="horizontal" :ui="{ description: 'text-xs' }"
              description="If true, the first row of parsed data will be interpreted as field names (default: true)">
              <div class="flex items-center gap-2">
                <USwitch v-model="entry.csvHeader" />
                <span class="text-xs text-muted">{{ entry.csvHeader ? 'Yes' : 'No' }}</span>
              </div>
            </UFormField>
          </div>
          <div v-if="entry.contentType === 'csv'" class="grid grid-cols-1 gap-3">
            <UFormField label="Skip Empty Lines" orientation="horizontal" :ui="{ description: 'text-xs' }"
              description="If true, lines that are completely empty will be skipped (default: true)">
              <div class="flex items-center gap-2">
                <USwitch v-model="entry.csvSkipEmptyLines" />
                <span class="text-xs text-muted">{{ entry.csvSkipEmptyLines ? 'Yes' : 'No' }}</span>
              </div>
            </UFormField>
          </div>
          <div v-if="entry.contentType === 'xls'" class="grid grid-cols-1 gap-3">
            <UFormField label="Sheet Name" orientation="horizontal" :ui="{ description: 'text-xs' }"
              description="Specify which sheet to use, default first sheet">
              <UInput v-model="entry.xlsSheet" placeholder="Sheet1" size="sm" class="w-full" />
            </UFormField>
            <UFormField label="Starting Cell" orientation="horizontal" :ui="{ description: 'text-xs' }"
              description='Specify the starting cell (e.g. "B2"), default "A1"'>
              <UInput v-model="entry.xlsStartingCell" placeholder="A1" size="sm" class="w-full" />
            </UFormField>
            <UFormField label="Default Value" orientation="horizontal" :ui="{ description: 'text-xs' }"
              description="Default value for empty cells, default null">
              <UInput v-model="entry.xlsDefault" placeholder="(none)" size="sm" class="w-full" />
            </UFormField>
            <UFormField label="Parse Dates" orientation="horizontal" :ui="{ description: 'text-xs' }"
              description="Parse dates from cells, default false">
              <div class="flex items-center gap-2">
                <USwitch v-model="entry.xlsParseDates" />
                <span class="text-xs text-muted">{{ entry.xlsParseDates ? 'Yes' : 'No' }}</span>
              </div>
            </UFormField>
          </div>
          <div v-if="entry.contentType === 'xls'" class="grid grid-cols-1 gap-3">
            <UFormField label="Date Format" orientation="horizontal" :ui="{ description: 'text-xs' }"
              description="Specify the date format for parsing dates, default: dd/mm/yyyy">
              <UInput v-model="entry.xlsDateFormat" placeholder="dd/mm/yyyy" size="sm" class="w-full" />
            </UFormField>
          </div>
          <div v-if="entry.contentType === 'xml'" class="grid grid-cols-1 gap-3">
            <UFormField label="XML Path" orientation="horizontal" :ui="{ description: 'text-xs' }"
              description="Specify the XML path to use, default whole XML">
              <UInput v-model="entry.xmlPath" placeholder="(root)" size="sm" class="w-full" />
            </UFormField>
            <UFormField label="Attribute Prefix" orientation="horizontal" :ui="{ description: 'text-xs' }"
              description="Prefix for XML attributes, default @">
              <UInput v-model="entry.xmlAttributePrefix" placeholder="@" size="sm" class="w-full" />
            </UFormField>
            <UFormField label="Ignore Attributes" orientation="horizontal" :ui="{ description: 'text-xs' }"
              description="Ignore XML attributes, default true">
              <div class="flex items-center gap-2">
                <USwitch v-model="entry.xmlIgnoreAttributes" />
                <span class="text-xs text-muted">{{ entry.xmlIgnoreAttributes ? 'Yes' : 'No' }}</span>
              </div>
            </UFormField>
            <UFormField label="Remove NS Prefix" orientation="horizontal" :ui="{ description: 'text-xs' }"
              description="Remove namespace string from tag and attribute names, default true">
              <div class="flex items-center gap-2">
                <USwitch v-model="entry.xmlRemoveNsPrefix" />
                <span class="text-xs text-muted">{{ entry.xmlRemoveNsPrefix ? 'Yes' : 'No' }}</span>
              </div>
            </UFormField>
          </div>
          <div v-if="entry.contentType === 'parquet'" class="grid grid-cols-1 gap-3">
            <UFormField label="UTF-8 Decode" orientation="horizontal" :ui="{ description: 'text-xs' }"
              description="Decode byte arrays as utf8 strings (default: true)">
              <div class="flex items-center gap-2">
                <USwitch v-model="entry.parquetUtf8" />
                <span class="text-xs text-muted">{{ entry.parquetUtf8 ? 'Yes' : 'No' }}</span>
              </div>
            </UFormField>
          </div>
        </div>
        <UButton icon="i-lucide-plus" label="Add Pattern" size="xs" variant="outline" @click="addStorageContentEntry" />
      </div>
    </div>
  </div>
</template>
