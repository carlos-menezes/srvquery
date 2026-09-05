import {
  CreateHttpClientOptions,
  CreateHttpClientParams,
  createHttpClient,
  defaultRetryOptions,
  type HttpClient,
} from "@srvquery/core";
import { resolveServerId } from "./net/server-id";
import {
  FiveMDynamicSchema,
  FiveMPlayersSchema,
  FiveMServerInfoSchema,
  type FiveMDynamic,
  type FiveMPlayers,
  type FiveMServerInfo,
} from "./packet/schema";

/**
 * Locates a FiveM/RedM server, either directly by `host`/`port` or by its Cfx.re server id (the
 * short code used in join links such as `https://cfx.re/join/<id>`).
 */
export type FiveMServerLocator = CreateHttpClientParams | { id: string };

/** Connection and retry settings used to create a FiveM/RedM protocol client. */
export type CreateFiveMProtocolParams = FiveMServerLocator & CreateHttpClientOptions;

/** Endpoints exposed by an FXServer, keyed by their public `.json` path. */
export type FiveMProtocolRequestOpcode = "INFO" | "PLAYERS" | "DYNAMIC";

type FiveMProtocolQueryParams<Opcode extends FiveMProtocolRequestOpcode> = {
  opcode: Opcode;
};

type FiveMProtocolResponseMap = {
  INFO: FiveMServerInfo;
  PLAYERS: FiveMPlayers;
  DYNAMIC: FiveMDynamic;
};

/** Client for querying FiveM and RedM (FXServer) servers. */
export interface FiveMProtocol {
  /** Queries one FXServer endpoint and resolves with its corresponding response model. */
  query<Opcode extends FiveMProtocolRequestOpcode>(
    params: FiveMProtocolQueryParams<Opcode>,
  ): Promise<FiveMProtocolResponseMap[Opcode]>;
}

const endpoints = {
  INFO: "/info.json",
  PLAYERS: "/players.json",
  DYNAMIC: "/dynamic.json",
} as const satisfies Record<FiveMProtocolRequestOpcode, string>;

const schemas = {
  INFO: FiveMServerInfoSchema,
  PLAYERS: FiveMPlayersSchema,
  DYNAMIC: FiveMDynamicSchema,
} as const;

/**
 * Creates a client for querying FiveM and RedM (FXServer) servers.
 *
 * The server can be located either by `host`/`port` or by its Cfx.re server id; when an id is
 * given it is resolved to a host and port pair on first use and cached for the lifetime of the
 * returned client.
 *
 * @param params Target server (by `host`/`port` or `id`) and HTTP transport settings.
 * @returns A client whose `query` method returns the response type for the requested opcode.
 */
export const createFiveMProtocol = (params: CreateFiveMProtocolParams): FiveMProtocol => {
  const { protocol, timeout, retry = defaultRetryOptions, ...locator } = params;

  let clientPromise: Promise<HttpClient> | undefined;

  const getClient = (): Promise<HttpClient> => {
    clientPromise ??= (
      "id" in locator ? resolveServerId(locator.id) : Promise.resolve(locator)
    ).then((target) => createHttpClient(target, { protocol, timeout, retry }));
    return clientPromise;
  };

  const query = async <Opcode extends FiveMProtocolRequestOpcode>({
    opcode,
  }: FiveMProtocolQueryParams<Opcode>): Promise<FiveMProtocolResponseMap[Opcode]> => {
    const client = await getClient();
    const body = await client.getJson(endpoints[opcode]);
    return schemas[opcode].parse(body) as FiveMProtocolResponseMap[Opcode];
  };

  return {
    query,
  };
};
