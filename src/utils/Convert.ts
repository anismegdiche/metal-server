//
//
//
import { Request, Response } from 'express'
//
import { TSchemaRequest } from '../modules/schema/types/TSchemaRequest'
import { TJson } from '../types/TJson'
import { TInternalResponse } from '../modules/schema/types/TInternalResponse'
import { HttpErrorBadRequest } from '../modules/errors/HttpErrors'

const RX_SORT = /^(\w+:(asc|desc))(,\w+:(asc|desc))*$/


export class Convert {

    static HumainSizeToBytes(size: string) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const bytes = require('bytes')
        return bytes(size)
    }

    static RequestToSchemaRequest(req: Request): TSchemaRequest {
        const { schema, entity } = req.params
        const { sort } = req.query ?? {}        

         
        let _sort : TJson<string> | undefined = undefined

        if (typeof sort === 'string') {
            if (!RX_SORT.test(sort))
                throw new HttpErrorBadRequest(`Invalid sort format: ${sort}`)
            
            _sort = sort
                .split(',')
                .reduce<TJson<string>>((acc, curr) => {
                    const [key, value] = curr.split(':')
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
        const escapedPattern = pattern.replace(/([.+?^${}()|[\]\\])/g, '\\$1')

        // Replace friendly wildcards with regex equivalents
        const rxPattern = escapedPattern
            .replace(/\*/g, '.*')   // Convert * to .*
            .replace(/\?/g, '.')    // Convert ? to .

        // Create and return the RegExp object
        return new RegExp(`^${rxPattern}$`) // Anchored to match the whole string
    }
}