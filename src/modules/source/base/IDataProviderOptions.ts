//
//
//
import { TSchemaRequest } from '../../schema/types/TSchemaRequest'
import { TOptionalParameter } from '../types/TOptionalParameter'
import { TContext } from '../../sandbox/types/TContext'

//
export interface IDataProviderOptions {
    Parse(schemaRequest: TSchemaRequest, $context?: Partial<TContext>): Partial<TOptionalParameter>
    GetFilter(options: TOptionalParameter, schemaRequest: TSchemaRequest, $context?: Partial<TContext>): Partial<TOptionalParameter>
    GetFields(options: TOptionalParameter, schemaRequest: TSchemaRequest, $context?: Partial<TContext>): Partial<TOptionalParameter>
    GetSort(options: TOptionalParameter, schemaRequest: TSchemaRequest, $context?: Partial<TContext>): Partial<TOptionalParameter>
    GetData(options: TOptionalParameter, schemaRequest: TSchemaRequest, $context?: Partial<TContext>): Partial<TOptionalParameter>
    GetCache(options: TOptionalParameter, schemaRequest: TSchemaRequest): Partial<TOptionalParameter>
    IsFilterNotEmpty(schemaRequest: TSchemaRequest): boolean
}