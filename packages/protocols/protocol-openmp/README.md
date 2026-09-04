# @srvquery/protocol-gtasa-samp

Query GTA:SA multiplayer (SA-MP / open.mp) game servers.

## Installation

```sh
pnpm add @srvquery/protocol-gtasa-samp
```

## Usage

```ts
import { createOpenMPProtocol } from "@srvquery/protocol-gtasa-samp";

const host = "127.0.0.1";
const port = 7777;

const samp = createOpenMPProtocol({ host, port });

const info = await samp.query({ opcode: "INFO" });
const rules = await samp.query({ opcode: "RULES" });
const clients = await samp.query({ opcode: "CLIENT_LIST" });
const players = await samp.query({ opcode: "PLAYERS" });
const ping = await samp.query({ opcode: "PING" });

console.log(`${info.hostname}: ${info.players}/${info.maxPlayers}`);
console.log({ rules, clients, players, ping });
```

## Query types

| Method         | OPCODE | Description                                           |
| -------------- | ------ | ----------------------------------------------------- |
| `info()`       | `i`    | Hostname, gamemode, language, player counts, password |
| `rules()`      | `r`    | Server rules (gravity, weather, weburl, etc.)         |
| `clientList()` | `c`    | Player names and scores                               |
| `players()`    | `d`    | Detailed player info: id, name, score, ping           |
| `ping()`       | `p`    | Round-trip latency to the server                      |

Reference: [open.mp SA:MP Query Mechanism](https://open.mp/docs/tutorials/QueryMechanism)
