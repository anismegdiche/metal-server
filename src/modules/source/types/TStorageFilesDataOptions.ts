//
//
//
import { STORAGE } from "../../storage/@consts";
import type { TStorageConfig } from "../../storage/types/TStorageConfig";
import type { TStorageFilesDataOptionsContent } from "./TStorageFilesDataOptionsContent";


export type TStorageFilesDataOptions = {
    // Common
    "storage-type"?: STORAGE;
    content?: TStorageFilesDataOptionsContent;
    autocreate?: boolean;
} &
    TStorageConfig;
