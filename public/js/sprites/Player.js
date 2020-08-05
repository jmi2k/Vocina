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
        this.posMatrix = this.scene.playerStartPosition;    //Andy's position in the map

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
        this.setPosition(x, y);

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

        this.light = this.scene.light;
    }

    /*FUNCTIONS TO USE BY USER*/

    //To delete
    /**Turn on game light and raspberry LED*/
    turnOnLED() {
        raspiWrite('LED', 1);
        this.scene.setLight(true);
    }

    //To delete
    /**Turn off game light and raspberry LED*/
    turnOffLED() {
        raspiWrite('LED', 0);
        this.scene.setLight(false);
    }

    /**
     * Console method to put the values of a new target (To the right) into the queue
     * @param {number} numberOfMovs - The number of right moves
     */
    moveRight(numberOfMovs) {
        if (!this.collision) {
            for (let i = 0; i < numberOfMovs; i++) {
                this.posMatrix[0]++;
                this.actualPos = this.matrix[this.posMatrix[0] + this.posMatrix[1] * 10];
                if (this.actualPos === -1) {
                    numberOfMovs = i;
                    this.collision = true;
                    if(numberOfMovs == 0)
                        this.collisionWithoutMovement = true;
                    break;
                } else if (this.actualPos === 0 || this.actualPos === 1) {
                    this.scene.arrivedGoal = false;
                } else if (this.actualPos === 2) {
                    this.scene.arrivedGoal = true;
                    console.log("Has llegado al final del nivel!");
                } else if (this.actualPos >= 3) {
                    this.scene.arrivedSublevel = true;
                    this.scene.lastSublevelMatrixPositionFirst = this.posMatrix[0];
                    this.scene.lastSublevelMatrixPositionSecond = this.posMatrix[1];
                    console.log("Subnivel conseguido");
                }
            }

            if (numberOfMovs != 0) {
                this.targetAux = new Phaser.Math.Vector2();
                if (this.andyMovesQueue.isEmpty()) { //If it's empty it's target it's calculated as usually
                    this.targetAux.x = this.x + this.tileSizeOfTheMovement * numberOfMovs;
                    this.targetAux.y = this.y;
                } else { //If it's with movements inside already it has to take the last target and calculate the next one based on that one
                    this.targetAux.x = this.andyMovesQueue.last().x + this.tileSizeOfTheMovement * numberOfMovs;
                    this.targetAux.y = this.andyMovesQueue.last().y;
                }
                this.targetAux.dir = 'right';
                this.andyMovesQueue.enqueue(this.targetAux);
            }
        }
    }

    /**
     * Console method to put the values of a new target (To the left) into the queue
     * @param {number} numberOfMovs - The number of left moves
     */
    moveLeft(numberOfMovs) {
        if (!this.collision) {
            for (let i = 0; i < numberOfMovs; i++) {
                this.posMatrix[0]--;
                this.actualPos = this.matrix[this.posMatrix[0] + this.posMatrix[1] * 10];
                if (this.actualPos === -1) {
                    numberOfMovs = i;
                    this.collision = true;
                    if(numberOfMovs == 0)
                        this.collisionWithoutMovement = true;
                    break;
                } else if (this.actualPos === 0 || this.actualPos === 1) {
                    this.scene.arrivedGoal = false;
                } else if (this.actualPos === 2) {
                    this.scene.arrivedGoal = true;
                    console.log("Has llegado al final del nivel!")
                } else if (this.actualPos >= 3) {
                    this.scene.arrivedSublevel = true;
                    this.scene.lastSublevelMatrixPositionFirst = this.posMatrix[0];
                    this.scene.lastSublevelMatrixPositionSecond = this.posMatrix[1];
                    console.log("Subnivel conseguido");
                }

            }

            if (numberOfMovs != 0) {
                this.targetAux = new Phaser.Math.Vector2();
                if (this.andyMovesQueue.isEmpty()) { //If it's empty it's target it's calculated as usually
                    this.targetAux.x = this.x - this.tileSizeOfTheMovement * numberOfMovs;
                    this.targetAux.y = this.y;
                } else { //If it's with movements inside already it has to take the last target and calculate the next one based on that one
                    this.targetAux.x = this.andyMovesQueue.last().x - this.tileSizeOfTheMovement * numberOfMovs;
                    this.targetAux.y = this.andyMovesQueue.last().y;
                }
                this.targetAux.dir = 'left';
                this.andyMovesQueue.enqueue(this.targetAux);
            }
        }
    }

    /**
     * Console method to put the values of a new target (To move it down) into the queue
     * @param {number} numberOfMovs - The number of down moves
     */
    moveDown(numberOfMovs) {
        if (!this.collision) {
            for (let i = 0; i < numberOfMovs; i++) {
                this.posMatrix[1]++;
                this.actualPos = this.matrix[this.posMatrix[0] + this.posMatrix[1] * 10];
                if (this.actualPos === -1) {
                    numberOfMovs = i;
                    this.collision = true;
                    if(numberOfMovs == 0)
                        this.collisionWithoutMovement = true;                    
                    break;
                } else if (this.actualPos === 0 || this.actualPos === 1) {
                    this.scene.arrivedGoal = false;
                } else if (this.actualPos === 2) {
                    this.scene.arrivedGoal = true;
                    console.log("Has llegado al final del nivel!")
                } else if (this.actualPos >= 3) {
                    this.scene.arrivedSublevel = true;
                    this.scene.lastSublevelMatrixPositionFirst = this.posMatrix[0];
                    this.scene.lastSublevelMatrixPositionSecond = this.posMatrix[1];
                    console.log("Subnivel conseguido");
                }
            }

            if (numberOfMovs != 0) {
                this.targetAux = new Phaser.Math.Vector2();
                if (this.andyMovesQueue.isEmpty()) { //If it's empty it's target it's calculated as usually
                    this.targetAux.x = this.x;
                    this.targetAux.y = this.y + this.tileSizeOfTheMovement * numberOfMovs;
                } else { //If it's with movements inside already it has to take the last target and calculate the next one based on that one
                    this.targetAux.x = this.andyMovesQueue.last().x;
                    this.targetAux.y = this.andyMovesQueue.last().y + this.tileSizeOfTheMovement * numberOfMovs;
                }
                this.targetAux.dir = 'down';
                this.andyMovesQueue.enqueue(this.targetAux);
            }
        }
    }

    /**
     * Console method to put the values of a new target (To move it up) into the queue
     * @param {number} numberOfMovs - The number of up moves
     */
    moveUp(numberOfMovs) {
        if (!this.collision) {
            for (let i = 0; i < numberOfMovs; i++) {
                this.posMatrix[1]--;
                this.actualPos = this.matrix[this.posMatrix[0] + this.posMatrix[1] * 10];
                if (this.actualPos === -1) {
                    numberOfMovs = i;
                    this.collision = true;
                    if(numberOfMovs == 0)
                        this.collisionWithoutMovement = true;
                    break;
                } else if (this.actualPos === 0 || this.actualPos === 1) {
                    this.scene.arrivedGoal = false;
                } else if (this.actualPos === 2) {
                    this.scene.arrivedGoal = true;
                    console.log("Has llegado al final del nivel!")
                } else if (this.actualPos >= 3) {
                    this.scene.arrivedSublevel = true;
                    this.scene.lastSublevelMatrixPositionFirst = this.posMatrix[0];
                    this.scene.lastSublevelMatrixPositionSecond = this.posMatrix[1];
                    console.log("Subnivel conseguido");
                }
            }

            if (numberOfMovs != 0) {
                this.targetAux = new Phaser.Math.Vector2();
                if (this.andyMovesQueue.isEmpty()) { //If it's empty it's target it's calculated as usually
                    this.targetAux.x = this.x;
                    this.targetAux.y = this.y - this.tileSizeOfTheMovement * numberOfMovs;
                } else { //If it's with movements inside already it has to take the last target and calculate the next one based on that one
                    this.targetAux.x = this.andyMovesQueue.last().x;
                    this.targetAux.y = this.andyMovesQueue.last().y - this.tileSizeOfTheMovement * numberOfMovs;
                }
                this.targetAux.dir = 'up';
                this.andyMovesQueue.enqueue(this.targetAux);
            }
        }
    }

    // MOVING

    /**
     * Method to finally move the player
     * @param {string} dir - The move's direction
     */
    moving(dir) {
        //Take the first target in the queue
        this.targetAux = this.andyMovesQueue.first();
        this.target.x = this.targetAux.x;
        this.target.y = this.targetAux.y;

        this.direction = dir;
        this.animationName = "chicoCamina";
        this.startAnimation();

        //Rotate the player before moving
        switch (this.direction) {
            case 'right':
                this.rotateTo.rotateTo(90);
                break;
            case 'left':
                this.rotateTo.rotateTo(270);
                break;
            case 'down':
                this.rotateTo.rotateTo(180);
                break;
            case 'up':
                this.rotateTo.rotateTo(360);
                break;
        }

        //30 means that the sprite goes as fast as 30pixels per second (Is the value of this.body.speed)
        this.scene.physics.moveToObject(this, this.andyMovesQueue.dequeue(), 60);
    }

    /*OTHER FUNCTIONS*/

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

        //Light follow the player
        //this.light.setPosition(this.x, this.y);

        // Player movement control, when condition it's true, player is moving and condition can't be trespassed
        if (!this.andyMovesQueue.isEmpty() && !this.andyIsMoving) {
            this.andyIsMoving = true;
            //Check the direction variable in the last queue element
            let dir = this.andyMovesQueue.first().dir;
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
  
            //If collides a world bound (Bounds manually callculated in SceneDown class, based on the wall size)
            if(this.x < this.scene.leftBound || this.x > this.scene.rightBound 
               || this.y > this.scene.bottomBound || this.y < this.scene.upperBound){
                this.stopAnimation();
                console.log(this.x+' '+this.y)
                this.body.reset(this.x, this.y);
                this.scene.andyDidntArriveTheGoal();
            }
            
            //If the sprite reaches one point stored in the queue means that didn't reach the goal tile (checked in a
            //event in the 'SceneDown' class)

            if (distance < 0.1) {
                this.body.reset(this.target.x, this.target.y);
                this.stopAnimation();

                //Restart the movement control
                this.andyIsMoving = false;

                if (this.andyMovesQueue.isEmpty() && this.scene.arrivedSublevel) {
                    this.sublevelAchieved = this.scene.sound.add('sublevelAchieved');
                    this.sublevelAchieved.play();
                    
                    this.scene.andyCompletesSublevel(this.actualPos);
                    this.scene.lastLevelCompleted = this.actualPos;
                    this.scene.arrivedSublevel = false;
                } 
                //If the sprite reaches the last point in the queue and that point isn't the GOAL then reset that andy has NOT reached
                else if (this.andyMovesQueue.isEmpty() && !this.scene.arrivedGoal) {
                    this.gameOver = this.scene.sound.add('gameOver');
                    this.gameOver.play();
                    
                    this.scene.andyDidntArriveTheGoal();
                } //If the sprite reaches the last point in the queue and that point is the GOAL then reset that andy HAS reached
                else if (this.andyMovesQueue.isEmpty() && this.scene.arrivedGoal) {
                    this.levelAchieved = this.scene.sound.add('levelAchieved');
                    this.levelAchieved.play();
                    
                    this.scene.levelUp(this.scene.scene.get('MainScene').level);
                } //If reaches the last point in the queue and collides a bound then didn't reach the GOAL
                else if (this.andyMovesQueue.isEmpty() && this.collision) { 
                    this.gameOver = this.scene.sound.add('gameOver');
                    this.gameOver.play();
                    
                    this.scene.andyDidntArriveTheGoal();
                }
            }
        } else if (this.collisionWithoutMovement) { //If andy tries to move towards a wall that's in (Is not going to be moving)
            console.log("Hola");
            this.gameOver = this.scene.sound.add('gameOver');
            this.gameOver.play();
            
            this.collisionWithoutMovement = false;
            this.scene.andyDidntArriveTheGoal();
        }
    }
}