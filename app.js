import spine from "./spine/spine-webgl.js";

const canvas = document.getElementById("canvas");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const petHitbox = document.getElementById("petHitbox");
let isWalking = false;

const gl = canvas.getContext("webgl", {
    alpha: true
});

if (!gl) {
    alert("WebGL not supported");
}
gl.enable(gl.BLEND);

gl.blendFunc(
    gl.SRC_ALPHA,
    gl.ONE_MINUS_SRC_ALPHA
);

// Spine setup

const context =
    new spine.webgl.ManagedWebGLRenderingContext(
        canvas,
        {
            alpha: true
        }
    );

const shader =
    spine.webgl.Shader.newTwoColoredTextured(context);

const batcher =
    new spine.webgl.PolygonBatcher(context);

const skeletonRenderer =
    new spine.webgl.SkeletonRenderer(context);

const mvp =
    new spine.webgl.Matrix4();

const zoom = 2.2;

mvp.ortho2d(
    0,
    0,
    canvas.width * zoom,
    canvas.height * zoom
);

const assetManager =
    new spine.webgl.AssetManager(context);

// files

const skelFile =
    "character/build_char_4133_logos_ambienceSynesthesia_6.skel";

const atlasFile =
    "character/build_char_4133_logos_ambienceSynesthesia_6.atlas";

// loading

let skelReady = false;
let atlasReady = false;


function checkReady() {
    if (skelReady && atlasReady) {
        loadEverything();
    }
}

assetManager.loadBinary(
    skelFile,
    () => {
        skelReady = true;
        checkReady();
    }
);


assetManager.loadTextureAtlas(
    atlasFile,
    () => {
        atlasReady = true;
        checkReady();
    }
);

let characters = [];
let character;

let walkingTimer = null;
let preferredDirection = null;
let currentBehavior = "Relax";
let petBounds = {
    left: 0,
    width: 0
};

function safeNumber(value) {
    let result = Number.isFinite(value)
        ? Math.round(value)
        : 0;

    if (Object.is(result, -0)) {
        result = 0;
    }

    return result;
}

function stopWalking() {
    cancelAnimationFrame(walkingTimer);
    walkingTimer = null;
}

function chooseWalkDirection() {
    if (!preferredDirection) {
        return Math.random() < 0.5
            ? "left"
            : "right";
    }

    const roll = Math.random();

    if (roll < 0.7) {
        return preferredDirection;
    }

    return preferredDirection === "left"
        ? "right"
        : "left";
}

const dockArea = {
    minX: 200,
    maxX: 1150,
    minY: 700,
    maxY: 750
};

function isOnDock() {
    return window.electronAPI.getWindowPosition()
        .then(pos => {

            const x = pos[0];
            const y = pos[1];

            const result =
                x >= dockArea.minX &&
                x <= dockArea.maxX &&
                y >= dockArea.minY &&
                y <= dockArea.maxY;

            // window.electronAPI.log(
            //     `Dock? ${result} x=${x} y=${y}`
            // );

            return result;
        });
}

