import { defaultTimeout, QueryTransportError, type CreateHttpClientParams } from "@srvquery/core";

type CfxServerListResponse = {
  Data?: {
    connectEndPoints?: string[];
  };
};

/**
 * Resolves a Cfx.re server id (the short code used in join links such as
 * `https://cfx.re/join/<join>`) to a host and port pair, by querying the public Cfx.re server
 * list API for the server's advertised connect endpoints.
 *
 * @param id The Cfx.re server id.
 * @param timeout Time in milliseconds to wait for the lookup before aborting.
 * @returns The resolved host and port pair for the server's HTTP query endpoints.
 * @throws {QueryTransportError} If the id is unknown, the lookup times out, or it resolves to no
 * usable IPv4 endpoint.
 */
export const resolveServerId = async (
  id: string,
  timeout = defaultTimeout,
): Promise<CreateHttpClientParams> => {
  const url = `https://frontend.cfx-services.net/api/servers/single/${id}`;
  let body: CfxServerListResponse;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new QueryTransportError({
        message: `Received HTTP ${response.status} while resolving server id "${id}"`,
        cause: undefined,
      });
    }

    body = (await response.json()) as CfxServerListResponse;
  } catch (err) {
    if (err instanceof QueryTransportError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new QueryTransportError({
        message: `Timed out after ${timeout}ms while resolving server id "${id}"`,
        cause: err,
      });
    }
    throw new QueryTransportError({
      message: `Failed to resolve server id "${id}"`,
      cause: err,
    });
  } finally {
    clearTimeout(timer);
  }

  const endpoint = body.Data?.connectEndPoints?.[0];
  if (!endpoint) {
    throw new QueryTransportError({
      message: `Server id "${id}" did not resolve to a connectable endpoint`,
      cause: undefined,
    });
  }

  // Only IPv4 endpoints are supported; reject anything else (e.g. bracketed IPv6).
  const [host, portString] = endpoint.split(":");
  const port = Number(portString);
  const isIpv4 = host !== undefined && /^(\d{1,3}\.){3}\d{1,3}$/.test(host);

  if (!isIpv4 || !Number.isInteger(port)) {
    throw new QueryTransportError({
      message: `Server id "${id}" resolved to an unsupported endpoint "${endpoint}" (only IPv4 is supported)`,
      cause: undefined,
    });
  }

  return { host, port };
};
