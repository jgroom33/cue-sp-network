import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { computeScenario, deviceMac } from "../packetEngine";
import { scenarios } from "../scenarios";
import { derivePacketModels } from "../packetModels";

const MAC_RE = /^02(:[0-9a-f]{2}){5}$/;

describe("deviceMac", () => {
  it("is a valid locally-administered unicast MAC, deterministic and distinct", () => {
    const names = ["pe1", "pe2", "p1", "p2", "p3", "p4", "rr1", "rr2", "asbr1", "asbr2", "agg1", "agg2", "agg5", "ce1", "ce2", "ce3", "ce4", "nid1", "nid2", "enni1", "enni2", "isp-upstream", "host-a", "host-b"];
    const macs = names.map(deviceMac);
    for (const m of macs) expect(m).toMatch(MAC_RE);
    expect(new Set(macs).size).toBe(names.length);
    expect(deviceMac("pe1")).toBe(deviceMac("pe1"));
  });
});

describe("every scenario serializes end to end", () => {
  const raw = JSON.parse(readFileSync(new URL("../../../public/network-data.json", import.meta.url), "utf8"));
  const topo = raw.network.topo;
  const configs = raw.network.device_configs;

  for (const def of scenarios) {
    it(`${def.id}: valid MACs, unique label ids, layers + bytes for every hop`, () => {
      const scenario = computeScenario(def, topo, configs);
      expect(scenario).not.toBeNull();
      const models = derivePacketModels(scenario!);
      expect(models.length).toBe(scenario!.packetStates.length);
      scenario!.packetStates.forEach((st, i) => {
        expect(st.headers.ethernet?.srcMac).toMatch(MAC_RE);
        expect(st.headers.ethernet?.dstMac).toMatch(MAC_RE);
        const ids = (st.headers.mpls ?? []).map((l) => l.id);
        expect(new Set(ids).size).toBe(ids.length);
        const m = models[i];
        expect(m.bytes.bytes.length).toBe(m.layers.reduce((a, l) => a + l.byteLength, 0));
        expect(m.bytes.owners.length).toBe(m.bytes.bytes.length);
        if (st.headers.vxlan || st.headers.pseudowire) {
          expect(st.headers.innerEthernet).toBeDefined();
        }
      });
    });
  }
});
