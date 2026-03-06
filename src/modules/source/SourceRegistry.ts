import type { TSource } from "./@types"

export class SourceRegistry {
    static readonly Sources = new Map<string, TSource>()
}
