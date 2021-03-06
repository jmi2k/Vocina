/** Class representing the player.
 * @extends Phaser.GameObjects.Sprite
 */
class Player extends Phaser.Physics.Arcade.Sprite {

    /**
     * Create the player.
     * @param {object} scene - scene creating the player.
     * @param {number} x - Start location x value.
     * @param {number} y - Start location y value.
     * @param {number} [frame] -
     */
    constructor(scene, x, y, frame) {
        super(scene, x, y, frame);

        this.scene = scene;
        this.matrix = this.scene.mapMatrix;
        this.posMatrix = this.scene.playerStartPosition; //Andy's position in the map

        //The scale of the player is relative to the map, and an extra substraction to make it a little bit smaller
        this.andyScale = this.scene.zoom;

        //The scale of the pixels the player has to go trhough have to be calculated based on the tileSize and on the andyScale, it has to be relative to the map.
        //Also, a one has to be added up to the result, just to ensure more exact positioning when moving the player
        this.tileSizeOfTheMovement = Math.trunc(this.scene.tileSize * this.andyScale) + 1;

        this.setScale(this.andyScale);

        this.collision = false;
        this.collisionWithoutMovement = false;
        this.scene.physics.world.enable(this);
        this.scene.add.existing(this);

        //Set the skins of the sprite
        this.setTexture('player');
        //this.setPosition(x, y);

        //Set collisions activation of the sprite
        this.body.setCollideWorldBounds(true);

        //On world bounds 
        this.body.onWorldBounds = true;
        this.scene.physics.world.on('worldbounds', this.onWorldBounds, this);
        this.collidingWorldBounds = false;

        //the hitbox is (height=tileHeight, width=tileWidth, x=andyX, y=andyY) (andyX & andyY both calculated in SceneDown)
        this.body.setSize(this.scene.tileSize, this.scene.tileSize);

        //With this offset calculation the hitbox is situtated right on the center of the sprite
        let bodyOffset = Math.trunc(this.scene.tileSize / 2);
        this.body.setOffset(bodyOffset, bodyOffset);

        this.direction = null;
        this.target = new Phaser.Math.Vector2();

        // Boolean to control if the player cant move
        this.andyIsMoving = false;
        this.numberMov = 0;

        /* Load rotateTo plugin from SceneDown */
        this.rotateTo = this.scene.plugins.get('rexrotatetoplugin').add(this, {
            speed: 360
        });
        console.log(' -- Loaded rotateTo plugin');

        /*ANIMATIONS*/

        createAnimationsPlayer(scene);

        //Queue to stock moves
        this.andyMovesQueue = new Queue();

        // this.x = x;
        // this.y = y;
    }

    /*FUNCTIONS TO USE BY USER*/

    /**
     * Console method to put the values of a new target (To the right) into the queue
     * @param {number} numberOfMovs - The number of right moves
     */
    moverDerecha(numberOfMovs) {
        this.move(numberOfMovs, 'right');
    }

    /**
     * Console method to put the values of a new target (To the left) into the queue
     * @param {number} numberOfMovs - The number of left moves
     */
    moverIzquierda(numberOfMovs) {
        this.move(numberOfMovs, 'left');
    }

    /**
     * Console method to put the values of a new target (To move it down) into the queue
     * @param {number} numberOfMovs - The number of down moves
     */
    moverAbajo(numberOfMovs) {
        this.move(numberOfMovs, 'down');
    }

    /**
     * Console method to put the values of a new target (To move it up) into the queue
     * @param {number} numberOfMovs - The number of up moves
     */
    moverArriba(numberOfMovs) {
        this.move(numberOfMovs, 'up');
    }

    move(numberOfMovs, direction) {
        numberOfMovs = this.matrixMovement(numberOfMovs, direction);

        let OFFSETS = {
            'up':    [ 0, -1],
            'down':  [ 0,  1],
            'left':  [-1,  0],
            'right': [ 1,  0],
        };

        let [xOff, yOff] = OFFSETS[direction];

        if (numberOfMovs != 0) {
            this.targetAux = new Phaser.Math.Vector2();
            if (this.andyMovesQueue.length == 0) { //If it's empty it's target it's calculated as usually
                this.targetAux.x = this.x + xOff * this.tileSizeOfTheMovement * numberOfMovs;
                this.targetAux.y = this.y + yOff * this.tileSizeOfTheMovement * numberOfMovs;
            } else { //If it's with movements inside already it has to take the last target and calculate the next one based on that one
                this.targetAux.x = this.andyMovesQueue.last().x + xOff * this.tileSizeOfTheMovement * numberOfMovs;
                this.targetAux.y = this.andyMovesQueue.last().y + yOff * this.tileSizeOfTheMovement * numberOfMovs;
            }
            this.targetAux.dir = direction;
            this.andyMovesQueue.enqueue(this.targetAux);
        } else {
            this.collisionWithoutMovement = true;
        }
    }

    // MATRIX MOVE

