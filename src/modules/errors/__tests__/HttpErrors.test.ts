
import { describe, expect, it, vi } from 'vitest';
import {
    HttpError,
    HttpErrorBadRequest,
    HttpErrorNotFound,
    HttpErrorSwitch,
    HttpErrorLog,
    HttpErrorInternalServerError
} from '../HttpErrors';
import { HTTP_STATUS_CODE } from '../../core/@consts';
import { Logger } from '../../../utils/Logger';

vi.mock('../../../utils/Logger', () => ({
    Logger: {
        Warn: vi.fn(),
        Error: vi.fn(),
        Level: 'info'
    },
    VERBOSITY: {
        DEBUG: 'debug'
    }
}));

describe('HttpErrors', () => {
    describe('Classes', () => {
        it('HttpErrorBadRequest should have status 400', () => {
            const err = new HttpErrorBadRequest('test');
            expect(err.Status).toBe(HTTP_STATUS_CODE.BAD_REQUEST);
            expect(err.message).toBe('test');
        });

        it('HttpErrorNotFound should have status 404', () => {
            const err = new HttpErrorNotFound();
            expect(err.Status).toBe(HTTP_STATUS_CODE.NOT_FOUND);
        });
    });

    describe('HttpErrorSwitch', () => {
        it('should return correct error class based on status', () => {
            expect(HttpErrorSwitch(400)).toBeInstanceOf(HttpErrorBadRequest);
            expect(HttpErrorSwitch(404)).toBeInstanceOf(HttpErrorNotFound);
            expect(HttpErrorSwitch(500)).toBeInstanceOf(HttpErrorInternalServerError);
            expect(HttpErrorSwitch(999)).toBeInstanceOf(HttpErrorInternalServerError);
        });
    });

    describe('HttpErrorLog', () => {
        it('should log warning for 404', () => {
            const err = new HttpErrorNotFound('missing');
            HttpErrorLog(err);
            expect(Logger.Warn).toHaveBeenCalledWith('missing');
        });

        it('should log error for others', () => {
            const err = new HttpErrorInternalServerError('boom');
            HttpErrorLog(err);
            expect(Logger.Error).toHaveBeenCalledWith('boom');
        });
    });
});
