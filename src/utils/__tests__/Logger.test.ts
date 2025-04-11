import { Logger } from '../Logger';
import { HttpErrorInternalServerError } from '../../server/HttpErrors';



describe('Logger', () => {
    describe('Assert', () => {
        it('should not throw when condition is true', () => {
            expect(() => {
                Logger.Assert(true, 'This should not throw');
            }).not.toThrow();
        });

        it('should throw HttpErrorInternalServerError when condition is false', () => {
            const errorMessage = 'Condition failed';

            expect(() => {
                Logger.Assert(false, errorMessage);
            }).toThrow(HttpErrorInternalServerError);

            expect(() => {
                Logger.Assert(false, errorMessage);
            }).toThrow(errorMessage);
        });

        it('should throw with the provided message', () => {
            const errorMessage = 'Custom error message';

            try {
                Logger.Assert(false, errorMessage);
            } catch (error: unknown) {
                expect(error).toBeInstanceOf(HttpErrorInternalServerError);
                expect((error as Error).message).toBe(errorMessage);
            }
        });

        it('should catch the first assert when there are 2', () => {
            const errorMessage1 = 'Condition failed 1';
            const errorMessage2 = 'Condition failed 2';
            try {
                Logger.Assert(false, errorMessage1);
                Logger.Assert(false, errorMessage2);
            } catch (error: unknown) {
                expect(error).toBeInstanceOf(HttpErrorInternalServerError);
                expect((error as Error).message).toBe(errorMessage1);
            }
        });
    });
});
