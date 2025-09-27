//
//
//
//
//
import { TRow } from '../../../types/DataTable'
import { TJson } from '../../../types/TJson'
import { STEP, STEP_STATUS } from '../../plan/@consts'
import { TStepArgs } from '../../plan/types/TStepArgs'
import { TSchemaRequest } from '../../schema/types/TSchemaRequest'

//
export type TContext = {
    $entity?: string // requested entity name
    $schema?: string // requested schema name
    $options: Omit<TSchemaRequest, 'schema' | 'entity' | 'source'>
    $request?: {
        'data-path'?: string // requested JSON path, if undefined will return the whole JSON
    }
    $row?: TJson
    $response?: {
        url?: string
        host?: string
        body?: TJson
    }
    $plan: {
        name: string
        schema?: string
        entity: string
        $current:{
            stepIndex?: number
            stepCommand?: STEP
            stepArgs?: TStepArgs
            data?: TRow[]
            status?: STEP_STATUS
        }
    }
}
