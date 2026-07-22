import test from "node:test";
import assert from "node:assert/strict";

import {
    safeNumber,
    chooseWalkDirection,
    clampWalkPosition,
    DragController
} from "../petUtils.mjs";

// A promise we can resolve by hand, to simulate the async window-position
// lookup resolving at a moment of our choosing.
function deferred() {
    let resolve;
    const promise = new Promise(r => {
        resolve = r;
    });
    return { promise, resolve };
}

// Returns an rng() stub that yields the given values in order (then repeats
// the last one), so direction rolls are deterministic.
function rngReturning(...values) {
    let i = 0;
    return () => values[Math.min(i++, values.length - 1)];
}

test("safeNumber", async (t) => {

    await t.test("passes integers through", () => {
        assert.equal(safeNumber(42), 42);
        assert.equal(safeNumber(-7), -7);
        assert.equal(safeNumber(0), 0);
    });

    await t.test("rounds floats", () => {
        assert.equal(safeNumber(3.4), 3);
        assert.equal(safeNumber(3.6), 4);
    });

    await t.test("blocks NaN and Infinity (would corrupt window position)", () => {
        assert.equal(safeNumber(NaN), 0);
        assert.equal(safeNumber(Infinity), 0);
        assert.equal(safeNumber(-Infinity), 0);
    });

    await t.test("coerces non-numbers to 0", () => {
        assert.equal(safeNumber(undefined), 0);
        assert.equal(safeNumber(null), 0);
        assert.equal(safeNumber("100"), 0);
    });

    await t.test("normalizes negative zero to positive zero", () => {
        // Math.round(-0.4) is -0; we must not leak -0 downstream.
        const result = safeNumber(-0.4);
        assert.equal(result, 0);
        assert.equal(Object.is(result, -0), false);
        assert.equal(Object.is(result, 0), true);
    });
});

test("chooseWalkDirection", async (t) => {

    await t.test("no preference is a coin flip on rng", () => {
        assert.equal(chooseWalkDirection(null, rngReturning(0.4)), "left");
        assert.equal(chooseWalkDirection(null, rngReturning(0.5)), "right");
        assert.equal(chooseWalkDirection(null, rngReturning(0.9)), "right");
    });

    await t.test("honors preference ~70% of the time", () => {
        assert.equal(chooseWalkDirection("left", rngReturning(0.0)), "left");
        assert.equal(chooseWalkDirection("left", rngReturning(0.69)), "left");
        assert.equal(chooseWalkDirection("right", rngReturning(0.5)), "right");
    });

    await t.test("flips preference on the ~30% roll", () => {
        assert.equal(chooseWalkDirection("left", rngReturning(0.8)), "right");
        assert.equal(chooseWalkDirection("right", rngReturning(0.8)), "left");
    });

    await t.test("boundary: roll of exactly 0.7 flips (uses <, not <=)", () => {
        assert.equal(chooseWalkDirection("left", rngReturning(0.7)), "right");
    });
});

test("clampWalkPosition", async (t) => {

    // Pet is 100px wide-ish; left offset 20, screen right limit 800.
    const petLeft = 20;
    const rightLimit = 800;

    await t.test("leaves an in-bounds position untouched", () => {
        const r = clampWalkPosition(400, petLeft, rightLimit);
        assert.equal(r.x, 400);
        assert.equal(r.hitEdge, false);
        assert.equal(r.preferredDirection, null);
    });

    await t.test("bounces off the left edge and prefers right", () => {
        // x + petLeft <= 5  ->  x <= -15
        const r = clampWalkPosition(-50, petLeft, rightLimit);
        assert.equal(r.x, 5 - petLeft); // -15
        assert.equal(r.hitEdge, true);
        assert.equal(r.preferredDirection, "right");
    });

    await t.test("bounces off the right edge and prefers left", () => {
        const r = clampWalkPosition(900, petLeft, rightLimit);
        assert.equal(r.x, rightLimit - 5); // 795
        assert.equal(r.hitEdge, true);
        assert.equal(r.preferredDirection, "left");
    });

    await t.test("left-edge boundary is inclusive (<=)", () => {
        // x + petLeft === 5 exactly
        const r = clampWalkPosition(5 - petLeft, petLeft, rightLimit);
        assert.equal(r.hitEdge, true);
        assert.equal(r.preferredDirection, "right");
    });

    await t.test("degenerate tiny screen: right check wins the tie", () => {
        // Both branches trigger; the right branch runs second and overwrites.
        const r = clampWalkPosition(0, 0, 5);
        assert.equal(r.hitEdge, true);
        assert.equal(r.preferredDirection, "left");
        assert.equal(r.x, 0); // rightLimit - 5
    });
});

test("DragController", async (t) => {

    await t.test("a normal drag moves the window by the pointer delta", async () => {
        const d = deferred();
        const moves = [];
        const dc = new DragController(
            () => d.promise,
            (x, y) => moves.push([x, y])
        );

        const pending = dc.onPointerDown(100, 200);
        d.resolve([10, 20]); // window was at (10, 20)
        await pending;

        assert.equal(dc.dragging, true);

        dc.onPointerMove(150, 250); // moved +50, +50
        assert.deepEqual(moves, [[60, 70]]);
    });

    await t.test("does not move before the position resolves", async () => {
        const d = deferred();
        const moves = [];
        const dc = new DragController(
            () => d.promise,
            (x, y) => moves.push([x, y])
        );

        dc.onPointerDown(100, 200);
        // Position hasn't come back yet.
        dc.onPointerMove(150, 250);
        assert.deepEqual(moves, []);
        assert.equal(dc.dragging, false);
    });

    // The race this whole controller exists to fix.
    await t.test("release before position resolves does NOT start a phantom drag", async () => {
        const d = deferred();
        const moves = [];
        const dc = new DragController(
            () => d.promise,
            (x, y) => moves.push([x, y])
        );

        const pending = dc.onPointerDown(100, 200);
        dc.onPointerUp();       // user released before the async lookup returned
        d.resolve([10, 20]);    // ...and only now does the position arrive
        await pending;

        assert.equal(dc.dragging, false, "must not be dragging after release");

        // Any later mouse movement must be ignored — no follow-the-cursor.
        dc.onPointerMove(300, 400);
        assert.deepEqual(moves, [], "no window movement should occur");
    });

    await t.test("pressing again after a stale release starts a fresh, valid drag", async () => {
        const first = deferred();
        const second = deferred();
        const positions = [first.promise, second.promise];
        let call = 0;
        const moves = [];
        const dc = new DragController(
            () => positions[call++],
            (x, y) => moves.push([x, y])
        );

        // First press released before resolving (the stale one).
        const p1 = dc.onPointerDown(100, 200);
        dc.onPointerUp();

        // Second, real press.
        const p2 = dc.onPointerDown(300, 300);

        // Stale position resolves first and must be ignored...
        first.resolve([10, 20]);
        await p1;
        assert.equal(dc.dragging, false);

        // ...then the real one resolves and drags.
        second.resolve([70, 80]);
        await p2;
        assert.equal(dc.dragging, true);

        dc.onPointerMove(310, 315); // +10, +15 from (300,300)
        assert.deepEqual(moves, [[80, 95]]);
    });
});
