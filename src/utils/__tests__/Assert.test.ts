import { HttpErrorInternalServerError } from '../../modules/errors/HttpErrors'
import { Assert } from '../Assert'


describe('Assert', () => {
    describe('Condition', () => {
        it('should not throw when condition is true', () => {
            expect(() => {
                Assert.Condition(true, 'This should not throw')
            }).not.toThrow()
        })

        it('should throw HttpErrorInternalServerError when condition is false', () => {
            const errorMessage = 'Condition failed'

            expect(() => {
                Assert.Condition(false, errorMessage)
            }).toThrow(HttpErrorInternalServerError)

            expect(() => {
                Assert.Condition(false, errorMessage)
            }).toThrow(errorMessage)
        })

        it('should throw with the provided message', () => {
            const errorMessage = 'Custom error message'

            try {
                Assert.Condition(false, errorMessage)
            } catch (error: unknown) {
                expect(error).toBeInstanceOf(HttpErrorInternalServerError)
                expect((error as Error).message).toBe(errorMessage)
            }
        })

        it('should catch the first assert when there are 2', () => {
            const errorMessage1 = 'Condition failed 1'
            const errorMessage2 = 'Condition failed 2'
            try {
                Assert.Condition(false, errorMessage1)
                Assert.Condition(false, errorMessage2)
            } catch (error: unknown) {
                expect(error).toBeInstanceOf(HttpErrorInternalServerError)
                expect((error as Error).message).toBe(errorMessage1)
            }
        })
    })

    describe('Var', () => {
        interface User {
            id: number;
            name: string;
        }

        it('should not throw when type assertion condition is true', () => {
            const user = {
                id: 1,
                name: 'John'
            }
            expect(() => {
                Assert.Var<User>(user, true, 'This should not throw')
            }).not.toThrow()
        })

        it('should throw when type assertion condition is false', () => {
            const user = {
                id: 1,
                name: 'John'
            }
            const errorMessage = 'Invalid user type'
            
            expect(() => {
                Assert.Var<User>(user, false, errorMessage)
            }).toThrow(HttpErrorInternalServerError)
            
            expect(() => {
                Assert.Var<User>(user, false, errorMessage)
            }).toThrow(errorMessage)
        })

        it('should allow using the variable as the asserted type after successful assertion', () => {
            const maybeUser: unknown = {
                id: 1,
                name: 'John'
            }
            
            Assert.Var<User>(maybeUser, true, 'Not a valid user')
            
            // TypeScript should now recognize maybeUser as User type
            expect((maybeUser as User).id).toBe(1)
            expect((maybeUser as User).name).toBe('John')
        })

        it('should handle null and undefined values', () => {
            expect(() => {
                Assert.Var<User>(null, true, 'Null value')
            }).not.toThrow()

            expect(() => {
                Assert.Var<User>(undefined, true, 'Undefined value')
            }).not.toThrow()
        })

        it('should handle number primitive value', () => {
            expect(() => {
                Assert.Var<number>(42, true, 'Number value')
            }).not.toThrow()
        })

        it('should handle string primitive value', () => {
            expect(() => {
                Assert.Var<string>('test', true, 'String value')
            }).not.toThrow()
        })

        it('should not throw when asserting true boolean value', () => {
            expect(() => {
                Assert.Var<boolean>(true as unknown, true, 'Boolean true value')
            }).not.toThrow()
        })

        it('should not throw when asserting false boolean value', () => {
            expect(() => {
                Assert.Var<boolean>(false as unknown, true, 'Boolean false value')
            }).not.toThrow()
        })

        it('should throw when condition is false for boolean assertion', () => {
            expect(() => {
                Assert.Var<boolean>(true as unknown, false, 'Boolean value with false condition')
            }).toThrow(HttpErrorInternalServerError)
        })

        it('should maintain boolean type after type assertion', () => {
            const maybeBool: unknown = true
            Assert.Var<boolean>(maybeBool, true, 'Boolean type assertion')
            expect(typeof maybeBool).toBe('boolean')
        })
    })
})