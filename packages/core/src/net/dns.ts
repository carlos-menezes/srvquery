import dns from "node:dns";
import { QueryDnsResolutionError } from "./errors";

/**
 * Resolves a hostname or IP address to its IPv4 address.
 *
 * Useful for protocols that must embed a numeric IPv4 address in a request
 * packet (rather than a hostname), since query protocols typically operate
 * directly over raw sockets without a resolver of their own.
 *
 * @param host The hostname or IP address to resolve.
 * @returns A promise that resolves to the IPv4 address.
 * @throws {QueryDnsResolutionError} If the host cannot be resolved to an IPv4 address.
 */
export const resolveIpv4 = (host: string): Promise<string> =>
  new Promise((resolve, reject) => {
    dns.lookup(host, { family: 4 }, (err, address) => {
      if (err) reject(new QueryDnsResolutionError({ host, cause: err }));
      else resolve(address);
    });
  });
