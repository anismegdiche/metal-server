import { HttpErrorInternalServerError } from '../../server/HttpErrors'
import { Assert } from '../Assert'


describe('Assert', () => {
    it('should not throw when condition is true', () => {
        expect(() => {
            Assert(true, 'This should not throw')
        }).not.toThrow()
    })

    it('should throw HttpErrorInternalServerError when condition is false', () => {
        const errorMessage = 'Condition failed'

        expect(() => {
            Assert(false, errorMessage)
        }).toThrow(HttpErrorInternalServerError)

        expect(() => {
            Assert(false, errorMessage)
        }).toThrow(errorMessage)
    })

    it('should throw with the provided message', () => {
        const errorMessage = 'Custom error message'

        try {
            Assert(false, errorMessage)
        } catch (error: unknown) {
            expect(error).toBeInstanceOf(HttpErrorInternalServerError)
            expect((error as Error).message).toBe(errorMessage)
        }
    })

    it('should catch the first assert when there are 2', () => {
        const errorMessage1 = 'Condition failed 1'
        const errorMessage2 = 'Condition failed 2'
        try {
            Assert(false, errorMessage1)
            Assert(false, errorMessage2)
        } catch (error: unknown) {
            expect(error).toBeInstanceOf(HttpErrorInternalServerError)
            expect((error as Error).message).toBe(errorMessage1)
        }
    })
})