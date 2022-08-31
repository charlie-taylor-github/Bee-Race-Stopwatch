// import { Scene } from './scene.js';
// import { Race } from './race.js';

export class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    area() {
        return this.x * this.y;
    }

    sumOf(vectorA, vectorB) {
        return new Vector2(vectorA.x + vectorB.x, vectorA.y + vectorB.y);
    }

    productOf(vectorA, vectorB) {
        return new Vector2(vectorA.x * vectorB.x, vectorA.y * vectorB.y);
    }

    setToProductWith(value) {
        this.x *= value;
        this.y *= value;
    }
}

export class InputHandler {
    constructor() {
        this.keys = [];

        window.addEventListener('keydown', e => {        
            if (this.keys.indexOf(e.key) === -1) {
                this.keys.push(e.key);
            }
        });

        window.addEventListener('keyup', e => {
            this.keys.splice(this.keys.indexOf(e.key), 1);
        });
    }
}

export class Scene {
    constructor(canvas, fps=60, font='80px Arial') {
        this.canvas = canvas;
        this.size = new Vector2(canvas.width, canvas.height);
        this.ctx = canvas.getContext('2d');
        this.fps = fps;
        this.frameInterval = 1 / fps;
        this.font = font;
        this.mainCamera = new Camera(this, new Vector2(0, 0));
        this.input = new InputHandler();
    }

    run(updateFunction) {
        let now;
        let then = Date.now();
        let interval = 1000 / this.fps;
        let delta;
        let ctx = this.ctx;
        let size = this.size;

        function animate() {
            requestAnimationFrame(animate);
            now = Date.now();
            delta = now - then;
            if (delta > interval) {
                then = now - (delta % interval);
                ctx.clearRect(0, 0, size.x, size.y);
                updateFunction(ctx);
            }
        }
        animate();
    }
}


export class Object {
    constructor(scene, position, collider=null, fixed=false) {
        this.scene = scene;
        this.position = position;
        this.velocity = new Vector2(0, 0);
        this.acceleration = new Vector2(0, 0);
        this.collider = collider;
        this.fixed = fixed;
    }

    updateKinematics() {
        this.velocity.x += this.acceleration.x * this.scene.frameInterval;
        this.velocity.y += this.acceleration.y * this.scene.frameInterval;
        this.position.x += this.velocity.x * this.scene.frameInterval;
        this.position.y += this.velocity.y * this.scene.frameInterval;
    }

    adjustForColliders(objects) {
        if (this.collider == null || this.fixed) {
            return;
        }

        let filteredObjects = objects.slice();
        if (filteredObjects.includes(this)) {
            filteredObjects.splice(filteredObjects.indexOf(this), 1);
        }

        for (const object of filteredObjects) {
            const objCol = object.collider;
            const thisCol = this.collider;
            if (objCol) {
                const objPos = object.position;
                const thisPos = this.position;
                const objColPos = new Vector2(objPos.x + objCol.relativePos.x, objPos.y + objCol.relativePos.y);
                const thisColPos = new Vector2(thisPos.x + thisCol.relativePos.x, thisPos.y + thisCol.relativePos.y);
                
                const alignTop = (thisColPos.y + thisCol.size.y) >= (objColPos.y + objCol.size.y) && thisColPos.y <= (objColPos.y + objCol.size.y);
                const alignBottom = (thisColPos.y + thisCol.size.y) >= objColPos.y && thisColPos.y <= objColPos.y;
                const alignLeft = (thisColPos.x + thisCol.size.x) >= (objColPos.x + objCol.size.x) && thisColPos.x <= (objColPos.x + objCol.size.x);
                const alignRight = (thisColPos.x + thisCol.size.x) >= objColPos.x && thisColPos.x <= objColPos.x;

                if (alignLeft || alignRight) {
                    const distance = objColPos.x - thisColPos.x;
                    if (objColPos.x >= thisColPos.x && objColPos.x <= thisColPos.x + thisCol.size.x) {
                        this.position.x -= thisCol.size.x - distance;
                    }
                    if (thisColPos.x >= objColPos.x && thisColPos.x <= objColPos.x + objCol.size.x) {
                        this.position.x += thisCol.size.x + distance;
                    }
                }
                if (alignTop || alignBottom) {
                    const distance = objColPos.y - thisColPos.y;
                    if (objColPos.y > thisColPos.y && objColPos.y < thisColPos.y + thisCol.size.y) {
                        this.position.y -= thisCol.size.y - distance;
                    }
                    if (thisColPos.y > objColPos.y && thisColPos.y < objColPos.y + objCol.size.y) {
                        this.position.y += thisCol.size.y + distance;
                    }
                }
                
            }
        }
    }

