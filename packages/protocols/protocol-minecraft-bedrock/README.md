# @srvquery/protocol-minecraft-bedrock

![npm Version](https://shieldcn.dev/npm/@srvquery/protocol-minecraft-bedrock.svg?variant=secondary) ![npm Weekly Downloads](https://shieldcn.dev/npm/@srvquery/protocol-minecraft-bedrock/downloads.svg)

Query Minecraft Bedrock servers directly using RakNet's unconnected ping protocol.

## Installation

```sh
pnpm add @srvquery/core @srvquery/protocol-minecraft-bedrock
```

## Usage

```ts
import { createMinecraftBedrockProtocol } from "@srvquery/protocol-minecraft-bedrock";

const minecraft = createMinecraftBedrockProtocol({
  host: "play.example.net",
});

const status = await minecraft.query({ opcode: "STATUS" });
const latency = await minecraft.query({ opcode: "PING" });

console.log(`${status.motd}: ${status.onlinePlayers}/${status.maxPlayers}`);
console.log({ latency });
```

## Query types

| Opcode   | Description                                        |
| -------- | -------------------------------------------------- |
| `STATUS` | Edition, version, player counts, map and game mode |
| `PING`   | Round-trip latency in milliseconds                 |

The UDP port defaults to `19132`. Pass `port` explicitly for servers using a custom port.

Reference: [Bedrock Edition protocol](https://wiki.bedrock.dev/servers/server-listping.html)
