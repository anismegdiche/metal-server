//
//
//
import { merge } from 'lodash-es';
//
import { Assert } from '../../../utils/Assert';
import type { TInternalResponse } from '../../core/types/TInternalResponse';
import type { U_config_sources_source } from '../../core/types/U_config_sources';
import type { TContext } from '../../sandbox/types/TContext';
import type { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestListEntities, TSchemaRequestSelect, TSchemaRequestUpdate } from '../../schema/types/TSchemaRequest';
import type { TSchemaResponse } from '../../schema/types/TSchemaResponse';
import { DATA_PROVIDER } from '../@consts';
import { absDataProvider } from '../base/absDataProvider';
import type { IDataProvider } from '../base/IDataProvider';
import type { TStorageFilesDataOptions } from '../types/TStorageFilesDataOptions';
import { StorageFilesData } from './StorageFilesData';
import type { TStorageFoldersDataOptions } from './StorageFoldersData';
import { StorageFoldersData } from './StorageFoldersData';


//
export enum STORAGE_MODE {
    FILES = 'files',
    FOLDERS = 'folders'
}


//
export type TStorageDataOptions = ({ mode: STORAGE_MODE.FILES } & TStorageFilesDataOptions)
    | ({ mode: STORAGE_MODE.FOLDERS } & TStorageFoldersDataOptions)

export type TStorageDataConfig = U_config_sources_source & {
    options: TStorageDataOptions;
}


//
export class StorageData extends absDataProvider implements IDataProvider {

    SourceName?: string
    ProviderName = DATA_PROVIDER.STORAGE
    Config: U_config_sources_source = <U_config_sources_source>{}
    Connection?: StorageFilesData | StorageFoldersData;

    DEFAULT = {
        options: {
            mode: STORAGE_MODE.FILES
        }
    }

    constructor() {
        super()
    }

    async Init(source: string, sourceConfig: U_config_sources_source): Promise<void> {
        await super.Init(source, sourceConfig)

        this.Config = merge(this.DEFAULT, sourceConfig)

        const { mode } = this.Config.options as TStorageDataOptions

        this.Connection = (mode === STORAGE_MODE.FILES)
            ? new StorageFilesData()
            : new StorageFoldersData()

        Assert.Var<StorageFilesData | StorageFoldersData>(this.Connection, `${this.SourceName}: Connection is not defined`)

        await this.Connection.Init(source, sourceConfig)
    }

    async Connect(): Promise<void> {
        Assert.Var<StorageFilesData | StorageFoldersData>(this.Connection, `${this.SourceName}: Provider is not defined`)
        await this.Connection.Connect()
    }

    async Disconnect(): Promise<void> {
        Assert.Var<StorageFilesData | StorageFoldersData>(this.Connection, `${this.SourceName}: Provider is not defined`)
        await this.Connection.Disconnect();
        this.Connection = undefined;
    }

    async Select(schemaRequest: TSchemaRequestSelect, $context?: Partial<TContext>): Promise<TInternalResponse<TSchemaResponse>> {
        Assert.Var<StorageFilesData | StorageFoldersData>(this.Connection, `${this.SourceName}: Provider is not defined`)
        return this.Connection.Select(schemaRequest, $context);
    }

    async Insert(schemaRequest: TSchemaRequestInsert, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {
        Assert.Var<StorageFilesData | StorageFoldersData>(this.Connection, `${this.SourceName}: Provider is not defined`)
        return this.Connection.Insert(schemaRequest, $context);
    }

    async Update(schemaRequest: TSchemaRequestUpdate, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {
        Assert.Var<StorageFilesData | StorageFoldersData>(this.Connection, `${this.SourceName}: Provider is not defined`)
        return this.Connection.Update(schemaRequest, $context);
    }

    async Delete(schemaRequest: TSchemaRequestDelete, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {
        Assert.Var<StorageFilesData | StorageFoldersData>(this.Connection, `${this.SourceName}: Provider is not defined`)
        return this.Connection.Delete(schemaRequest, $context);
    }

    async AddEntity(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        Assert.Var<StorageFilesData | StorageFoldersData>(this.Connection, `${this.SourceName}: Provider is not defined`)
        return this.Connection.AddEntity(schemaRequest);
    }

    async ListEntities(schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>> {
        Assert.Var<StorageFilesData | StorageFoldersData>(this.Connection, `${this.SourceName}: Provider is not defined`)
        return this.Connection.ListEntities(schemaRequest);
    }

    EscapeEntity(entity: string): string {
        Assert.Var<StorageFilesData | StorageFoldersData>(this.Connection, `${this.SourceName}: Provider is not defined`)
        return this.Connection.EscapeEntity(entity);
    }

    EscapeField(field: string): string {
        Assert.Var<StorageFilesData | StorageFoldersData>(this.Connection, `${this.SourceName}: Provider is not defined`)
        return this.Connection.EscapeField(field);
    }
}
