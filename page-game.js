import * as THREE from 'three';

/********************************s
 * RESPONSIVE BOUNCY 3D
 *
 * 
 */


// Should the resize functions run once as part of update()
let is_resize = false; 

// Is the game restarting, used on the initial start as well 
let is_game_restart = true; 

// Is the game on the viewport enough to be active
let is_game_on_viewport = true; 

// Is this the first time for update()
let is_first_update = false; 

// Should game be paused, happens on update()
let is_pause = false; 

// Has the start button been clicked
let has_game_started = false; 

// Holds width and height of last screen sizes
let screen_last_size = [window.innerWidth, window.innerHeight]; 

// Compensate on y axis to change perspective on 3d platforms
let platform_landscape_ball_compensate = -9;


/********************************s
 * GAME
 */

var game;
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


class playGame extends Phaser.Scene {

    // Variables to store platform 3D mesh
    geometry_3D_platform = false;
    material_3D_platform = false;
    mesh_3D_platform = false;

    // Audio markers
    audio_markers = [

        { name: 'track_1', start: 0, duration: 16, config: { volume: 0.5, loop: true } },
        { name: 'track_2', start: 16, duration: 16, config: { volume: 0.5, loop: true } },
        { name: 'track_3', start: 32, duration: 16, config: { volume: 0.5, loop: true } },
        { name: 'track_4', start: 48, duration: 16, config: { volume: 0.5, loop: true } },
        { name: 'track_5', start: 64, duration: 16, config: { volume: 0.5, loop: true } },
        { name: 'bounce', start: 98, duration: 1, config: { seek: 0.5, volume: 0.5 } },
        { name: 'fall', start: 102, duration: 1, config: { volume: 0.5 } }
    ];

    // Store background music loop number
    audio_marker_counter = 0;

    constructor(){

        super({
            key: 'PlayGame'
        });

    }

