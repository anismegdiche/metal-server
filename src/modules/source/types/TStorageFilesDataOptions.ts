//
//
//
import { STORAGE } from "../../storage/@consts";
import { TStorageConfig } from "../../storage/types/TStorageConfig";
import { TStorageFilesDataOptionsContent } from "./TStorageFilesDataOptionsContent";


export type TStorageFilesDataOptions = {
    // Common
    "storage-type"?: STORAGE;
    content?: TStorageFilesDataOptionsContent;
    autocreate?: boolean;
} &
    TStorageConfig;
