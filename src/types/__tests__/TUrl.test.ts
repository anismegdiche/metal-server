import { z_TUrl } from '../TUrl';

describe('TUrl Type', () => {
  describe('Valid URLs', () => {
    it('should accept HTTP URLs with FQDN', () => {
      const validHttp = 'http://example.com';
      expect(z_TUrl.safeParse(validHttp).success).toBe(true);
    });

    it('should accept HTTPS URLs with FQDN', () => {
      const validHttps = 'https://example.com';
      expect(z_TUrl.safeParse(validHttps).success).toBe(true);
    });

    it('should accept WebSocket URLs', () => {
      const validWs = 'wss://example.com/ws';
      expect(z_TUrl.safeParse(validWs).success).toBe(true);
    });

    it('should accept 127.0.0.1 URLs', () => {
      const validLocalhost = 'http://127.0.0.1:3000';
      expect(z_TUrl.safeParse(validLocalhost).success).toBe(true);
    });

    it('should accept IPv4 addresses', () => {
      const validIpv4 = 'http://192.168.1.1';
      expect(z_TUrl.safeParse(validIpv4).success).toBe(true);
    });

    it('should accept IPv6 addresses', () => {
      const validIpv6 = 'http://[2001:0db8:85a3:0000:0000:8a2e:0370:7334]';
      expect(z_TUrl.safeParse(validIpv6).success).toBe(true);
    });

    it('should accept URLs with paths and query parameters', () => {
      const validWithParams = 'https://example.com/path?param=value&another=test';
      expect(z_TUrl.safeParse(validWithParams).success).toBe(true);
    });

    it('should accept ftp protocol', () => {
      const url = 'ftp://example.com';
      expect(z_TUrl.safeParse(url).success).toBe(true);
    });

    it('should accept ftps protocol', () => {
      const url = 'ftps://example.com';
      expect(z_TUrl.safeParse(url).success).toBe(true);
    });

    it('should accept sftp protocol', () => {
      const url = 'sftp://example.com';
      expect(z_TUrl.safeParse(url).success).toBe(true);
    });

    it('should accept ssh protocol', () => {
      const url = 'ssh://example.com';
      expect(z_TUrl.safeParse(url).success).toBe(true);
    });

    it('should accept git protocol', () => {
      const url = 'git://github.com/user/repo.git';
      expect(z_TUrl.safeParse(url).success).toBe(true);
    });

    it('should accept mailto protocol', () => {
      const url = 'mailto:user@example.com';
      expect(z_TUrl.safeParse(url).success).toBe(true);
    });

    it('should accept file protocol', () => {
      const url = 'file:///path/to/file.txt';
      expect(z_TUrl.safeParse(url).success).toBe(true);
    });

    it('should accept data protocol', () => {
      const url = 'data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==';
      expect(z_TUrl.safeParse(url).success).toBe(true);
    });
  });

  describe('Invalid URLs', () => {
    it('should reject empty string', () => {
      const emptyString = '';
      expect(z_TUrl.safeParse(emptyString).success).toBe(false);
    });

    it('should reject invalid protocol', () => {
      const invalidProtocol = 'invalid://example.com';
      expect(z_TUrl.safeParse(invalidProtocol).success).toBe(false);
    });

    it('should reject missing protocol', () => {
      const noProtocol = 'example.com';
      expect(z_TUrl.safeParse(noProtocol).success).toBe(false);
    });

    it('should reject invalid hostname', () => {
      const invalidHost = 'http://example..com';
      expect(z_TUrl.safeParse(invalidHost).success).toBe(false);
    });

    it('should reject invalid IPv4', () => {
      const invalidIpv4 = 'http://256.256.256.256';
      expect(z_TUrl.safeParse(invalidIpv4).success).toBe(false);
    });

    it('should reject malformed IPv6', () => {
      const invalidIpv6 = 'http://[2001:0db8:85a3:0000:0000:8a2e:0370:7334:9999]';
      expect(z_TUrl.safeParse(invalidIpv6).success).toBe(false);
    });

    it('should reject invalid URL format', () => {
      const invalidFormat = 'not a url';
      expect(z_TUrl.safeParse(invalidFormat).success).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should reject URLs with credentials in the URL', () => {
      const withCredentials = 'http://user:pass@example.com';
      expect(z_TUrl.safeParse(withCredentials).success).toBe(false);
    });

    it('should handle very long URLs', () => {
      const longPath = 'a'.repeat(2000);
      const longUrl = `https://example.com/${longPath}`;
      // This should be rejected due to URL length limits
      expect(z_TUrl.safeParse(longUrl).success).toBe(false);
    });
  });
});
