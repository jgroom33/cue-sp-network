import type { ProtocolColorKey } from "../utils/colors";
import { fieldByteRange } from "./packetBytes";
import { fieldKey, splitFieldKey } from "./packetDiff";
import type { HopModel } from "./packetModels";

/** Everything a tooltip needs to say about one field at one hop. */
export interface FieldInfo {
  key: string;
  layerId: string;
  layerName: string;
  color: ProtocolColorKey;
  name: string;
  display: string;
  bits: number;
  bitStart: number; // within the layer
  byteStart: number; // within the packet
  byteEnd: number; // exclusive
  bitInByte: number;
  prev?: string; // previous value when changed at this hop
  added?: boolean; // layer was added at this hop
}

export function describeField(model: HopModel, key: string): FieldInfo | undefined {
  const [layerId, fieldId] = splitFieldKey(key);
  const layer = model.layers.find((l) => l.id === layerId);
  if (!layer) return undefined;
  if (layer.payload && fieldId === "data") {
    const range = model.bytes.layerRanges.get(layerId);
    if (!range) return undefined;
    return {
      key,
      layerId,
      layerName: layer.name,
      color: layer.color,
      name: "Payload",
      display: `${layer.byteLength} bytes`,
      bits: layer.byteLength * 8,
      bitStart: 0,
      byteStart: range[0],
      byteEnd: range[1],
      bitInByte: 0,
      added: model.diff.addedLayers.includes(layerId) || undefined,
    };
  }
  let bitStart = 0;
  let field;
  for (const f of layer.fields) {
    if (f.id === fieldId) {
      field = f;
      break;
    }
    bitStart += f.bits;
  }
  if (!field) return undefined;
  const range = fieldByteRange(model.bytes, layerId, bitStart, field.bits);
  if (!range) return undefined;
  const change = model.diff.changedFields.find((c) => fieldKey(c.layerId, c.fieldId) === key);
  return {
    key,
    layerId,
    layerName: layer.name,
    color: layer.color,
    name: field.name,
    display: field.display,
    bits: field.bits,
    bitStart,
    ...range,
    prev: change?.from,
    added: model.diff.addedLayers.includes(layerId) || undefined,
  };
}
