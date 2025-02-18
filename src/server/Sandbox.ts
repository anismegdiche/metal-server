//
//
//
//
//
import _ from "lodash"
import { createContext, Script } from 'vm'
//
import { Logger } from '../utils/Logger'
import { HttpErrorInternalServerError } from "./HttpErrors"
import { TContext } from "../@types/TContext"
import typia, { tags } from "typia"


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
        const maliciousPatterns = [
            // Detecting the use of child_process module
            /require\(["']child_process["']\)/,

            // Detecting attempt to require any module (to prevent loading internal modules)
            /require\(["'].*["']\)/,  // Matches any require statement (use cautiously)

            // Detecting potential DOM manipulation (cookie, write, writeln)
            /(\.|document)\s*\.\s*(cookie|write|writeln)\s*=/,

            // Detecting network requests via fetch or XMLHttpRequest
            /\b(fetch|XMLHttpRequest|http\s*\.\s*request)\b/,

            // Detecting exec function usage
            /\bexec\s*\(/,

            // Detecting eval function usage
            /\beval\s*\(/,

            // Detecting manipulation of *.prototype
            /\b\.prototype\s*/,

            // Detecting potential access to process object
            /\bprocess\s*/,

            // Detecting potential code execution delays using setTimeout/setInterval
            /\b(?:setTimeout|setInterval)\s*\(/,

            // Detecting function declarations (both regular functions and arrow functions)
            /(\bfunction\s*\w*\s*\(|\(\)\s*=>\s*\{)/,

            // Detecting import/export statements (ES6 modules)
            /\b(?:import|export)\b/,

            // Detecting infinite loops
            /while\s*\(\s*true\s*\)\s*\{\s*\}/,

            // Detecting child process spawning (fork or spawn)
            /\b(?:fork|spawn)\s*\(/,

            // Detecting potential SQL keywords (to prevent SQL injection)
            /\b(?:sql|query)\b/i,

            // Detecting potential SQL injection patterns (common SQL operators like OR, AND)
            /(['"`])\s*(?:or|and)\s*=\s*\1/i,

            // Detecting manipulation of global object (global or globalThis)
            /\b(global|globalThis)\s*\.\s*\w+\s*=/  // Matches assignments to global object like global.hacked = true
        ]
        
        return !maliciousPatterns.some(pattern => pattern.test(code))
    }

    @Logger.LogFunction(Logger.Debug, true)
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