    matrixMovement(numberOfMovs, direction) {

        if(numberOfMovs > 0){
            // Map bounds collision
            let boundCollision = false;

            for (let i = 0; i < numberOfMovs; i++) {
                switch (direction) {
                    case 'up':
                        if(this.posMatrix[1] == 0)
                            boundCollision = true;
                        else
                            this.posMatrix[1]--;
                        break;

                    case 'down':
                        if(this.posMatrix[1] == 9)
                            boundCollision = true;
                        else
                            this.posMatrix[1]++;
                        break;

                    case 'right':
                        if(this.posMatrix[0] == 9)
                            boundCollision = true;
                        else
                            this.posMatrix[0]++;
                        break;

                    case 'left':
                        if(this.posMatrix[0] == 0)
                            boundCollision = true;
                        else
                            this.posMatrix[0]--;
                        break;
                }
                this.actualPos = this.matrix[this.posMatrix[0] + this.posMatrix[1] * 10];

                //console.log(this.posMatrix[0] + "---" + this.posMatrix[1] + "---    " + this.actualPos);
                //console.log(this.posMatrix);

                if (this.actualPos === -1 || boundCollision) {
                    numberOfMovs = i;
                    //this.collision = true;
                    if (numberOfMovs == 0)
                        this.collisionWithoutMovement = true;
                    break;
                }
            }
        } else {
            console.log("Este valor no vale perro");
            numberOfMovs = 0;   //Provisional
        }

        return numberOfMovs;
    }

    // MOVING

    /**
     * Method to finally move the player
     * @param {string} dir - The move's direction
     */
    moving(dir) {
        //Take the first target in the queue
        this.targetAux = this.andyMovesQueue.dequeue();
        this.target.x = this.targetAux.x;
        this.target.y = this.targetAux.y;

        this.direction = dir;
        this.playerRotation = dir;
        this.animationName = "chicoCamina";
        this.startAnimation();

        //Rotate the player before moving
        let angle;
        switch (this.direction) {
            case 'right':
                angle = 90;
                break;
            case 'left':
                angle = 270;
                break;
            case 'down':
                angle = 180;
                break;
            case 'up':
                angle = 360;
                break;
        }
        this.rotateTo.rotateTo(angle);

        //30 means that the sprite goes as fast as 30pixels per second (Is the value of this.body.speed)
        this.scene.physics.moveToObject(this, this.targetAux, 60);
    }

    /*OTHER FUNCTIONS*/

    /**
     * Set player position in the map with a x and y
     * @param {number} x X position in the matrix
     * @param {number} y Y position in the matrix
     */
    setPlayerPosition(xPos, yPos) {
        this.posMatrix[0] = xPos;
        this.posMatrix[1] = yPos;

        let tileSize = this.scene.tileSize;
        this.x = (this.scene.wallSize + tileSize / 2 + tileSize * xPos) * this.scene.zoom;
        this.y = (this.scene.wallSize + tileSize / 2 + tileSize * yPos) * this.scene.zoom;
    }

    getPlayerPosition() {
        return [...this.posMatrix];
    }

    /**
     * Set player rotation to a specifies direction
     * @param {string} direction Represent the player direction
     */
    setPlayerRotation(direction){
        this.playerRotation = direction;
        
        switch (direction) {
            case 'right':
                this.setAngle(90);
                break;
            case 'left':
                this.setAngle(270);
                break;
            case 'down':
                this.setAngle(180);
                break;
            case 'up':
                this.setAngle(360);
                break;
        }
    }

    getPlayerRotation() {
        return this.playerRotation;
    }

    /**
     * Change the level. Only use by teachers
     * @param {number} password - Password to go to the next level 
     * @param {number} level - What level are you going to change
     */
    level(password, level) {
        if (password == 1234)
            this.scene.scene.get('MainScene').nextLevel(level);
    }

    /**
     * Turn the animation in 'this.animationName' on
     */
    startAnimation() {
        this.anims.play(this.animationName, true);

        //Play walk sound
        this.walk = this.scene.sound.add('walk');
        this.walk.play();
    }

    /**
     * Stop the animation from running, freezing it at its current frame
     */
    stopAnimation() {
        this.anims.stop();

        //Stop walk sound
        this.walk.stop();
    }

    /**
     * TODO
     */
    onWorldBounds() {
        this.collidingWorldBounds = true;
    }

    /**
     * Before scene update. All player logic
     * @param {number} time 
     * @param {number} delta 
     */
    preUpdate(time, delta) {
        super.preUpdate(time, delta);

        //Light follow the player. Light configuration ONLY in level one to activate the lantern
        if(this.scene.lightOn)
            this.scene.light.setPosition(this.x, this.y);

        // Player movement control, when condition it's true, player is moving and condition can't be trespassed
        if (!this.andyMovesQueue.length == 0 && !this.andyIsMoving) {
            this.andyIsMoving = true;
            //Check the direction variable in the last queue element
            let dir = this.andyMovesQueue.peek().dir;
            this.moving(dir);
        }

        // standing
        let currentDirection = this.direction;
        if (this.direction === 'left')
            currentDirection = 'right';
        //account for flipped sprite
        this.animationName = 'stand-' + currentDirection;

        //Distance between andy and the point will reach
        let distance = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);

        if (this.body.speed > 0) {
            //If the sprite reaches one point stored in the queue means that didn't reach the goal tile (checked in a
            //event in the 'SceneDown' class)
            
            if (distance < 0.1) {
                this.body.reset(this.target.x, this.target.y);
                this.stopAnimation();

                //Restart the movement control
                this.andyIsMoving = false;

                // When the move stop
                if (this.andyMovesQueue.length == 0){
                    this.scene.stateMachine.next();
                }
            }
        } else if (this.collisionWithoutMovement) { //If andy tries to move towards a wall that's in (Is not going to be moving)
            console.log("Hola");
            this.gameOver = this.scene.sound.add('gameOver');
            this.gameOver.play();

            this.collisionWithoutMovement = false;

            this.scene.stateMachine.next();
        }
    }
}