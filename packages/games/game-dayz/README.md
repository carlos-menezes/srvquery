# @srvquery/game-dayz

[![npm version](https://img.shields.io/npm/v/%40srvquery%2Fgame-dayz)](https://www.npmjs.com/package/@srvquery/game-dayz)
[![npm downloads](https://img.shields.io/npm/dm/%40srvquery%2Fgame-dayz)](https://www.npmjs.com/package/@srvquery/game-dayz)

Parse DayZ-specific metadata from Valve server rules responses.

## Installation

```sh
pnpm add @srvquery/game-dayz
```

## Usage

```ts
import { dayzRuleParser } from "@srvquery/game-dayz";
import { createValveProtocol } from "@srvquery/protocol-valve";

const valve = createValveProtocol({
  host: "127.0.0.1",
  port: 2302,
});

const rules = await valve.query("RULES", { parser: dayzRuleParser });

console.log(rules.mods);
```
