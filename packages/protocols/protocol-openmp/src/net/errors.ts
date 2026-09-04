type OpenMPDnsResolutionErrorCtor = {
  host: string;
  cause: unknown;
};

/** Error thrown when a hostname cannot be resolved to an IPv4 address. */
export class OpenMPDnsResolutionError extends Error {
  /** Hostname that failed to resolve. */
  public readonly host: string;
  /** Original DNS lookup error. */
  public readonly cause: unknown;

  constructor({ host, cause }: OpenMPDnsResolutionErrorCtor) {
    super(`Failed to resolve host "${host}" to an IPv4 address`);
    this.name = this.constructor.name;
    this.host = host;
    this.cause = cause;
  }
}
