import { QueryTransportError, type CreateHttpClientParams } from "@srvquery/core";

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
 * @returns The resolved host and port pair for the server's HTTP query endpoints.
 * @throws {QueryTransportError} If the id is unknown or resolves to no usable endpoint.
 */
export const resolveServerId = async (id: string): Promise<CreateHttpClientParams> => {
  const url = `https://frontend.cfx-services.net/api/servers/single/${id}`;
  let body: CfxServerListResponse;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new QueryTransportError({
        message: `Received HTTP ${response.status} while resolving server id "${id}"`,
        cause: undefined,
      });
    }

    body = (await response.json()) as CfxServerListResponse;
  } catch (err) {
    if (err instanceof QueryTransportError) throw err;
    throw new QueryTransportError({
      message: `Failed to resolve server id "${id}"`,
      cause: err,
    });
  }

  const endpoint = body.Data?.connectEndPoints?.[0];
  if (!endpoint) {
    throw new QueryTransportError({
      message: `Server id "${id}" did not resolve to a connectable endpoint`,
      cause: undefined,
    });
  }

  const [host, portString] = endpoint.split(":");
  const port = Number(portString);

  if (!host || !Number.isInteger(port)) {
    throw new QueryTransportError({
      message: `Server id "${id}" resolved to an invalid endpoint "${endpoint}"`,
      cause: undefined,
    });
  }

  return { host, port };
};
