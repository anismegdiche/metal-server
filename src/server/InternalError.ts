//
//
//
//
//
import { VERBOSITY } from "../utils/Logger"

//TODO: refactor and remove
export class InternalError extends Error {
    verbosity: VERBOSITY

    constructor(verbosity: VERBOSITY, message?: string) {
        super(message ?? "")
        this.name = "InternalError"
        this.verbosity = verbosity
    }
}

//TODO: refactor and remove
export class WarnError extends InternalError {
    constructor(message?: string) {
        super(VERBOSITY.WARN, message ?? "Warning")
        this.name = "WarnError"
    }
}