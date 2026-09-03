import { UdpQuerySocket } from "@srvquery/core";
import { createValveProtocol } from "@srvquery/protocol-valve";
import { dayzRuleParser } from "./rules";

export { dayzRuleParser } from "./rules";
export {
  DayZDlcSchema,
  DayZModSchema,
  DayZRulesSchema,
  type DayZDlc,
  type DayZMod,
  type DayZRules,
} from "./schema";

using socket = new UdpQuerySocket({
  host: "168.100.162.38",
  port: 27016,
  retries: 1,
});
{
  const proto = createValveProtocol({
    socket,
  });

  const info = await proto.query("INFO");
  console.log(info);
  const rules = await proto.query("RULES", { parser: dayzRuleParser });
  console.log(rules);
  const players = await proto.query("PLAYERS");
  console.log(players);
}
