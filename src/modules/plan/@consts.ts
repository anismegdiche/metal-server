//


export enum STEP {
    DEBUG = "debug",
    SELECT = "select",
    UPDATE = "update",
    DELETE = "delete",
    INSERT = "insert",
    JOIN = "join",
    FIELDS = "fields",
    SORT = "sort",
    RUN = "run",
    SYNC = "sync",// v0.2
    ANONYMIZE = "anonymize",// v0.3        
    REMOVE_DUPLICATE = "remove-duplicates",// v0.3
    LIST_ENTITIES = "list-entities", // v0.3
    REMOVE_FIELDS = "remove-fields", // v0.5
    BREAK = "break" // v0.5
}


export enum STEP_STATUS {
    PENDING = "pending",
    RUNNING = "running",
    COMPLETED = "completed",
    FAILED = "failed"
}