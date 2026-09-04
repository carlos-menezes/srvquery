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
import { createValveProtocol } from "@srvquery/protocol-valve";

const valve = createValveProtocol({
  host: "127.0.0.1",
  port: 27015,
});

const info = await valve.query({ opcode: "INFO" });
const players = await valve.query({ opcode: "PLAYERS" });

console.log(`${info.name}: ${info.players}/${info.maxPlayers}`);
console.log({ players });
```