function walkPet(
    direction,
    multiplier = 1
) {
    isWalking = true;
    currentBehavior = "Move";

    if (walkingTimer) {
        cancelAnimationFrame(walkingTimer);
        walkingTimer = null;
    }

    const distancePerWalkCycle = 60;

    const distance =
        distancePerWalkCycle * multiplier;

    const duration =
        character.moveDuration * multiplier;
    // window.electronAPI.log(
    //     `WALK multiplier=${multiplier} distance=${distance} duration=${duration}`
    // );

    if (direction === "left") {
        character.skeleton.scaleX = -1;
    }
    else {
        character.skeleton.scaleX = 1;
    }

    window.electronAPI
        .getWindowPosition()
        .then(pos => {

            let startX = pos[0];
            const startY = pos[1];

            const screenWidth = window.screen.width;

            const rightLimit =
                screenWidth -
                petBounds.width -
                petBounds.left;

            let startTime = Date.now();

            function step() {
                if (!isWalking) {
                        walkingTimer = null;
                        return;
                    }
                const elapsed = Date.now() - startTime;

                const progress =
                    elapsed / duration;

                if (progress >= 1) {
                    isWalking = false;
                    walkingTimer = null;
                    currentBehavior = "Relax";
                    character.animationState.setAnimation(
                        0,
                        "Relax",
                        true
                    );
                    return;
                }

                let currentX =
                    direction === "left"
                        ? startX - distance * progress
                        : startX + distance * progress;

                let hitEdge = false;

                if (currentX + petBounds.left <= 5) {
                    currentX = 5-petBounds.left;
                    preferredDirection = "right";
                    hitEdge = true;
                }
                if (currentX >= rightLimit-5) {
                    currentX = rightLimit-5;
                    preferredDirection = "left";
                    hitEdge = true;
                }

                if (hitEdge) {

                    const safeX = safeNumber(currentX);
                    const safeY = safeNumber(startY);
                    window.electronAPI.moveWindow(
                        safeX,
                        safeY
                    );

                    direction = preferredDirection;

                    character.skeleton.scaleX =
                        direction === "left" ? -1 : 1;

                    startX = currentX;

                    startTime = Date.now();

                    walkingTimer =
                        requestAnimationFrame(step);

                    return;
                }

                const safeX = safeNumber(currentX);
                const safeY = safeNumber(startY);

                window.electronAPI.moveWindow(
                    safeX,
                    safeY
                );

                walkingTimer =
                    requestAnimationFrame(step);
            }
            step();
        });
}

function loadEverything() {

    const atlas =
        assetManager.get(atlasFile);
    const atlasLoader =
        new spine.AtlasAttachmentLoader(atlas);
    const binary =
        assetManager.get(skelFile);
    const skeletonBinary =
        new spine.SkeletonBinary(atlasLoader);
    const skeletonData =
        skeletonBinary.readSkeletonData(binary);

    console.log(
        "Animations:",
        skeletonData.animations.map(
            a => a.name
        )
    );

    const moveAnimation =
        skeletonData.findAnimation("Move");

    const moveDuration = moveAnimation
    ? moveAnimation.duration * 1000
    : 4000;

    const skeleton =
        new spine.Skeleton(
            skeletonData
        );

    skeleton.setToSetupPose();

    const stateData =
        new spine.AnimationStateData(
            skeletonData
        );

    stateData.defaultMix = 0;

    const animationState =
        new spine.AnimationState(
            stateData
        );

    character = {
        skeleton,
        animationState,
        moveDuration
    };

    window.playAnimation = function(name) {
        character.animationState.setAnimation(
            0,
            name,
            true
        );
    };

    // click interaction
    petHitbox.onclick = () => {
        isWalking = false;
        stopWalking();
        currentBehavior = "Interact";
        character.animationState.setAnimation(
            0,
            "Interact",
            false
        );
        character.animationState.addAnimation(
            0,
            "Relax",
            true,
            0
        );
        currentBehavior = "Relax";
    };


    function startRandomBehavior() {
        const baseBehaviors = [
            {
                name: "Special",
                chance: 0.15
            },
            {
                name: "Move",
                chance: 0.85
            }
        ];

        const dockBehaviors = [
            {
                name: "Special",
                chance: 0.15
            },
            {
                name: "Sit",
                chance: 0.10
            },
            {
                name: "Move",
                chance: 0.75
            }
        ];

        function scheduleNext() {
            const delay =
                5000;
                // 15000 + Math.random() * 25000;
            setTimeout(
                chooseBehavior,
                delay
            );
        }

        async function chooseBehavior() {
            const onDock = await isOnDock();
            const behaviors = onDock
                ? dockBehaviors
                : baseBehaviors;
            const roll = Math.random();

            let total = 0;

            for (const behavior of behaviors) {

                total += behavior.chance;

                if (roll <= total) {
                    playBehavior(
                        behavior.name
                    );
                    return;
                }
            }
        }

        function playBehavior(name) {
            currentBehavior = name;
            if (name !== "Move") {
                stopWalking();
            }
            if (name === "Move") {
                setTimeout(() => {
                    const direction = chooseWalkDirection();
                    walkPet(
                        direction,
                        Math.floor(Math.random() * 4) + 1
                    );

                    preferredDirection = null;
                }, 100);
            }
            let track;

            track = character.animationState.setAnimation(
                0,
                name,
                name === "Move" || name === "Sit"
            );

            if (name === "Sit") {
                const thisBehavior = name;
                const sitDuration =
                    5000 + Math.random() * 10000;
                setTimeout(() => {
                    if (currentBehavior !== thisBehavior) {
                        return;
                    }
                    currentBehavior = "Relax";
                    character.animationState.setAnimation(
                        0,
                        "Relax",
                        true
                    );
                }, sitDuration);
            }
            else if (name !== "Move") {
                const thisBehavior = name;
                track.listener = {
                    complete: () => {
                        if (currentBehavior !== thisBehavior) {
                            return;
                        }
                        currentBehavior = "Relax";
                        character.animationState.setAnimation(
                            0,
                            "Relax",
                            true
                        );
                    }
                }
            }
            scheduleNext();
        }
        scheduleNext();
    }

    character.animationState.setAnimation(
        0,
        "Relax",
        true
    );

    startRandomBehavior();
    render();
}

