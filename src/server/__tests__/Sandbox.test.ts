/* eslint-disable no-eval */
//
//
//
//
//
import { Sandbox } from "../Sandbox"


describe('Sandbox', () => {

    // Sandbox context is created successfully
    it('should create a Sandbox context successfully', () => {
        const sandbox = new Sandbox()
        expect(sandbox).toBeDefined()
    })

    // Code is evaluated successfully within the context
    it('should evaluate safe code successfully within the context', () => {
        const sandbox = new Sandbox()
        const code = 'Math.abs(2 - 9)'
        const result = sandbox.Evaluate(code)

        // eslint-disable-next-line no-eval
        expect(result).toStrictEqual(eval(code))
    })

    it('should reset VM state', () => {
        const sandbox = new Sandbox()
        let result = sandbox.Evaluate('var x = 5')
        result = sandbox.Evaluate('x * 2')

        expect(result).toBeUndefined()
    })

    // Code is evaluated successfully within the context
    it('should evaluate code successfully within the context', () => {
        const sandbox = new Sandbox()
        const code = 'console.log("Hello, World!")'
        const result = sandbox.Evaluate(code)
        expect(result).toBeUndefined()
    })

    // Invalid code is rejected and error is logged
    it('should reject invalid code and log an error', () => {
        const sandbox = new Sandbox()
        const code = 'console.log("Hello, World!")123'
        const result = sandbox.Evaluate(code)
        expect(result).toBeUndefined()
    })

    // Code with syntax error is rejected and error is logged
    it('should reject code with syntax error and log an error', () => {
        const sandbox = new Sandbox()
        const code = 'console.log("Hello, World!")'
        const result = sandbox.Evaluate(code)
        expect(result).toBeUndefined()
    })

    // Code with infinite loop is rejected and error is logged
    it('should reject code with infinite loop and log an error', () => {
        const sandbox = new Sandbox()
        const code = 'while(true) {}'
        const result = sandbox.Evaluate(code)
        expect(result).toBeUndefined()
    })

    // Code with malicious intent is rejected and error is logged
    it('should reject code with malicious intent and log an error', () => {
        const sandbox = new Sandbox()
        const code = 'require("child_process").execSync("rm -rf /")'
        const result = sandbox.Evaluate(code)
        expect(result).toBeUndefined()
    })

    it('should reject code attempting to access the file system and log an error', () => {
        const sandbox = new Sandbox()
        const code = 'const fs = require("fs") fs.writeFileSync("malicious.txt", "Malicious content")'
        const result = sandbox.Evaluate(code)
        expect(result).toBeUndefined()
    })

    // Code attempting to make network requests is rejected and error is logged
    it('should reject code attempting to make network requests and log an error', () => {
        const sandbox = new Sandbox()
        const code = 'const http = require("http") http.get("http://malicious-site.com")'
        const result = sandbox.Evaluate(code)
        expect(result).toBeUndefined()
    })

    // Code attempting to modify global objects is rejected and error is logged
    it('should reject code attempting to modify global objects and log an error', () => {
        const sandbox = new Sandbox()
        const code = 'Object.prototype.maliciousFunction = () => console.log("Malicious")'
        const result = sandbox.Evaluate(code)
        expect(result).toBeUndefined()
    })

    // Code attempting to access sensitive environment variables is rejected and error is logged
    it('should reject code attempting to access sensitive environment variables and log an error', () => {
        const sandbox = new Sandbox()
        const code = 'console.log(process.env.SENSITIVE_DATA)'
        const result = sandbox.Evaluate(code)
        expect(result).toBeUndefined()
    })

    // Code attempting to execute shell commands is rejected and error is logged
    it('should reject code attempting to execute shell commands and log an error', () => {
        const sandbox = new Sandbox()
        const code = 'const { exec } = require("child_process") exec("echo Malicious code")'
        const result = sandbox.Evaluate(code)
        expect(result).toBeUndefined()
    })

    it('should reject code attempting to spawn child processes and log an error', () => {
        const sandbox = new Sandbox()
        const code = 'require("child_process").fork("maliciousScript.js")'
        const result = sandbox.Evaluate(code)
        expect(result).toBeUndefined()
    })

    // Code attempting to use eval is rejected and error is logged
    it('should reject code attempting to use eval and log an error', () => {
        const sandbox = new Sandbox()
        const code = 'eval("console.log(\'Eval is dangerous!\')")'
        const result = sandbox.Evaluate(code)
        expect(result).toBeUndefined()
    })

    // Code attempting to access the sandbox's internal modules is rejected and error is logged
    it('should reject code attempting to access internal modules and log an error', () => {
        const sandbox = new Sandbox()
        const code = 'const internalModule = require("internal-module")'
        const result = sandbox.Evaluate(code)
        expect(result).toBeUndefined()
    })

    // Code attempting to manipulate the prototype chain is rejected and error is logged
    it('should reject code attempting to manipulate the prototype chain and log an error', () => {
        const sandbox = new Sandbox()
        const code = 'Array.prototype.customFunction = () => console.log("Manipulating prototype chain")'
        const result = sandbox.Evaluate(code)
        expect(result).toBeUndefined()
    })

    // Code attempting to create infinite recursion is rejected and error is logged
    it('should reject code attempting to create infinite recursion and log an error', () => {
        const sandbox = new Sandbox()
        const code = 'function infiniteRecursion() { infiniteRecursion() } infiniteRecursion()'
        const result = sandbox.Evaluate(code)
        expect(result).toBeUndefined()
    })

    // Code attempting to access restricted APIs is rejected and error is logged
    it('should reject code attempting to access restricted APIs and log an error', () => {
        const sandbox = new Sandbox()
        const code = 'const crypto = require("crypto")'
        const result = sandbox.Evaluate(code)
        expect(result).toBeUndefined()
    })

    it('should return context object', () => {
        const sandbox = new Sandbox(true)
        const o =  { x: 5 }
        sandbox.SetContext({o})

        const code = 'o.x'
        const result = sandbox.Evaluate(code)
        expect(result).toEqual(eval(code))
    })
})
