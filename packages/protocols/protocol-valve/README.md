# @srvquery/protocol-valve

![npm Version](https://shieldcn.dev/npm/@srvquery/protocol-valve.svg?variant=secondary) ![npm Weekly Downloads](https://shieldcn.dev/npm/@srvquery/protocol-valve/downloads.svg)

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

## DayZ and Arma 3 `RULES`

DayZ and Arma 3 embed an additional, nested protocol inside the raw `A2S_RULES` response, sometimes called the "Server Browser Protocol": key=value rule pairs are used to carry paged, escaped chunks of a binary message describing DLCs, mods, signatures, and (for DayZ) a server description. The default `RULES` query only decodes the raw string pairs; use one of the parsers below via the `parser` option to decode that nested message instead.

- DayZ responds with protocol version `2`. Use `serverBrowserProtocol2RulesParser`.
- Arma 3 responds with protocol version `3`, which additionally carries difficulty settings and Creator DLC entries. Use `serverBrowserProtocol3RulesParser`.

```ts
import { createValveProtocol, serverBrowserProtocol2RulesParser } from "@srvquery/protocol-valve";

const dayz = createValveProtocol({
  host: "127.0.0.1",
  port: 2302,
});

const rules = await dayz.query({
  opcode: "RULES",
  parser: serverBrowserProtocol2RulesParser,
});

console.log(rules.mods);
console.log(rules.description);
```

```ts
import { createValveProtocol, serverBrowserProtocol3RulesParser } from "@srvquery/protocol-valve";

const arma3 = createValveProtocol({
  host: "127.0.0.1",
  port: 2302,
});

const rules = await arma3.query({
  opcode: "RULES",
  parser: serverBrowserProtocol3RulesParser,
});

console.log(rules.dlcs);
console.log(rules.creatorDlcs);
```

Both parsers throw a version-specific error (see [`rules/errors.ts`](src/rules/errors.ts)) if the
response doesn't match the expected protocol version.

Background and wire-format references:

- [Arma 3: ServerBrowserProtocol3](https://community.bistudio.com/wiki/Arma_3:_ServerBrowserProtocol3)
- [Arma 3: ServerBrowserProtocol2](https://community.bistudio.com/wiki/Arma_3:_ServerBrowserProtocol2)
- [WoozyMasta/a2s `pkg/a3sb`](https://github.com/WoozyMasta/a2s/tree/master/pkg/a3sb): a Go implementation this package's parsers were cross-checked against