    preload(){
        
        // Load plugin for mobile gestures events
        this.load.scenePlugin('rexgesturesplugin', 'rexgesturesplugin.min.js', 'rexGestures', 'rexGestures');

        // Load SVG for simple shapes
        this.load.svg("ball", "ball.svg", {width: 50, height: 50});
        this.load.svg("ground", "ground.svg", {width: 64, height: 20});
        
        // Load audio tracks
        this.load.audio('sfx', [
            'ball-game-tracks.ogg',
            'ball-game-tracks.mp3'
        ], {
            //instances: 4
        });

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
    create3DWorld() {

        //* threejs
        
        // variables to store canvas width and height
        var width = this.sys.game.canvas.width;
        var height = this.sys.game.canvas.height;

        this.threeScene = new THREE.Scene();

        // create the renderer
        this.renderer3D = new THREE.WebGLRenderer({
            canvas: this.sys.game.canvas,
            context: this.sys.game.context,
            antialias: true,
            premultipliedAlpha: true,
            logarithmicDepthBuffer: true
        });
        
        //  We don't want three.js to wipe our gl context!
        this.renderer3D.autoClear = false;

        // enable shadows
        this.renderer3D.shadowMap.enabled = true;
        this.renderer3D.shadowMap.type = THREE.PCFSoftShadowMap;

        // add a soft, white ambient light
        const ambient_light = new THREE.AmbientLight(0xffffff, 2);
        this.threeScene.add(ambient_light);
 
        // add a bright, white spotlight, learn more at https://threejs.org/docs/#api/en/lights/SpotLight
        const spot_light = new THREE.SpotLight(
            0xffffff,  // color
            5, //intensity 
            0, // distance
            0.4, // angle
            0.05, //penumbra, 
            0.1 //decay
        );
        spot_light.position.set(0, 250, 80);

        // enable the spotlight to cast shadow
        spot_light.castShadow = true;
        spot_light.shadow.mapSize.width = width;
        spot_light.shadow.mapSize.height = height;
        spot_light.shadow.camera.near = 1;
        spot_light.shadow.camera.far = 1000;

        // add spotlight to 3D scene
        this.threeScene.add(spot_light);

        // add a camera
        this.camera3D  = new THREE.PerspectiveCamera(25, null, 0.1, 1000);
        this.camera3D.position.set(50 , 145, 80);//80 real
        this.camera3D.lookAt(20, 25, -10);

        // create an Extern Phaser game object
        const view = this.add.extern();
      
        // custom renderer
        // next line is needed to avoid TypeScript errors
        // @ts-expect-error
        view.render = () => {

            // this is needed
            this.renderer3D.state.reset();
            
            // Is this a game restart after loosing
            if(is_game_restart) {

                // Trigger resize positing
                is_resize = true;

                // Finish game restart variable
                is_game_restart = false; 

            }

            // Render 
            this.renderer3D.render(this.threeScene, this.camera3D);
            
            // You may need this if you see rendering problems. This demo doesn't need it
            //this.renderer3D.state.reset();
        
        };   

        return this.threeScene;

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
        this.ball.setBounce(0.8);

    }

    // method to create the 3D ball
    add3DBall(){

        // Create sphere
        const geometry = new THREE.SphereGeometry(
            this.ball.displayWidth / 2 * gameOptions.gameScale, // radius
            32, //widthSegments
            16, //heightSegments
        );

        // Create material
        let material = new THREE.MeshBasicMaterial({color: 0x98ffff}); 

        // Mesh
        this.ball3D = new THREE.Mesh(geometry, material);
        
        // set the ball to cast a shadow
        this.ball3D.position.set(0,0,0);

        // set the ball to cast a shadow
        this.ball3D.castShadow = true;

        // Add ball to scene
        this.threeScene.add(this.ball3D);


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
        var screen_height = this.sys.game.canvas.height; 
        return Phaser.Math.Between(screen_height * gameOptions.platformHeightRange[1], screen_height * gameOptions.platformHeightRange[0]);
    }

    add2DPlatform(){

        // set platform X position
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
    add3DPlatform(platform2D) { 

        let platform3D;

        if( this.geometry_3D_platform && this.material_3D_platform && this.mesh_3D_platform ) {

            // Clone mesh is more efficient that recreating
            //https://stackoverflow.com/questions/24931070/display-several-times-the-same-3d-object-with-three-js
            platform3D = this.mesh_3D_platform.clone();
            
        } else {

            // Create Mesh
            let geometry = this.geometry_3D_platform = new THREE.BoxGeometry(1, 20, 20);
            let material = this.material_3D_platform = new THREE.MeshStandardMaterial(); 
            platform3D = this.mesh_3D_platform = new THREE.Mesh(geometry, material);

        }

        // create shape
        platform3D.position.set(0, 0, 0);

        // platform will receive shadows
        platform3D.receiveShadow = true;

        // scale the 3D platform to make it match 2D platform size
        platform3D.scale.x = platform2D.displayWidth * gameOptions.gameScale;

        // add to scene
        this.threeScene.add(platform3D);

        // return object
        return platform3D;

    }

    // method to add the score, just a dynamic text
    addScore() {

        this.score = 0;
        this.topScore = localStorage.getItem(gameOptions.localStorageName) == null ? 0 : localStorage.getItem(gameOptions.localStorageName);
        this.scoreText = this.add.text(10, 10, "--");
        this.scoreText.setStyle({
            fontSize: '25px',
            fontFamily: 'comictansregular',
            color: '#211b16',
            lineHeight: '30pt',
            align: 'left',
        });

    }

    // method to update the score
    updateScore(inc){

        this.score += inc;
        this.scoreText.text = "Puntos: " + this.score + "\nRecord: " + this.topScore;

        // is is a multiple of 15, advance loop
        if(this.score % 15 == 0) {

            // Play sounds fx
            this.sound.stopAll();
            this.audio_marker_counter = this.audio_marker_counter == 4 ? 0 : this.audio_marker_counter+1;
            this.sound.play('sfx', this.audio_markers[this.audio_marker_counter]);

        }

    }

    // listeners to make platforms move and stop
    addListeners(){

        this.input.on("pointerdown", function(){

            // Move forward if game started
            if(has_game_started)
                this.platformGroup.setVelocityX(-gameOptions.platformSpeed);

        }, this);

        this.input.on("pointerup", function(){
            this.platformGroup.setVelocityX(0);
        }, this);

        // Swipe event
        this.swipeInput = this.rexGestures.add.swipe({ velocityThreshold: 1000 })
        .on('swipe', function (swipe) {
            
            // If swipe is down
            if( swipe.down ) {
                is_pause = true; 
            }

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

    // Used to run the update function just once
    manual_update() {
        this.update();
    }

    // Resume game 
    resume_game() {
        this.scene.resume("PlayGame");  
        this.sound.resumeAll();
    }

    // Pause game 
    pause_game() {
        if( ! this.scene.isPaused("PlayGame") ) {
            this.scene.pause();   
            this.sound.pauseAll(); 
        }
    }

    // method to be executed at each frame
    update(time, delta){

        var platform_new_y;
        
        // Only use collide if not resizing
        if(!is_resize) {
            
            // collision management ball Vs platforms
            this.physics.world.collide(this.platformGroup, this.ball, function(platform, ball) {

                // bounce back the ball
                this.ball.body.velocity.y = -gameOptions.bounceVelocity;

                // Play sounds fx
                if(has_game_started)
                    this.sound.play('sfx', this.audio_markers[5]);

            }, null, this);

        } 
        // Run resize
        else {

            // Set up resize

            this.sys.game.canvas.width = window.innerWidth; 
            this.sys.game.canvas.height = window.innerHeight; 

        }
        var plat_counter = 0;

        // loop through all platforms
        this.platformGroup.getChildren().forEach(function(platform) {

            plat_counter++;

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
                platform.platform3D.position.y = (this.sys.game.canvas.height - platform.y) * gameOptions.gameScale;

            } 

            // If the screen is resizing, update each plaform
            if(is_resize) {

                // Update 2d platform y position
                var past_height = (platform.y / screen_last_size[1]) * 100;
                platform_new_y = (past_height/100) * this.sys.game.canvas.height;
                platform.y = platform_new_y;

                // Redefine y of 3D platform
                var past_height_3d = (platform.y - 40 / screen_last_size[1]) * 100; 
                platform.platform3D.position.y = (this.sys.game.canvas.height - platform.y) * gameOptions.gameScale;

            } 

            // adjust 3D platform x position
            platform.platform3D.position.x = platform.x * gameOptions.gameScale;

        }, this);

        if(is_resize) {

            // Reset ball to top to avoid loosing the game
            this.ball.y = 0;
            
            // Pause game while resizing
            this.pause_game();

            // Store screen size
            screen_last_size = [window.innerWidth, window.innerHeight];

            // Resize camera
            this.camera3D.aspect = this.sys.game.canvas.width / this.sys.game.canvas.height;
            this.camera3D.updateProjectionMatrix();

            // Resize 3d viewport
            this.renderer3D.setViewport(0, 0, window.innerWidth,window.innerHeight);

            // Update scene 2D rendering
            this.scene.scene.scale.resize(this.sys.game.canvas.width, this.sys.game.canvas.height);
            this.scene.scene.scale.displaySize.resize(this.sys.game.canvas.width, this.sys.game.canvas.height);

            // Update scrollTrigger rendering
            ScrollTrigger.refresh();

            // For some reason setting these styles help with the correct resizing of <canvas>
            this.sys.game.canvas.style.width = "";
            this.sys.game.canvas.style.height = "";

        }

        // if 2D ball falls down the screen...
        if(this.ball.y > this.sys.game.canvas.height){

            // Play/restart sounds fx
            this.sound.stopAll();
            this.sound.play('sfx', this.audio_markers[6]);
            this.sound.play('sfx', this.audio_markers[0]);
            this.audio_marker_counter = 0;

            // manage best score
            localStorage.setItem(gameOptions.localStorageName, Math.max(this.score, this.topScore));

            // restart the game
            is_game_restart = true;
            this.scene.start("PlayGame");

        }
        
        // Reposition ball 3D
        var ball3d_y = (this.sys.game.canvas.height - this.ball.y) * gameOptions.gameScale;
        this.ball3D.position.y = (ball3d_y - platform_landscape_ball_compensate) ;
        this.ball3D.position.x = this.ball.x * gameOptions.gameScale;

        // Called manually because customUpdate is set true for physics on game config
        if( ! this.scene.isPaused("PlayGame") )
            this.physics.world.update(time, delta);
       
        // Al resizing functions done

        // Pause game if requested
        if( is_pause ) {
            
            // Pause if game is off viewport and is not in the midst of a resize
            if ( ! is_game_on_viewport && ! is_resize  ) {
                this.pause_game();  
            } 

            // Reset is_pause
            is_pause = false; 

        } 

        // No pause requested however the game on viewport and paused, resume
        else if( ! is_pause && this.scene.isPaused("PlayGame") && is_game_on_viewport ) {
            this.resume_game();
        } 

        // is_resize is requested while game is in viewport
        else if( is_resize && is_game_on_viewport ) {
            // Resume game normally after resizing
            this.resume_game();
        }

        // Reset resize variables
        is_resize = false;
        is_pause = false; 

    }    

}



/********************************s
 * GSAP
 */

// use a script tag or an external JS file
document.addEventListener("DOMContentLoaded", (event) => {


    const my_game_canvas = document.getElementById('game-canvas');

    const context_creation_config = {
        alpha: false,
        depth: true, // allow the use of depth
        antialias: true,
        premultipliedAlpha: false,
        stencil: true,
        preserveDrawingBuffer: false,
        failIfMajorPerformanceCaveat: false,
        powerPreference: 'default'
    };
    const my_game_context = my_game_canvas.getContext('webgl1', context_creation_config);


    // Phaser game config

    let gameConfig = {
        type: Phaser.WEBGL,
        backgroundColor:0xffffb3,
        antialias: true,
        scale: {
            // Scaling is handled independently
            mode: Phaser.Scale.NO_SCALE,
            parent: "thegame",
            width: window.innerWidth,
            height: window.innerHeight,
        },
        physics: {
            default: "arcade",
            arcade: {
                // Physics is manually updated
                customUpdate: true
            }
        },
        audio: {
            disableWebAudio: false
        },
        scene: playGame,
        context: my_game_context,
        canvas: my_game_canvas,
    }
    game = new Phaser.Game(gameConfig);
    window.games = game;
    window.focus();

    // gsap code here!
    
    // Enable ScrollTrigger
    gsap.registerPlugin(ScrollTrigger);
    
    // Turn on to lock web address bar on mobile browsers
    ScrollTrigger.normalizeScroll(true);

    // Game intro screen
    gsap.to("#intro", {
        opacity: 1,
        duration: 1
    });

    // Start button events
    var btn_start = document.getElementById("btn_start"), 
        intro = document.getElementById("intro");
        
    btn_start.addEventListener("click", function(e) {
        
        // Hide intro panel
        intro.style.display = "none";
        
        // Resume game
        game.scene.resume("PlayGame");
        
        // Game started variable update
        has_game_started = true;

        // Play sound
        game.sound.play('sfx', game.scene.scenes[0].audio_markers[0]);

    });

    // Responsive Gsap
    // Unused in this demo but left here for reference, for more advanced projects you'll probably need it
    // let mm = gsap.matchMedia();
    // mm.add("(min-width: 400px)", () => {});
        
    // Set game container animations and listeners for GSAP
    gsap.to(".panel:not(:last-child)", {

        yPercent: -100, 
        ease: "none",
        stagger: 0.5,
        scrollTrigger: {
            trigger: "#container",
            start: "top top",
            end: () => "+=100%",
            scrub: true,
            pin: true, 
            //markers: true, // for testing
            onUpdate: (self) => {

                // Store update values
                var progress = self.progress.toFixed(3),
                    direction = self.direction; 

                if(progress >= 0.25 && direction == 1 && ! game.scene.isPaused("PlayGame")) {
                    
                    // Game panel is off viewport

                    // Set values for off viewport and pause
                    is_game_on_viewport = false;
                    is_pause = true; 
                
                } else if(progress <= 0.2 && direction == -1 && game.scene.isPaused("PlayGame")) {
                    
                    // Game panel is on viewport
                    
                    // Set values for on viewport and resume
                    is_game_on_viewport = true;
                    is_pause = false; 
                    game.scene.resume("PlayGame"); 
                    game.sound.resumeAll();  
                    
                }
                
            }
        }
    });

    // Asign correct z-index to panels
    gsap.set(".panel", {zIndex: (i, target, targets) => targets.length - i});


    // Throttler, for optimized resizing

    var throttler_timeout;

    function throttler( callback ) {

      // ignore resize events as long as an actualResizeHandler execution is in the queue
      if ( !throttler_timeout ) {
         throttler_timeout = setTimeout(function() {

            throttler_timeout = null;
            callback();

         // Execution interval
         }, 500);
      }

    }

    // Window Resize functions 

    function resize(e) {

        // Check if game is initiated and is paused
        if(game && game.scene.isPaused("PlayGame")) {
            
            // Resize while game is paused
            is_resize = true;       
            game.scene.scenes[0].manual_update();

        } else {

            // Resize while game is playing
            is_resize = true;       
        }

    };

    // Resize event listener
    window.addEventListener("resize", function() {
      throttler(resize);  
    }, false);


});
