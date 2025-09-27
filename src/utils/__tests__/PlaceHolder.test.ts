 

import { Sandbox } from "../../modules/sandbox/Sandbox"
import { TJson } from "../../types/TJson"
import { PlaceHolder } from "../PlaceHolder"

// Mock the Logger
jest.mock('../../utils/Logger', () => ({
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


describe('PlaceHolder', () => {
    describe('EvaluateJsCode', () => {
        it('should evaluate simple expressions', () => {
            const input: string = '${{ 1 + 2 }}'
            const result = PlaceHolder.EvaluateJsCode(input, new Sandbox())
            expect(result).toBe(3)
        })

        it('should evaluate complex expressions', () => {
            const input: string = '${{ (1 + 2) * 3 }}'
            const result = PlaceHolder.EvaluateJsCode(input, new Sandbox())
            expect(result).toBe(9)
        })

        it('should handle variables in expressions', () => {
            const input = '${{ $row.x + 2 }}'
            const $context = {
                $row: {
                    x: 1
                }
            }
            const result = PlaceHolder.EvaluateJsCode(input, new Sandbox($context))
            expect(result).toBe(3)
        })

        it('should handle functions in expressions', () => {
            const input = '${{ Math.pow(2, 3) }}'
            const result = PlaceHolder.EvaluateJsCode(input, new Sandbox())
            expect(result).toBe(8)
        })

        it('should handle conditional expressions', () => {
            const input = '${{ $row.x > 0 ? true : false }}'
            const $context = {
                $row: {
                    x: 1
                }
            }
            const result = PlaceHolder.EvaluateJsCode(input, new Sandbox($context))
            expect(result).toBe(true)
        })

        it('should handle nested expressions', () => {
            const input = '${{ ($row.x > 0 ? true : false) && ($row.y > 0 ? true : false) }}'
            const $context = {
                $row: {
                    x: 1,
                    y: 2
                }
            }
            const result = PlaceHolder.EvaluateJsCode(input, new Sandbox($context))
            expect(result).toBe(true)
        })

        it('should handle undefined variables', () => {
            const input = '${{ x + 2 }}'
            const result = PlaceHolder.EvaluateJsCode(input, new Sandbox())
            expect(result).toBeUndefined()
        })

        it('should handle invalid expressions', () => {
            const input = '${{ invalid expression }}'
            expect(() => PlaceHolder.EvaluateJsCode(input, new Sandbox())).toBeDefined()
        })

        it('should handle empty string input', () => {
            const result = PlaceHolder.EvaluateJsCode('', new Sandbox())
            expect(result).toEqual('')
        })

        it('should handle null input', () => {
            const result = PlaceHolder.EvaluateJsCode(null, new Sandbox())
            expect(result).toBeUndefined()
        })

        it('should handle undefined input', () => {
            const result = PlaceHolder.EvaluateJsCode(undefined, new Sandbox())
            expect(result).toBeUndefined()
        })

        it('should return same object', () => {
            const data: TJson = {
                title: "Fight Club",
                description: "An insomniac office worker"
            }

            const result = PlaceHolder.EvaluateJsCode(data, new Sandbox())
            expect(result).toEqual(data)
        })

        it('should evaluate key to number', () => {
            const data: TJson = {
                title: "Fight Club",
                pages: "${{ 2 + 2 }}"
            }

            const result = PlaceHolder.EvaluateJsCode(data, new Sandbox())
            expect(result).toEqual({
                title: "Fight Club",
                pages: 4
            })
        })

        it('should evaluate variables and return evaluated object', () => {
            const $context = {
                $entity: "movies",
                $row: {
                    id: 1,
                    title: "Fight Club",
                    description: "An insomniac office worker and a devil-may-care soapmaker form an underground fight club that evolves into something much, much more.",
                    availableOnDvd: true
                }
            }

            const data: TJson = {
                "${{ $entity }}": "${{ $row }}"
            }

            const result = PlaceHolder.EvaluateJsCode(data, new Sandbox($context))
            expect(result).toEqual({
                movies: {
                    id: 1,
                    title: "Fight Club",
                    description: "An insomniac office worker and a devil-may-care soapmaker form an underground fight club that evolves into something much, much more.",
                    availableOnDvd: true
                }
            })
        })

        it('should evaluate multiple time in same string', () => {
            const $context = {
                $entity: "myEntity",
                $row: {
                    id: 1,
                    userName: "New User 3",
                    // file deepcode ignore NoHardcodedPasswords/test: testing
                    password: "Password1"
                }
            }

            const data = "/${{ $entity }}/${{ $row.id }}"

            const result = PlaceHolder.EvaluateJsCode(data, new Sandbox($context))
            expect(result).toEqual("/myEntity/1")
        })
    })
})
