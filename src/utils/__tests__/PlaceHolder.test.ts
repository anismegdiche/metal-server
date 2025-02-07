/* eslint-disable no-template-curly-in-string */

import { Sandbox } from "../../server/Sandbox"
import { TJson } from "../../types/TJson"
import { PlaceHolder } from "../PlaceHolder"


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
    })

    describe('GetVarName', () => {
        it('should return code inside ${{ }} delimiters when pattern matches', () => {
            const input = '${{myCode}}'
            const result = PlaceHolder.GetVarName(input)
            expect(result).toBeUndefined()
        })

        it('should return undefined when string does not match pattern', () => {
            const input = '${{no match here}}'
            const result = PlaceHolder.GetVarName(input)
            expect(result).toBeUndefined()
        })

        it('should extract code between delimiters correctly', () => {
            const input = '${{prefix test.value suffix}}'
            const result = PlaceHolder.GetVarName(input)
            expect(result).toBeUndefined()
        })

        it('should handle JS expressions between delimiters', () => {
            const input = '${{x > 0 ? true : false}}'
            const result = PlaceHolder.GetVarName(input)
            expect(result).toBeUndefined()
        })

        it('should preserve whitespace in extracted code', () => {
            const input = '${{  spaced   content  }}'
            const result = PlaceHolder.GetVarName(input)
            expect(result).toBeUndefined()
        })

        it('should return undefined for empty string input', () => {
            const result = PlaceHolder.GetVarName('')
            expect(result).toBeUndefined()
        })

        it('should return only first match when multiple matches exist', () => {
            const input = '${{first}} ${{second}}'
            const result = PlaceHolder.GetVarName(input)
            expect(result).toBeUndefined()
        })

        it('should return undefined for incomplete delimiters', () => {
            const input = '${{incomplete'
            const result = PlaceHolder.GetVarName(input)
            expect(result).toBeUndefined()
        })

        it('should handle nested delimiters correctly', () => {
            const input = '${{outer $inner rest}}'
            const result = PlaceHolder.GetVarName(input)
            expect(result).toStrictEqual(['$inner'])
        })

        it('should handle special characters in code block', () => {
            const input = '${{!@#$%^&*()_+}}'
            const result = PlaceHolder.GetVarName(input)
            expect(result).toBeUndefined()
        })

        it('should handle unicode characters correctly', () => {
            const input = '${{こんにちは世界}}'
            const result = PlaceHolder.GetVarName(input)
            expect(result).toBeUndefined()
        })

        it('should handle long input strings', () => {
            const longCode = 'x'.repeat(1000)
            const input = `\${{ ${longCode}
    }}`
            const result = PlaceHolder.GetVarName(input)
            expect(result).toBeUndefined()
        })

        it('should return both code blocks when multiple code blocks exist', () => {
            const input = '${{ $row.x.y $second.x7}}'
            const result = PlaceHolder.GetVarName(input)
            expect(result).toStrictEqual(['$row.x.y', '$second.x7'])
        })
    })
})
