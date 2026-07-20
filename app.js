import spine from "./spine/spine-webgl.js";

const canvas = document.getElementById("canvas");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const petHitbox = document.getElementById("petHitbox");
let isWalking = false;

// Spine setup

const context =
    new spine.webgl.ManagedWebGLRenderingContext(
        canvas,
        {
            alpha:true,
        }
    );

const shader =
    spine.webgl.Shader.newTwoColoredTextured(
        context
    );

const batcher =
    new spine.webgl.PolygonBatcher(context);

const skeletonRenderer =
    new spine.webgl.SkeletonRenderer(context);
skeletonRenderer.premultipliedAlpha = true;
const mvp =
    new spine.webgl.Matrix4();

const zoom = 2.2;

mvp.ortho2d(
    0,
    0,
    window.innerWidth * zoom,
    window.innerHeight * zoom
);

const assetManager =
    new spine.webgl.AssetManager(context);

// files

const characterFiles = [
    {
        skel:
            "character/build_char_4133_logos_ambienceSynesthesia_6.skel",
        atlas:
            "character/build_char_4133_logos_ambienceSynesthesia_6.atlas"
    },
    {
        skel:
            "character/char_4133_logos_ambienceSynesthesia_6.skel",
        atlas:
            "character/char_4133_logos_ambienceSynesthesia_6.atlas"
    }
];

// loading

let loadedAssets = 0;
const totalAssets = characterFiles.length * 2;

function assetLoaded() {
    loadedAssets++;
    if (loadedAssets === totalAssets) {
        loadEverything();
    }
}


for (const character of characterFiles) {

    assetManager.loadBinary(
        character.skel,
        assetLoaded
    );

    assetManager.loadTextureAtlas(
        character.atlas,
        assetLoaded
    );
}

let characters = {};
let activeCharacter;
let currentMode = "normal";

const behaviorSources = {
    Move: "shared",

    Die: "normal",

    Sit: "base",
    Special: "base",

    Skill1: "normal",
    Skill2: "normal",
    Skill3: "normal"
};

const interactAnimations = {
    Skill1: "Skill_1_Attack",
    Skill3: "Skill_3_Attack"
};

const behaviorAnimations = {
    Move: [
        "Move"
    ],

    Die:[ "Die"],

    Sit: [
        "Sit"
    ],

    Special: [
        "Special"
    ],

    Skill1: [
        "Skill_1_Begin",
        "Skill_1_Idle"
    ],

    Skill2: [
        "Skill_2_Begin",
        "Skill_2_Loop",
        "Skill_2_End",
        "Skill_Down_2_Begin",
        "Skill_Down_2_Loop",
        "Skill_Down_2_End"
    ],

    Skill3: [
        "Skill_3_Begin",
        "Skill_3_Idle",
        "Skill_3_End"
    ]
};

let walkingTimer = null;
let preferredDirection = null;
let currentDirection = "right";
let currentBehavior = "Relax";
let skill2Down = false;
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

function playIdle() {

    activeCharacter.animationState.clearTrack(0);

    playAnimation(
        activeCharacter.defaultIdle,
        true
    );
}

function finishBehavior(){
    currentBehavior = "Relax";
    playIdle();
    startRandomBehavior();
}

function playStartAnimation() {

    const track = playAnimation(
        "Start",
        false
    );

    if (!track) {
        playIdle();
        return;
    }

    track.listener = {
        complete: () => {
            finishBehavior();
        }
    };
}

