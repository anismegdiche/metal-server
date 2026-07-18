export type ResolvedEntity = { name: string, type: string, anonymize?: string[], fromDefaultSource: boolean }
export type ResolvedSource = { name: string, provider: string, host: string, port: number, entities: ResolvedEntity[] }
export type ResolvedSchema = { name: string, type: 'source-only' | 'entities-only' | 'merged', sources: ResolvedSource[], defaultSource?: string }

export function isDefaultSource(schema: ResolvedSchema, sourceName: string): boolean {
  return schema.type === 'merged' && sourceName === schema.defaultSource
}
