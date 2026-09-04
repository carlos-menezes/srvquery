import dns from "node:dns";
import { OpenMPDnsResolutionError } from "./errors";

/**
 * Resolves the given IP address to its IPv4 address using DNS lookup.
 * @param ip The IP address or hostname to resolve.
 * @returns A promise that resolves to the IPv4 address.
 *
 * TODO: move to core?
 */
export const resolveIpv4 = (ip: string): Promise<string> =>
  new Promise((resolve, reject) => {
    dns.lookup(ip, { family: 4 }, (err, address) => {
      if (err) reject(new OpenMPDnsResolutionError({ host: ip, cause: err }));
      else resolve(address);
    });
  });