    standardPosition(height) {
        return new Vector2(this.position.x, this.scene.size.y - this.position.y - height);
    }
}


export class Camera extends Object{
    constructor(scene, position, scale) {
        super(scene, position);
        this.scale = scale;
    }

}

export class Collider {
    constructor(relativePos, size) {
        this.relativePos = relativePos;
        this.size = size;
    }
}

export class Race {
    constructor(scene, duration) {
        this.scene = scene;
        this.scene.mainCamera = new Camera(this.scene, new Vector2(0, 0), 1);
        this.duration = duration;
        this.objects = [new Background(this), new Line(this, 100), new Line(this, 2200)];
        this.winnerIndex = this.getWinnerIndex();
        this.bees = this.getNewBees(this.winnerIndex);

        this.active = false;
    }

    update(ctx) {
        if (this.active) {
            this.timeSinceRaceStarted += this.scene.frameInterval;
            if (this.timeSinceRaceStarted >= this.duration) {
                this.scene.mainCamera.velocity.x = 0;
    
                for (const bee of this.bees) {
                    bee.velocity.x = 0;
                }
            }
        }
        
        // Updating Objects
        for (const object of this.objects) {
            object.update();
        }
        for (const bee of this.bees) {
            bee.update();
        }
        for (const object of this.objects) {
            object.draw(ctx, this.scene.mainCamera);
        }
        for (const bee of this.bees) {
            bee.draw(ctx, this.scene.mainCamera);
        }
        for (const object of this.objects) {
            object.updateKinematics();
        }
        for (const bee of this.bees) {
            bee.updateKinematics();
        }
        this.scene.mainCamera.updateKinematics();
        this.draw(ctx);
    }

    getNewBees(winnerIndex) {
        let bees = [];
        for (let i = 1; i <= 5; i++) {
            const yPosition = (i * 12.5) + ((i-1) * 85);
            bees.push(new Bee(this, i == winnerIndex, new Vector2(100, yPosition)));
        }
        return bees;
    }

    getWinnerIndex() {
        return Math.floor(Math.random() * 5) + 1;
    }

    start() {
        this.scene.mainCamera.position.x = 0;
        this.bees = this.getNewBees(this.getWinnerIndex());
        this.active = true;
        this.timeSinceRaceStarted = 0;
        this.scene.mainCamera.velocity.x = 1300 / this.duration;

        for (const bee of this.bees) {
            bee.reset();
        }
    }

    draw(ctx) {
        const camera = this.scene.mainCamera;
        const flagIMG = new Image();
        flagIMG.src = 'assets/racing-flag.png';
        ctx.drawImage(
            flagIMG, 2100 - camera.position.x, 
            10 - camera.position.y, 
            100 * camera.scale, 100 * camera.scale);
    }
}

class Background extends Object {
    constructor(race) {
        super(race.scene, new Vector2(0, 0));
        this.race = race;
        this.size = new Vector2(2500, this.race.scene.size.y);
        this.img = new Image();
        this.img.src = 'assets/background.jpg'; 
    }

    update() {
    }

    draw(ctx, camera) {
        ctx.drawImage(
            this.img, this.position.x - camera.position.x, 
            this.position.y - camera.position.y, 
            this.size.x * camera.scale, this.size.y * camera.scale);
    }
}

class Line extends Object {
    constructor(race, x) {
        super(race.scene, new Vector2(x, 0));
        this.size = new Vector2(10, race.scene.size.y);
        this.race = race;
    }

    update() {
    }

