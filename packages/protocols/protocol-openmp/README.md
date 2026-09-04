# @srvquery/protocol-openmp

![npm Version](https://shieldcn.dev/npm/@srvquery/protocol-openmp.svg?variant=secondary) ![npm Weekly Downloads](https://shieldcn.dev/npm/@srvquery/protocol-openmp/downloads.svg)

Query GTA:SA multiplayer (SA-MP / open.mp) game servers.

## Installation

```sh
pnpm add @srvquery/protocol-openmp
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

## Retries

Queries use three attempts with exponential backoff by default. Customize the behavior when
creating the client:

```ts
const openmp = createOpenMPProtocol({
  host: "127.0.0.1",
  port: 7777,
  retry: {
    retries: 5,
    strategy: (attempt) => attempt * 250,
    fatal: (error) => error instanceof TypeError,
  },
});
```

Set `retries` to `1` to disable retries.

## Query types

| Opcode        | Wire value | Description                                           |
| ------------- | ---------- | ----------------------------------------------------- |
| `INFO`        | `i`        | Hostname, gamemode, language, player counts, password |
| `RULES`       | `r`        | Server rules (gravity, weather, weburl, etc.)         |
| `CLIENT_LIST` | `c`        | Player names and scores                               |
| `PLAYERS`     | `d`        | Detailed player info: id, name, score, ping           |
| `PING`        | `p`        | Round-trip latency to the server                      |

Reference: [open.mp SA:MP Query Mechanism](https://open.mp/docs/tutorials/QueryMechanism)
