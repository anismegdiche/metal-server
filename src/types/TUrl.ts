//
//
//
import { tags } from "typia";

// Custom tag for extended URL validation
type ExtendedUrl = tags.TagBase<{
  kind: "extended-url";
  target: "string";
  value: undefined;
  validate: `
    (() => {
      try {
        // Reject very long URLs (over 2000 characters)
        if ($input.length > 2000) return false;
        
        // Reject URLs with credentials
        if ($input.includes('@') && !$input.startsWith('mailto:')) return false;
        
        const url = new URL($input);
        
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
            if (url.hostname === 'localhost') return true;
            
            // IPv4 validation
            const ipv4Regex = /^(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})$/;
            const ipv4Match = url.hostname.match(ipv4Regex);
            if (ipv4Match) {
              // Validate each octet is between 0-255
              return ipv4Match.slice(1).every((octet) => {
                const num = parseInt(octet, 10);
                return num >= 0 && num <= 255;
              });
            }
            
            // IPv6 validation (simplified)
            if (url.hostname.startsWith('[') && url.hostname.endsWith(']')) {
              const ipv6 = url.hostname.slice(1, -1);
              // Basic IPv6 validation - more strict than needed but good enough for most cases
              return /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/.test(ipv6);
            }
            
            // FQDN validation
            return /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+[a-zA-Z]{2,}$/.test(url.hostname);
          }
        }
        
        return true;
      } catch {
        return false;
      }
    })()
  `;
}>;

// Use the custom tag in your type
export type TUrl = string & ExtendedUrl;