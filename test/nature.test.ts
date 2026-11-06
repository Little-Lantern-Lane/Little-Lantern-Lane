import { describe, expect, it } from "vitest";
import { BEACH, FOUNTAIN_X, natureAt, riverMidX, SHED, WOODS } from "../src/game/layout";

const QUAY = 11700;
const BEACH_X = 26000;
const RIVER = riverMidX(0);

describe("where you can hear the gulls, birds and brook", () => {
  it("is quiet in the village, indoors and in the tea room", () => {
    for (const x of [500, 1500, 5000, 7000, 9500, 21000, 29000, 30000]) expect(natureAt(x, 0, true)).toEqual({ gulls: 0, birds: 0, insects: 0, brook: 0, fountain: 0 });
  });

  it("has gulls along the beach and the harbour, but not inside the shed", () => {
    expect(natureAt(BEACH_X, BEACH.water, true).gulls).toBe(1);
    expect(natureAt(BEACH_X, BEACH.back, true).gulls).toBeGreaterThan(0.5);
    expect(natureAt(QUAY, 0, true).gulls).toBeGreaterThan(0);
    expect(natureAt(SHED.x0 + 100, 0, true).gulls).toBe(0);
  });

  it("has birds and insects all through the woods and only there", () => {
    expect(natureAt(WOODS.x0 + 300, 0, true).insects).toBe(1);
    expect(natureAt(BEACH_X, 0, true).insects).toBe(0);
    expect(natureAt(WOODS.x0 + 300, 0, true).birds).toBe(1);
    expect(natureAt(WOODS.x1 - 300, 0, true).birds).toBe(1);
    expect(natureAt(BEACH_X, 0, true).birds).toBe(0);
  });

  it("the brook is loudest on the bank, fades as you walk away, and is gone by the gate", () => {
    const bank = natureAt(WOODS.river0 - 40, 0, true).brook;
    const nearby = natureAt(WOODS.river0 - 500, 0, true).brook;
    expect(bank).toBeGreaterThan(0.9);
    expect(nearby).toBeLessThan(bank);
    expect(nearby).toBeGreaterThan(0);
    expect(natureAt(WOODS.gate, 0, true).brook).toBe(0);
    expect(natureAt(WOODS.river1 + 40, 0, true).brook).toBeGreaterThan(0.9);
  });

  it("follows the river as it bends away from the bridge", () => {
    const z = 30;
    expect(riverMidX(z)).not.toBe(RIVER);
    expect(natureAt(riverMidX(z) - 260, z, true).brook).toBeGreaterThan(0.9);
  });

  it("the fountain is loudest beside it, fades across the Square, and is gone by Market Street", () => {
    const beside = natureAt(FOUNTAIN_X, -2, true).fountain;
    const across = natureAt(FOUNTAIN_X + 300, 0, true).fountain;
    expect(beside).toBeGreaterThan(0.5);
    expect(across).toBeGreaterThan(0);
    expect(across).toBeLessThan(beside);
    expect(natureAt(1800, 0, true).fountain).toBe(0);
  });

  it("the fountain runs at night, and stops when it's frozen", () => {
    expect(natureAt(FOUNTAIN_X, -2, false).fountain).toBeGreaterThan(0.5);
    expect(natureAt(FOUNTAIN_X, -2, true, true).fountain).toBe(0);
  });

  it("can hear the river along the mill path", () => {
    expect(natureAt(8400, 0, true).brook).toBeGreaterThan(0);
  });

  it("gulls and birds fall silent when it isn't a calm day, and the water keeps running", () => {
    const woods = natureAt(WOODS.river0 - 40, 0, false);
    expect(woods.birds).toBe(0);
    expect(woods.insects).toBe(0);
    expect(woods.brook).toBeGreaterThan(0.9);
    expect(natureAt(BEACH_X, 0, false).gulls).toBe(0);
  });
});
