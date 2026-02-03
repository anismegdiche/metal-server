
import { describe, expect, it } from 'vitest';
import { HttpResponse } from '../HttpResponse';
import { HTTP_STATUS_CODE } from '../@consts';

describe('HttpResponse', () => {
    it('Ok should return 200 and data', () => {
        const res = HttpResponse.Ok({ foo: 'bar' });
        expect(res.StatusCode).toBe(HTTP_STATUS_CODE.OK);
        expect(res.Body).toEqual({ foo: 'bar' });
    });

    it('Created should return 201', () => {
        const res = HttpResponse.Created();
        expect(res.StatusCode).toBe(HTTP_STATUS_CODE.CREATED);
    });

    it('NoContent should return 204', () => {
        const res = HttpResponse.NoContent();
        expect(res.StatusCode).toBe(HTTP_STATUS_CODE.NO_CONTENT);
    });
});
