//
//
//
import type { TSource } from "./types/TSource"

export class SourceRegistry {
    static readonly Sources = new Map<string, TSource>()
}