function setMode(mode) {

    if (!characters[mode]) {
        window.electronAPI.log(
            "Unknown mode: " + mode
        );
        return;
    }

    currentMode = mode;
    activeCharacter = characters[mode];

    activeCharacter.skeleton.scaleX =
        currentDirection === "left"
            ? -1
            : 1;

    playIdle();
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
        activeCharacter.moveDuration * multiplier;

    currentDirection = direction;

    if (direction === "left") {
        activeCharacter.skeleton.scaleX = -1;
    }
    else {
        activeCharacter.skeleton.scaleX = 1;
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
                    window.electronAPI.log("Move finished");

                    isWalking = false;
                    walkingTimer = null;

                    const goNormal = Math.random() < 0.5;

                    if (goNormal) {
                        setMode("normal");
                    }
                    else {
                        setMode("base");
                    }

                    finishBehavior();

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

                    activeCharacter.skeleton.scaleX =
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

function createCharacter(skeletonData) {

    const moveAnimation =
        skeletonData.findAnimation("Move");

    const moveDuration =
        moveAnimation
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


    return {
        skeleton,
        animationState,
        moveDuration,
        type: null,
        defaultIdle: null,
        animations: []
    };
}

function loadCharacterData(files) {

    const atlas =
        assetManager.get(files.atlas);

    const atlasLoader =
        new spine.AtlasAttachmentLoader(atlas);

    const binary =
        assetManager.get(files.skel);

    const skeletonBinary =
        new spine.SkeletonBinary(atlasLoader);

    return skeletonBinary.readSkeletonData(binary);
}

function playAnimation(name, loop = true) {

    if (!activeCharacter.animations.includes(name)) {
        window.electronAPI.log(
            activeCharacter.type +
            " does not have " +
            name
        );
        return null;
    }

    return activeCharacter.animationState.setAnimation(
        0,
        name,
        loop
    );
}

function playAnimationBackward(name) {

    const animation =
        activeCharacter.animationState
            .data
            .skeletonData
            .findAnimation(name);

    if (!animation) {
        return null;
    }

    const track =
        activeCharacter.animationState.setAnimation(
            0,
            name,
            false
        );

    track.trackTime = animation.duration;
    track.timeScale = -1;

    return track;
}

function playBehavior(name) {

    const owner =
        behaviorSources[name];

    if (
        owner &&
        owner !== "shared" &&
        currentMode !== owner
    ) {
        setMode(owner);
    }

    switch(name) {

        case "Move":
            playMoveBehavior();
            break;

        case "Sit":
            playSitBehavior();
            break;

        case "Special":
            playSpecialBehavior();
            break;

        case "Skill1":
            playSkill1Behavior();
            break;

        case "Skill2":
            playSkill2Behavior();
            break;

        case "Skill3":
            playSkill3Behavior();
            break;
        case "Die":
            playQuitAnimation();
            break;

    }
}

function playMoveBehavior() {

    currentBehavior = "Move";

    // Move animation belongs to base skeleton
    if (!activeCharacter.animations.includes("Move")) {
        setMode("base");
    }

    playAnimation(
        "Move",
        true
    );

    setTimeout(() => {

        const direction =
            chooseWalkDirection();

        walkPet(
            direction,
            Math.floor(Math.random() * 4) + 1
        );

        preferredDirection = null;

    }, 100);
}

function playSitBehavior() {
    currentBehavior = "Sit";

    stopWalking();

    playAnimation(
        "Sit",
        true
    );

    window.electronAPI.log("Sit animation started");

    const sitDuration =
        5000 + Math.random() * 5000;

    setTimeout(() => {
        if (currentBehavior !== "Sit") {
            return;
        }
        finishBehavior();

    }, sitDuration);
}

function playSpecialBehavior() {
    currentBehavior = "Special";

    stopWalking();

    const track = playAnimation(
        "Special",
        false
    );

    if (!track) {
        return;
    }

    track.listener = {
        complete: () => {
            if (currentBehavior !== "Special") {
                return;
            }
            finishBehavior();
        }
    };
}

function playPhasedSkill(
    behaviorName,
    beginAnimation,
    idleAnimation,
    endAnimation
) {

    currentBehavior = behaviorName;

    stopWalking();

    window.electronAPI.log(
        behaviorName + " Begin"
    );

    const beginTrack = playAnimation(
        beginAnimation,
        false
    );

    if (!beginTrack) {
        return;
    }

    beginTrack.listener = {
        complete: () => {

            window.electronAPI.log(
                behaviorName + " Idle"
            );

            playAnimation(
                idleAnimation,
                true
            );

            const idleDuration =
                5000 + Math.random() * 5000;


            setTimeout(() => {

                if (currentBehavior !== behaviorName) {
                    return;
                }

                window.electronAPI.log(
                    behaviorName + " End"
                );


                const endTrack = playAnimation(
                    endAnimation,
                    false
                );


                if (!endTrack) {
                    return;
                }


                endTrack.listener = {
                    complete: () => {
                        finishBehavior();
                    }
                };

            }, idleDuration);
        }
    };
}

function playSkill1Behavior() {

    currentBehavior = "Skill1";

    stopWalking();

    const beginTrack =
        playAnimation(
            "Skill_1_Begin",
            false
        );

    if (!beginTrack) {
        return;
    }


    beginTrack.listener = {
        complete: () => {

            playAnimation(
                "Skill_1_Idle",
                true
            );


            const idleDuration =
                5000 + Math.random() * 5000;


            setTimeout(() => {

                if (currentBehavior !== "Skill1") {
                    return;
                }


                window.electronAPI.log(
                    "Skill1 Reverse"
                );


                const reverseTrack =
                    playAnimationBackward(
                        "Skill_1_Begin"
                    );


                if (!reverseTrack) {
                    return;
                }

            }, idleDuration);
        }
    };
}


function playSkill2Behavior() {

    currentBehavior = "Skill2";
    skill2Down = false;

    stopWalking();

    const beginTrack = playAnimation(
        "Skill_2_Begin",
        false
    );

    if (!beginTrack) {
        return;
    }

    beginTrack.listener = {
        complete: () => {

            playAnimation(
                "Skill_2_Loop",
                true
            );

            const idleDuration =
                5000 + Math.random() * 5000;

            setTimeout(() => {

                if (currentBehavior !== "Skill2") {
                    return;
                }

                endSkill2();

            }, idleDuration);
        }
    };
}

function switchSkill2Mode() {

    if (currentBehavior !== "Skill2") {
        return;
    }

    skill2Down = !skill2Down;

    if (skill2Down) {

        playAnimation(
            "Skill_Down_2_Loop",
            true
        );

    }
    else {

        playAnimation(
            "Skill_2_Loop",
            true
        );

    }
}


function endSkill2() {

    const endAnimation = skill2Down
        ? "Skill_Down_2_End"
        : "Skill_2_End";


    const endTrack = playAnimation(
        endAnimation,
        false
    );


    if (!endTrack) {
        return;
    }


    endTrack.listener = {
        complete: () => {
            finishBehavior();
        }
    };
}

function playSkill3Behavior() {

    playPhasedSkill(
        "Skill3",
        "Skill_3_Begin",
        "Skill_3_Idle",
        "Skill_3_End"
    );

}

function playQuitAnimation() {

    stopWalking();

    currentBehavior = "Die";

    // Die animation only exists in normal skeleton
    if (currentMode !== "normal") {
        setMode("normal");
    }

    const track = playAnimation(
        "Die",
        false
    );

    if (!track) {
        window.electronAPI.confirmQuit();
        return;
    }

    track.listener = {
        complete: () => {
            window.electronAPI.confirmQuit();
        }
    };
}

function startRandomBehavior() {
    const baseBehaviors = [
        {
            name: "Special",
            chance: 1
        },
        {
            name: "Move",
            chance: 5
        },

        {
            name: "Skill3",
            chance: 1
        },
        {
            name: "Skill1",
            chance: 1
        },
        {
            name: "Skill2",
            chance: 1
        }
    ];


    const dockBehaviors = [
        {
            name: "Sit",
            chance: 2
        },
        {
            name: "Special",
            chance: 1
        },
        {
            name: "Move",
            chance: 5
        },

        {
            name: "Skill3",
            chance: 1
        },
        {
            name: "Skill1",
            chance: 1
        },
        {
            name: "Skill2",
            chance: 1
        }
    ];

    function scheduleNext() {
        const delay =
            // 5000;
            15000 + Math.random() * 25000;
        setTimeout(
            chooseBehavior,
            delay
        );
    }

    async function chooseBehavior() {
        const onDock = await isOnDock();
        let behaviors = onDock
            ? dockBehaviors
            : baseBehaviors;

        behaviors = behaviors.filter(
            behavior => {

                const owner =
                    behaviorSources[behavior.name];

                if (!owner) {
                    return false;
                }

                if (
                    owner !== "shared" &&
                    owner !== currentMode
                ) {
                    return false;
                }

                const requiredAnimations =
                    behaviorAnimations[behavior.name];

                if (!requiredAnimations) {
                    return false;
                }

                if (owner === "shared") {
                    return (
                        characters.base.animations.includes(requiredAnimations[0]) ||
                        characters.normal.animations.includes(requiredAnimations[0])
                    );
                }

                return requiredAnimations.every(
                    animation =>
                        characters[owner]
                            .animations
                            .includes(animation)
                );
            }
        );
        window.electronAPI.log(
            "Available behaviors: " +
            behaviors.map(b => b.name).join(", ")
        );
        if (behaviors.length === 0) {
            window.electronAPI.log(
                activeCharacter.type + " has no available behaviors"
            );

            scheduleNext();
            return;
        }

        const totalChance =
            behaviors.reduce(
                (sum, behavior) =>
                    sum + behavior.chance,
                0
            );

        const roll =
            Math.random() * totalChance;

        let total = 0;

        for (const behavior of behaviors) {

            total += behavior.chance;

            if (roll <= total) {

                window.electronAPI.log(
                    "Chosen behavior: " + behavior.name
                );

                playBehavior(
                    behavior.name
                );

                return;
            }
        }
    }
    scheduleNext();
}

function playInteract() {

    stopWalking();
    if (
        currentBehavior === "Skill2" &&
        currentMode === "normal"
    ) {
        switchSkill2Mode();
        return;
    }

    if (
        currentMode === "normal" &&
        currentBehavior === "Relax"
    ) {

        const attackAnimation =
            Math.random() < 0.5
                ? "Attack_1"
                : "Attack_2";

        const track = playAnimation(
            attackAnimation,
            false
        );

        if (!track) {
            return;
        }

        track.listener = {
            complete: () => {
                playIdle();
            }
        };

        return;
    }
    if (
        currentMode === "normal" &&
        interactAnimations[currentBehavior]
    ) {

        const attackAnimation =
            interactAnimations[currentBehavior];

        const track = playAnimation(
            attackAnimation,
            false
        );

        if (!track) {
            return;
        }

        track.listener = {
            complete: () => {
                let idleAni = activeCharacter.defaultIdle;
                if(currentBehavior === "Skill1"){
                    idleAni = "Skill_1_Idle";
                }
                else if(currentBehavior === "Skill3"){
                    idleAni = "Skill_3_Idle";
                }
                playAnimation(
                    idleAni,
                    true
                );
            }
        };

        return;
    }

    currentBehavior = "Interact";

    setMode("base");

    const track = playAnimation(
        "Interact",
        false
    );

    if (!track) {
        return;
    }

    track.listener = {
        complete: () => {
            finishBehavior();
        }
    };
}

function loadEverything() {

    const files = characterFiles[0];

    const atlas =
        assetManager.get(files.atlas);

    const atlasLoader =
        new spine.AtlasAttachmentLoader(atlas);

    const binary =
        assetManager.get(files.skel);

    const skeletonBinary =
        new spine.SkeletonBinary(atlasLoader);

    const skeletonData =
        skeletonBinary.readSkeletonData(binary);
    const firstCharacterData = skeletonData;

    const character1 =
        createCharacter(
            firstCharacterData
        );
    character1.type = "base";
    character1.defaultIdle = "Relax";
    character1.animations =
        firstCharacterData.animations.map(a => a.name);

    const secondData =
        loadCharacterData(
            characterFiles[1]
        );

    const character2 =
        createCharacter(
            secondData
        );

    character2.type = "normal";
    character2.defaultIdle = "Idle";
    character2.animations =
        secondData.animations.map(a => a.name);

    characters = {
        base: character1,
        normal: character2
    };
    setMode("normal");
    window.electronAPI.moveWindow(
        500,
        713
    );

    window.switchCharacter = function() {

        if (currentMode === "base") {
            setMode("normal");
        }
        else {
            setMode("base");
        }

        window.electronAPI.log(
            "switched to " + currentMode
        );
    };

    window.addEventListener(
        "keydown",
        (e) => {
            window.electronAPI.log(
                "key pressed = " + e.key
            );

            if (e.key.toLowerCase() === "c") {
                window.switchCharacter();
            }
        }
    );

    petHitbox.onclick = () => {
        playInteract();
    };

    window.electronAPI.onQuitRequest(() => {
        playQuitAnimation();
    });

    playStartAnimation();
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
    if (!activeCharacter)
        return;

    const now =
        Date.now() / 1000;
    const delta =
        now - lastTime;
    lastTime = now;
    activeCharacter.animationState.update(delta);
    const track = activeCharacter.animationState.tracks[0];

    if (
        track &&
        track.timeScale < 0 &&
        track.trackTime <= 0
    ) {

        // Clamp it
        track.trackTime = 0;

        // Let this frame stay visible
        track.timeScale = 0;

        setTimeout(() => {
            activeCharacter.animationState.clearTrack(0);
            finishBehavior();
        }, 50);
    }

    activeCharacter.animationState.apply(
        activeCharacter.skeleton
    );

    activeCharacter.skeleton.x = 420;
    activeCharacter.skeleton.y = 180;
    activeCharacter.skeleton.updateWorldTransform();

    activeCharacter.skeleton.getBounds(offset, size);

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


    context.gl.clearColor(
        0,
        0,
        0,
        0
    );

    context.gl.clear(
        context.gl.COLOR_BUFFER_BIT
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
    skeletonRenderer.premultipliedAlpha = true;

    skeletonRenderer.draw(
        batcher,
        activeCharacter.skeleton
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
