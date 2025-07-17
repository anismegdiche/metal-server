
import { StringUtils } from "../StringUtils"

describe('Url', () => {

    it('should join multiple path segments into single URL', () => {
        const result = StringUtils.Url('http:/example.com', 'path', 'to', 'resource')
        expect(result).toBe('http://example.com/path/to/resource')
    })

    it('should replace single colon slash with double slash in protocol', () => {
        const result = StringUtils.Url('http:/example.com')
        expect(result).toBe('http://example.com')
    })

    it('should filter out undefined values when joining paths', () => {
        const result = StringUtils.Url('http:/example.com', undefined, 'path', undefined)
        expect(result).toBe('http://example.com/path')
    })

    it('should filter out empty strings when joining paths', () => {
        const result = StringUtils.Url('http:/example.com', '', 'path', '')
        expect(result).toBe('http://example.com/path')
    })

    it('should handle single path segment correctly', () => {
        const result = StringUtils.Url('http:/example.com')
        expect(result).toBe('http://example.com')
    })

    it('should maintain correct separators between path segments', () => {
        const result = StringUtils.Url('http:/example.com/', '/path/', '/to/', '/resource/')
        expect(result).toBe('http://example.com/path/to/resource/')
    })

    it('should maintain correct separators between path segments', () => {
        const result = StringUtils.Url('http:/example.com////', '/path////', '/to////', '/resource////')
        expect(result).toBe('http://example.com/path/to/resource/')
    })

    it('should return empty string for empty input array', () => {
        const result = StringUtils.Url()
        expect(result).toBe('')
    })

    it('should return empty string when all inputs are undefined or empty', () => {
        const result = StringUtils.Url(undefined, '', undefined, '')
        expect(result).toBe('')
    })

    it('should correctly join long paths with many segments', () => {
        const segments = Array(100).fill('segment')
        const result = StringUtils.Url('http:/example.com', ...segments)
        expect(result).toBe(`http://example.com/${segments.join('/')}`)
    })

    it('should handle paths containing special characters', () => {
        const result = StringUtils.Url('http:/example.com', 'path with spaces', 'file#1', '?param=value')
        expect(result).toBe('http://example.com/path with spaces/file#1?param=value')
    })

    it('should handle URLs with multiple protocol separators', () => {
        const result = StringUtils.Url('http:/example.com', 'path:/subpath')
        expect(result).toBe('http://example.com/path:/subpath')
    })

    it('should normalize paths with duplicate separators', () => {
        const result = StringUtils.Url('http:/example.com/', '//path//', '///to////')
        expect(result).toBe('http://example.com/path/to/')
    })

    it('should return exact string when passed only one path', () => {
        const result = StringUtils.Url('http:/example.com/')
        expect(result).toBe('http://example.com/')
    })

    it('should merge with query parameters', () => {
        const result = StringUtils.Url('http:/example.com/', 'subfolder', '?q=test')
        expect(result).toBe('http://example.com/subfolder?q=test')
    })

    it('should handle URLs with multiple query parameters', () => {
        const result = StringUtils.Url('http:/example.com/', 'subfolder', '?q=test', '&p=test2')
        expect(result).toBe('http://example.com/subfolder?q=test&p=test2')
    })

    it('should handle URLs with multiple query parameters and ? symbols', () => {
        const result = StringUtils.Url('http:/example.com/', 'subfolder', '?q=test', '&p=test2', '&param=value')
        expect(result).toBe('http://example.com/subfolder?q=test&p=test2&param=value')
    })
})
