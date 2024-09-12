/*WebFontConfig = {
  custom: {
    families: ['chumley_ixiregular', 'rooneysansregular', 'rooneysansbold'],
    urls: ['fonts.css']
  },
  active: function() {
    console.log("active");
    if(this.scoreText)
      this.scoreText.setFont('chumley_ixiregular');
  },
  
  loading: function() {},
  active: function() {},
  inactive: function() {},
  fontloading: function(familyName, fvd) {},
  fontactive: function(familyName, fvd) {},
  fontinactive: function(familyName, fvd) {}
  
};
//*/





/********************************s
 * GAME
 */


let game;
let gameOptions = {

    // ball gravity
    ballGravity: 1200,

    // bounce velocity when the ball hits a platform
    bounceVelocity: 800,

    // ball start x position, 0 = left; 1 = right
    ballStartXPosition: 0.2,

    // amount of platforms to be created and recycled
    platformAmount: 10,

    // platform speed, in pixels per second
    platformSpeed: 650,

    // min and max distance range between platforms
    platformDistanceRange: [250, 450],

    // min and max platform height, , 0 = top of the screen; 1 = bottom of the screen
    platformHeightRange: [0.5, 0.8],

    // min and max platform length
    platformLengthRange: [40, 160],

    // local storage name where to save best scores
    localStorageName: "bestballscore3d",

    // game scale between 2D and 3D
    gameScale: 0.1 
}

let is_resize = false; // Is the screen resizing at the moment
let has_first_load = false; // Is this the first start
let screen_last_size = [];
screen_last_size.push([window.innerWidth, window.innerHeight]);
let is_landscape = window.innerWidth > window.innerHeight ? true : false; 
let platform_landscape_compensate = is_landscape ? 0 : 0;
let platform_landscape_ball_compensate = is_landscape ? -9 : -9;

// Throttler 

var throttler_timeout;

function throttler( callback ) {

  // ignore resize events as long as an actualResizeHandler execution is in the queue
  if ( !throttler_timeout ) {
     throttler_timeout = setTimeout(function() {

        throttler_timeout = null;
        callback();

     // Execution interval
     }, 250);
  }

}

// Window Resize functions 

function resize(e) {
  is_resize = true;
};

window.addEventListener("resize", function() {
  throttler(resize);  
}, false);



class playGame extends Phaser.Scene{
    constructor(){
        super("PlayGame");
    }
    preload(){
        this.load.image("ground", "ground.png");
        this.load.image("ball", "ball.png");
        
    }
    create() {

        // method to create the 3D world
        this.create3DWorld();

        // method to add the 2D ball
        this.add2DBall();

        // method to add the 3D ball
        this.add3DBall();

        // method to add platforms
        this.addPlatforms();

        // method to add score
        this.addScore();

        // method to add game listeners
        this.addListeners();

    }

    // method to create the 3D world
    create3DWorld(){

        // 3D world creation
        this.phaser3D = new Phaser3D(this, {

            // camera fov, learn more at https://threejsfundamentals.org/threejs/lessons/threejs-cameras.html
            fov: 25,
            //*
            // camera x, y and z position
            x: 50,
            y: 145,
            z: 80
            //*/

        });

        // point the camera at a x, y, z coordinate
        this.phaser3D.camera.lookAt(20, 25, -10);
        //this.phaser3D.camera.rotation.z = 0.3;

        // enable shadows
        this.phaser3D.enableShadows();

        // enable gamma correction, learn more at https://en.wikipedia.org/wiki/Gamma_correction
        this.phaser3D.enableGamma();

        // add a soft, white ambient light
        this.phaser3D.add.ambientLight({
            color: 0xffffff,
            intensity: 1.5
        });

        // add a bright, white spotlight, learn more at https://threejs.org/docs/#api/en/lights/SpotLight
        let spotlight = this.phaser3D.add.spotLight({
            color: 0xffffff,
            intensity: 1,
            angle: 0.4,
            decay: 0.1,
            x: 0,
            y: 250,
            z: 80
        });

        // enable the spotlight to cast shadow
        this.phaser3D.setShadow(spotlight);
    }


    // method to create the 2D ball
    add2DBall(){

        // this is just the good old Arcade physics body creation
        this.ball = this.physics.add.sprite(this.sys.game.canvas.width * gameOptions.ballStartXPosition, 0, "ball");

        // set ball gravity
        this.ball.body.gravity.y = gameOptions.ballGravity;

        // we are only checking for collisions on the bottom of the ball
        this.ball.body.checkCollision.down = true;
        this.ball.body.checkCollision.up = false;
        this.ball.body.checkCollision.left = false;
        this.ball.body.checkCollision.right = false;

        // modify a bit the collision shape to make the game more kind with players
        this.ball.setSize(30, 50, true);
    }

