import { applyBagEvent, BAG_EVENTS, initialBag, type BagState } from "./bag";
import { applyMeterEvent, initialMeter, METER_EVENTS, type MeterState } from "./meter";
import { applyWorldEvent, initialWorld, WORLD_EVENTS, type WorldState } from "./world";
import type { GameEvent } from "./tags";

export interface GameState {
  meter: MeterState;
  world: WorldState;
  bag: BagState;
}

export function initialState(): GameState {
  return { meter: initialMeter(), world: initialWorld(), bag: initialBag() };
}

export function isKnownEvent(name: string): boolean {
  return METER_EVENTS.has(name) || WORLD_EVENTS.has(name) || BAG_EVENTS.has(name);
}

export function applyEvent(state: GameState, ev: GameEvent): GameState {
  if (!isKnownEvent(ev.name)) throw new Error(`Unknown event: ${ev.name}`);
  return {
    meter: applyMeterEvent(state.meter, ev),
    world: applyWorldEvent(state.world, ev),
    bag: applyBagEvent(state.bag, ev),
  };
}
