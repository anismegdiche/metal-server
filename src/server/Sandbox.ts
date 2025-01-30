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

export class Sandbox {

    #Context = createContext()
    #KeepState: boolean = false

    constructor(context?: Partial<TContext>) {
        if (context) {
            this.SetContext(context) // Set the context
            this.#KeepState = true
        }
    }

    // Example validation function
    static #IsValidCode(code: string): boolean {
        const maliciousPatterns = [
            /require\(["']child_process["']\)/, // Detecting child_process module usage
            /(\.|document)\s*\.\s*(cookie|write|writeln)\s*=/, // Detecting potential DOM manipulation
            /\b(fetch|XMLHttpRequest|http\s*\.\s*request)\b/, // Detecting potential network requests
            /\bexec\s*\(/, // Detecting exec function usage
            /\beval\s*\(/, // Detecting eval function usage
            /\b\.prototype\s*/, // Detecting manipulation of *.prototype
            /\bprocess\s*/, // Detecting manipulation of *.prototype
            /\b(?:setTimeout|setInterval)\s*\(/, // Detecting potential code execution delays
            /(\bfunction\s*\w*\s*\(|\(\)\s*=>\s*\{)/, // Detecting function declarations
            /\b(?:import|export)\b/, // Detecting import/export statements
            /while\s*\(\s*true\s*\)\s*\{\s*\}/, // Detecting infinite loops
            /\b(?:fork|spawn)\s*\(/, // Detecting child process spawning
            /\b(?:sql|query)\b/i, // Detecting potential SQL keywords
            /(['"`])\s*(?:or|and)\s*=\s*\1/i // Detecting potential SQL injection patterns
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
        try {

            if (!Sandbox.#IsValidCode(_code))
                throw new HttpErrorInternalServerError('Invalid code')

            if (!this.#KeepState)
                this.Reset()

            const script = new Script(_code)
            return script.runInContext(this.#Context)

        } catch (error: any) {
            Logger.Error(`Error evaluating code: ${_code}, ${error?.message}`)
            return undefined
        }
    }

    AddSafeObjectsToContext(): void {
        this.#Context.JSON = JSON
        this.#Context.Math = Math
        this.#Context._ = _
    }
}