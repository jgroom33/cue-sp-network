import type { ComputedScenario } from "./types";
import { buildLayers, type PacketLayer } from "./packetLayers";
import { serializePacket, type SerializedPacket } from "./packetBytes";
import { diffPackets, type PacketDiff } from "./packetDiff";

export interface HopModel {
  layers: PacketLayer[];
  bytes: SerializedPacket;
  diff: PacketDiff;
}

/** Derive per-hop view models once per scenario (memoize on scenario identity). */
export function derivePacketModels(scenario: ComputedScenario): HopModel[] {
  const out: HopModel[] = [];
  let prev: PacketLayer[] | undefined;
  for (const state of scenario.packetStates) {
    const layers = buildLayers(state.headers);
    out.push({
      layers,
      bytes: serializePacket(layers),
      diff: diffPackets(prev, layers, state.actions),
    });
    prev = layers;
  }
  return out;
}