    // method to create the 3D ball
    add3DBall(){

        // create a red sphere
        this.ball3D = this.phaser3D.add.sphere({
            radius: this.ball.displayWidth / 2 * gameOptions.gameScale,
            widthSegments: 64,
            heightSegments: 64,
            //color: 0xf50087, pink
            color: 0x98ffff,
            x: 0,
            y: 0,
            z: 0,
        });

        this.ball3D.renderOrder = 200;
        // set the ball to cast a shadow
        this.phaser3D.castShadow(this.ball3D);

    }

    // method to add platforms
    addPlatforms(){

        // creation of a physics group containing all platforms
        this.platformGroup = this.physics.add.group();

        // let's proceed with the creation
        for(let i = 0; i < gameOptions.platformAmount; i++){

            this.add2DPlatform();
        }
    }

    // method to set a random platform X position
    setPlatformX(){
        return this.getRightmostPlatform() + Phaser.Math.Between(gameOptions.platformDistanceRange[0], gameOptions.platformDistanceRange[1]);
    }

    // method to set a random platform Y position
    setPlatformY(){
        
        var screen_orientation = this.get_screen_orientation();

        // Accounts for aspect ratios, but need to test more. Comment line before this to test. 
        var screen_height = this.sys.game.canvas.height,
            screen_width = this.sys.game.canvas.width; 
        
        // Portrait view
        if(screen_orientation == "portrait") {
            return Phaser.Math.Between(screen_height * gameOptions.platformHeightRange[0], screen_height * gameOptions.platformHeightRange[1]);
        } 
        // Landscape view
        else if( screen_orientation == "landscape" ) {
            return Phaser.Math.Between( screen_height * gameOptions.platformHeightRange[1], screen_height * gameOptions.platformHeightRange[0] );
        }

    }

    add2DPlatform(){

        // st platform X position
        let platformX = (this.getRightmostPlatform() == 0) ? this.ball.x : this.setPlatformX();

        // create 2D platform
        let platform = this.platformGroup.create(platformX, this.setPlatformY(), "ground");

        // set platform registration point
        platform.setOrigin(0.5, 1);

        // platform won't move no matter how many hits it gets
        platform.setImmovable(true);

        // set a random platform width
        platform.displayWidth = Phaser.Math.Between(gameOptions.platformLengthRange[0], gameOptions.platformLengthRange[1]);

        // add 3D platform as a 2D platform property
        platform.platform3D = this.add3DPlatform(platform);

    }

    // method to add a 3D platform, the argument is the 2D platform
    add3DPlatform(platform2D){

        // create a  box
        let platform3D = this.phaser3D.add.box({
            width: 1,
            height: 20,
            depth: 20,
            color: 0xffFFFF,
            x: 0,
            y: (this.sys.game.canvas.height - platform2D.y) * gameOptions.gameScale + platform_landscape_compensate,
            z: 0
        });
        
        // platform will receive shadows
        this.phaser3D.receiveShadow(platform3D);

        // scale the 3D platform to make it match 2D platform size
        platform3D.scale.x = platform2D.displayWidth * gameOptions.gameScale;

        return platform3D;

    }

    // method to add the score, just a dynamic text
    addScore(){
        this.score = 0;
        this.topScore = localStorage.getItem(gameOptions.localStorageName) == null ? 0 : localStorage.getItem(gameOptions.localStorageName);
        this.scoreText = this.add.text(10, 10, "--");
        this.scoreText.setStyle({
            fontSize: '20px',
            fontFamily: 'chumley_ixiregular',
            color: '#211b16',
            align: 'left',
            letterSpacing: '10px',
        });

    }

    // method to update the score
    updateScore(inc){
        this.score += inc;
        this.scoreText.text = "Score: " + this.score + "\nBest: " + this.topScore;
    }

    // listeners to make platforms move and stop
    addListeners(){

        this.input.on("pointerdown", function(){
            this.platformGroup.setVelocityX(-gameOptions.platformSpeed);
        }, this);
        this.input.on("pointerup", function(){
            this.platformGroup.setVelocityX(0);
        }, this);

    }

    // method to get the rightmost platform
    getRightmostPlatform(){
        let rightmostPlatform = 0;
        this.platformGroup.getChildren().forEach(function(platform){
            rightmostPlatform = Math.max(rightmostPlatform, platform.x);
        });
        return rightmostPlatform;
    }

