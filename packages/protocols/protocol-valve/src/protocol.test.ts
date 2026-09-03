import { type UdpQuerySocket } from "@srvquery/core";
import { describe, expect, expectTypeOf, it } from "vitest";
import { createValveProtocol } from "./protocol";

function createProtocol() {
  const socket = {
    send: async () => [Buffer.from([0xff, 0xff, 0xff, 0xff, 0x6a])],
  } as unknown as UdpQuerySocket;
  return createValveProtocol({ socket });
}

describe("ValveProtocol query parser", () => {
  it("returns the native result without a parser", async () => {
    const result = createProtocol().query("PING");

    expectTypeOf(result).toEqualTypeOf<Promise<true>>();
    await expect(result).resolves.toBe(true);
  });

  it("returns a synchronous parser result", async () => {
    const result = createProtocol().query("PING", {
      parser: (ping) => (ping ? "online" : "offline") as const,
    });

    expectTypeOf(result).toEqualTypeOf<Promise<"online" | "offline">>();
    await expect(result).resolves.toBe("online");
  });

  it("awaits an asynchronous parser result", async () => {
    const result = createProtocol().query("PING", {
      parser: async (ping) => ({ ping }),
    });

    expectTypeOf(result).toEqualTypeOf<Promise<{ ping: true }>>();
    await expect(result).resolves.toEqual({ ping: true });
  });
});
