# @srvquery/core

[![npm version](https://img.shields.io/npm/v/%40srvquery%2Fcore)](https://www.npmjs.com/package/@srvquery/core)
[![npm downloads](https://img.shields.io/npm/dm/%40srvquery%2Fcore)](https://www.npmjs.com/package/@srvquery/core)

Shared binary parsing and UDP query primitives for `srvquery` packages.

## Installation

```sh
pnpm add @srvquery/core
```

## Usage

### BufferCursor

```ts
import { BufferCursor } from "@srvquery/core";

const cursor = new BufferCursor(
  Buffer.from([
    0x2a, // UInt8
    0x34,
    0x12, // UInt16LE
    0xff,
    0xff,
    0xff,
    0xff, // Int32LE
    0x78,
    0x56,
    0x34,
    0x12, // UInt32LE
    0x00,
    0x00,
    0xc0,
    0x3f, // FloatLE
    0x01,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00, // BigUInt64LE
    0x68,
    0x69,
    0x00, // C string
    0xaa,
    0xbb, // bytes
    0xcc, // skipped byte
    0xdd,
    0xee, // remaining bytes
  ]),
);

console.log(cursor.offset); // 0
console.log(cursor.readUInt8()); // 42
console.log(cursor.readUInt16LE()); // 4660
console.log(cursor.readInt32LE()); // -1
console.log(cursor.readUInt32LE()); // 305419896
console.log(cursor.readFloatLE()); // 1.5
console.log(cursor.readBigUInt64LE()); // 1n
console.log(cursor.readCString()); // "hi"
console.log(cursor.readBytes(2)); // <Buffer aa bb>

cursor.skip(1);

console.log(cursor.remaining); // 2
console.log(cursor.readRemaining()); // <Buffer dd ee>
```

### createUdpSocket

`using` invokes `Symbol.dispose` when the socket leaves scope:

```ts
import { createUdpSocket } from "@srvquery/core";

using socket = createUdpSocket(
  {
    host: "127.0.0.1",
    port: 27015,
  },
  {
    timeout: 2_000,
    type: "udp4",
  },
);

const packets = await socket.send(
  { payload: Buffer.from("status\0") },
  {
    accept: (packet) => packet.length > 0,
    end: (accepted) => accepted.length === 1,
  },
);

console.log(packets[0]);
```

Call `close` when the lifetime cannot be expressed with `using`:

```ts
const socket = createUdpSocket({ host: "127.0.0.1", port: 27015 });

socket.close();
```
