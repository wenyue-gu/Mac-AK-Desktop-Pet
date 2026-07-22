// Framework-agnostic helpers extracted from app.js.
//
// These pieces hold the fiddly edge-case logic (invalid coordinates, screen-edge
// bouncing, and the drag-vs-async-position race) that used to live inline in
// app.js closures. Pulling them out lets us unit-test them in Node without a
// DOM / WebGL / Electron environment, and app.js imports them so the tests
// cover the real code paths.

// Coerce a value into a safe integer coordinate.
// Non-finite values (NaN / Infinity) become 0, and -0 is normalized to 0 so it
// never leaks out to window.setPosition.
export function safeNumber(value) {
    let result = Number.isFinite(value)
        ? Math.round(value)
        : 0;

    if (Object.is(result, -0)) {
        result = 0;
    }

    return result;
}

// Pick which way the pet should walk.
// With no preferred direction it's a coin flip; with one, there's a 70% chance
// of honoring it and a 30% chance of flipping. `rng` is injectable for testing.
export function chooseWalkDirection(preferredDirection, rng = Math.random) {
    if (!preferredDirection) {
        return rng() < 0.5
            ? "left"
            : "right";
    }

    const roll = rng();

    if (roll < 0.7) {
        return preferredDirection;
    }

    return preferredDirection === "left"
        ? "right"
        : "left";
}

// Keep a walk position inside the screen and report when an edge was hit.
// When the pet reaches an edge we clamp its x and hand back the direction it
// should now prefer (bouncing off the wall). Returns preferredDirection: null
// when no edge was touched.
export function clampWalkPosition(currentX, petBoundsLeft, rightLimit) {
    let x = currentX;
    let hitEdge = false;
    let preferredDirection = null;

    if (x + petBoundsLeft <= 5) {
        x = 5 - petBoundsLeft;
        preferredDirection = "right";
        hitEdge = true;
    }
    if (x >= rightLimit - 5) {
        x = rightLimit - 5;
        preferredDirection = "left";
        hitEdge = true;
    }

    return { x, hitEdge, preferredDirection };
}

// Encapsulates click-drag of the pet window.
//
// The tricky part: fetching the window position is async, so a fast
// press-and-release can resolve *after* the pointer is already up. The
// `pointerDown` flag is the guard — if the button is no longer held by the time
// the position comes back, we refuse to start a "phantom" drag that would make
// the pet follow the cursor with no button pressed.
export class DragController {
    constructor(getWindowPosition, moveWindow) {
        this.getWindowPosition = getWindowPosition;
        this.moveWindow = moveWindow;

        this.dragging = false;
        this.pointerDown = false;
        // Monotonic id for each press, so a slow position lookup from an old
        // press can't hijack a newer one that's already in progress.
        this.pressId = 0;
        this.startMouseX = 0;
        this.startMouseY = 0;
        this.startWindowX = 0;
        this.startWindowY = 0;
    }

    onPointerDown(screenX, screenY) {
        this.pointerDown = true;
        const pressId = ++this.pressId;
        this.startMouseX = screenX;
        this.startMouseY = screenY;

        return this.getWindowPosition().then(pos => {
            // Ignore if the button was released before the position came back,
            // or if a newer press has since superseded this one.
            if (!this.pointerDown || pressId !== this.pressId) {
                return;
            }

            this.startWindowX = pos[0];
            this.startWindowY = pos[1];
            this.dragging = true;
        });
    }

    onPointerMove(screenX, screenY) {
        if (!this.dragging) {
            return;
        }

        const dx = screenX - this.startMouseX;
        const dy = screenY - this.startMouseY;

        this.moveWindow(
            this.startWindowX + dx,
            this.startWindowY + dy
        );
    }

    onPointerUp() {
        this.pointerDown = false;
        this.dragging = false;
    }
}