    // method to be executed at each frame
    update(){

        var platform_new_y;

        if(!is_resize) {
            
            // collision management ball Vs platforms
            this.physics.world.collide(this.platformGroup, this.ball, function(){
                // bounce back the ball
                this.ball.body.velocity.y = -gameOptions.bounceVelocity;
            }, null, this);

        }
        

        if(is_resize) {

            this.ball.y = 0;
            this.scene.pause();

            // Get last screen values
            var last_screen = screen_last_size[screen_last_size.length - 1];

            var screen_last_height = last_screen[1],
                screen_last_width = last_screen[0];

            //console.log("screen_last_height " + screen_last_height + " screen_last_width: " + screen_last_width);
            this.ball.setSize(30, 50, true);

        }


        var first_plat_position = false;
        // loop through all platforms
        this.platformGroup.getChildren().forEach(function(platform){

            // if the platform leaves the screen to the left...
            if(platform.getBounds().right < -100){

                // increase the score
                this.updateScore(1);

                // recycle the platform moving it to a new position
                platform.x = this.setPlatformX();
                platform.y = this.setPlatformY();

                // set new platform width
                platform.displayWidth = Phaser.Math.Between(gameOptions.platformLengthRange[0], gameOptions.platformLengthRange[1]);

                // adjust 3D platform scale and y position
                platform.platform3D.scale.x = platform.displayWidth * gameOptions.gameScale;
                
                platform.platform3D.position.y = (this.sys.game.canvas.height - platform.y) * gameOptions.gameScale + platform_landscape_compensate;


            } 

            // If the screen is resizing, update each plaform
            if(is_resize) {

                
                // Calculate percentage of positioning for ball, and platform
                // Reapply
                
                //console.log(game.config);
                game.config.height = this.sys.game.canvas.height;

                // Redefine height of 2D platform

                var past_height = (platform.y / screen_last_height) * 100;
                platform_new_y = (past_height/100) * this.sys.game.canvas.height;
                platform.y = platform_new_y;


                // Redefine y of 3D platform

                var past_height_3d = (platform.y - 40 / screen_last_height) * 100; 
                platform.platform3D.position.y = (this.sys.game.canvas.height - platform.y) * gameOptions.gameScale + platform_landscape_compensate;

            } 

            // adjust 3D platform x position
            platform.platform3D.position.x = platform.x * gameOptions.gameScale ;

        }, this);

        if(is_resize) {

            console.log("is_resize ");
            screen_last_size.push( [window.innerWidth, window.innerHeight] );

                
//game.resize();

            // Reset ball to top to avoid loosing the game
            //this.ball.y = 0;
            
            this.phaser3D.camera.aspect = this.sys.game.canvas.width / this.sys.game.canvas.height;
            
            // point the camera at a x, y, z coordinate
            this.phaser3D.camera.updateProjectionMatrix();

            //this.phaser3D.renderer.setSize(this.sys.game.canvas.width,this.sys.game.canvas.height);
            this.phaser3D.renderer.setViewport(0, 0, this.sys.game.canvas.width,this.sys.game.canvas.height);

            //this.phaser3D.renderer.resetState();
            this.phaser3D.renderer.render(this.phaser3D.scene, this.phaser3D.camera);

        }


        // if 2D ball falls down the screen...
        if(this.ball.y > this.sys.game.canvas.height){

            // manage best score
            localStorage.setItem(gameOptions.localStorageName, Math.max(this.score, this.topScore));

            // restart the game
            this.scene.start("PlayGame");

        }
        
        var width = window.innerWidth, height = window.innerHeight;        
        var ball3d_y = (this.sys.game.canvas.height - this.ball.y) * gameOptions.gameScale;
        
        this.ball3D.position.y = (ball3d_y - platform_landscape_ball_compensate) ;
        this.ball3D.position.x = this.ball.x * gameOptions.gameScale;

        // Al resizing functions done, reset resize
        if(is_resize) {
            this.scene.resume("PlayGame");
        }
        is_resize = false;

        if(!has_first_load) {
            this.scene.pause();   
            has_first_load = true; 
        }

    }

    get_screen_orientation() {

        // Accounts for aspect ratios, but need to test more. Comment line before this to test. 
        var screen_height = this.sys.game.canvas.height,
            screen_width = this.sys.game.canvas.width; 
        
        // Portrait view
        if(screen_height > screen_width) {
            return "portrait";
        } 
        // Landscape view
        else if( screen_width > screen_height ) {
            return "landscape";
        }

    }

    

}



/********************************s
 * GSAP
 */

// use a script tag or an external JS file
document.addEventListener("DOMContentLoaded", (event) => {
   
    gsap.registerPlugin(ScrollTrigger)
    // gsap code here!

    let gameConfig = {
        type: Phaser.AUTO,
        //backgroundColor:0x87ceeb,
        transparent: true,
        antialias: true,
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            parent: "thegame",
        },
        physics: {
            default: "arcade"
        },
        scene: playGame
    }
    game = new Phaser.Game(gameConfig);
    window.focus();



    


    game.scene.pause("PlayGame");

    //this.scene.start("PlayGame");

    gsap.to("#intro", {
        opacity: 1,
        duration: 1
    });

    var btn_start = document.getElementById("btn_start"), 
        intro = document.getElementById("intro");
        
    btn_start.addEventListener("click", function(e) {
        intro.style.display = "none";
        game.scene.resume("PlayGame");
    });

});