// dragging

let dragging = false;
let startMouseX = 0;
let startMouseY = 0;
let startWindowX = 0;
let startWindowY = 0;

petHitbox.addEventListener(
    "mousedown",
    (e) => {

        window.electronAPI.setIgnoreMouse(false);

        stopWalking();
        preferredDirection = null;

        startMouseX = e.screenX;
        startMouseY = e.screenY;

        window.electronAPI
            .getWindowPosition()
            .then(pos => {

                startWindowX = pos[0];
                startWindowY = pos[1];

                dragging = true;
            });
    }
);

window.addEventListener(
    "mousemove",
    (e) => {
        if (!dragging)
            return;
        const dx =
            e.screenX - startMouseX;
        const dy =
            e.screenY - startMouseY;

        window.electronAPI.moveWindow(
            startWindowX + dx,
            startWindowY + dy
        );
    }
);

window.addEventListener(
    "mouseup",
    () => {
        dragging = false;
    }
);

let lastTime =
    Date.now() / 1000;

const offset = new spine.Vector2();
const size = new spine.Vector2();

function render() {
    requestAnimationFrame(render);
    if (!character)
        return;

    const now =
        Date.now() / 1000;
    const delta =
        now - lastTime;
    lastTime = now;
    character.animationState.update(delta);
    character.animationState.apply(
        character.skeleton
    );

    character.skeleton.x = 420;
    character.skeleton.y = 180;
    character.skeleton.updateWorldTransform();

    character.skeleton.getBounds(offset, size);

    petHitbox.style.width = (size.x / zoom) + "px";
    petHitbox.style.height = (size.y / zoom) + "px";

    petHitbox.style.left =
    (offset.x / zoom) + "px";

    petHitbox.style.top =
        ((canvas.height * zoom - offset.y - size.y) / zoom) + "px";

    petBounds.left = offset.x / zoom;
    petBounds.width = size.x / zoom;

    window.electronAPI.updatePetBounds({
        left: petBounds.left,
        top: canvas.height - (offset.y + size.y) / zoom,
        width: petBounds.width,
        height: size.y / zoom
    });

    // gl.clearColor(
    //     0.2,
    //     0.2,
    //     0.2,
    //     1
    // );
    gl.clearColor(
        0,
        0,
        0,
        0
    );

    gl.clear(
        gl.COLOR_BUFFER_BIT
    );

    shader.bind();
    shader.setUniformi(
        spine.webgl.Shader.SAMPLER,
        0
    );
    shader.setUniform4x4f(
        spine.webgl.Shader.MVP_MATRIX,
        mvp.values
    );
    batcher.begin(shader);
    skeletonRenderer.draw(
        batcher,
        character.skeleton
    );
    batcher.end();
    shader.unbind();

}


petHitbox.addEventListener("mouseenter", () => {
    window.electronAPI.setIgnoreMouse(false);
});


petHitbox.addEventListener("mouseleave", () => {
    if (!dragging) {
        window.electronAPI.setIgnoreMouse(true);
    }
});
