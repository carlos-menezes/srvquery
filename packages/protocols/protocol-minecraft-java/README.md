# @srvquery/protocol-minecraft-java

![npm Version](https://shieldcn.dev/npm/@srvquery/protocol-minecraft-java.svg?variant=secondary) ![npm Weekly Downloads](https://shieldcn.dev/npm/@srvquery/protocol-minecraft-java/downloads.svg)

Query Minecraft Java Edition servers using the direct Server List Ping protocol.

## Installation

```sh
pnpm add @srvquery/core @srvquery/protocol-minecraft-java
```

## Usage

```ts
import { createMinecraftJavaProtocol } from "@srvquery/protocol-minecraft-java";

const minecraft = createMinecraftJavaProtocol({
  host: "org.earthmc.net",
});

const status = await minecraft.query({ opcode: "STATUS" });
const latency = await minecraft.query({ opcode: "PING" });

console.log(`${status.version.name}: ${status.players.online}/${status.players.max}`);
console.log({ latency });
```

## Query types

| Opcode   | Description                                         |
| -------- | --------------------------------------------------- |
| `STATUS` | Version, player counts, description and server icon |
| `PING`   | Round-trip latency in milliseconds                  |

Reference: [Minecraft Protocol: Server List Ping](https://minecraft.wiki/w/Java_Edition_protocol/Server_List_Ping)

The `port` defaults to `25565`, Minecraft Java Edition's standard server port. Pass `port` explicitly for servers using a custom port.
