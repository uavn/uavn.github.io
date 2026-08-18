import { init, load, Sprite, SpriteSheet, GameLoop, TileEngine, Text, initInput, keyPressed } from 'kontra';
import './style.css';
import spriteSheet from './assets/world.png';
import worldSimple from './assets/world-simple.json';
//import worldHard from './assets/world-hard.json';

function buildWorldData (json) {
    return {
        width:30,
        height:30,
        tileheight:32,
        tilewidth:32,
        layers:[{
            data:json,
            height:30,
            width:30,
        }],
        tilesets:[{
            source:{
                columns:10,
                image:"world.png",
                imageheight:160,
                imagewidth:320,
                tilecount:50,
                tileheight:32,
                tilewidth:32,
            }
        }],
   };
};

let playerOnHorse,
timer, horse, steeringAngle, moveAngle, horseSpeed,
isDrifting,
driftPoints,
totalDriftPoints,
gameTime,
gameLevel,
texts;

const FRAME_WIDTH = 32;
const HORSE_FRAME_WIDTH = 28;
const HORSE_FRAME_HEIGHT = 80;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const ACTION_DISTANCE = 32;
const MAX_HORSE_SPEED = 3.01;
const MIN_DRIFT_SPEED = 1;
const HORSE_SPEED_STEP = 0.1;
const HORSE_TURN_STEP = 2;
const HORSE_SPEED_SLOWDOWN_STEP = 0.03;
const HORSE_SPEED_SLOWDOWN_DRIFT_MULTIPLIER = 4;
const DRIFT_WEIGHT = 0.01;
const MAX_DRIFT_ANGLE_PERCENT = 25;

