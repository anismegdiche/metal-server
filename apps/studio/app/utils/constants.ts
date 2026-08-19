export const PROVIDER_ICON_MAP: Record<string, string> = {
  postgres: 'i-lucide-database',
  postgresql: 'i-lucide-database',
  POSTGRES: 'i-lucide-database',
  mysql: 'i-lucide-database',
  MYSQL: 'i-lucide-database',
  SQLITE: 'i-lucide-database',
  sqlite: 'i-lucide-database',
  mongodb: 'i-lucide-leaf',
  MONGODB: 'i-lucide-leaf',
  mssql: 'i-lucide-server',
  MSSQL: 'i-lucide-server',
  'azure-sqldb': 'i-lucide-server',
  AZURE_SQLDB: 'i-lucide-server',
  cosmosdb: 'i-lucide-database',
  COSMOSDB: 'i-lucide-database',
  'azure-cosmosdb': 'i-lucide-database',
  AZURE_COSMOSDB: 'i-lucide-database',
  webservice: 'i-lucide-globe',
  WEBSERVICE: 'i-lucide-globe',
  storage: 'i-lucide-hard-drive',
  STORAGE: 'i-lucide-hard-drive',
  metal: 'i-lucide-server',
  METAL: 'i-lucide-server',
  memory: 'i-lucide-cpu',
  MEMORY: 'i-lucide-cpu',
  plans: 'i-lucide-workflow',
  PLANS: 'i-lucide-workflow',
  'fake-data': 'i-lucide-flask-conical',
  FAKE_DATA: 'i-lucide-flask-conical',
}

export function getProviderIcon(provider: string): string {
  return PROVIDER_ICON_MAP[provider] ?? PROVIDER_ICON_MAP[provider.toLowerCase()] ?? 'i-lucide-database'
}

export const TYPE_ICON_MAP: Record<string, string> = {
  table: 'i-lucide-table',
  view: 'i-lucide-eye',
  collection: 'i-lucide-box',
}

export function getTypeIcon(type: string): string {
  return TYPE_ICON_MAP[type] ?? 'i-lucide-circle'
}

export const SCHEMA_TYPE_BADGE: Record<string, { label: string, color: string }> = {
  source: { label: 'Source', color: 'info' },
  entities: { label: 'Entities', color: 'warning' },
  mixed: { label: 'Mixed', color: 'primary' },
}

export const STATUS_DOT_MAP: Record<string, string> = {
  healthy: 'bg-success',
  degraded: 'bg-warning',
  down: 'bg-error',
}

export const STATUS_LABEL_MAP: Record<string, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  down: 'Down',
}

export const METHOD_COLOR_MAP: Record<string, string> = {
  GET: 'text-success',
  POST: 'text-info',
  PATCH: 'text-warning',
  DELETE: 'text-error',
}
