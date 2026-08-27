import { BadRequestException } from '@nestjs/common';
import * as net from 'net';

export class HostValidator {
  private static readonly BLOCKED_METADATA_HOSTS = [
    '169.254.169.254', // AWS / GCP / Azure IMDS
    '169.254.169.250',
    '169.254.169.251',
    '169.254.169.252',
    '169.254.169.253',
    'metadata.google.internal',
    'metadata.goog',
    'instance-data',
    '100.100.100.200', // Alibaba Cloud IMDS
    'oracle-cloud-agent',
  ];

  static validate(host: string): string {
    if (!host || typeof host !== 'string') {
      throw new BadRequestException('Database host is required');
    }

    const normalized = host.trim().toLowerCase();

    // 1. Check for blocked cloud metadata hostnames
    if (this.BLOCKED_METADATA_HOSTS.includes(normalized)) {
      throw new BadRequestException(
        'Security Error: Connection to cloud instance metadata service is prohibited.',
      );
    }

    // 2. Check for link-local addresses (169.254.x.x)
    if (net.isIP(normalized) === 4) {
      const parts = normalized.split('.').map(Number);
      if (parts[0] === 169 && parts[1] === 254) {
        throw new BadRequestException(
          'Security Error: Connection to link-local addresses (169.254.0.0/16) is prohibited.',
        );
      }
      if (parts[0] === 0) {
        throw new BadRequestException('Security Error: Invalid 0.0.0.0 IP address.');
      }
    }

    // 3. Reject control characters and spaces in hostname
    if (/[\s\r\n\0]/.test(normalized)) {
      throw new BadRequestException('Security Error: Invalid characters in database host.');
    }

    return normalized;
  }
}
