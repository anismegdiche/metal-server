import type { Request, Response } from 'express'
import type { Mock } from 'vitest'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { UserResponse } from '../UserResponse'
import { HttpErrorForbidden, HttpErrorUnauthorized } from '../../../errors/HttpErrors'

vi.mock('../../../../utils/Convert', () => ({
    Convert: {
        InternalResponseToResponse: vi.fn()
    }
}))

vi.mock('../../../auth/User', () => ({
    User: {
        Authenticate: vi.fn(),
        LogOut: vi.fn(),
        GetUserInfo: vi.fn(),
        IsAuthenticated: vi.fn()
    }
}))

vi.mock('../../ResponseHandler', () => ({
    ResponseHandler: {
        ResponseError: vi.fn()
    }
}))

const { Convert } = await import('../../../../utils/Convert')
const { User } = await import('../../../auth/User')

const ConvertMock = vi.mocked(Convert)
const UserMock = vi.mocked(User)

const mockResolved = (fn: Mock, value: unknown) => {
    fn.mockResolvedValue(value)
}

const mockReturn = (fn: Mock, value: unknown) => {
    fn.mockReturnValue(value)
}

const flushMicrotasks = () => new Promise(resolve => setTimeout(resolve, 0))

describe('UserResponse', () => {
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), end: vi.fn().mockReturnThis() }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should get request token from auth header', () => {
        const token = UserResponse.GetRequestToken({ headers: { authorization: 'Bearer test-token' } } as Request)
        expect(token).toBe('test-token')
    })

    it('should authenticate and convert response', async () => {
        mockResolved(UserMock.Authenticate as unknown as Mock, { StatusCode: 200 })
        const req = { body: { username: 'u', password: 'p' } } as Request

        await UserResponse.Authenticate(req, res as unknown as Response)

        expect(UserMock.Authenticate).toHaveBeenCalledWith({ username: 'u', password: 'p' })
        expect(ConvertMock.InternalResponseToResponse).toHaveBeenCalled()
    })

    it('should logout and convert response', async () => {
        mockResolved(UserMock.LogOut as unknown as Mock, { StatusCode: 200 })
        const req = { headers: { authorization: 'Bearer t' } } as Request

        await UserResponse.LogOut(req, res as unknown as Response)

        expect(UserMock.LogOut).toHaveBeenCalledWith('t')
        expect(ConvertMock.InternalResponseToResponse).toHaveBeenCalled()
    })

    it('should get info and convert response', async () => {
        mockResolved(UserMock.GetUserInfo as unknown as Mock, { StatusCode: 200 })
        const req = { headers: { authorization: 'Bearer t' } } as Request

        UserResponse.GetInfo(req, res as unknown as Response)
        await flushMicrotasks()

        expect(UserMock.GetUserInfo).toHaveBeenCalledWith('t')
        expect(ConvertMock.InternalResponseToResponse).toHaveBeenCalled()
    })

    it('should set current user and call next when authenticated', () => {
        const req = { headers: { authorization: 'Bearer t' } } as Request
        const next = vi.fn()
        mockReturn(UserMock.IsAuthenticated as unknown as Mock, { id: 1 })

        UserResponse.IsAuthenticated(req, res as unknown as Response, next)

        expect(req.__METAL_CURRENT_USER).toEqual({ id: 1 })
        expect(next).toHaveBeenCalled()
    })

    it('should throw unauthorized when token is invalid', () => {
        const req = { headers: { authorization: 'Bearer t' } } as Request
        mockReturn(UserMock.IsAuthenticated as unknown as Mock, undefined)

        expect(() => UserResponse.IsAuthenticated(req, res as unknown as Response, vi.fn())).toThrow(HttpErrorUnauthorized)
    })

    it('should throw forbidden when already authenticated', () => {
        mockReturn(UserMock.IsAuthenticated as unknown as Mock, { id: 1 })

        const req = { headers: { authorization: 'Bearer t' } } as Request

        expect(() => UserResponse.IsNotAuthenticated(req, res as unknown as Response, vi.fn())).toThrow(HttpErrorForbidden)
    })

    it('should allow when not authenticated', () => {
        const next = vi.fn()
        mockReturn(UserMock.IsAuthenticated as unknown as Mock, undefined)

        const req = { headers: { authorization: 'Bearer t' } } as Request

        UserResponse.IsNotAuthenticated(req, res as unknown as Response, next)

        expect(next).toHaveBeenCalled()
    })
})