const App = {
    generateMenu() {
        const levelsOptions = [
            'Simple',
            'Harder',
        ];

        let levelSelected = levelsOptions[0];

        const menu = document.createElement('div');
        menu.id = 'menu';
        menu.style.width = CANVAS_WIDTH + 'px';
        menu.style.height = CANVAS_HEIGHT + 'px';

        const h1 = document.createElement('h1');
        h1.innerText = 'Medieval Drift';
        menu.appendChild(h1);

        const result = document.createElement('div');
        result.id = 'menu-results';
        menu.appendChild(result);

        const div = document.createElement('div');
        div.id = 'menu-desc';

        const lines = [
            'Controls:',
            'W A S D - move',
            'E - use horse',
            'SPACE - start drift',
        ];

        lines.map(line => {
            const lDiv = document.createElement('div');
            lDiv.innerText = line;
            div.appendChild(lDiv);
        });

        menu.appendChild(div);

        const h2 = document.createElement('h2');
        h2.innerText = 'Choose Level';
        menu.appendChild(h2);

        const div2 = document.createElement('div');
        const levels = document.createElement('select');

        levelsOptions.map(opt => {
            const option = document.createElement('option');
            option.innerText = opt;
            option.value = opt;
            levels.appendChild(option);
        });

        levels.onchange = function(event) {
            levelSelected = event.target.value;
        };

        div2.appendChild(levels);
        menu.appendChild(div2);

        const startover = document.createElement('button');
        startover.innerText = 'Start Over';
        startover.classList.add('hidden');
        startover.onclick = function() {
            location.reload();
        };
        menu.appendChild(startover);

        const button = document.createElement('button');
        button.innerText = 'Start';
        button.onclick = function() {
            document.dispatchEvent(new CustomEvent('start-game', {
                detail: {
                    level: levelSelected,
                },
            }));

            menu.classList.add('hidden');
            h2.classList.add('hidden');
            div.classList.add('hidden');
            levels.classList.add('hidden');
            button.classList.add('hidden');
            startover.classList.remove('hidden');
        };
        menu.appendChild(button);

        document.body.appendChild(menu);
    },

    generateTexts(gameTime, horseSpeed, driftPoints, totalDriftPoints) {
        let textLines = [
            'Timeout: ' + gameTime + ' sec',
        ];

        if (horseSpeed) {
            textLines.push('Speed: ' + Math.round(horseSpeed * 100, 2));
        }

        if (driftPoints) {
            textLines.push('Points: ' + driftPoints);
        }

        if (totalDriftPoints) {
            textLines.push('Total Points: ' + totalDriftPoints);
        }

        return [
            Text({
                text: textLines.join('\n'),
                font: '18px Arial',
                color: 'white',
                x: CANVAS_WIDTH - 200,
                y: 10,
                anchor: {x: 0, y: 0},
                textAlign: 'left',
                lineHeight: 1.3,
            })
        ];
    },

    generateCanvas() {
        document.getElementsByTagName('canvas')?.[0]?.remove();

        const canvasElement = document.createElement('canvas');
        canvasElement.width = CANVAS_WIDTH; // Set your desired width
        canvasElement.height = CANVAS_HEIGHT; // Set your desired height
        document.body.appendChild(canvasElement);

        return canvasElement;
    },

    createPlayer(playerSpriteSheet) {
        return {
            sprite: Sprite({
                x: 32,
                y: 32,
                anchor: {x: 0.5, y: 0.5},
                animations: playerSpriteSheet.animations,
            }),
        };
    },
    createHorse(horseSpriteSheet) {
        return {
            sprite: Sprite({
                x: 32,
                y: 140,
                anchor: {x: 0.5, y: 0.5},
                animations: horseSpriteSheet.animations,
            }),
        };
    },
    async loadWorldResources(gameLevel) {
        let worldData = worldSimple;

        // if ('Harder' === gameLevel) {
            // worldData = worldHard;
        // } else if ('Hardest' === gameLevel) {
            // worldData = worldHarder;
        // }

        worldData = buildWorldData(worldData);

        return load(spriteSheet)
            .then(([image]) => {
                let tileEngine = TileEngine({
                    ...worldData,
                    tilesets: [{
                        firstgid: 1,
                        image,
                    }],
                });

                let playerSpriteSheet = SpriteSheet({
                    image,
                    frameWidth: FRAME_WIDTH,
                    frameHeight: FRAME_WIDTH,
                    animations: {
                        idle: {
                            frames: [30],
                            frameRate: 1,
                        },
                        walk: {
                            frames: [30, 31, 32, 33, 34],
                            frameRate: 7,
                            loop: true,
                        },
                        ride: {
                            frames: [35],
                            frameRate: 1,
                        },
                    },
                });

                let horseSpriteSheet = SpriteSheet({
                    image,
                    frameWidth: HORSE_FRAME_WIDTH,
                    frameHeight: HORSE_FRAME_HEIGHT,
                    animations: {
                        idle: {
                            frames: [0],
                            frameRate: 1,
                        },
                        walk: {
                            frames: [0, 1, 2, 3],
                            frameRate: 7,
                            loop: true,
                        },
                    },
                });

                return {tileEngine, playerSpriteSheet, horseSpriteSheet};
            });
    },
};

function debounce(func, timeout = 100) {
    if (timer) {
        clearTimeout(timer);
    }

    timer = setTimeout(func, timeout)
}

App.generateMenu();

document.addEventListener('start-game', (e) => {
    playerOnHorse = false;
    timer = null;
    horse = null;
    steeringAngle = 0;
    moveAngle = 0;
    horseSpeed = 0;
    isDrifting = false;
    driftPoints = 0;
    totalDriftPoints = 0;
    gameTime = 60;
    gameLevel = null;
    texts = [];

    gameLevel = e.detail.level;

    createWorld();
});

