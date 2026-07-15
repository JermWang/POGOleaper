// ===== POGO LEAP - MAIN GAME ENGINE =====

/**
 * Main Game Engine
 * Coordinates all game systems and manages the game loop
 * Designed for 60fps performance on mobile devices
 */

class PogoLeapGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.gameState = 'waiting'; // waiting, playing, paused, gameOver
        this.lastFrameTime = 0;
        // Consistent 60fps for smooth gameplay
        this.targetFPS = 60; // Always 60fps for best performance
        this.frameInterval = 1000 / this.targetFPS;
        
        // Game objects
        this.player = null;
        this.platforms = [];
        this.particles = [];
        this.camera = { 
            y: 0, 
            maxY: 0,
            zoom: 1.0  // Normal zoom - using larger assets instead for better gameplay feel
        };
        
        // Power-up system
        this.powerups = [];
        this.activePowerups = new Map(); // Track active power-up effects
        
        // Game state
        this._score = 0; // Private score variable
        this.bestScore = 0;
        this.gameStartY = 0;
        this.isGameRunning = false;
        this.isPaused = false;
        
        // Achievement system
        this.achievements = new Map();
        this.sessionStats = {
            platformsJumped: 0,
            evilToadsDefeated: 0,
            tokensCollected: 0,
            powerupsCollected: 0,
            maxHeight: 0,
            perfectLandings: 0,
            biomesReached: new Set()
        };
        this.initializeAchievements();
        
        // Score protection against console manipulation
        this._scoreHistory = [];
        this._lastScoreUpdate = 0;
        
        // Scoring enhancements for competition
        this.comboCount = 0;
        this.comboTimer = 0;
        this.lastCollectionTime = 0;
        this.platformStreak = 0;
        
        // Input handling
        this.keys = {};
        this.touches = {
            left: false,
            right: false,
            activeTouches: new Map() // Track individual touches
        };
        this.mousePressed = false;
        
        // Performance monitoring
        this.frameCount = 0;
        this.fpsDisplay = 0;
        this.lastFPSTime = 0;
        
        // === ENHANCED AUDIO TRACKING FOR ADDICTIVE SOUNDSCAPE ===
        this.audioState = {
            lastMilestoneScore: 0,
            tokenStreak: 0,
            perfectBounceStreak: 0,
            lastHeightMilestone: 0,
            currentComboLevel: 0,
            dangerZoneWarned: false,
            isHighAltitude: false,
            lastTokenTime: 0,
            lastPlatformSoundTime: 0,
            musicTempo: 1.0, // Dynamic music tempo based on height/difficulty
            lastTempoUpdate: 0 // Throttle tempo updates
        };
        
        // Background music setup
        this.backgroundMusic = null;
        this.musicVolume = 0.3; // Soft background volume
        this.musicEnabled = true;
        
        console.log('🎮 Pogo Leap game engine initialized with enhanced audio! 🎵');
        
        // Create protected score property
        this.setupScoreProtection();
    }

    // Setup score protection against console manipulation
    setupScoreProtection() {
        // Create protected score property with getter/setter
        Object.defineProperty(this, 'score', {
            get: function() {
                return this._score;
            },
            set: function(value) {
                // Validate score changes
                if (typeof value !== 'number' || value < 0 || !Number.isFinite(value)) {
                    console.error('🚨 INVALID SCORE DETECTED:', value);
                    return; // Reject invalid score
                }
                
                // Track score increases for validation
                if (value > this._score) {
                    const increase = value - this._score;
                    const now = Date.now();
                    

                    
                    // Record legitimate score increases
                    this._scoreHistory.push({
                        score: value,
                        timestamp: now,
                        increase: increase
                    });
                    
                    // Keep only recent history (last 50 entries)
                    if (this._scoreHistory.length > 50) {
                        this._scoreHistory.shift();
                    }
                    
                    this._lastScoreUpdate = now;
                }
                
                this._score = value;
                this.updateScoreDisplay();
            },
            enumerable: true,
            configurable: false // Prevent redefinition
        });
        
        // Protect against direct property access
        Object.defineProperty(this, '_score', {
            writable: true,
            enumerable: false,
            configurable: false
        });
        
        console.log('🛡️ Score protection system enabled');
    }

    // Detect mobile device for performance optimizations
    detectMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768 ||
               'ontouchstart' in window;
    }

    // Background music management
    loadBackgroundMusic(audioUrl) {
        try {
            this.backgroundMusic = new Audio(audioUrl);
            this.backgroundMusic.loop = true;
            this.backgroundMusic.volume = this.musicVolume;
            this.backgroundMusic.preload = 'auto';
            console.log('🎵 Background music loaded:', audioUrl);
            
            // If loading fails, create a simple fallback tune
            this.backgroundMusic.onerror = () => {
                console.log('🎵 Audio file not found, creating simple background tune...');
                this.createSimpleBackgroundMusic();
            };
        } catch (error) {
            console.warn('Failed to load background music:', error);
            this.createSimpleBackgroundMusic();
        }
    }

    // Create a simple procedural background music using Web Audio API
    createSimpleBackgroundMusic() {
        try {
            if (!window.AudioContext && !window.webkitAudioContext) return;
            
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.isPlayingProcedural = false;
            
            // Simple 8-bit style melody
            this.melodyNotes = [
                { freq: 523, duration: 0.3 }, // C5
                { freq: 659, duration: 0.3 }, // E5  
                { freq: 784, duration: 0.3 }, // G5
                { freq: 659, duration: 0.3 }, // E5
                { freq: 523, duration: 0.6 }, // C5 (longer)
                { freq: 587, duration: 0.3 }, // D5
                { freq: 659, duration: 0.3 }, // E5
                { freq: 523, duration: 0.6 }  // C5 (longer)
            ];
            
            console.log('🎵 Simple background tune created');
        } catch (error) {
            console.warn('Could not create procedural music:', error);
        }
    }

    // Play the simple procedural background music
    playProceduralMusic() {
        if (!this.audioContext || this.isPlayingProcedural) return;
        
        this.isPlayingProcedural = true;
        let noteIndex = 0;
        
        const playNote = () => {
            if (!this.isPlayingProcedural || this.gameState !== 'playing') {
                this.isPlayingProcedural = false;
                return;
            }
            
            const note = this.melodyNotes[noteIndex];
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(note.freq, this.audioContext.currentTime);
            oscillator.type = 'square'; // 8-bit style
            
            gainNode.gain.setValueAtTime(0.05, this.audioContext.currentTime); // Very soft
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + note.duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + note.duration);
            
            noteIndex = (noteIndex + 1) % this.melodyNotes.length;
            
            setTimeout(playNote, note.duration * 1000);
        };
        
        playNote();
    }

    startBackgroundMusic() {
        if (!this.musicEnabled) return;
        
        try {
            if (this.backgroundMusic) {
                // Use audio file if available
                this.backgroundMusic.currentTime = 0;
                this.backgroundMusic.play().catch(e => {
                    console.log('🎵 Background music autoplay blocked - will start on first user interaction');
                });
            } else if (this.audioContext) {
                // Use procedural music as fallback
                this.playProceduralMusic();
            }
        } catch (error) {
            console.warn('Failed to start background music:', error);
        }
    }

    stopBackgroundMusic() {
        // Stop audio file
        if (this.backgroundMusic) {
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0;
        }
        
        // Stop procedural music
        if (this.isPlayingProcedural) {
            this.isPlayingProcedural = false;
        }
    }

    toggleBackgroundMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (this.musicEnabled) {
            this.startBackgroundMusic();
        } else {
            this.stopBackgroundMusic();
        }
        console.log('🎵 Background music:', this.musicEnabled ? 'ON' : 'OFF');
    }

    // Initialize game with robust error handling
    async initialize() {
        try {
            console.log('🎮 Initializing Pogo Leap game...');
            
            // Show loading message
            this.showOverlay('<h3>🎨 Loading Game Assets...</h3><p>Please wait while we load your custom sprites!</p>');
            
            // Wait for assets to load with timeout protection
            let loadingAttempts = 0;
            const maxAttempts = 60; // 6 seconds max
            
            while (!gameAssets.isReady() && loadingAttempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
                loadingAttempts++;
                
                // Update loading progress if available
                if (gameAssets.loadingProgress > 0) {
                    this.showOverlay(`
                        <h3>🎨 Loading Game Assets...</h3>
                        <p>Progress: ${gameAssets.loadingProgress.toFixed(0)}%</p>
                        <div style="background: rgba(255,255,255,0.2); height: 4px; border-radius: 2px; margin: 10px 0;">
                            <div style="background: #fbbf24; height: 100%; width: ${gameAssets.loadingProgress}%; border-radius: 2px; transition: width 0.3s ease;"></div>
                        </div>
                    `);
                }
            }
            
            // Force proceed even if some assets fail (graceful degradation)
            if (!gameAssets.isReady()) {
                console.warn('⚠️ Asset loading timeout - proceeding with fallbacks');
            }
            
            // Get canvas and context with validation
            this.canvas = document.getElementById('gameCanvas');
            if (!this.canvas) {
                throw new Error('Game canvas not found - check HTML structure');
            }
            
            this.ctx = this.canvas.getContext('2d');
            if (!this.ctx) {
                throw new Error('Unable to get canvas 2D context - browser may not support Canvas API');
            }
            
            // Validate canvas dimensions
            if (!this.viewWidth || !this.viewHeight) {
                console.warn('⚠️ Canvas dimensions not set, using defaults');
                this.viewWidth = 320;
                this.viewHeight = 480;
            }
            
            // Set up canvas properties
            this.setupCanvas();
            
            // Initialize game objects with error protection
            this.resetGame();
            
            // Set up input handlers
            this.setupInputHandlers();
            
            // Set up UI handlers  
            this.setupUIHandlers();
            
            // Load best score (non-critical)
            try {
                this.loadBestScore();
            } catch (e) {
                console.warn('⚠️ Failed to load best score:', e.message);
            }
            
            // Initialize leaderboard (non-critical)
            try {
                if (typeof leaderboard !== 'undefined') {
                    await leaderboard.initialize();
                    console.log('✅ Leaderboard initialized');
                } else {
                    console.warn('⚠️ Leaderboard module not available');
                }
            } catch (e) {
                console.warn('⚠️ Leaderboard initialization failed:', e.message);
            }
            
            // Show start instructions
            this.showStartInstructions();
            
            // Start game loop
            this.startGameLoop();
            
            console.log('✅ Game initialized successfully with custom assets');
            
        } catch (error) {
            console.error('❌ Game initialization failed:', error);
            this.showError('Failed to initialize game: ' + error.message + 
                         '<br><br>Please refresh the page and try again.');
        }
    }

    // Set up canvas properties
    setupCanvas() {
        // Logical game resolution (world coordinates stay 320x480)
        const config = gameAssets.config.canvas;
        this.viewWidth = config.width;
        this.viewHeight = config.height;

        // High-resolution backing store so the canvas is never upscaled on
        // screen. 3x logical (960x1440) covers the largest display size the
        // layout allows times typical device pixel ratios.
        const scale = 3;
        this.renderScale = scale;
        this.canvas.width = Math.round(this.viewWidth * scale);
        this.canvas.height = Math.round(this.viewHeight * scale);

        // All game drawing happens in logical coordinates; this base
        // transform maps them onto the high-res backing store. save()/
        // restore() pairs in the render loop preserve it.
        this.ctx.scale(scale, scale);

        // Set CSS size for responsive design
        this.canvas.style.width = '100%';
        this.canvas.style.height = 'auto';

        // High-quality sampling: source art is much larger than drawn size,
        // so smoothing here means crisp downscale, not blur.
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';

        // Set text rendering properties
        this.ctx.textBaseline = 'top';
    }

    // Reset game to initial state
    resetGame() {
        // Reset player
        this.player = {
            x: this.viewWidth / 2 - gameAssets.config.player.width / 2,
            y: this.viewHeight - 150,
            width: gameAssets.config.player.width,
            height: gameAssets.config.player.height,
            velocityX: 0,
            velocityY: 0,
            rotation: 0,
            trail: [],
            grounded: false,
            // Flying mechanics
            isFlying: false,
            flyingTimeLeft: 0,
            flyingPower: 0.15,
            flyingJustActivated: false
        };
        
        // Reset game state
        this.score = 0;
        this.gameStartY = this.player.y;
        this.camera.y = 0;
        this.camera.maxY = 0;
        this.platforms = [];
        this.particles = [];
        this.tokens = []; // Collectible bonus tokens! 🌮
        this.powerups = []; // Collectible power-ups! ⚡
        this.activePowerups.clear(); // Clear all active power-up effects
        
        // Reset session stats for achievements
        this.sessionStats = {
            platformsJumped: 0,
            evilToadsDefeated: 0,
            tokensCollected: 0,
            powerupsCollected: 0,
            maxHeight: 0,
            perfectLandings: 0,
            biomesReached: new Set()
        };
        
        // Touch timing for mobile timing bounce
        this.centerTouchStart = 0;
        this.centerTouchActive = false;
        this.touchDeadzone = 50; // Pixels from edge where touch is ignored
        this.touchSensitivity = 0.8; // Reduced for better touch accuracy
        
        // Generate initial platforms
        this.generateInitialPlatforms();
        
        // Generate initial tokens
        this.generateInitialTokens();
        
        // Generate initial power-ups
        this.generateInitialPowerups();
        
        // Update UI
        this.updateScoreDisplay();
        
        // Stop background music when resetting
        this.stopBackgroundMusic();
        
        console.log('🎮 Game reset');
    }

    // Generate initial platforms
    generateInitialPlatforms() {
        const platformConfig = gameAssets.config.platform;
        
        // Starting platform (under player) - extra wide for beginners
        this.platforms.push({
            x: this.player.x - 60, // Wider on both sides
            y: this.player.y + this.player.height + 10,
            width: platformConfig.width + 120, // Much wider platform
            height: platformConfig.height,
            type: 'normal',
            touched: false,
            broken: false
        });
        
        // Generate platforms going up
        const newPlatforms = gamePhysics.generatePlatforms(
            this.player.y - 100,
            this.player.y - 2000,
            this.viewWidth
        );
        
        this.platforms.push(...newPlatforms);
        
        console.log(`Generated ${this.platforms.length} initial platforms`);
    }

    // Generate initial tokens for collection
    generateInitialTokens() {
        // Generate tokens scattered throughout the level
        const tokenCount = 15; // Start with some tokens
        
        for (let i = 0; i < tokenCount; i++) {
            // Random position in the upper area
            const x = 12 + Math.random() * (this.viewWidth - 50);
            const y = this.player.y - 200 - (i * 150) - Math.random() * 100;
            
            this.tokens.push({
                x: x,
                y: y,
                width: 26, // Increased from 20 (30% larger for better visibility)
                height: 26, // Increased from 20 (30% larger for better visibility)
                collected: false,
                pulseTime: Math.random() * Math.PI * 2, // For pulsing animation
                bobOffset: Math.random() * Math.PI * 2  // For bobbing animation
            });
        }
        
        console.log(`Generated ${this.tokens.length} collectible tokens 🌮`);
    }

    // Generate initial power-ups for collection
    generateInitialPowerups() {
        // Generate much fewer power-ups than tokens (they're special!)
        const powerupCount = 3; // Start with fewer power-ups
        const powerupTypes = Object.keys(gameAssets.powerUpTypes);
        
        for (let i = 0; i < powerupCount; i++) {
            // Random position in the upper area, spread out more than tokens
            const x = 10 + Math.random() * (this.viewWidth - 48);
            const y = this.player.y - 600 - (i * 500) - Math.random() * 300; // Much more spread out
            
            // Select random power-up type based on rarity
            const randomType = this.selectRandomPowerupType();
            
            this.powerups.push({
                x: x,
                y: y,
                width: 33, // Increased from 25 (30% larger for better visibility)
                height: 33, // Increased from 25 (30% larger for better visibility)
                type: randomType,
                collected: false,
                pulseTime: Math.random() * Math.PI * 2, // For pulsing animation
                bobOffset: Math.random() * Math.PI * 2  // For bobbing animation
            });
        }
        
        console.log(`Generated ${this.powerups.length} collectible power-ups ⚡`);
    }

    // Select random power-up type based on rarity weights
    selectRandomPowerupType() {
        const types = Object.keys(gameAssets.powerUpTypes);
        const weights = types.map(type => gameAssets.powerUpTypes[type].rarity);
        
        // Create cumulative weight array
        const cumulativeWeights = [];
        let totalWeight = 0;
        for (let weight of weights) {
            totalWeight += weight;
            cumulativeWeights.push(totalWeight);
        }
        
        // Select based on random number
        const random = Math.random() * totalWeight;
        for (let i = 0; i < cumulativeWeights.length; i++) {
            if (random <= cumulativeWeights[i]) {
                return types[i];
            }
        }
        
        // Fallback to first type
        return types[0];
    }

    // Start game
    startGame() {
        if (this.gameState === 'playing') return;
        
        this.gameState = 'playing';
        this.isGameRunning = true;
        this.isPaused = false;
        

        
        // Reset if coming from game over
        if (this.gameState !== 'paused') {
            this.resetGame();
        }
        
        // Hide overlay
        this.hideOverlay();
        
        // Play enhanced start sound
        this.playSound('gameStart');
        
        // Start background music (with fallback)
        if (!this.backgroundMusic && !this.audioContext) {
            // Try to load background music - will create fallback if file doesn't exist
            this.loadBackgroundMusic('assets/audio/background-music.mp3');
            
            // Give it a moment to load, then create fallback if needed
            setTimeout(() => {
                if (!this.backgroundMusic && !this.audioContext) {
                    this.createSimpleBackgroundMusic();
                }
                this.startBackgroundMusic();
            }, 100);
        } else {
            this.startBackgroundMusic();
        }
        
        // Show brief message about custom assets if loaded
        if (gameAssets.isReady() && gameAssets.images.jump) {
            setTimeout(() => {
                if (this.gameState === 'playing') {
                    // Show a brief notification about the custom sprites
                    if (typeof showNotification === 'function') {
                        showNotification('🎨 Custom Pogo sprites loaded! Use ⬅️➡️ to see directional animations!');
                    }
                }
            }, 1000);
        }
        
        console.log('🚀 Game started with custom assets');
    }

    // Pause game
    pauseGame() {
        if (this.gameState !== 'playing') return;
        
        this.isPaused = true;
        this.gameState = 'paused';
        
        this.showOverlay(`
            <h3>⏸️ Game Paused</h3>
            <button onclick="game.resumeGame()" class="game-btn primary">Resume</button>
            <button onclick="game.endGame()" class="game-btn secondary">End Game</button>
        `);
        
        console.log('⏸️ Game paused');
    }

    // Resume game
    resumeGame() {
        if (this.gameState !== 'paused') return;
        
        this.isPaused = false;
        this.gameState = 'playing';
        this.hideOverlay();
        
        console.log('▶️ Game resumed');
    }

    // End game
    endGame() {
        this.isGameRunning = false;
        this.gameState = 'gameOver';
        

        
        // Stop background music
        this.stopBackgroundMusic();
        
        // Update best score
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.saveBestScore();
        }
        
        // Show game over screen
        this.showGameOverScreen();
        
        // Play game over sound
        this.playSound('gameOver');
        
        console.log(`🎯 Game ended - Score: ${this.score}`);
    }

    // Main game loop - optimized for consistent 60fps
    gameLoop(currentTime) {
        requestAnimationFrame((time) => this.gameLoop(time));
        
        // Calculate delta time with stability
        if (this.lastFrameTime === 0) this.lastFrameTime = currentTime;
        let deltaTime = currentTime - this.lastFrameTime;
        
        // Clamp delta time to prevent large jumps (pause recovery, tab switches)
        deltaTime = Math.min(deltaTime, 50); // Max 50ms delta (20fps minimum)
        
        // Limit frame rate for consistent performance
        if (deltaTime < this.frameInterval) {
            return;
        }
        
        this.lastFrameTime = currentTime;
        
        // Update FPS counter
        this.updateFPSCounter(currentTime);
        
        // Only update game if playing
        if (this.gameState === 'playing' && !this.isPaused) {
            this.update(deltaTime);
        }
        
        // Always render (but with optimizations)
        this.render();
    }

    // Update game state - FIXED to avoid double normalization
    update(deltaTime) {
        // Physics system now handles its own normalization, pass raw deltaTime
        
        // Update player physics
        gamePhysics.updatePlayer(this.player, deltaTime, this.viewWidth);
        
        // Check for flying sound trigger
        if (this.player.flyingJustActivated) {
            this.playSound('flying');
            this.player.flyingJustActivated = false; // Reset flag
        }
        
        // Update platforms
        this.platforms.forEach(platform => {
            gamePhysics.updatePlatform(platform, deltaTime, this.viewWidth);
        });
        
        // Check platform collisions
        this.checkCollisions();
        
        // Update camera
        const targetY = gamePhysics.getCameraTarget(this.player, this.viewHeight);
        gamePhysics.updateCamera(this.camera, targetY, deltaTime);
        
        // Update score with enhanced audio feedback
        this.updateScore();
        
        // Update combo timer
        this.updateComboSystem();
        
        // Track biome achievement
        this.updateSessionStats('biomeReached');
        
        // Update dynamic music tempo
        this.updateMusicTempo();
        
        // Update particles with better memory management
        gamePhysics.updateParticles(this.particles, deltaTime);
        
        // Clean up excessive particles for performance
        if (this.particles.length > 150) {
            this.particles.splice(100); // Keep only the newest 100 particles
        }
        
        // Generate new platforms as player goes higher
        this.manageActivePlatforms();
        
        // Generate new tokens as player goes higher
        this.manageTokens();
        
        // Generate new power-ups as player goes higher
        this.managePowerups();
        
        // Update active power-up effects
        this.updateActivePowerups(deltaTime);
        
        // Check for game over
        this.checkGameOver();
        
        // Handle input (simple now!)
        this.handleInput(deltaTime);
    }

    // Check collisions
    checkCollisions() {
        this.player.grounded = false;
        
        for (let i = this.platforms.length - 1; i >= 0; i--) {
            const platform = this.platforms[i];
            
            // Skip broken platforms
            if (platform.broken) {
                this.platforms.splice(i, 1);
                continue;
            }
            
            // Check collision
            if (gamePhysics.checkPlatformCollision(this.player, platform)) {
                // Special handling for evil platforms
                if (platform.type === 'evil') {
                    if (this.activePowerups.has('coin')) {
                        // Player has coin power-up - can defeat evil toad!
                        this.defeatEvilToad(platform, i);
                        continue;
                    } else {
                        // Player gets hurt by evil toad
                        this.handleEvilToadDamage(platform);
                        return; // Exit early to prevent normal platform behavior
                    }
                }
                
                // Normal platform handling
                const jumpResult = gamePhysics.handlePlatformJump(this.player, platform);
                
                // Special platform effects after jumping
                if (platform.type === 'ice') {
                    // Ice platforms make player slippery - reduce horizontal control
                    this.player.velocityX *= 1.5; // Increase slide momentum
                    this.player.onIce = true; // Flag for continued slippery effect
                } else {
                    this.player.onIce = false;
                }
                
                if (platform.type === 'breaking' && platform.breakTimer === undefined) {
                    // Start break timer when touched
                    platform.breakTimer = 0;
                    this.playSound('breakingPlatform');
                }
                
                if (platform.type === 'disappearing' && platform.fadeTimer === undefined) {
                    // Start fade timer when touched
                    platform.fadeTimer = 0;
                }
                

                
                // Mark platform as touched
                if (!platform.touched) {
                    platform.touched = true;
                    
                    // Track platform jump for achievements
                    this.updateSessionStats('platformJump');
                    
                    // Create particles
                    const currentBiome = gameAssets.getCurrentBiome(Math.abs(this.player.y));
                    const particles = gamePhysics.createJumpParticles(
                        platform.x + platform.width/2,
                        platform.y,
                        platform.type === 'spring' ? 'spark' : 'feather',
                        currentBiome.particleColor
                    );
                    this.particles.push(...particles);
                    
                    // Play enhanced platform-specific sounds with throttling
                    const now = Date.now();
                    if (now - this.audioState.lastPlatformSoundTime > 50) { // Throttle rapid sounds
                        let soundType = 'platform';
                        switch(platform.type) {
                            case 'spring':
                                soundType = 'springBounce';
                                break;
                            case 'superspring':
                                soundType = 'superSpringBounce';
                                break;
                            case 'minispring':
                                soundType = 'miniSpringBounce';
                                break;
                            case 'moving':
                                soundType = 'movingPlatform';
                                break;
                            case 'breaking':
                                soundType = 'breakingPlatform';
                                break;
                            case 'cloud':
                                soundType = 'cloudPlatform';
                                break;
                            case 'ice':
                                soundType = 'icePlatform';
                                break;
                            case 'disappearing':
                                soundType = 'disappearingPlatform';
                                break;
                            case 'evil':
                                soundType = 'evilPlatform';
                                break;
                            case 'normal':
                            default:
                                soundType = 'bounce';
                        }
                        this.playSound(soundType);
                        this.audioState.lastPlatformSoundTime = now;
                    }
                }
                
                this.player.grounded = true;
                break;
            }
        }
        
        // Check token collisions
        this.tokens.forEach(token => {
            if (this.checkTokenCollision(token)) {
                this.collectToken(token);
            }
        });
        
        // Check power-up collisions
        this.powerups.forEach(powerup => {
            if (this.checkPowerupCollision(powerup)) {
                this.collectPowerup(powerup);
            }
        });
    }

    // Update score with enhanced audio milestones
    updateScore() {
        const newScore = gamePhysics.calculateScore(this.player.y, this.gameStartY);
        if (newScore > this.score) {
            const oldScore = this.score;
            this.score = newScore;
            this.updateScoreDisplay();
            
            // === MILESTONE AUDIO SYSTEM ===
            
            // Check for major milestones (1000s)
            if (Math.floor(this.score / 1000) > Math.floor(oldScore / 1000)) {
                this.playSound('milestone1000');
                this.audioState.lastMilestoneScore = this.score;
            }
            // Check for medium milestones (500s)
            else if (Math.floor(this.score / 500) > Math.floor(oldScore / 500)) {
                this.playSound('milestone500');
                this.audioState.lastMilestoneScore = this.score;
            }
            // Check for small milestones (100s)
            else if (Math.floor(this.score / 100) > Math.floor(oldScore / 100)) {
                this.playSound('milestone100');
                this.audioState.lastMilestoneScore = this.score;
            }
            // Regular score progress sound (every 50 points, but not if milestone just played)
            else if (this.score % 50 === 0 && this.score !== this.audioState.lastMilestoneScore) {
                this.playSound('score');
            }
            
            // Check for new personal best with celebration
            if (this.score > this.bestScore) {
                // Only play once per session when crossing previous best
                if (oldScore <= this.bestScore && this.score > this.bestScore) {
                    this.playSound('newPersonalBest');
                }
            }
            
            // Height-based atmospheric sounds
            const height = Math.abs(this.player.y);
            if (height > 2000 && !this.audioState.isHighAltitude) {
                this.playSound('windWhoosh');
                this.audioState.isHighAltitude = true;
            } else if (height > 5000 && Math.floor(height / 1000) > this.audioState.lastHeightMilestone) {
                this.playSound('spaceAmbient');
                this.audioState.lastHeightMilestone = Math.floor(height / 1000);
            }
        }
    }

    // Update combo system
    updateComboSystem() {
        const currentTime = Date.now();
        
        // Reset combo if timer expired
        if (this.comboTimer > 0 && currentTime > this.comboTimer) {
            this.comboCount = 0;
            this.comboTimer = 0;
        }
    }

    // Manage active platforms (generate new ones, remove old ones)
    manageActivePlatforms() {
        // Remove platforms far below camera
        const removeY = this.camera.y + this.viewHeight + 200;
        this.platforms = this.platforms.filter(platform => platform.y < removeY);
        
        // Generate new platforms above if needed
        const topPlatform = this.platforms.length > 0 
            ? this.platforms.reduce((highest, platform) => 
                platform.y < highest.y ? platform : highest, { y: Infinity })
            : { y: this.player.y }; // Use player position if no platforms exist
        
        // More aggressive platform generation to prevent gaps
        const generateY = this.camera.y - this.viewHeight - 800; // Increased buffer
        
        if (topPlatform.y > generateY) {
            const newPlatforms = gamePhysics.generatePlatforms(
                topPlatform.y - 50, // Smaller gap to ensure continuity
                generateY,
                this.viewWidth
            );
            this.platforms.push(...newPlatforms);
            console.log(`Generated ${newPlatforms.length} new platforms at height ${Math.abs(topPlatform.y).toFixed(0)}px`);
        }
    }

    // Manage active tokens (generate new ones, remove old ones)
    manageTokens() {
        // Remove collected tokens and tokens far below camera
        const removeY = this.camera.y + this.viewHeight + 200;
        this.tokens = this.tokens.filter(token => !token.collected && token.y < removeY);
        
        // Generate new tokens above if needed
        const currentTopY = this.camera.y - this.viewHeight - 500;
        const existingTokensAbove = this.tokens.filter(token => token.y < currentTopY);
        
        if (existingTokensAbove.length < 5) {
            // Generate some tokens in the new area
            const tokensToGenerate = 8;
            
            for (let i = 0; i < tokensToGenerate; i++) {
                const x = 12 + Math.random() * (this.viewWidth - 50);
                const y = currentTopY - (i * 200) - Math.random() * 150;
                
                this.tokens.push({
                    x: x,
                    y: y,
                    width: 20,
                    height: 20,
                    collected: false,
                    pulseTime: Math.random() * Math.PI * 2,
                    bobOffset: Math.random() * Math.PI * 2
                });
            }
        }
    }

    // Manage active power-ups (generate new ones, remove old ones)
    managePowerups() {
        // Remove collected power-ups and power-ups far below camera
        const removeY = this.camera.y + this.viewHeight + 200;
        this.powerups = this.powerups.filter(powerup => !powerup.collected && powerup.y < removeY);
        
        // Generate new power-ups above if needed
        const currentTopY = this.camera.y - this.viewHeight - 500;
        const existingPowerupsAbove = this.powerups.filter(powerup => powerup.y < currentTopY);
        
        if (existingPowerupsAbove.length < 2) { // Keep even fewer power-ups
            // Generate some power-ups in the new area based on spawn chance
            const spawnChance = gameAssets.config.powerups.spawnChance;
            const powerupsToGenerate = 2; // Generate fewer at a time
            
            for (let i = 0; i < powerupsToGenerate; i++) {
                // Only spawn if random chance succeeds
                if (Math.random() < spawnChance) {
                    const x = 10 + Math.random() * (this.viewWidth - 48);
                    const y = currentTopY - (i * 600) - Math.random() * 400; // Much more spread out
                    
                    const randomType = this.selectRandomPowerupType();
                    
                    this.powerups.push({
                        x: x,
                        y: y,
                        width: 25,
                        height: 25,
                        type: randomType,
                        collected: false,
                        pulseTime: Math.random() * Math.PI * 2,
                        bobOffset: Math.random() * Math.PI * 2
                    });
                }
            }
        }
    }

    // Check for game over conditions with audio warnings
    checkGameOver() {
        // More forgiving death zone near starting area
        const distanceFromStart = Math.abs(this.player.y - this.gameStartY);
        let deathBuffer = 100; // Default death buffer
        
        // If player is still near starting area (within 200 pixels), be much more forgiving
        if (distanceFromStart < 200) {
            deathBuffer = 400; // 4x more forgiving at start
        } else if (distanceFromStart < 500) {
            deathBuffer = 250; // 2.5x more forgiving in early game
        }
        
        // === DANGER ZONE AUDIO WARNINGS ===
        const dangerDistance = this.player.y - (this.camera.y + this.viewHeight);
        
        // Last chance warning (very close to death)
        if (dangerDistance > deathBuffer * 0.8 && !this.audioState.dangerZoneWarned) {
            this.playSound('lastChance');
            this.audioState.dangerZoneWarned = true;
        } 
        // Danger zone warning (getting close)
        else if (dangerDistance > deathBuffer * 0.5 && !this.audioState.dangerZoneWarned) {
            this.playSound('dangerZone');
            this.audioState.dangerZoneWarned = true;
        }
        
        // Reset danger warning when player gets back to safety
        if (dangerDistance < deathBuffer * 0.3) {
            this.audioState.dangerZoneWarned = false;
        }
        
        // Game over if player falls too far below camera
        if (this.player.y > this.camera.y + this.viewHeight + deathBuffer) {
            this.endGame();
        }
    }

    // Handle input - PRECISE KEYBOARD + RESPONSIVE TOUCH!
    handleInput(deltaTime) {
        let keyboardDirection = 0;
        let touchDirection = 0;
        
        // Keyboard input (precise desktop controls)
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
            keyboardDirection -= 1;
        }
        if (this.keys['ArrowRight'] || this.keys['KeyD']) {
            keyboardDirection += 1;
        }
        
        // Touch input (ultra-responsive mobile controls)
        // CRITICAL: Update touch states from individual touches first!
        if (this.touches && this.touches.activeTouches && this.touches.activeTouches.size > 0) {
            this.updateTouchStates();
        }
        
        if (this.touches.left) {
            touchDirection -= this.touchSensitivity;
        }
        if (this.touches.right) {
            touchDirection += this.touchSensitivity;
        }
        
        // Mouse fallback (use touch physics for mouse)
        if (!keyboardDirection && !touchDirection && this.mousePressed) {
            if (this.lastMouseX < this.viewWidth / 2) {
                touchDirection -= this.touchSensitivity;
            } else {
                touchDirection += this.touchSensitivity;
            }
        }
        
        // PRECISION-OPTIMIZED RESPONSE - different physics for different inputs
        if (keyboardDirection !== 0) {
            // Use PRECISE physics for keyboard/desktop controls
            gamePhysics.movePlayerHorizontalPrecise(this.player, keyboardDirection, deltaTime);
        } else if (touchDirection !== 0) {
            // Use ENHANCED physics for touch/mobile controls  
            gamePhysics.movePlayerHorizontalEnhanced(this.player, touchDirection, deltaTime);
        }
    }

    // Render game - optimized for performance
    render() {
        // Clear canvas efficiently
        this.ctx.clearRect(0, 0, this.viewWidth, this.viewHeight);
        
        // Draw background BEFORE camera transform to ensure it covers the entire screen
        gameAssets.drawBackground(this.ctx, this.viewWidth, this.viewHeight, this.camera.y, this.score);
        
        // Save context for game world rendering
        this.ctx.save();
        
        // Apply zoom transform centered on screen
        const centerX = this.viewWidth / 2;
        const centerY = this.viewHeight / 2;
        this.ctx.translate(centerX, centerY);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-centerX, -centerY);
        
        // Apply camera transform for game objects
        this.ctx.translate(0, -this.camera.y);
        
        // Calculate viewport bounds for culling (adjusted for zoom)
        const zoomBuffer = (this.camera.zoom - 1) * this.viewHeight / 2;
        const renderBuffer = 100; // Increased buffer for better edge visibility
        const viewTop = this.camera.y - renderBuffer - zoomBuffer;
        const viewBottom = this.camera.y + this.viewHeight + renderBuffer + zoomBuffer;
        
        // Draw platforms (with optimized culling)
        for (let i = 0; i < this.platforms.length; i++) {
            const platform = this.platforms[i];
            if (platform.y >= viewTop && platform.y <= viewBottom) {
                gameAssets.drawPlatform(this.ctx, platform);
            }
        }
        
        // Draw collectible tokens (with optimized culling)
        for (let i = 0; i < this.tokens.length; i++) {
            const token = this.tokens[i];
            if (!token.collected && token.y >= viewTop && token.y <= viewBottom) {
                gameAssets.drawToken(this.ctx, token);
            }
        }
        
        // Draw collectible power-ups (with optimized culling)
        for (let i = 0; i < this.powerups.length; i++) {
            const powerup = this.powerups[i];
            if (!powerup.collected && powerup.y >= viewTop && powerup.y <= viewBottom) {
                gameAssets.drawPowerup(this.ctx, powerup);
            }
        }
        
        // Draw particles (batch for efficiency)
        if (this.particles.length > 0) {
            for (let i = 0; i < this.particles.length; i++) {
                const particle = this.particles[i];
                if (particle.y >= viewTop && particle.y <= viewBottom) {
                    gameAssets.drawParticle(
                        this.ctx,
                        particle.x,
                        particle.y,
                        particle.size,
                        particle.type,
                        particle.alpha,
                        particle.biomeColor
                    );
                }
            }
        }
        
        // Draw player trail (optimized)
        if (this.player.trail && this.player.trail.length > 0) {
            for (let i = 0; i < this.player.trail.length; i++) {
                const point = this.player.trail[i];
                gameAssets.drawParticle(
                    this.ctx,
                    point.x,
                    point.y,
                    3 - (i * 0.5),
                    'trail',
                    point.alpha
                );
            }
        }
        
        // Draw flying effects behind player
        if (this.player.isFlying && this.player.flyingTimeLeft > 0) {
            this.drawFlyingEffects();
        }
        
        // Draw player (with velocity for sprite selection)
        gameAssets.drawPlayer(
            this.ctx,
            this.player.x,
            this.player.y,
            this.player.width,
            this.player.height,
            this.player.rotation,
            this.player.velocityX
        );
        
        // Restore context
        this.ctx.restore();
        
        // Draw UI (not affected by camera)
        this.drawUI();
        
        // Draw touch zones for mobile debugging (development only)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            this.drawTouchZones();
        }
    }

    // Draw flying effects (behind player)
    drawFlyingEffects() {
        this.ctx.save();
        
        // Create sparkle particles around player
        const time = Date.now();
        const sparkles = 6;
        
        for (let i = 0; i < sparkles; i++) {
            const angle = (time * 0.01 + i * (Math.PI * 2 / sparkles)) % (Math.PI * 2);
            const radius = 25 + Math.sin(time * 0.005 + i) * 8;
            
            const sparkleX = this.player.x + this.player.width/2 + Math.cos(angle) * radius;
            const sparkleY = this.player.y + this.player.height/2 + Math.sin(angle) * radius;
            
            // Draw sparkle
            this.ctx.fillStyle = `rgba(255, 215, 0, ${0.6 + Math.sin(time * 0.008 + i) * 0.4})`;
            this.ctx.beginPath();
            this.ctx.arc(sparkleX, sparkleY, 2 + Math.sin(time * 0.01 + i) * 1, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }
    
    // Flying glow removed - no aura effects
    
    // Check if platform is in view
    isPlatformInView(platform) {
        const viewTop = this.camera.y - 50;
        const viewBottom = this.camera.y + this.viewHeight + 50;
        return platform.y >= viewTop && platform.y <= viewBottom;
    }

    // Check if token is in view
    isTokenInView(token) {
        const viewTop = this.camera.y - 50;
        const viewBottom = this.camera.y + this.viewHeight + 50;
        return token.y >= viewTop && token.y <= viewBottom;
    }

    // Check if power-up is in view
    isPowerupInView(powerup) {
        const viewTop = this.camera.y - 50;
        const viewBottom = this.camera.y + this.viewHeight + 50;
        return powerup.y >= viewTop && powerup.y <= viewBottom;
    }

    // Check collision between player and token
    checkTokenCollision(token) {
        if (token.collected) return false;
        
        // Match the star artwork while keeping collection comfortably forgiving.
        const tokenScale = 1.8;
        const scaledWidth = token.width * tokenScale;
        const scaledHeight = token.height * tokenScale;
        const padding = 6;
        
        // Center the scaled token
        const tokenX = token.x - (scaledWidth - token.width) / 2;
        const tokenY = token.y - (scaledHeight - token.height) / 2;
        
        return (
            this.player.x < tokenX + scaledWidth + padding &&
            this.player.x + this.player.width > tokenX - padding &&
            this.player.y < tokenY + scaledHeight + padding &&
            this.player.y + this.player.height > tokenY - padding
        );
    }

    // Collect a token and award points with combo system
    collectToken(token) {
        if (token.collected) return;
        
        token.collected = true;
        
        // Track achievement
        this.updateSessionStats('tokenCollected');
        
        // Base bonus points
        let bonus = gameAssets.config.score.tokenBonus;
        
        // Check for combo (collected within 2 seconds of last collection)
        const currentTime = Date.now();
        if (currentTime - this.lastCollectionTime < 2000) {
            this.comboCount++;
            this.comboTimer = currentTime + 3000; // 3 second combo window
            bonus = Math.floor(bonus * (1 + this.comboCount * 0.2)); // 20% bonus per combo
        } else {
            this.comboCount = 0;
        }
        this.lastCollectionTime = currentTime;
        
        this.score += bonus;
        this.updateScoreDisplay();
        
        // Enhanced token collection audio with streak detection
        const now = Date.now();
        const timeSinceLastToken = now - this.audioState.lastTokenTime;
        
        if (timeSinceLastToken < 2000) { // Within 2 seconds = streak
            this.audioState.tokenStreak++;
            if (this.audioState.tokenStreak >= 3) {
                this.playSound('tokenStreak'); // Special streak sound
            } else {
                this.playSound('token');
            }
        } else {
            this.audioState.tokenStreak = 1;
            this.playSound('token');
        }
        
        this.audioState.lastTokenTime = now;
        
        // Create collection particles
        this.createTokenCollectionEffect(token);
        
        // Show combo feedback
        if (this.comboCount > 0) {
            console.log(`🌮 Token collected! +${bonus} points (${this.comboCount + 1}x COMBO!)`);
        } else {
            console.log(`🌮 Token collected! +${bonus} points`);
        }
    }



    // Create visual effect when collecting token
    createTokenCollectionEffect(token) {
        const particleCount = 8;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            
            this.particles.push({
                x: token.x + token.width / 2,
                y: token.y + token.height / 2,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                size: 2 + Math.random() * 2,
                type: 'tokenSpark',
                alpha: 1,
                life: 30 + Math.random() * 20
            });
        }
    }

    // Handle player touching evil toad - causes damage/death unless shielded
    handleEvilToadDamage(platform) {
        // Check if player has shield protection
        if (this.player.hasShield) {
            // Shield protects against evil toad - defeat it instead!
            console.log('🛡️ Shield deflected evil toad attack!');
            this.defeatEvilToad(platform, this.platforms.indexOf(platform));
            return;
        }
        
        // Play evil toad death sound
        this.playSound('evilToadDeath');
        
        // Create danger particles
        this.createDangerEffect(platform);
        
        // Game over - evil toad kills player!
        console.log('💀 Player touched evil toad!');
        this.endGame();
    }

    // Defeat evil toad when player has coin power-up
    defeatEvilToad(platform, platformIndex) {
        // Award bonus points for defeating evil toad
        const bonusPoints = 200;
        this.score += bonusPoints;
        this.updateScoreDisplay();
        
        // Track achievement
        this.updateSessionStats('evilToadDefeated');
        
        // Play triumphant victory sound
        this.playSound('evilToadDefeat');
        
        // Create victory particles
        this.createEvilToadDefeatEffect(platform);
        
        // Convert evil platform to normal platform
        platform.type = 'normal';
        platform.touched = true; // Mark as touched so no double scoring
        
        // Give player a good bounce from defeating the enemy
        this.player.velocityY = -gameAssets.config.player.jumpForce * 1.3;
        
        console.log(`⚡ Evil toad defeated! +${bonusPoints} points`);
    }

    // Create danger effect when touching evil toad
    createDangerEffect(platform) {
        const particleCount = 25; // More particles for dramatic death effect
        const centerX = platform.x + platform.width / 2;
        const centerY = platform.y;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 4 + Math.random() * 6; // Faster, more explosive particles
            
            this.particles.push({
                x: centerX,
                y: centerY,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed - 2, // More upward bias
                size: 3 + Math.random() * 4, // Bigger particles
                type: 'danger',
                color: '#ff0000', // Bright red danger particles
                life: 1.5, // Longer lasting
                decay: 0.02 // Slower decay for more visible effect
            });
        }
    }

    // Create victory effect when defeating evil toad
    createEvilToadDefeatEffect(platform) {
        const particleCount = 20;
        const centerX = platform.x + platform.width / 2;
        const centerY = platform.y;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 4 + Math.random() * 5;
            
            this.particles.push({
                x: centerX,
                y: centerY,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed - 2,
                size: 3 + Math.random() * 4,
                type: 'victory',
                color: '#ffd700', // Gold victory particles
                life: 1.0,
                decay: 0.02
            });
        }
    }

    // Check collision between player and power-up
    checkPowerupCollision(powerup) {
        if (powerup.collected) return false;
        
        // Check if player overlaps with power-up (with padding for easier collection)
        const padding = 8; // Slightly larger collection area for power-ups
        return (
            this.player.x < powerup.x + powerup.width + padding &&
            this.player.x + this.player.width > powerup.x - padding &&
            this.player.y < powerup.y + powerup.height + padding &&
            this.player.y + this.player.height > powerup.y - padding
        );
    }

    // Collect a power-up and activate its effect
    collectPowerup(powerup) {
        if (powerup.collected) return;
        
        powerup.collected = true;
        
        // Track achievement
        this.updateSessionStats('powerupCollected');
        
        // Award bonus points
        const bonus = gameAssets.config.score.powerupBonus;
        this.score += bonus;
        this.updateScoreDisplay();
        
        // Activate power-up effect
        this.activatePowerup(powerup.type);
        
        // Play collection sound based on type
        this.playSound(`powerup${powerup.type.charAt(0).toUpperCase() + powerup.type.slice(1)}`);
        
        // Create collection particles
        this.createPowerupCollectionEffect(powerup);
        
        console.log(`⚡ Power-up collected: ${gameAssets.powerUpTypes[powerup.type].name} +${bonus} points`);
    }

    // Activate power-up effect
    activatePowerup(type) {
        const config = gameAssets.powerUpTypes[type];
        if (!config) return;
        
        // Check if we've reached the maximum active power-ups
        if (this.activePowerups.size >= gameAssets.config.powerups.maxActive) {
            // Smart power-up replacement: prioritize keeping defensive power-ups
            let powerupToRemove = null;
            
            // Priority order (least important first): magnet > coin > shield
            for (let [powerupType, data] of this.activePowerups) {
                if (powerupType === 'magnet') {
                    powerupToRemove = powerupType;
                    break; // Magnet is least important, remove it first
                } else if (powerupType === 'coin' && !powerupToRemove) {
                    // Only remove coin if no magnet is available and no shield is active
                    if (!this.activePowerups.has('shield')) {
                        powerupToRemove = powerupType;
                    }
                }
            }
            
            // If no smart choice available, remove the oldest
            if (!powerupToRemove) {
                powerupToRemove = this.activePowerups.keys().next().value;
            }
            
            console.log(`🔄 Replacing power-up: ${powerupToRemove} → ${type}`);
            this.deactivatePowerup(powerupToRemove);
        }
        
        // Activate the new power-up
        this.activePowerups.set(type, {
            timeLeft: config.duration,
            config: config
        });
        
        // Apply immediate effects
        switch(type) {
            case 'coin':
                // Super flight mode (enhanced flying)
                this.player.isFlying = true;
                this.player.flyingTimeLeft = config.duration; // Sync with power-up timer
                this.player.flyingPower = 0.25; // Stronger than normal coin platforms
                console.log('🪙✈️ SUPER FLIGHT ACTIVATED!');
                this.playSound('flying'); // Special activation sound
                break;
                
            case 'shield':
                // Evil shield (invincibility)
                this.player.hasShield = true;
                console.log('👹🛡️ EVIL SHIELD ACTIVATED!');
                this.playSound('powerupShield'); // Shield activation sound
                break;
                
            case 'magnet':
                // Token magnet (auto-collect nearby tokens)
                this.player.hasMagnet = true;
                console.log('🌮🧲 TOKEN MAGNET ACTIVATED!');
                this.playSound('powerupMagnet'); // Magnet activation sound
                break;
        }
    }

    // Deactivate power-up effect
    deactivatePowerup(type) {
        if (!this.activePowerups.has(type)) return;
        
        this.activePowerups.delete(type);
        
        // Remove effects
        switch(type) {
            case 'coin':
                if (this.player.isFlying) {
                    this.player.isFlying = false;
                    this.player.flyingTimeLeft = 0;
                    this.player.flyingPower = 0.15; // Reset to normal
                }
                break;
                
            case 'shield':
                this.player.hasShield = false;
                break;
                
            case 'magnet':
                this.player.hasMagnet = false;
                break;
        }
        
        // Play expiration sound
        this.playSound('powerupExpire');
        
        console.log(`⚡ Power-up expired: ${type}`);
    }

    // Update active power-up effects
    updateActivePowerups(deltaTime) {
        const toRemove = [];
        
        for (let [type, data] of this.activePowerups) {
            // Countdown timer (timeLeft and deltaTime both in milliseconds)
            data.timeLeft -= deltaTime;
            
            // === POWER-UP LOW TIME WARNING ===
            // Play warning sound when power-up is running low (last 2 seconds)
            if (data.timeLeft <= 2000 && data.timeLeft > 1800 && !data.warningPlayed) {
                this.playSound('powerupLowTime');
                data.warningPlayed = true;
            }
            
            // Check for expiration
            if (data.timeLeft <= 0) {
                toRemove.push(type);
                continue;
            }
            
            // Apply continuous effects and sync timers
            if (type === 'magnet' && this.player.hasMagnet) {
                this.applyMagnetEffect();
            } else if (type === 'coin') {
                // Always keep coin effects synced, regardless of flying state
                if (this.player.isFlying) {
                    this.player.flyingTimeLeft = data.timeLeft;
                }
                // Coin power-up enables evil toad killing for full duration
                // No additional sync needed - handled by activePowerups Map
            }
        }
        
        // Remove expired power-ups
        toRemove.forEach(type => this.deactivatePowerup(type));
    }

    // Apply magnet effect to nearby tokens
    applyMagnetEffect() {
        const magnetRange = gameAssets.config.powerups.magnetRange;
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        
        this.tokens.forEach(token => {
            if (token.collected) return;
            
            const tokenCenterX = token.x + token.width / 2;
            const tokenCenterY = token.y + token.height / 2;
            
            const distance = Math.sqrt(
                Math.pow(tokenCenterX - playerCenterX, 2) + 
                Math.pow(tokenCenterY - playerCenterY, 2)
            );
            
            // Pull tokens within range towards the player
            if (distance < magnetRange && distance > 0) {
                const pullStrength = 0.3;
                const directionX = (playerCenterX - tokenCenterX) / distance;
                const directionY = (playerCenterY - tokenCenterY) / distance;
                
                token.x += directionX * pullStrength * (magnetRange - distance) / magnetRange;
                token.y += directionY * pullStrength * (magnetRange - distance) / magnetRange;
            }
        });
    }

    // Create visual effect when collecting power-up
    createPowerupCollectionEffect(powerup) {
        const particleCount = 12; // More particles for power-ups
        const powerupConfig = gameAssets.powerUpTypes[powerup.type];
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 3 + Math.random() * 4;
            
            this.particles.push({
                x: powerup.x + powerup.width / 2,
                y: powerup.y + powerup.height / 2,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                size: 3 + Math.random() * 3,
                type: 'powerupGlow',
                alpha: 1,
                life: 40 + Math.random() * 30
            });
        }
        
        // Add special effect particles based on power-up type
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            
            this.particles.push({
                x: powerup.x + powerup.width / 2,
                y: powerup.y + powerup.height / 2,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                size: 4 + Math.random() * 2,
                type: powerup.type === 'shield' ? 'shieldGlow' : 
                      powerup.type === 'magnet' ? 'magnetGlow' : 'powerupGlow',
                alpha: 1,
                life: 50 + Math.random() * 25
            });
        }
    }

    // Draw UI elements
    drawUI() {
        // Draw score
        gameAssets.drawScore(this.ctx, this.score, 10, 10);
        
        // No visual timing indicator - hidden skill mechanic
        
        // Draw active power-up indicators
        this.drawPowerupIndicators();
        
        // Draw flying timer when active (legacy support)
        if (this.player.isFlying && this.player.flyingTimeLeft > 0 && !this.activePowerups.has('coin')) {
            const timeLeft = Math.ceil(this.player.flyingTimeLeft / 1000);
            const centerX = this.viewWidth / 2;
            const timerY = 40;
            
            // Background for timer
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            this.ctx.fillRect(centerX - 50, timerY - 15, 100, 25);
            this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(centerX - 50, timerY - 15, 100, 25);
            
            // Timer text with pulsing effect
            const pulseAlpha = 0.8 + Math.sin(Date.now() * 0.01) * 0.2;
            this.ctx.font = 'bold 16px "Fredoka", cursive';
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = `rgba(255, 215, 0, ${pulseAlpha})`;
            this.ctx.fillText(`🪙 FLYING: ${timeLeft}s`, centerX, timerY + 3);
            this.ctx.restore();
        }
        
        // Draw FPS counter (debug)
        if (this.fpsDisplay > 0) {
            this.ctx.font = '12px monospace';
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.fillText(`FPS: ${this.fpsDisplay}`, this.viewWidth - 60, 10);
        }
        
        // Game over screen is handled by overlay (showGameOverScreen), not canvas drawing
    }

    // Timing indicator removed - hidden skill mechanic

    // Draw sleek power-up indicators with circular countdown timers
    drawPowerupIndicators() {
        if (this.activePowerups.size === 0) return;
        
        this.ctx.save();
        
        // Position indicators in top-right coiner
        const startX = this.viewWidth - 45;
        const startY = 45;
        const spacing = 50;
        let index = 0;
        
        for (let [type, data] of this.activePowerups) {
            const config = gameAssets.powerUpTypes[type];
            if (!config) continue;
            
            const timeLeft = data.timeLeft / 1000; // Keep as decimal for smooth animation
            const totalDuration = config.duration / 1000;
            const progress = timeLeft / totalDuration; // 1.0 = full, 0.0 = empty
            
            const centerX = startX;
            const centerY = startY + (index * spacing);
            const radius = 18;
            
            // Get power-up specific colors and icon
            const colors = {
                coin: { bg: '#22c55e', icon: '🪙', glow: '#34d399' },
                shield: { bg: '#22c55e', icon: '🛡️', glow: '#4ade80' },
                magnet: { bg: '#fbbf24', icon: '🧲', glow: '#fcd34d' }
            };
            
            const powerupColors = colors[type] || { bg: '#6b7280', icon: '⚡', glow: '#9ca3af' };
            
            // Pulsing effect for low time (under 2 seconds)
            const isLowTime = timeLeft <= 2;
            const pulseIntensity = isLowTime ? 0.6 + Math.sin(Date.now() * 0.015) * 0.4 : 1;
            
            // Draw background circle with subtle shadow
            this.ctx.save();
            this.ctx.globalAlpha = 0.2;
            this.ctx.fillStyle = '#000000';
            this.ctx.beginPath();
            this.ctx.arc(centerX + 2, centerY + 2, radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
            
            // Draw main background circle
            this.ctx.fillStyle = `rgba(0, 0, 0, 0.7)`;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw countdown progress ring
            this.ctx.strokeStyle = powerupColors.bg;
            this.ctx.lineWidth = 3;
            this.ctx.lineCap = 'round';
            this.ctx.globalAlpha = pulseIntensity;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius - 2, -Math.PI/2, -Math.PI/2 + (progress * Math.PI * 2));
            this.ctx.stroke();
            
            // Add glow effect for low time
            if (isLowTime) {
                this.ctx.save();
                this.ctx.shadowColor = powerupColors.glow;
                this.ctx.shadowBlur = 8 * pulseIntensity;
                this.ctx.strokeStyle = powerupColors.glow;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, radius - 2, -Math.PI/2, -Math.PI/2 + (progress * Math.PI * 2));
                this.ctx.stroke();
                this.ctx.restore();
            }
            
            // Draw power-up icon
            this.ctx.globalAlpha = pulseIntensity;
            this.ctx.font = 'bold 20px "Fredoka", sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillText(powerupColors.icon, centerX, centerY);
            
            // Draw small time number for precision (only if < 10 seconds)
            if (timeLeft < 10) {
                this.ctx.font = 'bold 8px "Fredoka", sans-serif';
                this.ctx.fillStyle = isLowTime ? '#ff6b6b' : '#ffffff';
                this.ctx.globalAlpha = 0.8;
                this.ctx.fillText(Math.ceil(timeLeft).toString(), centerX, centerY + radius + 8);
            }
            
            this.ctx.globalAlpha = 1;
            index++;
        }
        
        this.ctx.restore();
    }

    // Set up input handlers
    setupInputHandlers() {
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            // Only allow deliberate actions to start a new game (no movement keys!)
            if (e.code === 'Space' && (this.gameState === 'waiting' || this.gameState === 'gameOver')) {
                e.preventDefault();
                this.startGame();
                return;
            }
            
            this.keys[e.code] = true;
            
            // Prevent arrow key scrolling
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => {
            // Start game on first mouse interaction (keep this for intentional clicks)
            if (this.gameState === 'waiting' || this.gameState === 'gameOver') {
                this.startGame();
                return;
            }
            
            this.mousePressed = true;
            this.lastMouseX = e.offsetX * (this.viewWidth / this.canvas.offsetWidth);
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.mousePressed = false;
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.mousePressed) {
                this.lastMouseX = e.offsetX * (this.viewWidth / this.canvas.offsetWidth);
            }
        });
        
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleTouchStart(e);
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleTouchEnd(e);
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.handleTouchMove(e);
        });
    }

    // EXPERT TOUCH HANDLING - ZERO LAG!
    handleTouchStart(e) {
        // Start game on first interaction
        if (this.gameState === 'waiting' || this.gameState === 'gameOver') {
            this.startGame();
            return;
        }
        
        // IMMEDIATE processing - no loops, direct touch handling
        const touch = e.changedTouches[0]; // Primary touch only for speed
        if (!touch) return;
        
            const rect = this.canvas.getBoundingClientRect();
            const x = (touch.clientX - rect.left) * (this.viewWidth / rect.width);
            
        // INSTANT zone detection - no complex calculations
        const midPoint = this.viewWidth * 0.5;
        
        if (x < midPoint - 20) {
                this.touches.left = true;
            this.touches.right = false;
        } else if (x > midPoint + 20) {
                this.touches.right = true;
            this.touches.left = false;
        } else {
            // Center zone for timing bounce
            this.centerTouchStart = Date.now();
            this.centerTouchActive = true;
        }
        
        // Store minimal touch info for tracking
        this.touches.activeTouches.set(touch.identifier, {
            x: x,
            side: x < midPoint ? 'left' : 'right'
        });
    }

    handleTouchEnd(e) {
        for (let touch of e.changedTouches) {
            const touchInfo = this.touches.activeTouches.get(touch.identifier);
            if (!touchInfo) continue;
            
        // Check for center touch timing bounce
        if (this.centerTouchActive && this.centerTouchStart > 0) {
            const touchDuration = Date.now() - this.centerTouchStart;
            
            // Timing bounce if touch held for 100-300ms in center area
            if (touchDuration >= 100 && touchDuration <= 300 && this.checkTimingBounce()) {
                this.activateTimingBounce();
            }
        }
        
            // Remove this specific touch
            this.touches.activeTouches.delete(touch.identifier);
        }
        
        // Update movement states based on remaining touches
        this.updateTouchStates();
        
        // Reset center touch if no touches remain
        if (this.touches.activeTouches.size === 0) {
        this.centerTouchStart = 0;
        this.centerTouchActive = false;
        }
    }

    // CRITICAL: Update touch states from active touches
    updateTouchStates() {
        // Safety check to prevent errors
        if (!this.touches || !this.touches.activeTouches) {
            return;
        }
        
        // Reset touch states
        this.touches.left = false;
        this.touches.right = false;
        
        // Check all active touches and set movement states
        try {
            for (let [id, touchInfo] of this.touches.activeTouches) {
                if (touchInfo && touchInfo.side === 'left') {
                    this.touches.left = true;
                } else if (touchInfo && touchInfo.side === 'right') {
                    this.touches.right = true;
                }
            }
        } catch (error) {
            // Silently handle touch state errors to prevent spam
            console.warn('Touch state update error:', error);
        }
    }

    handleTouchMove(e) {
        // ULTRA-FAST touch move - minimal processing
        const touch = e.changedTouches[0];
        if (!touch || this.centerTouchActive) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = (touch.clientX - rect.left) * (this.viewWidth / rect.width);
        const midPoint = this.viewWidth * 0.5;
        
        // INSTANT state update - no complex loops
        if (x < midPoint - 20) {
            this.touches.left = true;
            this.touches.right = false;
        } else if (x > midPoint + 20) {
            this.touches.right = true;
            this.touches.left = false;
        }
    }

    // MOBILE BUTTON HANDLER - works on all devices
    addMobileButtonHandler(button, callback) {
        let touchStarted = false;
        
        // Touch events (mobile)
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            touchStarted = true;
            button.style.transform = 'scale(0.95)';
        }, { passive: false });
        
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (touchStarted) {
                button.style.transform = 'scale(1)';
                callback();
                touchStarted = false;
            }
        }, { passive: false });
        
        button.addEventListener('touchcancel', () => {
            button.style.transform = 'scale(1)';
            touchStarted = false;
        });
        
        // Mouse events (desktop fallback)
        button.addEventListener('click', (e) => {
            if (!touchStarted) { // Prevent double-firing
                callback();
            }
        });
    }

    // Draw touch zones for mobile debugging
    drawTouchZones() {
        if (!this.detectMobileDevice()) return;
        
        this.ctx.save();
        this.ctx.globalAlpha = 0.3;
        
        // Left zone (red)
        this.ctx.fillStyle = this.touches.left ? 'rgba(255, 0, 0, 0.5)' : 'rgba(255, 0, 0, 0.2)';
        this.ctx.fillRect(this.touchDeadzone, 0, this.viewWidth * 0.4 - this.touchDeadzone, this.viewHeight);
        
        // Right zone (blue) 
        this.ctx.fillStyle = this.touches.right ? 'rgba(0, 0, 255, 0.5)' : 'rgba(0, 0, 255, 0.2)';
        this.ctx.fillRect(this.viewWidth * 0.6, 0, this.viewWidth * 0.4 - this.touchDeadzone, this.viewHeight);
        
        // Center zone (green)
        this.ctx.fillStyle = this.centerTouchActive ? 'rgba(0, 255, 0, 0.5)' : 'rgba(0, 255, 0, 0.2)';
        this.ctx.fillRect(this.viewWidth * 0.4, 0, this.viewWidth * 0.2, this.viewHeight);
        
        this.ctx.restore();
    }

    // Set up UI event handlers - MOBILE OPTIMIZED
    setupUIHandlers() {
        // Hide play button - game starts on first interaction
        const playButton = document.getElementById('playButton');
        if (playButton) {
            playButton.style.display = 'none';
        }
        
        // MOBILE-FIRST button handling - touch events for immediate response
        const leaderboardButton = document.getElementById('leaderboardButton');
        if (leaderboardButton) {
            this.addMobileButtonHandler(leaderboardButton, () => {
                if (typeof showLeaderboard === 'function') {
                    showLeaderboard();
                }
            });
        }
        
        // CRITICAL: Twitter auth button setup with mobile optimization
        const twitterAuthButton = document.getElementById('twitterAuthButton');
        if (twitterAuthButton) {
            // Ensure button is visible if user is not authenticated
            if (!twitterAuth.isAuthenticated) {
                twitterAuthButton.style.display = 'block';
                twitterAuthButton.textContent = '🐦 Connect Twitter for Contest';
                twitterAuthButton.disabled = false;
                console.log('🔧 GAME INIT: Twitter button ensured visible');
            }
            
            // Add mobile-optimized button handler
            this.addMobileButtonHandler(twitterAuthButton, async () => {
                try {
                    console.log('🎮 Starting authentication process...');
                    
                    // Show loading state
                    const originalText = twitterAuthButton.textContent;
                    twitterAuthButton.textContent = '⏳ Connecting...';
                    twitterAuthButton.disabled = true;
                    
                    const user = await twitterAuth.initiateAuth();
                    
                    console.log('✅ Authentication successful:', user);
                    
                    // Update UI and refresh game over screen
                    twitterAuth.updateUI();
                    this.showGameOverScreen();
                    
                } catch (error) {
                    console.error('Authentication failed:', error);
                    
                    // Restore button state
                    twitterAuthButton.textContent = '🐦 Connect Twitter for Contest';
                    twitterAuthButton.disabled = false;
                    
                    // Show error with better messaging
                    const errorMsg = error.message === 'Authentication cancelled' 
                        ? 'Twitter authentication cancelled' 
                        : 'Twitter authentication failed: ' + error.message;
                    this.showError(errorMsg);
                }
            });
        }
    }

    // Show overlay with optional persistence for game over screen
    showOverlay(content, persistent = false) {
        const overlay = document.getElementById('gameOverlay');
        const overlayContent = document.getElementById('overlayContent');
        
        if (overlay && overlayContent) {
            // MOBILE FIX: For game over/persistent screens, bypass the extra overlayContent container
            if (persistent) {
                // Inject content directly into overlay for cleaner mobile experience
                overlay.innerHTML = content;
                overlay.classList.add('show');
                console.log('📱 Mobile-optimized overlay: bypassed extra container');
            } else {
                // Use normal overlay structure for non-persistent overlays
                overlayContent.innerHTML = content;
                overlay.classList.add('show');
            }
            
            // Remove existing click handlers
            overlay.removeEventListener('click', this.overlayClickHandler);
            
            // Add click handler only if not persistent (game over screen should be persistent)
            if (!persistent) {
                this.overlayClickHandler = (e) => {
                    // Only close if clicking the overlay background, not the content
                    if (e.target === overlay) {
                        this.hideOverlay();
                    }
                };
                overlay.addEventListener('click', this.overlayClickHandler);
            }
        }
    }

    // Hide overlay
    hideOverlay() {
        const overlay = document.getElementById('gameOverlay');
        const overlayContent = document.getElementById('overlayContent');
        
        if (overlay) {
            overlay.classList.remove('show');
            
            // Clean up click handler
            if (this.overlayClickHandler) {
                overlay.removeEventListener('click', this.overlayClickHandler);
                this.overlayClickHandler = null;
            }
            
            // Restore original overlay structure if it was modified
            if (overlayContent && !overlay.contains(overlayContent)) {
                overlay.innerHTML = '';
                overlay.appendChild(overlayContent);
                overlayContent.innerHTML = '';
                console.log('📱 Restored original overlay structure');
            }
        }
    }

    // Show game over screen with integrated leaderboard
    async showGameOverScreen() {
        let scoreText = `${this.score.toLocaleString()}`;
        let bestScoreDisplay = '';
        let submissionStatus = '';
        
        if (this.score > this.bestScore) {
            bestScoreDisplay = `<div style="color: #fbbf24; font-weight: bold; margin: 8px 0;">🎉 NEW BEST!</div>`;
        } else if (this.bestScore > 0) {
            bestScoreDisplay = `<div style="color: #94a3b8; font-size: 0.9rem; margin: 8px 0;">Best: ${this.bestScore.toLocaleString()}</div>`;
        }
        


        // Add leaderboard submission if authenticated
        if (twitterAuth.isAuthenticated) {
            try {
                await leaderboard.submitScore(this.score);
                submissionStatus = `<div style="color: #22c55e; font-size: 0.85rem; margin: 8px 0;">✅ Score submitted!</div>`;
            } catch (error) {
                console.error('Score submission failed:', error);
                if (error.message.includes('validation failed')) {
                    submissionStatus = `<div style="color: #22c55e; font-size: 0.85rem; margin: 8px 0;">🚨 Security check failed</div>`;
                } else {
                    submissionStatus = `<div style="color: #22c55e; font-size: 0.85rem; margin: 8px 0;">⚠️ Submit failed</div>`;
                }
            }
        } else {
            submissionStatus = `<div style="color: #60a5fa; font-size: 0.85rem; margin: 8px 0;">🐦 Connect Twitter to compete!</div>`;
        }

        // Get leaderboard data for integration
        let leaderboardHTML = '';
        try {
            console.log('🏆 GAME OVER: Fetching leaderboard data...');
            // Clear any cached leaderboard data to ensure fresh fetch
            if (leaderboard && leaderboard.currentLeaderboard) {
                leaderboard.currentLeaderboard = null;
                console.log('🗑️ Cleared cached leaderboard data');
            }
            // Refresh leaderboard data using correct method
            if (leaderboard && typeof leaderboard.fetchWeeklyLeaderboard === 'function') {
                console.log('🔄 Calling leaderboard.fetchWeeklyLeaderboard()...');
                await leaderboard.fetchWeeklyLeaderboard();
                console.log('✅ Leaderboard data fetched, current length:', leaderboard.currentLeaderboard?.length || 0);
                leaderboardHTML = this.generateIntegratedLeaderboard();
                console.log('🎯 Generated leaderboard HTML length:', leaderboardHTML.length);
            } else {
                console.warn('❌ Leaderboard not available, showing placeholder');
                leaderboardHTML = this.generatePlaceholderLeaderboard();
            }
        } catch (error) {
            console.error('❌ Failed to load leaderboard:', error);
            leaderboardHTML = this.generatePlaceholderLeaderboard();
        }

        // Get player's rank for sharing
        let playerRank = null;
        if (twitterAuth.isAuthenticated && leaderboard.currentLeaderboard) {
            const playerEntry = leaderboard.currentLeaderboard.find(entry => 
                entry.user_id === twitterAuth.currentUser?.id
            );
            if (playerEntry) {
                playerRank = leaderboard.currentLeaderboard.indexOf(playerEntry) + 1;
            }
        }
        
        const content = `
            <div style="
                max-width: 320px; 
                width: 100%;
                margin: 0 auto; 
                text-align: center;
                font-family: var(--font-display);
                background: linear-gradient(145deg, rgba(0, 0, 0, 0.95), rgba(20, 20, 20, 0.9));
                border-radius: 16px;
                padding: 10px;
                backdrop-filter: blur(15px);
                border: 2px solid rgba(22, 163, 74, 0.4);
                box-shadow: 
                    0 12px 32px rgba(0, 0, 0, 0.8),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1);
                position: relative;
                box-sizing: border-box;
                max-height: 48vh;
                overflow: visible;
            ">
                <!-- Close Button -->
                <button onclick="game.hideOverlay()" style="
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    background: rgba(255, 255, 255, 0.1);
                    border: none;
                    border-radius: 50%;
                    width: 28px;
                    height: 28px;
                    color: rgba(255, 255, 255, 0.7);
                    cursor: pointer;
                    font-size: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                " onmouseover="this.style.background='rgba(255, 255, 255, 0.2)'; this.style.color='white'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'; this.style.color='rgba(255, 255, 255, 0.7)'">✕</button>
                
                <!-- Score Section - Compact like mobile -->
                <div style="margin-bottom: 10px;">
                    <h2 style="
                        color: #22c55e;
                        font-size: 1.2rem;
                        font-weight: 900;
                        margin: 0 0 8px 0;
                        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
                        text-transform: uppercase;
                    ">💀 GAME OVER</h2>
                    <div style="
                        color: #fbbf24;
                        font-size: 1.6rem;
                        font-weight: 900;
                        margin-bottom: 4px;
                        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
                    ">${scoreText}</div>
                    ${bestScoreDisplay}
                    ${submissionStatus}
                </div>

                <!-- Leaderboard Section - With internal scrolling -->
                <div style="
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 12px;
                    padding: 8px;
                    margin-bottom: 10px;
                    border: 1px solid rgba(22, 163, 74, 0.2);
                    max-height: 155px;
                    overflow-y: auto;
                ">
                    ${leaderboardHTML}
                </div>
                
                <!-- Action Buttons - Mobile style -->
                <div style="
                    display: flex;
                    gap: 8px;
                    margin-bottom: 6px;
                ">
                    <button onclick="game.startGame()" style="
                        flex: 1;
                        background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                        border: none;
                        border-radius: 8px;
                        padding: 8px;
                        color: white;
                        font-weight: 600;
                        font-size: 0.75rem;
                        cursor: pointer;
                        text-transform: uppercase;
                        box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
                        transition: all 0.2s ease;
                    " onmouseover="this.style.transform='translateY(-1px)'; this.style.background='linear-gradient(135deg, #4ade80 0%, #22c55e 100%)'" onmouseout="this.style.transform='translateY(0)'; this.style.background='linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'">
                        🎮 Play Again
                    </button>
                    
                    <!-- UNIFIED SHARE & DOWNLOAD BUTTON -->
                    ${this.score >= 500 || playerRank ? `
                        <button onclick="game.shareAndDownloadScore(${this.score}, ${playerRank || 'null'})" style="
                            flex: 1;
                            background: linear-gradient(135deg, #1d9bf0 0%, #1a8cd8 100%);
                            border: none;
                            border-radius: 8px;
                            padding: 8px;
                            color: white;
                            font-weight: 600;
                            font-size: 0.75rem;
                            cursor: pointer;
                            text-transform: uppercase;
                            box-shadow: 0 2px 8px rgba(29, 155, 240, 0.3);
                            transition: all 0.2s ease;
                        " onmouseover="this.style.transform='translateY(-1px)'; this.style.background='linear-gradient(135deg, #2ea8ff 0%, #1d9bf0 100%)'" onmouseout="this.style.transform='translateY(0)'; this.style.background='linear-gradient(135deg, #1d9bf0 0%, #1a8cd8 100%)'">
                            🐦📥 Share & Save
                        </button>
                    ` : `
                        <button onclick="leaderboard.showExpandedLeaderboard()" style="
                            flex: 1;
                            background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
                            border: none;
                            border-radius: 8px;
                            padding: 8px;
                            color: white;
                            font-weight: 600;
                            font-size: 0.75rem;
                            cursor: pointer;
                            text-transform: uppercase;
                            box-shadow: 0 2px 8px rgba(22, 163, 74, 0.3);
                            transition: all 0.2s ease;
                        " onmouseover="this.style.transform='translateY(-1px)'; this.style.background='linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'" onmouseout="this.style.transform='translateY(0)'; this.style.background='linear-gradient(135deg, #16a34a 0%, #15803d 100%)'">
                            🏆 Full Board
                        </button>
                    `}
                </div>


            </div>
        `;
        
        this.showOverlay(content, true); // Make game over screen persistent
        
        // Setup mobile-friendly button handlers after overlay is shown
        setTimeout(() => {
            console.log('🔧 Setting up mobile game over buttons...');
            this.setupGameOverButtons(playerRank);
        }, 100); // Increased delay to ensure DOM is ready
    }

    // Setup mobile-optimized button handlers for game over screen
    setupGameOverButtons(playerRank) {
        // Play Again button - multiple fallback selectors
        let playAgainBtn = document.querySelector('button[onclick*="game.startGame"]');
        
        // Fallback 1: Look for button containing "Play Again" text
        if (!playAgainBtn) {
            const buttons = document.querySelectorAll('button');
            for (let btn of buttons) {
                if (btn.textContent && (btn.textContent.includes('Play Again') || btn.textContent.includes('🎮'))) {
                    playAgainBtn = btn;
                    console.log('🔍 Found Play Again button via text search:', btn.textContent.trim());
                    break;
                }
            }
        }
        
        // Fallback 2: Look for most recent button added to the DOM
        if (!playAgainBtn) {
            const allButtons = Array.from(document.querySelectorAll('button'));
            playAgainBtn = allButtons[allButtons.length - 1]; // Try the last button
            if (playAgainBtn) {
                console.log('🔍 Using last button as Play Again fallback:', playAgainBtn.textContent?.trim());
            }
        }
        
        if (playAgainBtn) {
            playAgainBtn.removeAttribute('onclick');
            this.addMobileButtonHandler(playAgainBtn, () => {
                console.log('🎮 Play Again button pressed via mobile handler');
                this.startGame();
            });
            console.log('✅ Play Again button mobile handler attached');
        } else {
            console.warn('❌ Play Again button not found for mobile optimization');
        }
        
        // Share button (if score is high enough)
        const shareBtn = document.querySelector('button[onclick*="shareAndDownloadScore"]');
        if (shareBtn) {
            shareBtn.removeAttribute('onclick');
            this.addMobileButtonHandler(shareBtn, () => {
                this.shareAndDownloadScore(this.score, playerRank);
            });
        }
        
        // Leaderboard button
        const leaderboardBtn = document.querySelector('button[onclick*="leaderboard.showExpandedLeaderboard"]');
        if (leaderboardBtn) {
            leaderboardBtn.removeAttribute('onclick');
            this.addMobileButtonHandler(leaderboardBtn, () => {
                if (typeof leaderboard !== 'undefined' && leaderboard.showExpandedLeaderboard) {
                    leaderboard.showExpandedLeaderboard();
                }
            });
        }
        
        // Close button
        const closeBtn = document.querySelector('button[onclick*="game.hideOverlay"]');
        if (closeBtn) {
            closeBtn.removeAttribute('onclick');
            this.addMobileButtonHandler(closeBtn, () => this.hideOverlay());
        }
        
        // Start button in waiting screen
        const startBtn = document.querySelector('button[onclick*="game.startGame"]');
        if (startBtn && startBtn !== playAgainBtn) {
            startBtn.removeAttribute('onclick');
            this.addMobileButtonHandler(startBtn, () => this.startGame());
        }
    }

    // Generate compact leaderboard HTML - mobile style for desktop
    generateIntegratedLeaderboard() {
        if (!leaderboard.currentLeaderboard || leaderboard.currentLeaderboard.length === 0) {
            return `
                <div style="text-align: center; padding: 16px; color: #94a3b8;">
                    <div style="font-size: 2rem; margin-bottom: 8px;">🐸</div>
                    <h3 style="color: #fbbf24; margin: 0 0 8px 0; font-size: 1.1rem;">🏆 Weekly Leaderboard</h3>
                    <p style="margin: 0; font-size: 0.9rem;">No scores yet this week!</p>
                    <p style="font-size: 0.8rem; color: #fbbf24; margin: 4px 0 0 0;">Be the first Pogo champion!</p>
                </div>
            `;
        }

        let html = `
            <div style="text-align: center; margin-bottom: 12px;">
                <h3 style="color: #fbbf24; margin: 0 0 4px 0; font-size: 1.1rem;">🏆 Leaderboard</h3>
                <div style="font-size: 0.65rem; color: #94a3b8; margin: 0;">
                    Resets in: <strong style="color: #fbbf24;">${leaderboard.getTimeUntilReset()}</strong>
                </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 2px; overflow: visible;">
        `;

        // Show top 8 entries - more entries with scrolling
        const maxEntries = 8;
        leaderboard.currentLeaderboard.slice(0, maxEntries).forEach((entry, index) => {
            if (!entry || typeof entry.score !== 'number' || !entry.username) {
                return;
            }
            
            const rank = index + 1;
            const isCurrentUser = twitterAuth.isAuthenticated && 
                                entry.user_id === twitterAuth.currentUser?.id;
            
            const rankEmoji = leaderboard.getRankEmoji(rank);
            
            // Check if recent score
            let isRecentScore = false;
            if (entry.created_at) {
                try {
                    isRecentScore = Date.now() - new Date(entry.created_at).getTime() < 300000; // 5 minutes
                } catch (e) {
                    // Invalid date format, ignore
                }
            }
            const liveIndicator = isRecentScore ? ' 🔴' : '';
            
            html += `
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 6px 8px;
                    background: ${isCurrentUser ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
                    border-radius: 6px;
                    border: ${isCurrentUser ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)'};
                    font-size: 0.8rem;
                ">
                    <span style="color: #22c55e; font-weight: 700; min-width: 24px;">${rankEmoji}</span>
                    <span style="flex: 1; text-align: left; margin-left: 8px; font-weight: 600; color: ${isCurrentUser ? '#fbbf24' : '#e2e8f0'};">
                        <a href="https://twitter.com/${entry.username}" target="_blank" rel="noopener noreferrer" 
                           style="color: inherit; text-decoration: none;">
                            @${entry.username}
                        </a>${liveIndicator}
                    </span>
                    <span style="color: #fbbf24; font-weight: 700; text-shadow: 1px 1px 0px #16a34a;">
                        ${entry.score.toLocaleString()}
                    </span>
                </div>
            `;
        });

        html += '</div>';

        // Add "View Full Leaderboard" link if there are more entries
        if (leaderboard.currentLeaderboard.length > maxEntries) {
            html += `
                <div style="text-align: center; margin-top: 12px;">
                    <button onclick="leaderboard.showExpandedLeaderboard()" style="
                        background: rgba(22, 163, 74, 0.2);
                        color: #22c55e;
                        border: 1px solid rgba(22, 163, 74, 0.4);
                        border-radius: 6px;
                        padding: 6px 12px;
                        font-size: 0.75rem;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    " onmouseover="this.style.background='rgba(22, 163, 74, 0.3)'" onmouseout="this.style.background='rgba(22, 163, 74, 0.2)'">
                        View All ${leaderboard.currentLeaderboard.length} Players →
                    </button>
                </div>
            `;
        }

        return html;
    }

    // Generate placeholder leaderboard when data unavailable
    generatePlaceholderLeaderboard() {
        return `
            <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                <div style="font-size: 2rem; margin-bottom: 8px;">🐸</div>
                <h3 style="color: #fbbf24; margin: 0 0 8px 0;">🏆 Weekly Leaderboard</h3>
                <p style="margin: 0; font-size: 0.9rem;">Loading leaderboard...</p>
            </div>
        `;
    }

    // Unified share and download function
    async shareAndDownloadScore(score, rank = null) {
        try {
            // Generate trophy image first
            const trophyCanvas = await this.generateTrophyCanvas(score, rank);
            
            if (trophyCanvas) {
                // Download the image
                const link = document.createElement('a');
                link.download = `mojo-champion-${score}-${Date.now()}.png`;
                link.href = trophyCanvas.toDataURL();
                link.click();
                
                this.showNotification('🏆 Trophy image downloaded!', 'success');
            }
            
            // Share on Twitter (no auth needed for web intent)
            let tweetText = `🐸 Just scored ${score.toLocaleString()} points in POGO LEAP! 🎮`;
            
            if (rank) {
                if (rank === 1) {
                    tweetText += `\n\n🥇 I'm currently #1 on the leaderboard! 🏆`;
                } else if (rank <= 3) {
                    tweetText += `\n\n🏅 Ranked #${rank} on the leaderboard!`;
                } else if (rank <= 10) {
                    tweetText += `\n\n🎯 Made it to the top 10 at rank #${rank}!`;
                } else {
                    tweetText += `\n\n📈 Ranked #${rank} on the leaderboard!`;
                }
            }

            tweetText += `\n\nCan you beat my score? 🤔\n\nPlay now: ${window.location.origin}`;

            const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
            
            const shareWindow = window.open(
                tweetUrl,
                'twitterShare',
                'width=550,height=420,scrollbars=yes,resizable=yes'
            );

            if (shareWindow) {
                this.showNotification('🐦 Twitter share opened!', 'success');
            } else {
                this.showNotification('⚠️ Please allow popups for sharing', 'warning');
            }

        } catch (error) {
            console.error('Share and download error:', error);
            this.showNotification('❌ Share and download failed', 'error');
        }
    }

    // Generate trophy canvas for download
    async generateTrophyCanvas(score, rank) {
        try {
            if (!window.trophyGenerator) {
                console.error('Trophy generator not available');
                return null;
            }

            const playerData = {
                username: twitterAuth.currentUser?.username || 'Anonymous',
                score: score,
                rank: rank || null
            };

            return await window.trophyGenerator.generateTrophy(playerData);
        } catch (error) {
            console.error('Trophy canvas generation error:', error);
            return null;
        }
    }

    // Update score display
    updateScoreDisplay() {
        const currentScoreElement = document.getElementById('currentScore');
        const bestScoreElement = document.getElementById('bestScore');
        
        if (currentScoreElement) {
            currentScoreElement.textContent = this.score.toLocaleString();
        }
        
        if (bestScoreElement) {
            bestScoreElement.textContent = this.bestScore.toLocaleString();
        }
    }

    // Load best score from localStorage
    loadBestScore() {
        try {
            const stored = localStorage.getItem('pogo_leap_best_score');
            this.bestScore = stored ? parseInt(stored, 10) : 0;
            this.updateScoreDisplay();
        } catch (error) {
            console.error('Failed to load best score:', error);
        }
    }

    // Save best score to localStorage
    saveBestScore() {
        try {
            localStorage.setItem('pogo_leap_best_score', this.bestScore.toString());
        } catch (error) {
            console.error('Failed to save best score:', error);
        }
    }

    // OLD PLAY SOUND METHOD - REMOVED (Using enhanced version at line 2907)

    // Show start instructions
    showStartInstructions() {
        this.showOverlay(`
            <div class="game-start-card">
                <img src="game/token.png" alt="Pogo riding a pogo stick" class="game-start-image jump-animation">
                <span class="game-start-kicker">Ready for a run?</span>
                <h1>POGO LEAP</h1>
                <p>Use the arrow keys or tap either side. Land on platforms, avoid hazards, and collect stars.</p>
                <button type="button" class="game-start-button" onclick="game.startGame()">Start climbing</button>
            </div>
        `);
    }

    // Show error message
    showError(message) {
        console.error(message);
        this.showOverlay(`
            <h3>❌ Error</h3>
            <p>${message}</p>
            <button onclick="game.hideOverlay()" class="game-btn secondary">OK</button>
        `);
    }

    // Start game loop
    startGameLoop() {
        this.lastFrameTime = performance.now();
        requestAnimationFrame((time) => this.gameLoop(time));
        console.log('🔄 Game loop started');
    }

    // Update FPS counter
    updateFPSCounter(currentTime) {
        this.frameCount++;
        
        if (currentTime - this.lastFPSTime >= 1000) {
            this.fpsDisplay = this.frameCount;
            this.frameCount = 0;
            this.lastFPSTime = currentTime;
        }
    }

    // Generate trophy image for sharing (now shows preview)
    async generateTrophyImage() {
        try {
            console.log('🏆 Generating trophy preview...');
            
            // Get player information
            const username = twitterAuth.isAuthenticated ? twitterAuth.currentUser.username : null;
            
            // Try to get player's rank from leaderboard
            let rank = null;
            if (leaderboard && leaderboard.currentLeaderboard) {
                const playerEntry = leaderboard.currentLeaderboard.find(entry => 
                    twitterAuth.isAuthenticated && entry.user_id === twitterAuth.currentUser.id
                );
                if (playerEntry) {
                    rank = leaderboard.currentLeaderboard.indexOf(playerEntry) + 1;
                }
            }
            
            // Prepare player data for trophy generation
            const playerData = {
                score: this.score,
                username: username,
                rank: rank,
                gameMode: 'Daily Contest',
                date: new Date().toLocaleDateString()
            };
            
            // Check if trophy generator is available
            if (typeof trophyGenerator === 'undefined') {
                console.error('Trophy generator not available');
                this.showNotification('❌ Trophy generator not available', 'error');
                return;
            }
            
            // Wait for trophy image to load if needed
            if (!trophyGenerator.isLoaded) {
                this.showNotification('⏳ Loading trophy image...', 'info');
                await trophyGenerator.loadTrophyImage();
            }
            
            // Generate and show preview (new method)
            const result = await trophyGenerator.generateAndPreview(playerData);
            
            if (result.success) {
                console.log('✅ Trophy preview shown');
            } else {
                this.showNotification('❌ Failed to generate trophy: ' + result.error, 'error');
                console.error('Trophy generation failed:', result.error);
            }
            
        } catch (error) {
            console.error('Trophy generation error:', error);
            this.showNotification('❌ Trophy generation failed', 'error');
        }
    }

    // Show notification to user
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (!notification) {
            console.log('Notification:', message);
            return;
        }
        
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        // Auto-hide after 4 seconds
        setTimeout(() => {
            notification.className = 'notification';
        }, 4000);
    }

    // Share achievement on Twitter
    async shareOnTwitter() {
        try {
            if (!twitterAuth.isAuthenticated) {
                this.showNotification('❌ Please connect Twitter first', 'error');
                return;
            }

            // Get player's rank if available
            let rank = null;
            if (leaderboard && leaderboard.currentLeaderboard) {
                const playerEntry = leaderboard.currentLeaderboard.find(entry => 
                    entry.user_id === twitterAuth.currentUser.id
                );
                if (playerEntry) {
                    rank = leaderboard.currentLeaderboard.indexOf(playerEntry) + 1;
                }
            }

            console.log('🐦 Sharing achievement on Twitter...');
            const success = await twitterAuth.shareAchievement(this.score, rank);
            
            if (success) {
                this.showNotification('🐦 Twitter share window opened!', 'success');
            } else {
                this.showNotification('❌ Failed to open Twitter share', 'error');
            }

        } catch (error) {
            console.error('Twitter sharing error:', error);
            this.showNotification('❌ Twitter sharing failed', 'error');
        }
    }

    // Generate trophy and share on Twitter
    async generateAndShareTrophy() {
        try {
            if (!twitterAuth.isAuthenticated) {
                this.showNotification('❌ Please connect Twitter first', 'error');
                return;
            }

            console.log('🏆 Generating trophy and preparing Twitter share...');
            
            // First generate the trophy image
            const trophyResult = await this.generateTrophyImage();
            if (!trophyResult) return;

            // Get player's rank
            let rank = null;
            if (leaderboard && leaderboard.currentLeaderboard) {
                const playerEntry = leaderboard.currentLeaderboard.find(entry => 
                    entry.user_id === twitterAuth.currentUser.id
                );
                if (playerEntry) {
                    rank = leaderboard.currentLeaderboard.indexOf(playerEntry) + 1;
                }
            }

            // Share achievement on Twitter
            console.log('🐦 Opening Twitter share for trophy...');
            const shareSuccess = await twitterAuth.shareTrophyAchievement(this.score, rank);
            
            if (shareSuccess) {
                this.showNotification('🏆 Trophy generated! Twitter share opened!', 'success');
            } else {
                this.showNotification('🏆 Trophy generated! Twitter share failed.', 'error');
            }

        } catch (error) {
            console.error('Trophy share error:', error);
            this.showNotification('❌ Trophy sharing failed', 'error');
        }
    }
    
    // Initialize achievement system
    initializeAchievements() {
        const achievementDefs = [
            // Height achievements - Updated for accessible biome transitions
            { id: 'first_jump', name: 'Baby Steps', description: 'Jump on your first platform', requirement: 1, type: 'platformsJumped' },
            { id: 'city_heights', name: 'City Explorer', description: 'Reach the City Heights biome (2000px)', requirement: 2000, type: 'height' },
            { id: 'cloud_nine', name: 'Head in the Clouds', description: 'Reach the Cloud Nine biome (8000px)', requirement: 8000, type: 'height' },
            { id: 'stratosphere', name: 'Space Cadet', description: 'Reach the Stratosphere biome (20000px)', requirement: 20000, type: 'height' },
            { id: 'deep_space', name: 'Cosmic Frog', description: 'Reach Deep Space biome (40000px)', requirement: 40000, type: 'height' },
            
            // Combat achievements
            { id: 'first_toad', name: 'Toad Slayer', description: 'Defeat your first Evil Toad', requirement: 1, type: 'evilToadsDefeated' },
            { id: 'toad_hunter', name: 'Toad Hunter', description: 'Defeat 10 Evil Toads', requirement: 10, type: 'evilToadsDefeated' },
            
            // Collection achievements
            { id: 'token_lover', name: 'Token Lover', description: 'Collect 25 tokens in one game', requirement: 25, type: 'tokensCollected' },
            { id: 'powerup_master', name: 'Power-up Master', description: 'Collect 15 power-ups in one game', requirement: 15, type: 'powerupsCollected' },
            
            // Skill achievements
            { id: 'perfect_start', name: 'Perfect Start', description: '10 perfect platform landings', requirement: 10, type: 'perfectLandings' },
            { id: 'high_scorer', name: 'High Scorer', description: 'Score over 50K points', requirement: 50000, type: 'score' },
            { id: 'elite_scorer', name: 'Elite Scorer', description: 'Score over 500K points', requirement: 500000, type: 'score' },
            { id: 'legendary_scorer', name: 'Legendary Scorer', description: 'Score over 2M points', requirement: 2000000, type: 'score' },
            { id: 'mythic_scorer', name: 'Mythic Scorer', description: 'Score over 5M points', requirement: 5000000, type: 'score' },
            { id: 'transcendent_scorer', name: 'Transcendent Scorer', description: 'Score over 10M points', requirement: 10000000, type: 'score' },
            
            // Special achievements
            { id: 'biome_explorer', name: 'Biome Explorer', description: 'Visit all 5 biomes in one game', requirement: 5, type: 'biomesReached' },
            { id: 'million_point_club', name: 'Million Point Club', description: 'Join the elite million point club', requirement: 1000000, type: 'score' },
            { id: 'ultimate_pogo', name: 'Ultimate Pogo', description: 'Reach the Transcendent Cosmos', requirement: 1000000, type: 'height' }
        ];
        
        // Initialize all achievements as locked
        achievementDefs.forEach(ach => {
            this.achievements.set(ach.id, { ...ach, unlocked: false, unlockedAt: null });
        });
    }
    
    // Check and unlock achievements
    checkAchievements() {
        this.achievements.forEach((achievement, id) => {
            if (achievement.unlocked) return; // Already unlocked
            
            let currentValue = 0;
            switch (achievement.type) {
                case 'platformsJumped':
                    currentValue = this.sessionStats.platformsJumped;
                    break;
                case 'height':
                    currentValue = Math.abs(this.player.y);
                    break;
                case 'evilToadsDefeated':
                    currentValue = this.sessionStats.evilToadsDefeated;
                    break;
                case 'tokensCollected':
                    currentValue = this.sessionStats.tokensCollected;
                    break;
                case 'powerupsCollected':
                    currentValue = this.sessionStats.powerupsCollected;
                    break;
                case 'perfectLandings':
                    currentValue = this.sessionStats.perfectLandings;
                    break;
                case 'score':
                    currentValue = this.score;
                    break;
                case 'biomesReached':
                    currentValue = this.sessionStats.biomesReached.size;
                    break;
            }
            
            if (currentValue >= achievement.requirement) {
                this.unlockAchievement(id);
            }
        });
    }
    
    // Unlock specific achievement
    unlockAchievement(achievementId) {
        const achievement = this.achievements.get(achievementId);
        if (!achievement || achievement.unlocked) return;
        
        achievement.unlocked = true;
        achievement.unlockedAt = Date.now();
        
        // Show achievement notification
        this.showAchievementNotification(achievement);
        
        // Play achievement sound
        this.playSound('achievement');
        
        console.log(`🏆 Achievement unlocked: ${achievement.name} - ${achievement.description}`);
    }
    
    // Show achievement notification
    showAchievementNotification(achievement) {
        // This could integrate with your existing notification system
        this.showNotification(`🏆 ${achievement.name}`, 'achievement');
    }
    
    // Update session stats (called from various game events)
    updateSessionStats(type, value = 1) {
        switch (type) {
            case 'platformJump':
                this.sessionStats.platformsJumped += value;
                break;
            case 'evilToadDefeated':
                this.sessionStats.evilToadsDefeated += value;
                break;
            case 'tokenCollected':
                this.sessionStats.tokensCollected += value;
                break;
            case 'powerupCollected':
                this.sessionStats.powerupsCollected += value;
                break;
            case 'perfectLanding':
                this.sessionStats.perfectLandings += value;
                break;
            case 'biomeReached':
                const currentBiome = gameAssets.getCurrentBiome(Math.abs(this.player.y));
                this.sessionStats.biomesReached.add(currentBiome.name);
                break;
        }
        
        // Check for new achievements
        this.checkAchievements();
    }
    
    // Update dynamic music tempo based on height and difficulty
    updateMusicTempo() {
        const now = Date.now();
        
        // Throttle updates to every 500ms for performance
        if (now - this.audioState.lastTempoUpdate < 500) return;
        this.audioState.lastTempoUpdate = now;
        
        const playerHeight = Math.abs(this.player.y);
        const currentBiome = gameAssets.getCurrentBiome(playerHeight);
        
        // Calculate tempo based on height - SCALED FOR MULTI-MILLION SCORES
        const heightFactor = Math.min(playerHeight / 1000000, 1); // 0-1 over 10M points (1M pixels)
        const baseTempo = 1.0 + (heightFactor * 0.5); // 1.0 to 1.5
        
        // Add slight variation based on player velocity for dynamic feel
        const velocityFactor = Math.abs(this.player.velocityY) / 20; // Normalize velocity
        const dynamicTempo = baseTempo + (velocityFactor * 0.1); // Slight tempo boost when moving fast
        
        // Clamp tempo to reasonable range
        this.audioState.musicTempo = Math.max(0.8, Math.min(1.8, dynamicTempo));
        
        // Log tempo changes for debugging
        if (Math.abs(this.audioState.musicTempo - baseTempo) > 0.05) {
            console.log(`🎵 Music tempo: ${this.audioState.musicTempo.toFixed(2)}x (${currentBiome.name})`);
        }
    }
    
    // Enhanced playSound method with dynamic tempo
    playSound(soundType) {
        if (!window.audioEnabled) {
            return;
        }
        
        // Debug: console.log(`🎵 Attempting to play sound: ${soundType}, audioEnabled: ${window.audioEnabled}`);
        
        try {
            // Get sound configuration from assets
            const soundConfig = gameAssets.sounds[soundType];
            if (!soundConfig) {
                console.warn(`🚨 Sound type '${soundType}' not found, using default`);
                playTone(400, 0.1);
                return;
            }
            
            // Debug: console.log(`🎵 Playing sound: ${soundType} (${soundConfig.frequency}Hz, ${soundConfig.duration}s)`);
            
            // Apply dynamic tempo to frequency and duration
            const tempoFactor = this.audioState.musicTempo;
            const adjustedFrequency = soundConfig.frequency * (1 + (tempoFactor - 1) * 0.3); // Slight frequency boost
            const adjustedDuration = soundConfig.duration / tempoFactor; // Faster sounds at high tempo
            
            // Apply different volume levels based on sound type
            let volume = 0.1; // Default volume
            if (soundType.includes('powerup')) {
                volume = 0.15; // Louder for power-ups
            } else if (soundType.includes('bounce') || soundType.includes('spring')) {
                volume = 0.12; // Slightly louder for bounces
            } else if (soundType.includes('milestone') || soundType === 'achievement') {
                volume = 0.18; // Louder for achievements
            }
            
            // Play the tone with tempo adjustments and dynamic volume
            playTone(adjustedFrequency, adjustedDuration, 'sine', volume);
            
        } catch (e) {
            console.warn('Enhanced audio playback failed:', e);
            // Fallback to simple tone
            playTone(400, 0.1);
        }
    }
}

// Global game instance
let game = null;

// Initialize game when called
async function initializeGame() {
    if (!game) {
        game = new PogoLeapGame();
        window.game = game;
        await game.initialize();
    }
}

// Export for global access
window.game = game;

console.log('🎮 Game module loaded');
console.log('🎮 Game module loaded');