    draw(ctx, camera) {
        ctx.fillStyle = 'white';
        ctx.fillRect(
            this.position.x - camera.position.x, 
            this.position.y - camera.position.y, 
            this.size.x * camera.scale, 
            this.size.y * camera.scale);
    }
}

export class Bee extends Object{
    constructor(race, winner, position) {
        console.log('new bee');
        super(race.scene, position);
        this.startPosition = position;
        this.winner = winner;
        this.race = race;
        this.currentKeyFrame = 1;
        this.size = new Vector2(85, 85);

        this.animationSpeed = 0.09;
        this.timeSinceFlap = 0;

        this.perfectXVelocity = 2100 / this.race.duration
        this.movementData = this.getMovementData();
    }

    update() {
        this.timeSinceFlap += this.race.scene.frameInterval;
        this.timeSinceInterval += this.race.scene.frameInterval;

        // Set Velocity
        let lowerTimeBound = 0;
        for (const movementDatum of this.movementData) {
            let upperTimeBound = movementDatum['t'];
            if (this.race.timeSinceRaceStarted >= lowerTimeBound && this.race.timeSinceRaceStarted <= upperTimeBound) {
                this.velocity.x = movementDatum['v'];
            }
            lowerTimeBound = movementDatum['t'];
        }


        if (this.timeSinceFlap >= this.animationSpeed) {
            this.currentKeyFrame = this.currentKeyFrame % 4;
            this.currentKeyFrame++;
            this.timeSinceFlap = 0;
        }
    }

    draw(ctx, camera) {
        const img = new Image();
        img.src = 'assets/flying_keyframes/' + this.currentKeyFrame.toString() + '.png';
        ctx.drawImage(
            img, this.standardPosition(this.size.y).x - camera.position.x, 
            this.standardPosition(this.size.y).y - camera.position.y, 
            this.size.x * camera.scale, this.size.y * camera.scale);
        
        ctx.font = '48px serif';
        ctx.fillStyle = 'white';
        ctx.fillText(5-this.race.bees.indexOf(this), this.standardPosition(this.size.y).x - camera.position.x - 50, this.standardPosition(this.size.y).y - camera.position.y + 70);
    }

    getPerfectPositionAtTime(time) {
        return time * (2200 / this.race.duration);
    }

    getMovementData() {
        const velocityChangesNo = this.race.duration;
        let movementData = [];
        let remainingDistance = 1900 - (500*Math.random());
        if (this.winner) {
            remainingDistance = 2100;
        }
        let remainingTime = this.race.duration;
        for (let i = 0; i < velocityChangesNo - 1; i++) {
            let v = (Math.random()+0.5) * this.perfectXVelocity;
            let t = Math.random() + 0.5;

            if (remainingDistance - (v*t) < 0) {
                v = remainingDistance*t/2;
            }
            if (remainingTime - t < 0) {
                t = remainingTime / 2;
            }            
            remainingDistance -= v * t;
            remainingTime -= t;
            movementData.push({'v': v, 't': this.race.duration - remainingTime});
        }
        const v = remainingDistance / remainingTime;
        const t = remainingTime;
        remainingDistance -= v * t;
        remainingTime -= t;
        movementData.push({'v': v, 't': this.race.duration - remainingTime});
        return movementData;
    }

    reset() {
        console.log(this.startPosition);
        this.perfectXVelocity = 2100 / this.race.duration
        this.movementData = this.getMovementData();
        this.position = this.startPosition;
    }
}

window.addEventListener('load', function(){
    const canvas = document.getElementById('canvas');
    canvas.width = 1000;
    canvas.height = 500;
    const scene = new Scene(canvas, 60);
    const race = new Race(scene, 5);
    scene.run((ctx) => {
        race.update(ctx);
    });

    this.document.getElementById('start').addEventListener('click', function() {
        const hrs = parseInt(document.getElementById('h2').value + document.getElementById('h1').value);
        const mins = parseInt(document.getElementById('m2').value + document.getElementById('m1').value);
        const secs = parseInt(document.getElementById('s2').value + document.getElementById('s1').value);
        const totalSecs = (hrs*3600) + (mins*60) + secs;
        race.duration = totalSecs;
        race.start();
    });
});