function createWorld() {
    let gameInterval = setInterval(() => {
        if (gameTime <= 0) {
            clearInterval(gameInterval);
        }

        if (playerOnHorse) {
            gameTime--;
            if (gameTime < 0) gameTime = 0;
        }

        if (gameTime <= 0) {
            stopDrift();

            document.dispatchEvent(new CustomEvent('stop-game', {
                detail: {
                    totalDriftPoints,
                },
            }));
        }
    }, 1000);

    function rotateShapes(shapes, angleDegrees) {
        for (let shape of shapes) {
            let angleRadians = angleDegrees * Math.PI / 180; // sin + cos require radians

            if (shape.rotation !== angleRadians) {
                shape.rotation = angleRadians;
            }
        }
    }

    function walk(shapes, angle, value) {
        const firstShape = shapes[0];
        const worldMatrix = firstShape.parent;
        const worldMatrixLayer = worldMatrix.layers[0];

        let aPlus = 0;

        if (180 !== angle) {
            const radiansB = (angle * Math.PI) / 180;
            aPlus = value * Math.sin(radiansB);
        }

        let bPlus = Math.sqrt(Math.abs(Math.pow(aPlus, 2) - Math.pow(value, 2)));

        let xPlus = 0;
        let yPlus = 0;

        if (angle > 0 && angle <= 90) {
            xPlus = aPlus;
            yPlus = -1 * bPlus;
        } else if (angle > 90 && angle <= 180) {
            xPlus = aPlus;
            yPlus = bPlus;
        } else if (angle > 180 && angle <= 270) {
            xPlus = aPlus;
            yPlus = bPlus;
        } else if ((angle > 270 && angle <= 360) || 0 === angle) {
            xPlus = aPlus;
            yPlus = -1 * bPlus;
        }

        const col = Math.ceil((firstShape.position.x + xPlus * firstShape.width / 2 + xPlus) / worldMatrix.tilewidth) - 1;
        const row = Math.ceil((firstShape.position.y + yPlus * firstShape.height / 2 + yPlus) / worldMatrix.tileheight) - 1;

        const cell = worldMatrixLayer.data[worldMatrixLayer.width * row + col];

        if (0 <= [18, 27, 28, 29, 38, 39, 47, 48, 49].indexOf(cell)) {
            for (let shape of shapes) {
                shape.position['x'] += xPlus;
                shape.position['y'] += yPlus;
            }
        } else {
            driftPoints = 0;
            horseSpeed = 0;
        }

        if (18 === cell) {
        }
    }

    function renderGameInfo() {
        texts = App.generateTexts(
            gameTime,
            horseSpeed,
            driftPoints,
            totalDriftPoints,
        );
    };

    function startDrift() {
        isDrifting = true;
        driftPoints = 0;
    };

    function stopDrift() {
        if (isDrifting && driftPoints) {
            totalDriftPoints += driftPoints;
        }

        isDrifting = false;
        moveAngle = steeringAngle;
        // steeringAngle = moveAngle;
        driftPoints = 0;
    };

    function calculateAngleDifference(a, b) {
        let diff = Math.abs(a - b);

        if (diff > 180) {
            diff = 360 - diff;
        }

        return diff;
    };

    function increaseDriftPoints() {
        if (driftPoints <= 10) {
            driftPoints += 1;
        } else if (driftPoints <= 20) {
            driftPoints += 5;
        } else if (driftPoints <= 30) {
            driftPoints += 10;
        } else if (driftPoints <= 50) {
            driftPoints += 20;
        } else if (driftPoints <= 100) {
            driftPoints += 50;
        } else {
            driftPoints += 100;
        }
    };

    document.addEventListener('stop-game', (e) => {
        gameLevel = null;
        menu.classList.remove('hidden');
        const resDiv = document.getElementById('menu-results');
        resDiv.innerText = 'Time out! Your result is: ' + e.detail.totalDriftPoints + ' points.';
    });

    const canvasElement = App.generateCanvas();
    let { canvas } = init();

    const worldPromise = App.loadWorldResources(gameLevel);

    renderGameInfo();

    worldPromise.then(({tileEngine, playerSpriteSheet, horseSpriteSheet}) => {
        initInput();
        let sx = 1;

        const horse1 = App.createHorse(horseSpriteSheet);
        tileEngine.add(horse1.sprite);

        const player = App.createPlayer(playerSpriteSheet);
        tileEngine.add(player.sprite);

        let loop = GameLoop({
            update: function() {
                if (!gameTime || !gameLevel) {
                    return false;
                }

                const cameraX = player.sprite.x - canvasElement.width / 2;
                const cameraY = player.sprite.y - canvasElement.height / 2;

                const maxCameraX = tileEngine.width * tileEngine.tilewidth - canvasElement.width;
                const maxCameraY = tileEngine.height * tileEngine.tileheight - canvasElement.height;
                tileEngine.sx = Math.min(Math.max(cameraX, 0), maxCameraX);
                tileEngine.sy = Math.min(Math.max(cameraY, 0), maxCameraY);

                player.sprite.update();
                horse1.sprite.update();

                let playerAnimation = playerOnHorse ? 'ride' : 'idle';
                let horseAnimation = 'idle';

                const left = keyPressed('arrowleft') || keyPressed('a');
                const right = keyPressed('arrowright') || keyPressed('d');
                const up = keyPressed('arrowup') || keyPressed('w');
                const down = keyPressed('arrowdown') || keyPressed('s');
                const action = keyPressed('e');
                const space = keyPressed('space');

                if (action) {
                    horseSpeed = 0;

                    const playerNearHorse1 =
                        Math.abs(player.sprite.position.x - horse1.sprite.position.x) < ACTION_DISTANCE &&
                        Math.abs(player.sprite.position.y - horse1.sprite.position.y) < ACTION_DISTANCE;

                    if (playerNearHorse1) {
                        horse = horse1;
                    }

                    if (playerNearHorse1) {
                        debounce(() => {
                            playerOnHorse = !playerOnHorse;

                            if (playerOnHorse) {
                                player.sprite.position = horse.sprite.position;
                                player.sprite.rotation = horse.sprite.rotation;
                            }
                        });
                    } else {
                        horse = null;
                    }
                }

                if (horseSpeed < MIN_DRIFT_SPEED || !playerOnHorse) {
                    stopDrift();
                }

                if (playerOnHorse && horseSpeed && space) {
                    startDrift();
                }

                if (left || right || up || down || horseSpeed) {
                    const movable = [player.sprite];

                    if (playerOnHorse && horse) {
                        horseAnimation = 'walk';
                        movable.push(horse.sprite);
                    } else {
                        playerAnimation = 'walk';
                    }

                    if (playerOnHorse) {
                        if (left) {
                            steeringAngle -= HORSE_TURN_STEP;

                            if (steeringAngle <= 0) {
                                steeringAngle += 360;
                            }
                        } else if (right) {
                            steeringAngle += HORSE_TURN_STEP;

                            if (steeringAngle >= 360) {
                                steeringAngle -= 360;
                            }
                        }

                        if (left || right || isDrifting) {
                            let elementAngle = steeringAngle;

                            if (isDrifting) {
                                let difference = calculateAngleDifference(steeringAngle, elementAngle);

                                if (difference > MAX_DRIFT_ANGLE_PERCENT) {
                                    difference = MAX_DRIFT_ANGLE_PERCENT;
                                }

                                elementAngle = steeringAngle + (difference / 3);
                            }

                            rotateShapes(movable, elementAngle);
                        }

                        if (up) {
                            horseSpeed = Math.min(horseSpeed + HORSE_SPEED_STEP, MAX_HORSE_SPEED);
                        } else if (down) {
                            horseSpeed = Math.max(horseSpeed - HORSE_SPEED_STEP, 0);
                            stopDrift();
                        }

                        if (horseSpeed) {
                            horseSpeed = Math.max(horseSpeed - (HORSE_SPEED_SLOWDOWN_STEP * (isDrifting ? HORSE_SPEED_SLOWDOWN_DRIFT_MULTIPLIER : 1)), 0);

                            if (isDrifting) {
                                let difference = calculateAngleDifference(steeringAngle, moveAngle);

                                if (difference > MAX_DRIFT_ANGLE_PERCENT) {
                                    difference = MAX_DRIFT_ANGLE_PERCENT;
                                }

                                moveAngle = (moveAngle + DRIFT_WEIGHT * difference) % 360;
                            } else {
                                moveAngle = steeringAngle;
                            }

                            if (moveAngle === steeringAngle) {
                                stopDrift();
                            }

                            walk(movable, moveAngle, horseSpeed);
                        }
                    } else {
                        if (left) {
                            rotateShapes(movable, 270);
                            walk(movable, 270, 1);
                        } else if (right) {
                            rotateShapes(movable, 90);
                            walk(movable, 90, 1);
                        } else if (up) {
                            rotateShapes(movable, 0);
                            walk(movable, 0, 1);
                        } else if (down) {
                            rotateShapes(movable, 180);
                            walk(movable, 180, 1);
                        }
                    }
                }

                player.sprite.playAnimation(playerAnimation);
                horse && horse.sprite.playAnimation(horseAnimation);

                if (isDrifting) {
                    increaseDriftPoints();
                }

                renderGameInfo();
            },
            render: function() {
                tileEngine.render();
                texts.map(text => text.render());
            }
        });

        loop.start();
    });
};
