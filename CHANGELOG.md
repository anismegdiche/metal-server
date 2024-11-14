# Metal Changelog

## Version 0.3 - November 14, 2024

### ⚠️ Breaking Changes
- Updated to Node.js v22.10.0 for improved performance and security.
- Parameter `sourceName` changed to `source`
- Parameter `entityName` changed to `entity`
- Parameter `schemaName` changed to `schema`
- Parameter `planName` changed to `plan`
- Parameter `leftField` changed to `left-field`
- Parameter `rightField` changed to `right-field`
- Parameter `filterExpression` changed to `filter-expression`
- Parameter `autoCreate` changed to `autocreate`
- File Provider:
    - Changed `contentType` → `content` (Now supports multiple content type for the same storage, which may cause changes in behavior for existing configuration).
    - Changed `storageType` → `storage`.
    - Changed `fileSystem` storage → `fs`.
    - Changed Parameter `fsFolder` → `fs-folder`.
    - Changed `azureBlob` storage → `az-blob`.
    - Changed Parameter `azureBlobConnectionString` → `az-blob-connection-string`.
    - Changed Parameter `azureBlobContainerName` → `az-blob-container`.
    - Changed Parameter `azureBlobCreateContainerIfNotExists` → `az-blob-autocreate`.
    - Changed Parameter `jsonArrayPath` → `json-array`.
    - Changed Parameter `csvDelimiter` → `csv-delimiter`.
    - Changed Parameter `csvNewline` → `csv-newline`.
    - Changed Parameter `csvHeader` → `csv-header`.
    - Changed Parameter `csvQuoteChar` → `csv-quote`.
    - Changed Parameter `csvSkipEmptyLines` → `csv-skip-empty`.
- Plan sync function parameters have changed:
  - `source` → `from`
  - `destination` → `to`
  - `on` → `id`

### Features
- Response configuration: chunk, rate limit, body limit.
- Plan commands: anonymize, remove-duplicates.
- SwaggerUI.
- Schema: List entities.
- File Provider: FTP.
- File Content: XLSX.
- Role Based Access Control.

### Enhancements
- Updated packages.
- Updated Config file validation.
- Updated Plan sync function usage.
- Enhanced Authentication.
- Enhanced Logging feature.
- Enhanced MongoDb filter expression.
- Enhanced Tessract.js Engine.
- Enhanced File Provider (now supports multiple content types in the same storage).

### Bug Fixes
- Fixed bugs related to Plan commands.
- Fixed bugs related to File Provider.

---
# Metal Changelog

## Version 0.2 - March 01, 2024

### Features
- DataProvider: Azure SQL Database, File, Memory and Metal cross.
- File storage: Local filesystem, Azure Blob
- File Content: JSON, CSV.
- Plan commands: sync.
- JS code in DataProvider options.

### Enhancements
- Improved MS SQL Server DataProvider.
- Updated Logging Feature.
- Updated packages.

### Bug Fixes
- Fixed bugs related to Plan commands.

---
## Version 0.1 - January 12, 2024

### Features
- User authentication
- REST API: user (authentication), schema (CRUD operations), cache (view/purge/clean), plan (start/stop)
- DataProvider: PostgreSQL, MS SQL Server, MongoDB and Plan.
- DataProvider Options: filter, filterExpression, fields, data, sort, cache.
- Plan Feature and commands: select, update, delete, insert, join (left, right, inner, fullOuter, cross), break, fields, sort, run, debug.
- Scheduling Feature with cron syntax
- AI Engine Feature: Tesseract.JS, TensorFlow.JS and NLP.JS
- Configuration Validator
- Console logging