//
//
//
//
//
import { TRow } from '../../../types/DataTable'
import { TJson } from '../../../types/TJson'
import { STEP_STATUS } from '../../plan/@consts'
import { TStepRun } from '../../plan/types/TStep'
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
            stepCommand?: TStepRun
            data?: TRow[]
            status?: STEP_STATUS
        }
    }
}
