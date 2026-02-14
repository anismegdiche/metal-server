//
//
//
import * as _ from 'lodash-es'
import { createContext, Script } from 'node:vm'
//
import { Logger } from '../../utils/Logger'
import { HttpErrorInternalServerError, NormalizeError } from "../errors/HttpErrors"
import type { TContext } from "./types/TContext"
import { maliciousPatterns } from "./@consts"
import { Utils } from "../../utils/Utils"


//
export class Sandbox {

    #Context = createContext()
    #KeepState: boolean = false //NOSONAR

    constructor(context?: Partial<TContext>) {
        if (context) {
            this.SetContext(context) // Set the context
            this.#KeepState = true
        }
    }

    static _isValidCode(code: string): boolean {
        return !maliciousPatterns.some(pattern => pattern.test(code))
    }

    @Logger.LogFunction(true)
    SetContext(context?: object): void {
        this.#Context = createContext(context)
        this.AddSafeObjectsToContext()
    }

    @Logger.LogFunction()
    Reset(): void {
        this.SetContext()
    }

    // Evaluate dynamic code
    @Logger.LogFunction()
    Evaluate<T>(code: string, throwError: boolean = false): T | undefined {
        const _code = code.trim()
        let isSuspicious = false
        try {

            if (!Sandbox._isValidCode(_code)) {
                isSuspicious = true
                throw new HttpErrorInternalServerError('Invalid code')
            }
            if (!this.#KeepState)
                this.Reset()

            const script = new Script(_code)
            return script.runInContext(this.#Context)

        } catch (err: unknown) {
            Logger.Error(`Error evaluating code: ${_code}, ${NormalizeError(err).message}`)
            if (isSuspicious || throwError)
                throw err
            return undefined
        }
    }

    AddSafeObjectsToContext(): void {
        this.#Context.JSON = JSON
        this.#Context.Math = Math
        this.#Context._ = _

        this.#Context.$utils = {
            JSON,
            Math,
            _,
            newUuid: () => Utils.Uuid(true)
        }
    }
}