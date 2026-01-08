import type { TAmazonS3StorageConfig } from "../providers/AmazonS3Storage";
import type { TAzureBlobStorageConfig } from "../providers/AzureBlobStorage";
import type { TAzureDataLakeStorageConfig } from "../providers/AzureDataLakeStorage";
import type { TAzureFileStorageConfig } from "../providers/AzureFileStorage";
import type { TFsStorageConfig } from "../providers/FsStorage";
import type { TFtpStorageConfig } from "../providers/FtpStorage";


export type TStorageConfig = TFsStorageConfig &
    TFtpStorageConfig &
    TAzureBlobStorageConfig &
    TAzureFileStorageConfig &
    TAzureDataLakeStorageConfig &
    TAmazonS3StorageConfig;
