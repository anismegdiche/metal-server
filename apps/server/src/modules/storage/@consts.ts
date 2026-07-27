//

export enum STORAGE {
	// Legacy
	FILESYSTEM = "fs",
	FTP = "ftp",
	SFTP = "sftp",

	// Cloud (Azure)
	AZURE_BLOB = "azure-blob",
	AZURE_FILE = "azure-file",
	AZURE_DATALAKE_G2 = "azure-datalake",

	// Cloud (AWS)
	AWS_S3 = "aws-s3",
}
