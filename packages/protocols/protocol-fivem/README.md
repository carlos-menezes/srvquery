# @srvquery/protocol-fivem

![npm Version](https://shieldcn.dev/npm/@srvquery/protocol-fivem.svg?variant=secondary) ![npm Weekly Downloads](https://shieldcn.dev/npm/@srvquery/protocol-fivem/downloads.svg)

Query FiveM and RedM (FXServer) game servers.

## Installation

```sh
pnpm add @srvquery/protocol-fivem
```

## Usage

```ts
import { createFiveMProtocol } from "@srvquery/protocol-fivem";

const fivem = createFiveMProtocol({
  host: "127.0.0.1",
  port: 30120,
});

const info = await fivem.query({ opcode: "INFO" });
const players = await fivem.query({ opcode: "PLAYERS" });
const dynamic = await fivem.query({ opcode: "DYNAMIC" });

console.log(`${dynamic.hostname}: ${dynamic.clients}/${dynamic.sv_maxclients}`);
console.log({ info, players });
```

## Locating a server by Cfx.re id

Servers can also be located by their Cfx.re server id (the short code used in join links such as `https://cfx.re/join/<id>`) instead of a `host`/`port` pair. The id is resolved to the server's advertised connect endpoint on first use and cached for the lifetime of the returned client.

```ts
import { createFiveMProtocol } from "@srvquery/protocol-fivem";

const fivem = createFiveMProtocol({ id: "abcdef" });

const info = await fivem.query({ opcode: "INFO" });
```

## Query types

| Opcode    | Endpoint        | Description                                                                               |
| --------- | --------------- | ----------------------------------------------------------------------------------------- |
| `INFO`    | `/info.json`    | Server version, icon, resources and `vars` convars                                        |
| `PLAYERS` | `/players.json` | Connected players: id, name, ping, identifiers                                            |
| `DYNAMIC` | `/dynamic.json` | Lightweight, server-browser-oriented summary (hostname, gametype, mapname, client counts) |

## Stripping formatting codes

FiveM/RedM allows `^`-prefixed color and formatting codes (e.g. `^1` for red) in strings such as hostnames and player names. Pass `stripFormattingCodes: true` to recursively strip them from every string in the response:

```ts
const info = await fivem.query({ opcode: "INFO", stripFormattingCodes: true });
```

Reference: [Chat Formatting // Colors, Bold, Underline](https://forum.cfx.re/t/chat-formatting-colors-bold-underline/67641)
