# @srvquery/protocol-openmp

![npm Version](https://shieldcn.dev/npm/@srvquery/protocol-openmp.svg?variant=secondary) ![npm Weekly Downloads](https://shieldcn.dev/npm/@srvquery/protocol-openmp/downloads.svg)

Query GTA:SA multiplayer (SA-MP / open.mp) game servers.

## Installation

```sh
pnpm add @srvquery/protocol-openmp
```

Install `iconv-lite` separately when querying servers that return Cyrillic text using a legacy
encoding such as Windows-1251:

```sh
pnpm add iconv-lite
```

## Usage

```ts
import { createOpenMPProtocol } from "@srvquery/protocol-openmp";

const host = "127.0.0.1";
const port = 7777;

const openmp = createOpenMPProtocol({ host, port });

const info = await openmp.query({ opcode: "INFO" });
const rules = await openmp.query({ opcode: "RULES" });
const clients = await openmp.query({ opcode: "CLIENT_LIST" });
const players = await openmp.query({ opcode: "PLAYERS" });
const ping = await openmp.query({ opcode: "PING" });

console.log(`${info.hostname}: ${info.players}/${info.maxPlayers}`);
console.log({ rules, clients, players, ping });
```

## Query types

| Opcode        | Wire value | Description                                           |
| ------------- | ---------- | ----------------------------------------------------- |
| `INFO`        | `i`        | Hostname, gamemode, language, player counts, password |
| `RULES`       | `r`        | Server rules (gravity, weather, weburl, etc.)         |
| `CLIENT_LIST` | `c`        | Player names and scores                               |
| `PLAYERS`     | `d`        | Detailed player info: id, name, score, ping           |
| `PING`        | `p`        | Round-trip latency to the server                      |

Reference: [open.mp SA:MP Query Mechanism](https://open.mp/docs/tutorials/QueryMechanism)

## Text encoding

SA-MP servers do not identify the encoding of text fields in query responses. UTF-8 is used by
default. For servers that use a legacy encoding such as Windows-1251, pass a decoder for the
returned byte strings:

```ts
import iconv from "iconv-lite";
import { createOpenMPProtocol } from "@srvquery/protocol-openmp";

const openmp = createOpenMPProtocol({
  host: "127.0.0.1",
  port: 7777,
});

const info = await openmp.query({
  opcode: "INFO",
  decodeText: (buffer) => iconv.decode(buffer, "win1251"),
});
```
