//
//
//
import type { Request, Response } from 'express'
import bytes from 'bytes'
//
import type { TSchemaRequest } from '../modules/schema/types/TSchemaRequest'
import type { TJson } from '../types/TJson'
import type { TInternalResponse } from '../modules/core/types/TInternalResponse'
import { HttpErrorBadRequest } from '../modules/errors/HttpErrors'
import { Assert } from './Assert'

const RX_SORT = /^(\w+:(asc|desc))(,\w+:(asc|desc))*$/


export class Convert {

    static HumainSizeToBytes(size: string): number {
        return bytes(size) ?? 0
    }

    static RequestToSchemaRequest(req: Request): TSchemaRequest {
        const { schema, entity } = req.params
        const { sort } = req.query ?? {}


        let _sort: TJson<string> | undefined = undefined

        if (typeof sort === 'string') {
            if (!RX_SORT.test(sort))
                throw new HttpErrorBadRequest(`Invalid sort format: ${sort}`)

            _sort = sort
                .split(',')
                .reduce<TJson<string>>((acc, curr) => {
                    const [key, value] = curr.split(':')
                    Assert.Var<string>(key, "undefined key")
                    Assert.Var<string>(value, "undefined value")

                    acc[key] = value
                    return acc
                }, {})
        }

        const schemaResponse: TSchemaRequest = {
            schema,
            entity,
            ...req.body,
            ...req.query,
            sort: _sort ?? sort
        }

        return schemaResponse
    }

    static InternalResponseToResponse(res: Response, intRes: TInternalResponse<any>): Response {
        return res
            .status(intRes.StatusCode)
            .json(intRes.Body)
            .end()
    }

    static PatternToRegex(pattern: string): RegExp {
        // Escape special regex characters except for * and ?
        const escapedPattern = pattern.replaceAll(/([.+?^${}()|[\]\\])/g, '\\$1')

        // Replace friendly wildcards with regex equivalents
        const rxPattern = escapedPattern
            .replaceAll(/\*/g, '.*')   // Convert * to .*
            .replaceAll(/\?/g, '.')    // Convert ? to .

        // Create and return the RegExp object
        return new RegExp(`^${rxPattern}$`) // Anchored to match the whole string
    }
}