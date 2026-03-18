import { describe, it, expect } from "vitest";
import { Rankai } from "../src/core.js";
describe("Rankai", () => {
  it("init", () => { expect(new Rankai().getStats().ops).toBe(0); });
  it("op", async () => { const c = new Rankai(); await c.process(); expect(c.getStats().ops).toBe(1); });
  it("reset", async () => { const c = new Rankai(); await c.process(); c.reset(); expect(c.getStats().ops).toBe(0); });
});
