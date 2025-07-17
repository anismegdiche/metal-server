import { TUrl } from '../TUrl';
import typia from 'typia';

describe('TUrl Type', () => {
  describe('Valid URLs', () => {
    it('should accept HTTP URLs with FQDN', () => {
      const validHttp: TUrl = 'http://example.com';
      expect(typia.is<TUrl>(validHttp)).toBe(true);
    });

    it('should accept HTTPS URLs with FQDN', () => {
      const validHttps: TUrl = 'https://example.com';
      expect(typia.is<TUrl>(validHttps)).toBe(true);
    });

    it('should accept WebSocket URLs', () => {
      const validWs: TUrl = 'wss://example.com/ws';
      expect(typia.is<TUrl>(validWs)).toBe(true);
    });

    it('should accept localhost URLs', () => {
      const validLocalhost: TUrl = 'http://localhost:3000';
      expect(typia.is<TUrl>(validLocalhost)).toBe(true);
    });

    it('should accept IPv4 addresses', () => {
      const validIpv4: TUrl = 'http://192.168.1.1';
      expect(typia.is<TUrl>(validIpv4)).toBe(true);
    });

    it('should accept IPv6 addresses', () => {
      const validIpv6: TUrl = 'http://[2001:0db8:85a3:0000:0000:8a2e:0370:7334]';
      expect(typia.is<TUrl>(validIpv6)).toBe(true);
    });

    it('should accept URLs with paths and query parameters', () => {
      const validWithParams: TUrl = 'https://example.com/path?param=value&another=test';
      expect(typia.is<TUrl>(validWithParams)).toBe(true);
    });

    it('should accept ftp protocol', () => {
      const url: TUrl = 'ftp://example.com';
      expect(typia.is<TUrl>(url)).toBe(true);
    });

    it('should accept ftps protocol', () => {
      const url: TUrl = 'ftps://example.com';
      expect(typia.is<TUrl>(url)).toBe(true);
    });

    it('should accept sftp protocol', () => {
      const url: TUrl = 'sftp://example.com';
      expect(typia.is<TUrl>(url)).toBe(true);
    });

    it('should accept ssh protocol', () => {
      const url: TUrl = 'ssh://example.com';
      expect(typia.is<TUrl>(url)).toBe(true);
    });

    it('should accept git protocol', () => {
      const url: TUrl = 'git://github.com/user/repo.git';
      expect(typia.is<TUrl>(url)).toBe(true);
    });

    it('should accept mailto protocol', () => {
      const url: TUrl = 'mailto:user@example.com';
      expect(typia.is<TUrl>(url)).toBe(true);
    });

    it('should accept file protocol', () => {
      const url: TUrl = 'file:///path/to/file.txt';
      expect(typia.is<TUrl>(url)).toBe(true);
    });

    it('should accept data protocol', () => {
      const url: TUrl = 'data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==';
      expect(typia.is<TUrl>(url)).toBe(true);
    });
  });

  describe('Invalid URLs', () => {
    it('should reject empty string', () => {
      const emptyString = '';
      expect(typia.is<TUrl>(emptyString)).toBe(false);
    });

    it('should reject invalid protocol', () => {
      const invalidProtocol = 'invalid://example.com';
      expect(typia.is<TUrl>(invalidProtocol)).toBe(false);
    });

    it('should reject missing protocol', () => {
      const noProtocol = 'example.com';
      expect(typia.is<TUrl>(noProtocol)).toBe(false);
    });

    it('should reject invalid hostname', () => {
      const invalidHost = 'http://example..com';
      expect(typia.is<TUrl>(invalidHost)).toBe(false);
    });

    it('should reject invalid IPv4', () => {
      const invalidIpv4 = 'http://256.256.256.256';
      expect(typia.is<TUrl>(invalidIpv4)).toBe(false);
    });

    it('should reject malformed IPv6', () => {
      const invalidIpv6 = 'http://[2001:0db8:85a3:0000:0000:8a2e:0370:7334:9999]';
      expect(typia.is<TUrl>(invalidIpv6)).toBe(false);
    });

    it('should reject invalid URL format', () => {
      const invalidFormat = 'not a url';
      expect(typia.is<TUrl>(invalidFormat)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should reject URLs with credentials in the URL', () => {
      const withCredentials = 'http://user:pass@example.com';
      expect(typia.is<TUrl>(withCredentials)).toBe(false);
    });

    it('should handle very long URLs', () => {
      const longPath = 'a'.repeat(2000);
      const longUrl = `https://example.com/${longPath}` as const;
      // This should be rejected due to URL length limits
      expect(typia.is<TUrl>(longUrl)).toBe(false);
    });
  });
});
