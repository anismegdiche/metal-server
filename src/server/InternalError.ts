//
//
//
//
//
import { VERBOSITY } from "../lib/Logger"

export class InternalError extends Error {
    verbosity: VERBOSITY

    constructor(verbosity: VERBOSITY, message?: string) {
        super(message ?? "")
        this.name = "InternalError"
        this.verbosity = verbosity
    }
}

export class WarnError extends InternalError {
    constructor(message?: string) {
        super(VERBOSITY.WARN, message ?? "Warning")
        this.name = "WarnError"
    }
}

export class ErrorError extends InternalError {
    constructor(message?: string) {
        super(VERBOSITY.ERROR, message ?? "Warning")
        this.name = "WarnError"
    }
}