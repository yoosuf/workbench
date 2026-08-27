export class DriverError extends Error {
  public readonly code: string;
  public readonly originalError?: unknown;

  constructor(code: string, message: string, originalError?: unknown) {
    super(message);
    this.name = 'DriverError';
    this.code = code;
    this.originalError = originalError;
    Object.setPrototypeOf(this, DriverError.prototype);
  }
}
