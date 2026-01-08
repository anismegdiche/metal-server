//
//
//
import { z } from "zod";


// Custom Zod schema for extended URL validation
export const z_TUrl = z.string().refine((val) => {
  try {
    // Reject very long URLs (over 2000 characters)
    if (val.length > 2000) return false;

    // Reject URLs with credentials
    if (val.includes('@') && !val.startsWith('mailto:')) return false;

    const url = new URL(val);

    // Validate protocol
    const allowedProtocols = [
      'http:', 'https:', 'ws:', 'wss:', 'ftp:', 'ftps:', 'sftp:', 'ssh:',
      'git:', 'mailto:', 'file:', 'data:', 'telnet:', 'irc:', 'news:',
      'gopher:', 'nntp:', 'smb:', 'urn:', 'magnet:'
    ];

    // Check if protocol is in the allowed list (with or without colon)
    const protocol = url.protocol.toLowerCase();
    if (!allowedProtocols.some(p => p.toLowerCase() === protocol)) {
      return false;
    }

    // For non-data and non-mailto URIs, validate hostname
    if (url.protocol !== 'data:' && url.protocol !== 'mailto:') {
      // Reject URLs with empty hostname (except for file: protocol)
      if (!url.hostname && url.protocol !== 'file:') return false;

      // Validate hostname based on protocol
      if (url.hostname) {
        // Reject invalid hostnames with consecutive dots
        if (url.hostname.includes('..')) return false;

        // Validate hostname format based on type
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '0.0.0.0') return true;

        // IPv4 validation
        const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
        const ipv4Match = url.hostname.match(ipv4Regex);
        if (ipv4Match) {
          // Validate each octet is between 0-255
          return ipv4Match.slice(1).every((octet) => {
            const num = parseInt(octet, 10);
            return num >= 0 && num <= 255;
          });
        }

        // IPv6 validation
        if (url.hostname.startsWith('[') && url.hostname.endsWith(']')) {
          const ipv6 = url.hostname.slice(1, -1);
          const parts = ipv6.split(':');
          if (parts.length < 3 || parts.length > 8) return false;
          return parts.every(part => /^[0-9a-fA-F]{0,4}$/.test(part));
        }

        // FQDN validation
        const labels = url.hostname.split('.');
        if (labels.length < 2) return false;

        const labelRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
        const tldRegex = /^[a-zA-Z]{2,}$/;

        const tld = labels.pop()!;
        return labels.every(label => labelRegex.test(label)) && tldRegex.test(tld);
      }
    }

    return true;
  } catch {
    return false;
  }
}, { message: "Invalid URL" });


//
export type TUrl = z.infer<typeof z_TUrl>;