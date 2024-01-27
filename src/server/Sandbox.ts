//
//
//
//
//
import { createContext, Script } from 'vm'
//
import { Logger } from '../lib/Logger'

export class Sandbox {
    #Context: any
    #KeepState: boolean = false

    constructor(resetState: boolean = false) {
        this.#KeepState = resetState
        this.Reset()
    }

    Reset() {
        // Create a context
        this.#Context = createContext()

        // Add additional variables or functions to the context if needed
        this.#Context.global = this.#Context

        // Add console to the context if you want to allow console.log, etc.
        this.#Context.console = console
    }

    // Evaluate dynamic code
    Evaluate(code: string): string | undefined {
        try {
            // Perform additional validation if necessary
            if (!Sandbox.#IsValidCode(code)) {
                throw new Error('Invalid code')
            }

            if (!this.#KeepState) {
                this.Reset()
            }

            // Execute the code within the context
            const script = new Script(code)
            return script.runInContext(this.#Context)
        } catch (error: any) {
            // Handle errors or log them
            Logger.Error(`Error evaluating code: ${code}, ${error?.message}`)
            return undefined
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
}