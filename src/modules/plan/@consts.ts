//
//
//

export enum PLAN_FAILURE_STRATEGY {
	DATA = "data",
	DATA_ERRORS = "data-errors",
	THROW = "throw"
}

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
	SYNC = "sync", // v0.2
	ANONYMIZE = "anonymize", // v0.3
	REMOVE_DUPLICATE = "remove-duplicates", // v0.3
	LIST_ENTITIES = "list-entities", // v0.3
	BREAK = "break", // v0.5
	PICK = "pick", // v0.5
	OMIT = "omit", // v0.5
	MAP = "map", // v0.5
	SET_VAR = "set-var", // v0.5
}

export enum STEP_STATUS {
	PENDING = "pending",
	RUNNING = "running",
	COMPLETED = "completed",
	FAILED = "failed",
}

export enum STEP_ON_ERROR_STRATEGY {
	THROW = "throw",
	SKIP = "skip",
	RETRY = "retry",
	SINK = "sink"
}

export enum STEP_ON_ERROR_SCOPE {
	STEP = "step",
	ROW = "row"
}

export enum STEP_ON_ERROR_RETRY_BACKOFF {
	FIXED = "fixed",
	LINEAR = "linear",
	EXPONENTIAL = "exponential"
}

export enum STEP_ON_ERROR_RETRY_AFTER_RETRIES {
	THROW = STEP_ON_ERROR_STRATEGY.THROW,
	SKIP = STEP_ON_ERROR_STRATEGY.SKIP,
	SINK = STEP_ON_ERROR_STRATEGY.SINK
}

export enum STEP_SIGNAL {
	NEXT = "next",
	STOP = "stop"
}

export enum STEP_OUTCOME {
	SUCCESS = "success",
	FAILED = "failed"
}