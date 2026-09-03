# @srvquery/protocol-valve

[![npm version](https://img.shields.io/npm/v/%40srvquery%2Fprotocol-valve)](https://www.npmjs.com/package/@srvquery/protocol-valve)
[![npm downloads](https://img.shields.io/npm/dm/%40srvquery%2Fprotocol-valve)](https://www.npmjs.com/package/@srvquery/protocol-valve)

Query game servers that implement the Valve server query protocol.

## Installation

```sh
pnpm add @srvquery/protocol-valve
```

## Usage

```ts
import { UdpQuerySocket } from "@srvquery/core";
import { createValveProtocol } from "@srvquery/protocol-valve";

using socket = new UdpQuerySocket({
  host: "127.0.0.1",
  port: 27015,
});

const valve = createValveProtocol({ socket });
const info = await valve.query("INFO");
const players = await valve.query("PLAYERS");
const rules = await valve.query("RULES");
const ping = await valve.query("PING");

console.log(`${info.name}: ${info.players}/${info.maxPlayers}`);
console.log({ players, rules, ping });
```

Pass a parser to transform a query result:

```ts
const playerNames = await valve.query("PLAYERS", {
  parser: (players) => players.map((player) => player.name),
});
```

Use `request` when supplying a challenge explicitly:

```ts
const challenge = await valve.request({
  query: "SERVERQUERY_GETCHALLENGE",
});

const challengedPlayers = await valve.request({
  query: "PLAYERS",
  challenge,
});
```
