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
    BREAK = "break", // v0.5
    PICK = "pick", // v0.5
    OMIT = "omit", // v0.5
    MAP = "map", // v0.5
    SET_VAR = "set-var" // v0.5
}


export enum STEP_STATUS {
    PENDING = "pending",
    RUNNING = "running",
    COMPLETED = "completed",
    FAILED = "failed"
}

