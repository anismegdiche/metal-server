/* eslint-disable unused-imports/no-unused-vars */

import { describe, expect, it } from 'vitest';
import { absWebServiceProvider } from '../base/absWebServiceProvider';
import type { Readable } from 'node:stream';
import type { TJson } from '../../../types/TJson';
import type { TContext } from '../../sandbox/types/TContext';
import type { TConfigSourceWebService, TWebServiceDataOptions } from '../../source/providers/WebServiceData';

class mockWS extends absWebServiceProvider { // NOSONAR
    DEFAULT: unknown;
    ConfigSource?: TConfigSourceWebService;
    ConfigSourceOptions?: TWebServiceDataOptions;
    Client?: unknown;
    Init(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    Connect(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    Disconnect(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    Read($context: Partial<TContext>): Promise<Readable> {
        throw new Error('Method not implemented.');
    }
    Create(data: TJson, $context: Partial<TContext>): Promise<Readable> {
        throw new Error('Method not implemented.');
    }
    Update(data: TJson, $context: Partial<TContext>): Promise<Readable> {
        throw new Error('Method not implemented.');
    }
    Delete($context: Partial<TContext>): Promise<Readable> {
        throw new Error('Method not implemented.');
    }

}

describe('absWebServiceProvider', () => {

    describe('IsEndpoint', () => {
        it('should return true for valid endpoint', () => {
            const valid = {
                Method: 'GET',
                Url: 'http://example.com',
                Data: {}
            };
            const mockInstance = new mockWS(); // NOSONAR
            expect(mockInstance.IsEndpoint(valid)).toBe(true);
        });

        it('should return false for invalid endpoint', () => {
            const invalid = {
                Method: 'GET',
                // missing Url
                Data: {}
            };
            const mockInstance = new mockWS(); // NOSONAR
            expect(mockInstance.IsEndpoint(invalid)).toBe(false);
        });
    });
});
