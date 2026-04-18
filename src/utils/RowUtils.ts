
/** biome-ignore-all lint/complexity/noStaticOnlyClass: <explanation> */
//
//
//

import { createHash, createHmac, randomUUID } from "node:crypto"
//
import { type TRow } from "../types/DataTable"
import { JsonUtils } from "./JsonUtils"
import { Logger } from "./Logger"


//
const HASH_ALGO = "sha256"
const HASH_DIGEST = "base64"
const HASH_PEPPER = process.env.HASH_PEPPER || "m3t4l-m!l!t!4"


//
function pseudonymize(value: string): string {
    return createHmac(HASH_ALGO, HASH_PEPPER).update(value).digest(HASH_DIGEST)
}

function anonymize(value: string): string {
    return createHash(HASH_ALGO)
        .update(value + randomUUID())
        .digest(HASH_DIGEST)
}

function normalizeValue(val: unknown): string {
    if (val === null || val === undefined) return ""
    if (val instanceof Date) return val.toISOString()
    if (typeof val === "object") {
        try {
            return JsonUtils.Stringify(val)
        } catch {
            return String(val)
        }
    }
    return String(val)
}


//
export class RowUtils {

    @Logger.LogFunction(true)
    static Anonymize(row: TRow, fieldsSet: Set<string>, pseudo: boolean = true): TRow {
        const _row: TRow = {}
        // Copy all original fields first
        for (const key in row) {
            _row[key] = row[key]
        }

        for (const field of fieldsSet) {
            // Use Set for O(1) lookup
            if (field in row) {
                const val = normalizeValue(row[field])
                const newVal = pseudo
                    ? pseudonymize(val)
                    : anonymize(val)

                _row[field] = newVal
            }
        }
        return _row
    }

    static Pick(row: TRow, fields: string[]): TRow {
        const filtered: TRow = {}

        // Keep only the specified fields
        for (const field of fields) {
            if (Object.hasOwn(row, field)) {
                filtered[field] = row[field]
            }
        }
        return filtered
    }

    static Omit(row: TRow, fields: string[]): TRow {
        const filtered: TRow = {}

        // Keep all fields except the ones to omit
        for (const [key, value] of Object.entries(row)) {
            if (!fields.includes(key)) {
                filtered[key] = value
            }
        }

        return filtered
    }
}
