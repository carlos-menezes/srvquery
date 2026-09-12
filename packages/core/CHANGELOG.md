# @srvquery/core

## 0.0.1-next.0

### Patch Changes

- Initial prerelease of the srvquery package suite.

  The release includes:

  - `@srvquery/core` transport, retry, error, DNS, and binary parsing primitives.
  - `@srvquery/protocol-valve` direct Valve A2S server queries.
  - `@srvquery/protocol-openmp` direct SA-MP/open.mp queries for server info, rules, players, client lists, and latency, including per-query text decoding for legacy Cyrillic encodings.
  - `@srvquery/protocol-fivem` direct FiveM/RedM HTTP queries.
  - `@srvquery/protocol-minecraft-java` direct Minecraft Java Server List Ping queries for status and latency.
  - `@srvquery/protocol-minecraft-bedrock` direct Minecraft Bedrock RakNet unconnected ping queries for status and latency.

  All protocol clients query a supplied server host and port directly. They do not perform master-list discovery.
