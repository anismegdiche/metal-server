 
import { HttpErrorInternalServerError } from "../../errors/HttpErrors"
import { Sandbox } from "../Sandbox"


// Mock the Logger
jest.mock('../../../utils/Logger', () => ({
    Logger: {
        SetLevel: () => () => { },
        EnableAll: () => () => { },
        DisableAll: () => () => { },
        Log: () => () => { },
        Error: () => () => { },
        Warn: () => () => { },
        Debug: () => () => { },
        Info: () => () => { },
        Message: () => () => { },
        LogFunction: () => () => { },
        Level : "error",
        Out: 'OUT'
    }
}))

describe('Sandbox', () => {
    // Sandbox context is created successfully
    it('should create a Sandbox context successfully', () => {
        const sandbox = new Sandbox()
        expect(sandbox).toBeDefined()
    })

    // Code is evaluated successfully within the context
    it('should evaluate code successfully within the context', () => {
        const sandbox = new Sandbox()
        const code = 'Math.abs(2 - 9)'
        const result = sandbox.Evaluate(code)
        expect(result).toStrictEqual(eval(code))
    })

    it('should reset VM state', () => {
        const sandbox = new Sandbox()
        let result = sandbox.Evaluate('var x = 5')
        result = sandbox.Evaluate('x * 2')
        expect(result).toBeUndefined()
    })

    it('should evaluate code with console.log safely', () => {
        const sandbox = new Sandbox()
        const code = 'console.log("Hello, World!")'
        const result = sandbox.Evaluate(code)
        expect(result).toBeUndefined()
    })

    it('should reject invalid code and log an error', () => {
        const sandbox = new Sandbox()
        const code = 'console.log("Hello, World!")123'
        const result = sandbox.Evaluate(code)
        expect(result).toBeUndefined()
    })

    // Additional function and context tests
    it('should return context object', () => {
        const $response = { body: { x: 5 } }
        const sandbox = new Sandbox({ $response })
        const code = '$response.body.x'
        const result = sandbox.Evaluate(code)
        expect(result).toEqual(eval(code))
    })

    it('should return object in object', () => {
        const $entity = "person"
        const $row = {
            name: "John",
            age: 30
        }
        const sandbox = new Sandbox({
            $entity,
            $row
        })
        const code = '({ [ $entity ]: $row })'
        const result = sandbox.Evaluate(code)
        expect(result).toEqual({
            person: {
                name: "John",
                age: 30
            }
        })
    })

    it('should be valid for added functions', () => {
        const sandbox = new Sandbox()
        // Math
        expect(sandbox.Evaluate("Math.abs(2 - 9)")).toEqual(7)
        // JSON
        expect(sandbox.Evaluate("JSON.stringify({ a: 1 })")).toEqual('{"a":1}')
        // Lodash
        expect(sandbox.Evaluate("_.sum([1, 2, 3])")).toEqual(6)
    })


    // Malicious tests separated
    describe('Malicious Code Tests', () => {
        it('should reject code attempting to execute shell commands (exec)', () => {
            const sandbox = new Sandbox()
            expect(() => sandbox.Evaluate('require("child_process").execSync("rm -rf /")'))
                .toThrow(HttpErrorInternalServerError)
        })

        it('should reject code attempting to access the file system', () => {
            const sandbox = new Sandbox()
            expect(() => sandbox.Evaluate('const fs = require("fs"); fs.writeFileSync("malicious.txt", "Malicious content")'))
                .toThrow(HttpErrorInternalServerError)
        })

        it('should reject code attempting to make network requests', () => {
            const sandbox = new Sandbox()
            expect(() => sandbox.Evaluate('const http = require("http"); http.get("http://malicious-site.com")'))
                .toThrow(HttpErrorInternalServerError)
        })

        it('should reject code attempting to modify global objects', () => {
            const sandbox = new Sandbox()
            expect(() => sandbox.Evaluate('Object.prototype.maliciousFunction = () => console.log("Malicious")'))
                .toThrow(HttpErrorInternalServerError)
        })

        it('should reject code attempting to access sensitive environment variables', () => {
            const sandbox = new Sandbox()
            expect(() => sandbox.Evaluate('console.log(process.env.SENSITIVE_DATA)'))
                .toThrow(HttpErrorInternalServerError)
        })

        it('should reject code attempting to spawn child processes', () => {
            const sandbox = new Sandbox()
            expect(() => sandbox.Evaluate('require("child_process").fork("maliciousScript.js")'))
                .toThrow(HttpErrorInternalServerError)
        })

        it('should reject code attempting to use eval', () => {
            const sandbox = new Sandbox()
            expect(() => sandbox.Evaluate('eval("console.log(\'Eval is dangerous!\')")'))
                .toThrow(HttpErrorInternalServerError)
        })

        it('should reject code attempting to access internal modules', () => {
            const sandbox = new Sandbox()
            expect(() => sandbox.Evaluate('const internalModule = require("internal-module")'))
                .toThrow(HttpErrorInternalServerError)
        })

        it('should reject code attempting to manipulate the prototype chain', () => {
            const sandbox = new Sandbox()
            expect(() => sandbox.Evaluate('Array.prototype.customFunction = () => console.log("Manipulating prototype chain")'))
                .toThrow(HttpErrorInternalServerError)
        })

        it('should reject code attempting to create infinite recursion', () => {
            const sandbox = new Sandbox()
            expect(() => sandbox.Evaluate('function infiniteRecursion() { infiniteRecursion() } infiniteRecursion()'))
                .toThrow(HttpErrorInternalServerError)
        })

        it('should reject code attempting to access restricted APIs', () => {
            const sandbox = new Sandbox()
            expect(() => sandbox.Evaluate('const crypto = require("crypto")'))
                .toThrow(HttpErrorInternalServerError)
        })
    })

    describe("Security Tests", () => {
        let sandbox = new Sandbox()

        beforeEach(() => {
            sandbox = new Sandbox()
        })

        it("should reject code that executes shell commands (exec)", () => {
            expect(() => sandbox.Evaluate("require('child_process').exec('ls')"))
                .toThrow(HttpErrorInternalServerError)
        })

        it("should reject code that exits the process", () => {
            expect(() => sandbox.Evaluate("process.exit(1)"))
                .toThrow(HttpErrorInternalServerError)
        })

        it("should reject code that uses eval", () => {
            expect(() => sandbox.Evaluate("eval('2 + 2')"))
                .toThrow(HttpErrorInternalServerError)
        })

        it("should reject code that manipulates object prototypes", () => {
            expect(() => sandbox.Evaluate("Object.prototype.hacked = true"))
                .toThrow(HttpErrorInternalServerError)
        })

        it("should reject infinite loops", () => {
            expect(() => sandbox.Evaluate("while(true) {}"))
                .toThrow(HttpErrorInternalServerError)
        })

        it("should reject code that makes network requests", () => {
            expect(() => sandbox.Evaluate("fetch('http://malicious.com')"))
                .toThrow(HttpErrorInternalServerError)
        })

        it("should reject function declarations", () => {
            expect(() => sandbox.Evaluate("function test() { return 'hacked' }"))
                .toThrow(HttpErrorInternalServerError)
        })

        it("should reject setTimeout and setInterval usage", () => {
            expect(() => sandbox.Evaluate("setTimeout(() => console.log('hacked'), 1000)"))
                .toThrow(HttpErrorInternalServerError)
        })

        it("should reject command injection via concatenation", () => {
            expect(() => sandbox.Evaluate("const cmd = 'ls'; require('child_process').exec(cmd)"))
                .toThrow(HttpErrorInternalServerError)
        })

        it("should reject environment variable access", () => {
            expect(() => sandbox.Evaluate("process.env.SECRET"))
                .toThrow(HttpErrorInternalServerError)
        })

        it("should reject accessing global objects", () => {
            expect(() => sandbox.Evaluate("global.process.exit(1)"))
                .toThrow(HttpErrorInternalServerError)
        })

        it("should reject modifying the global object", () => {
            expect(() => sandbox.Evaluate("global.hacked = true"))
                .toThrow(HttpErrorInternalServerError)
        })

        it("should reject accessing the Function constructor", () => {
            expect(() => sandbox.Evaluate("Function('return process')()"))
                .toThrow(HttpErrorInternalServerError)
        })
    })
})
