//
//
//
import _ from "lodash"
import { createContext, Script } from 'vm'
//
import { Logger } from '../../utils/Logger'
import { HttpErrorInternalServerError } from "../errors/HttpErrors"
import { TContext } from "./types/TContext"
import typia, { tags } from "typia"
import { maliciousPatterns } from "./@consts"


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

    // Example validation function
    static #IsValidCode(code: string): boolean {
        
        
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
    Evaluate<T>(code: string): T | undefined {
        const _code = code.trim()
        let isSuspicious = false
        try {

            if (!Sandbox.#IsValidCode(_code)) {
                isSuspicious = true
                throw new HttpErrorInternalServerError('Invalid code')
            }
            if (!this.#KeepState)
                this.Reset()

            const script = new Script(_code)
            return script.runInContext(this.#Context)

        } catch (error: any) {
            Logger.Error(`Error evaluating code: ${_code}, ${error?.message}`)
            if (isSuspicious)
                throw error
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
            newUuid: () => typia.random<string & tags.Format<"uuid">>()
        }
    }
}