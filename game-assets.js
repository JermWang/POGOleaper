// ===== POGO LEAP - GAME ASSETS MODULE =====

/**
 * Game Assets Manager
 * Handles all visual assets, colors, and theme configuration for Pogo Leap
 * Designed to be easily updatable for different themes or art styles
 */

class GameAssets {
    constructor() {
        this.loaded = false;
        this.loadingProgress = 0;
        this.images = {};
        this.sprites = {};
        this.colors = this.getColorPalette();
        this.sounds = this.getSoundEffects();
        this.config = this.getGameConfig();
        this.lastLoggedHeight = -1; // For debug logging
        
        // Asset paths - ALL ASSETS IN GAME SUBDIRECTORY FOR CONSISTENCY
        this.assetPaths = {
            // Main player sprite: Pogo riding the pogo stick
            player: 'game/token.png',

            // Legacy player sprites kept as a graceful loading fallback
            jump: 'game/jump.png',
            leftJump: 'game/left_jump.png',
            rightJump: 'game/right_jump.png', 
            walk: 'game/walk.png',

            // Enemies/obstacles
            evilToad: 'game/evil-toad.png'
        };
        
        // Power-ups use their own star language instead of reusing Pogo artwork.
        this.powerUpTypes = {
            coin: {
                name: 'Fly Boost',
                description: 'Super jump power!',
                duration: 3000, // 3 seconds (reduced from 5)
                color: '#34d399',
                edgeColor: '#047857',
                rarity: 0.4 // Increased back to 40% to counter evil platforms
            },
            shield: {
                name: 'Shield Power', 
                description: 'Invincibility protection!',
                duration: 4000, // 4 seconds
                color: '#60a5fa',
                edgeColor: '#1d4ed8',
                rarity: 0.25 // Medium chance for shield
            },
            magnet: {
                name: 'Star Magnet',
                description: 'Auto-collect nearby stars!',
                duration: 6000, // 6 seconds
                color: '#f472b6',
                edgeColor: '#be185d',
                rarity: 0.35 // Good chance for magnet
            }
        };
        
        // Start loading assets
        this.loadAssets();
    }

    // Get current biome based on height - SCALED FOR MULTI-MILLION SCORES
    getCurrentBiome(height) {
        const absHeight = Math.abs(height);
        
        // Debug: Biome transitions (uncomment to debug)
        // if (Math.floor(absHeight / 100) !== this.lastLoggedHeight) {
        //     console.log(`🌍 Player height: ${absHeight.toFixed(0)}px, Current biome: ${this.getBiomeName(absHeight)}, Thresholds - Ground: <2000, City: <8000, Clouds: <20000, Space: <40000`);
        //     this.lastLoggedHeight = Math.floor(absHeight / 100);
        // }
        
        // Adjusted for more accessible biome transitions and longer restaurant area
        if (absHeight < 2000) return this.colors.biomes.ground;        // 0-2000px (early game restaurant area)
        else if (absHeight < 8000) return this.colors.biomes.city;     // 2000-8000px (city heights)
        else if (absHeight < 20000) return this.colors.biomes.clouds;  // 8000-20000px (cloud level)
        else if (absHeight < 40000) return this.colors.biomes.space;   // 20000-40000px (space)
        else return this.colors.biomes.cosmos;                         // 40000px+ (deep space)
    }
    
    // Helper function to get biome name for debugging
    getBiomeName(height) {
        const absHeight = Math.abs(height);
        if (absHeight < 2000) return 'Lily Pad Pond';
        else if (absHeight < 8000) return 'Elite City Heights';
        else if (absHeight < 20000) return 'Legendary Cloud Nine';
        else if (absHeight < 40000) return 'Mythic Stratosphere';
        else return 'Transcendent Cosmos';
    }
    
    // Get next biome for smooth transitions
    getNextBiome(height) {
        const absHeight = Math.abs(height);
        
        if (absHeight < 2000) return this.colors.biomes.city;
        else if (absHeight < 8000) return this.colors.biomes.clouds;
        else if (absHeight < 20000) return this.colors.biomes.space;
        else if (absHeight < 40000) return this.colors.biomes.cosmos;
        else return this.colors.biomes.cosmos; // Stay in deep space
    }
    
    // Get the starting height of current biome
    getBiomeStartHeight(height) {
        const absHeight = Math.abs(height);
        
        if (absHeight < 2000) return 0;
        else if (absHeight < 8000) return 2000;
        else if (absHeight < 20000) return 8000;
        else if (absHeight < 40000) return 20000;
        else return 40000;
    }
    
    // Interpolate between two colors
    interpolateColor(color1, color2, factor) {
        // Convert hex to RGB
        const hex1 = color1.replace('#', '');
        const hex2 = color2.replace('#', '');
        
        const r1 = parseInt(hex1.substr(0, 2), 16);
        const g1 = parseInt(hex1.substr(2, 2), 16);
        const b1 = parseInt(hex1.substr(4, 2), 16);
        
        const r2 = parseInt(hex2.substr(0, 2), 16);
        const g2 = parseInt(hex2.substr(2, 2), 16);
        const b2 = parseInt(hex2.substr(4, 2), 16);
        
        // Interpolate
        const r = Math.round(r1 + (r2 - r1) * factor);
        const g = Math.round(g1 + (g2 - g1) * factor);
        const b = Math.round(b1 + (b2 - b1) * factor);
        
        // Convert back to hex
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    // Color palette matching the restaurant theme
    getColorPalette() {
        return {
            // Biome-based sky colors (height-dependent)
            biomes: {
                ground: { // 0-2K pixels - The pond (matches the site background)
                    skyTop: '#dcfd52',    // Lime pond sky
                    skyMiddle: '#eaffa3', // Soft lime haze
                    skyBottom: '#45c8f2', // Pond water blue
                    particleColor: '#dcfd52', // Lime pollen
                    name: 'Lily Pad Pond'
                },
                city: { // 2K-8K pixels - Reeds & cattails above the water
                    skyTop: '#8fd24a',    // Meadow green
                    skyMiddle: '#bfe86a', // Warm lime
                    skyBottom: '#79c98f', // Marsh green
                    particleColor: '#eaffa3',
                    name: 'Cattail Marsh'
                },
                clouds: { // 8K-20K pixels - Misty canopy
                    skyTop: '#cfe8d6',    // Soft mint mist
                    skyMiddle: '#eef9ee', // Pale haze
                    skyBottom: '#bfe0c8', // Green-white
                    particleColor: '#ffffff',
                    name: 'Misty Canopy'
                },
                space: { // 20K+ pixels - Twilight leap
                    skyTop: '#241f43',    // Deep dusk
                    skyMiddle: '#4b3b7a', // Twilight purple
                    skyBottom: '#a06fc0', // Sunset lilac
                    particleColor: '#fbbf24',
                    name: 'Twilight Leap'
                },
                cosmos: { // 40K+ pixels - To the moon
                    skyTop: '#04040d',    // Night sky
                    skyMiddle: '#0a1230', // Deep space
                    skyBottom: '#14203c', // Midnight pond reflection
                    particleColor: '#ffffff',
                    name: 'Cosmic Pond'
                }
            },
            
            // Legacy sky colors (REMOVED - using biome system only)
            
            // Platform colors - STRATEGIC BOUNCE SYSTEM
            platform: {
                normal: '#3aab30',        // Lily pad green
                spring: '#22c55e',        // Green - Standard spring (1.7x bounce)
                superspring: '#ffd700',   // Bright Gold - MEGA spring (2.1x bounce)
                minispring: '#87ceeb',    // Light Blue - Mini spring (1.35x bounce)
                moving: '#3aab30',        // Lily pad green
                breaking: '#5c8a3a',      // Wilting reed green
                cloud: '#ffffff',
                ice: '#add8e6',           // Light blue - Slippery ice platform
                disappearing: '#6b8f3a',  // Fading lily pad
                evil: '#7c2d12'
            },
            
            // Player colors (Pogo)
            player: {
                body: '#fbbf24',
                beak: '#22c55e',
                eye: '#000000',
                hat: '#16a34a'
            },
            
            // UI colors
            ui: {
                score: '#fbbf24',
                shadow: 'rgba(0, 0, 0, 0.3)',
                text: '#ffffff',
                textShadow: 'rgba(0, 0, 0, 0.5)'
            },
            
            // Particle effects
            particles: {
                feather: '#fbbf24',
                spark: '#ffffff',
                trail: 'rgba(251, 191, 36, 0.6)',
                tokenSpark: '#FF8C00', // Orange token collection sparks! 🌮
                powerupGlow: '#00ff88', // Power-up collection glow
                shieldGlow: '#ff4444', // Evil shield glow
                magnetGlow: '#ffaa00'  // Magnet field glow
            },
            
            // Power-up effect colors
            powerups: {
                coin: '#22c55e',     // Green for super flight
                shield: '#22c55e',   // Red for evil shield  
                magnet: '#fbbf24',   // Yellow for token magnet
                glowIntensity: 0.8
            }
        };
    }

    // Sound effect configuration - ENHANCED FOR ADDICTIVE AUDIO! 🎵
    getSoundEffects() {
        return {
            // === CORE MOVEMENT SOUNDS ===
            jump: { frequency: 400, duration: 0.1 },
            platform: { frequency: 300, duration: 0.05 },
            bounce: { frequency: 650, duration: 0.12 }, // Enhanced bounce sound for normal platforms
            
            // === ENHANCED PLATFORM SOUNDS ===
            springBounce: { frequency: 800, duration: 0.2 }, // Standard spring - satisfying pop! 🟢
            superSpringBounce: { frequency: 1200, duration: 0.4 }, // MEGA spring - epic launch! 🟡
            miniSpringBounce: { frequency: 650, duration: 0.15 }, // Mini spring - cute hop! 🔵
            movingPlatform: { frequency: 420, duration: 0.08 }, // Moving platform wobble
            breakingPlatform: { frequency: 180, duration: 0.6 }, // Platform breaking - ominous crack!
            cloudPlatform: { frequency: 550, duration: 0.12 }, // Soft cloud bounce - airy feel
            icePlatform: { frequency: 750, duration: 0.1 }, // Ice platform - crystalline chime
            disappearingPlatform: { frequency: 200, duration: 0.3 }, // Disappearing platform - fading whistle
            evilPlatform: { frequency: 150, duration: 0.4 }, // Evil platform - ominous low tone
            
            // === COLLECTION & REWARD SOUNDS ===
            powerup: { frequency: 800, duration: 0.2 },
            token: { frequency: 660, duration: 0.2 }, // Token collection sound! 🌮
            tokenStreak: { frequency: 880, duration: 0.3 }, // Multiple tokens in a row! 🌮🌮
            score: { frequency: 523, duration: 0.1 },
            scoreStreak: { frequency: 740, duration: 0.15 }, // Rapid scoring combo!
            comboBonus: { frequency: 987, duration: 0.4 }, // Combo multiplier achieved! ⚡
            
            // === MILESTONE SOUNDS ===
            milestone100: { frequency: 600, duration: 0.3 }, // Every 100 points - gentle chime
            milestone500: { frequency: 800, duration: 0.4 }, // Every 500 points - satisfying ding
            milestone1000: { frequency: 1100, duration: 0.6 }, // Every 1000 points - epic fanfare!
            newPersonalBest: { frequency: 1400, duration: 1.0 }, // New high score - celebration!
            achievement: { frequency: 1200, duration: 0.8 }, // Achievement unlocked! 🏆
            
            // === POWER-UP ENHANCED SOUNDS ===
            flying: { frequency: 880, duration: 0.4 }, // Flying power-up sound! 🪙✈️
            powerupCoin: { frequency: 1200, duration: 0.6 }, // Super flight activation! 🪙 - More exciting!
            powerupShield: { frequency: 600, duration: 0.8 }, // Shield activation! 🛡️ - More powerful!
            powerupMagnet: { frequency: 950, duration: 0.5 }, // Token magnet activation! 🧲 - More magnetic!
            powerupExpire: { frequency: 350, duration: 0.3 }, // Power-up expiring
            powerupLowTime: { frequency: 450, duration: 0.1 }, // Power-up running out - warning beep
            
            // === PERFECT TIMING & SKILL SOUNDS ===
            perfectBounce: { frequency: 1200, duration: 0.3 }, // Perfect timing bounce! ⚡
            skillStreak: { frequency: 1050, duration: 0.25 }, // Multiple perfect bounces in a row
            
            // === DANGER & DEATH SOUNDS ===
            fall: { frequency: 200, duration: 0.3 },
            evilToadDeath: { frequency: 150, duration: 0.8 }, // Deep, ominous death sound! 💀
            evilToadDefeat: { frequency: 1300, duration: 0.5 }, // Defeating evil toad - triumphant!
            dangerZone: { frequency: 250, duration: 0.2 }, // Getting close to death zone
            lastChance: { frequency: 300, duration: 0.4 }, // Very close to game over - urgent!
            
            // === ATMOSPHERIC SOUNDS ===
            heightGain: { frequency: 480, duration: 0.08 }, // Subtle upward progress sound
            windWhoosh: { frequency: 200, duration: 0.15 }, // High altitude wind effect
            spaceAmbient: { frequency: 350, duration: 0.25 }, // Entering space zone
            
            // === UI & FEEDBACK SOUNDS ===
            gameStart: { frequency: 523, duration: 0.3 }, // Game starting - uplifting tone
            gameOver: { frequency: 220, duration: 1.2 }, // Game over - somber but not harsh
            newGame: { frequency: 659, duration: 0.4 }, // Starting new game - hopeful tone
            buttonHover: { frequency: 400, duration: 0.05 }, // UI feedback - subtle
            buttonClick: { frequency: 600, duration: 0.08 }, // UI confirmation - crisp
            
            // === COMBO SYSTEM SOUNDS ===
            combo2x: { frequency: 700, duration: 0.2 }, // 2x combo multiplier
            combo3x: { frequency: 850, duration: 0.25 }, // 3x combo multiplier  
            combo5x: { frequency: 1000, duration: 0.3 }, // 5x combo multiplier
            comboMax: { frequency: 1200, duration: 0.5 }, // Maximum combo - epic!
            comboLost: { frequency: 400, duration: 0.2 } // Combo broken - disappointed but not harsh
        };
    }

    // Game configuration
    getGameConfig() {
        // Detect mobile for responsive canvas sizing
        const isMobile = window.innerWidth <= 768;
        const canvasWidth = isMobile ? 420 : 320;   // Original sizes
        const canvasHeight = isMobile ? 650 : 480;  // Original sizes
        
        return {
            // Canvas settings
            canvas: {
                width: canvasWidth,
                height: canvasHeight
            },
            
            // Player settings - increased size to compensate for zoom revert
            player: {
                width: 42,  // Increased from 32 (30% larger for better visibility)
                height: 42, // Increased from 32 (30% larger for better visibility)
                jumpForce: 16, // Increased from 14 to compensate for removed timing bounce (14 * 1.15 ≈ 16)
            maxSpeed: 5.5, // Further tuned for smoother control
                gravity: 0.5
            },
            
            // Platform settings - increased size to compensate for zoom revert
            platform: {
                width: 78,         // Increased from 60 (30% larger for better visibility)
                height: 16,        // Increased from 12 (30% larger for better visibility)
                spacing: 80,
                minGap: 20,        // Safer start gaps
                maxGap: 50,        // Much more conservative max gap
                easyMinGap: 15,    // Very easy gaps for beginners  
                easyMaxGap: 30,    // Conservative easy max gap
                hardMinGap: 30,    // Conservative gaps at high altitudes
                hardMaxGap: 60     // Safe but challenging gap (well below max reachable)
            },
            
            // Scoring - optimized for competition
            score: {
                platformMultiplier: 10,
                heightMultiplier: 1,
                bonusMultiplier: 50,
                tokenBonus: 125, // Increased token bonus for risk/reward 🌮
                powerupBonus: 200, // Higher power-up bonus for strategic collection ⚡
                comboMultiplier: 1.2, // Bonus for collecting multiple items quickly
                perfectTimingBonus: 50, // Reward for skilled timing bounces
                streakBonus: 25 // Bonus for platform streaks without falling
            },
            
            // Power-up system
            powerups: {
                spawnChance: 0.06, // Increased to 6% chance per platform area to improve coin availability
                magnetRange: 80, // Magnet collection range in pixels
                shieldFlashInterval: 200, // Shield flash effect timing
                glowPulseSpeed: 0.015, // Glow animation speed
                maxActive: 3 // Maximum active power-ups at once (increased for better gameplay)
            },
            
            // Visual effects
            effects: {
                trailLength: 5,
                particleCount: 3,
                fadeSpeed: 0.05
            }
        };
    }

    // Draw the player using the dedicated Pogo-on-a-pogo-stick artwork.
    drawPlayer(ctx, x, y, width, height, rotation = 0, velocityX = 0) {
        ctx.save();
        
        // The hero stays visually consistent instead of changing into collectible art.
        const sprite = this.getPlayerSprite(velocityX, false);
        
        if (sprite && this.loaded) {
            // Draw custom sprite
            ctx.translate(x + width/2, y + height/2);
            ctx.rotate(rotation);
            
            // Calculate sprite size (maintain aspect ratio)
            const aspectRatio = sprite.width / sprite.height;
            let spriteWidth = width;
            let spriteHeight = height;
            
            if (aspectRatio > 1) {
                spriteHeight = width / aspectRatio;
            } else {
                spriteWidth = height * aspectRatio;
            }
            
            // Draw sprite centered
            ctx.drawImage(
                sprite,
                -spriteWidth/2,
                -spriteHeight/2,
                spriteWidth,
                spriteHeight
            );
        } else {
            // Fallback to procedural drawing
            ctx.translate(x + width/2, y + height/2);
            ctx.rotate(rotation);
            
            // Draw frog body
            ctx.fillStyle = this.colors.player.body;
            ctx.beginPath();
            ctx.ellipse(0, 0, width/2.5, height/2.5, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw frog head
            ctx.fillStyle = this.colors.player.body;
            ctx.beginPath();
            ctx.ellipse(0, -height/3, width/3, height/3, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw beak
            ctx.fillStyle = this.colors.player.beak;
            ctx.beginPath();
            ctx.moveTo(-width/6, -height/3);
            ctx.lineTo(-width/3, -height/4);
            ctx.lineTo(-width/6, -height/5);
            ctx.closePath();
            ctx.fill();
            
            // Draw eye
            ctx.fillStyle = this.colors.player.eye;
            ctx.beginPath();
            ctx.ellipse(-width/8, -height/2.5, 3, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw simple hat (Pogo's signature look)
            ctx.fillStyle = this.colors.player.hat;
            ctx.beginPath();
            ctx.ellipse(0, -height/1.8, width/2.8, height/8, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    // Draw platform
    drawPlatform(ctx, platform) {
        const { x, y, width, height, type = 'normal' } = platform;
        ctx.save();
        
        // Get platform color based on type
        const color = this.colors.platform[type] || this.colors.platform.normal;
        
        // Draw platform shadow
        ctx.fillStyle = this.colors.ui.shadow;
        ctx.fillRect(x + 2, y + 2, width, height);
        
        // Draw main platform
        ctx.fillStyle = color;
        ctx.fillRect(x, y, width, height);
        
        // Add platform details based on type - STRATEGIC SPRING SYSTEM
        switch(type) {
            case 'normal':
                // Lily-pad styling: top sheen, radiating veins, darker underside
                ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
                ctx.fillRect(x, y, width, Math.max(2, height * 0.34));
                ctx.strokeStyle = 'rgba(10, 58, 20, 0.45)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                for (let v = 0; v < 3; v++) {
                    ctx.moveTo(x + width / 2, y + height);
                    ctx.lineTo(x + width * (0.25 + v * 0.25), y);
                }
                ctx.stroke();
                ctx.fillStyle = 'rgba(10, 58, 20, 0.4)';
                ctx.fillRect(x, y + height - 2, width, 2);
                break;

            case 'superspring':
                // MEGA SPRING - Bright gold with large visual indicator
                ctx.fillStyle = '#FFD700'; // Bright gold
                ctx.fillRect(x, y - 4, width, height + 8); // Thicker platform
                
                // Draw large spring coils with golden glow
                ctx.strokeStyle = '#FFB000';
                ctx.lineWidth = 3;
                ctx.shadowColor = '#FFD700';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                for(let i = 0; i < 4; i++) {
                    const coilX = x + 8 + (i * 11);
                    ctx.moveTo(coilX, y - 2);
                    ctx.quadraticCurveTo(coilX + 6, y - 8, coilX + 12, y - 2);
                }
                ctx.stroke();
                ctx.shadowBlur = 0; // Reset shadow
                
                // Add sparkle effect
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(x + width/4, y - 6, 2, 2);
                ctx.fillRect(x + 3*width/4, y - 6, 2, 2);
                break;
                
            case 'spring':
                // STANDARD SPRING - Green with spring coils
                ctx.strokeStyle = '#16a34a';
                ctx.lineWidth = 2;
                ctx.beginPath();
                for(let i = 0; i < 3; i++) {
                    const coilX = x + 10 + (i * 15);
                    ctx.moveTo(coilX, y);
                    ctx.quadraticCurveTo(coilX + 5, y - 5, coilX + 10, y);
                }
                ctx.stroke();
                break;
                
            case 'minispring':
                // MINI SPRING - Light blue with small bouncy indicator
                ctx.fillStyle = '#87CEEB'; // Light blue
                ctx.fillRect(x, y, width, height);
                
                // Draw small spring coils
                ctx.strokeStyle = '#4682B4';
                ctx.lineWidth = 1;
                ctx.beginPath();
                for(let i = 0; i < 2; i++) {
                    const coilX = x + 15 + (i * 15);
                    ctx.moveTo(coilX, y + 2);
                    ctx.quadraticCurveTo(coilX + 3, y - 2, coilX + 6, y + 2);
                }
                ctx.stroke();
                
                // Add small bounce indicator
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(x + width/2, y - 3, 2, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'moving':
                // Draw arrow indicators for moving platforms
                ctx.fillStyle = '#fed7aa';
                ctx.beginPath();
                ctx.moveTo(x + 5, y + height/2);
                ctx.lineTo(x + 15, y + height/2 - 3);
                ctx.lineTo(x + 15, y + height/2 + 3);
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'breaking':
                // Draw crack lines (keep this procedural)
                ctx.strokeStyle = '#7f1d1d';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x + width/3, y);
                ctx.lineTo(x + width/3 + 5, y + height);
                ctx.moveTo(x + 2*width/3, y);
                ctx.lineTo(x + 2*width/3 - 5, y + height);
                ctx.stroke();
                break;
                
            case 'cloud':
                // Draw cloud texture (keep this procedural)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                for(let i = 0; i < 4; i++) {
                    const cloudX = x + (i * width/4) + 5;
                    ctx.beginPath();
                    ctx.ellipse(cloudX, y + height/2, 8, 4, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
                
            case 'ice':
                // Ice platform - slippery blue surface with sparkle effects
                ctx.fillStyle = 'rgba(173, 216, 230, 0.9)'; // Light blue
                ctx.fillRect(x, y, width, height);
                
                // Ice shine effect
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.fillRect(x + 2, y + 1, width - 4, 2);
                
                // Sparkle effects
                ctx.fillStyle = '#ffffff';
                for(let i = 0; i < 3; i++) {
                    const sparkleX = x + (i + 1) * width / 4;
                    const sparkleY = y + height / 2;
                    ctx.fillRect(sparkleX, sparkleY, 1, 1);
                }
                break;
                
            case 'disappearing':
                // Disappearing platform - fading effect based on timer
                const fadeAlpha = platform.fadeTimer ? Math.max(0.3, 1 - platform.fadeTimer / 60) : 1; // 60 frames = 1 second fade
                ctx.fillStyle = `rgba(139, 69, 19, ${fadeAlpha})`; // Brown that fades
                ctx.fillRect(x, y, width, height);
                
                // Warning flash when about to disappear
                if (platform.fadeTimer && platform.fadeTimer > 30) {
                    const flashAlpha = Math.sin(platform.fadeTimer * 0.5) * 0.5 + 0.5;
                    ctx.fillStyle = `rgba(255, 255, 0, ${flashAlpha * 0.4})`;
                    ctx.fillRect(x, y, width, height);
                }
                break;
                
            case 'evil':
                // Evil toad sprite - use as provided, no transformations needed
                if (this.images.evilToad && this.loaded) {
                    const evilWidth = 32;
                    const evilHeight = 32;
                    
                    // Simple drawing - your sprite is already oriented correctly
                    ctx.drawImage(
                        this.images.evilToad,
                        x + (width - evilWidth) / 2, // Center horizontally on platform
                        y - evilHeight + 8, // Position above platform
                        evilWidth,
                        evilHeight
                    );
                }
                break;
        }
        
        ctx.restore();
    }

    // Draw particle effect
    drawParticle(ctx, x, y, size, type = 'feather', alpha = 1, biomeColor = null) {
        ctx.save();
        ctx.globalAlpha = alpha;
        
        // Use biome color if provided, otherwise use default particle color
        const color = biomeColor || this.colors.particles[type] || this.colors.particles.feather;
        ctx.fillStyle = color;
        
        switch(type) {
            case 'feather':
                // Draw feather shape
                ctx.beginPath();
                ctx.ellipse(x, y, size, size * 2, Math.PI/4, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'spark':
                // Draw star-like spark
                ctx.beginPath();
                for(let i = 0; i < 8; i++) {
                    const angle = (i * Math.PI) / 4;
                    const radius = (i % 2 === 0) ? size : size/2;
                    const sparkX = x + Math.cos(angle) * radius;
                    const sparkY = y + Math.sin(angle) * radius;
                    
                    if(i === 0) ctx.moveTo(sparkX, sparkY);
                    else ctx.lineTo(sparkX, sparkY);
                }
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'trail':
                // Draw simple circle trail
                ctx.beginPath();
                ctx.ellipse(x, y, size, size, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'tokenSpark':
                // Draw simple token collection spark (no glow)
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'powerupGlow':
                // Draw simple power-up collection particle (no glow)
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'shieldGlow':
                // Draw shield particle with hexagonal shape
                const sides = 6;
                ctx.beginPath();
                for (let i = 0; i < sides; i++) {
                    const angle = (i / sides) * Math.PI * 2;
                    const pointX = x + Math.cos(angle) * size;
                    const pointY = y + Math.sin(angle) * size;
                    if (i === 0) ctx.moveTo(pointX, pointY);
                    else ctx.lineTo(pointX, pointY);
                }
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'magnetGlow':
                // Draw magnet particle with alternating colors
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
                
                // Add magnetic field lines
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.beginPath();
                const magnetTime = Date.now() * 0.01;
                for (let i = 0; i < 4; i++) {
                    const angle = (i / 4) * Math.PI * 2 + magnetTime;
                    const lineLength = size * 1.5;
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + Math.cos(angle) * lineLength, y + Math.sin(angle) * lineLength);
                }
                ctx.stroke();
                break;
                
            case 'perfectBounce':
                // Draw perfect timing bounce particle with star shape
                const points = 5;
                ctx.beginPath();
                for (let i = 0; i < points * 2; i++) {
                    const angle = (i / (points * 2)) * Math.PI * 2;
                    const radius = (i % 2 === 0) ? size : size * 0.5;
                    const pointX = x + Math.cos(angle) * radius;
                    const pointY = y + Math.sin(angle) * radius;
                    if (i === 0) ctx.moveTo(pointX, pointY);
                    else ctx.lineTo(pointX, pointY);
                }
                ctx.closePath();
                ctx.fill();
                
                // Add inner bright center
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'danger':
                // Draw danger particle with spiky shape
                const spikes = 6;
                ctx.beginPath();
                for (let i = 0; i < spikes * 2; i++) {
                    const angle = (i / (spikes * 2)) * Math.PI * 2;
                    const radius = (i % 2 === 0) ? size : size * 0.6;
                    const pointX = x + Math.cos(angle) * radius;
                    const pointY = y + Math.sin(angle) * radius;
                    if (i === 0) ctx.moveTo(pointX, pointY);
                    else ctx.lineTo(pointX, pointY);
                }
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'victory':
                // Draw victory particle with burst shape
                const rays = 8;
                ctx.beginPath();
                for (let i = 0; i < rays; i++) {
                    const angle = (i / rays) * Math.PI * 2;
                    const innerRadius = size * 0.3;
                    const outerRadius = size;
                    
                    const innerX = x + Math.cos(angle) * innerRadius;
                    const innerY = y + Math.sin(angle) * innerRadius;
                    const outerX = x + Math.cos(angle) * outerRadius;
                    const outerY = y + Math.sin(angle) * outerRadius;
                    
                    ctx.moveTo(innerX, innerY);
                    ctx.lineTo(outerX, outerY);
                }
                ctx.stroke();
                
                // Add center circle
                ctx.beginPath();
                ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
        
        ctx.restore();
    }

    // Draw progressive background - Earth's atmosphere to deep space!
    drawBackground(ctx, canvasWidth, canvasHeight, scrollY, playerScore = 0) {
        // Get current biome based on player height (use scroll position to determine height)
        const playerHeight = Math.abs(scrollY);
        const currentBiome = this.getCurrentBiome(playerHeight);
        const nextBiome = this.getNextBiome(playerHeight);
        
        // Calculate transition progress between biomes - Updated for accessible gameplay
        const getBiomeHeight = (height) => {
            const absHeight = Math.abs(height);
            if (absHeight < 2000) return 2000;        // Ground biome: 2K pixels
            else if (absHeight < 8000) return 6000;   // City biome: 6K pixels  
            else if (absHeight < 20000) return 12000; // Cloud biome: 12K pixels
            else if (absHeight < 40000) return 20000; // Space biome: 20K pixels
            else return 40000;                        // Cosmos: infinite
        };
        
        const currentBiomeHeight = getBiomeHeight(playerHeight);
        const biomeStartHeight = this.getBiomeStartHeight(playerHeight);
        const currentBiomeProgress = Math.max(0, (playerHeight - biomeStartHeight) / currentBiomeHeight);
        
        // Create transition gradient between current and next biome
        const transitionFactor = Math.min(currentBiomeProgress * 2, 1); // Smooth transition in first half of biome
        
        const topColor = this.interpolateColor(currentBiome.skyTop, nextBiome.skyTop, transitionFactor);
        const middleColor = this.interpolateColor(currentBiome.skyMiddle, nextBiome.skyMiddle, transitionFactor);
        const bottomColor = this.interpolateColor(currentBiome.skyBottom, nextBiome.skyBottom, transitionFactor);
        
        // Create the biome gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
        gradient.addColorStop(0, topColor);
        gradient.addColorStop(0.3, middleColor);
        gradient.addColorStop(1, bottomColor);
        
        ctx.fillStyle = gradient;
        // Fill entire canvas with slight padding to ensure complete coverage
        ctx.fillRect(-10, -10, canvasWidth + 20, canvasHeight + 20);
        
        // Add biome-specific atmospheric effects - Updated for accessible thresholds
        if (playerHeight >= 40000) {
            // Cosmos biome (40K+ pixels) - draw cosmic effects
            this.drawCosmicEffects(ctx, canvasWidth, canvasHeight, scrollY);
            this.drawStars(ctx, canvasWidth, canvasHeight, scrollY, 1.0);
        } else if (playerHeight >= 20000) {
            // Space biome (20K+ pixels) - draw planets and stars
            this.drawPlanets(ctx, canvasWidth, canvasHeight, scrollY);
            this.drawStars(ctx, canvasWidth, canvasHeight, scrollY, 0.8);
        } else if (playerHeight >= 8000) {
            // Cloud biome (8K+ pixels) - draw clouds and some stars
            this.drawClouds(ctx, canvasWidth, canvasHeight, scrollY, 0.6);
            this.drawStars(ctx, canvasWidth, canvasHeight, scrollY, 0.2);
        } else if (playerHeight >= 2000) {
            // City biome (2K+ pixels) - draw city skyline and buildings
            this.drawCitySkyline(ctx, canvasWidth, canvasHeight, scrollY);
            this.drawClouds(ctx, canvasWidth, canvasHeight, scrollY, 0.3);
        } else {
            // Ground biome (0-2K pixels) - restaurant grounds with buildings
            this.drawRestaurantBuildings(ctx, canvasWidth, canvasHeight, scrollY);
            this.drawClouds(ctx, canvasWidth, canvasHeight, scrollY, 0.5);
        }
        
        // Clean biome transition notification
        this.drawBiomeNotification(ctx, canvasWidth, canvasHeight, currentBiome, playerHeight);
        
        // Subtle biome transition preview (only at 90% progress) - DISABLED: illegible text
        // if (currentBiomeProgress > 0.9) {
        //     this.drawBiomeTransition(ctx, canvasWidth, canvasHeight, nextBiome.name);
        // }
    }
    
    // Draw subtle biome transition preview
    drawBiomeTransition(ctx, canvasWidth, canvasHeight, biomeName) {
        ctx.save();
        
        // Very subtle pulse effect
        const alpha = Math.sin((Date.now() * 0.002) % (Math.PI * 2)) * 0.2 + 0.4; // Pulse between 0.2 and 0.6
        ctx.globalAlpha = alpha;
        
        // Position at bottom of screen, very subtle
        const textY = canvasHeight - 30;
        
        // Subtle text with minimal background
        ctx.textAlign = 'center';
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillText(`Approaching: ${biomeName}`, canvasWidth / 2, textY);
        
        ctx.restore();
    }
    
    // Clean biome notification system
    drawBiomeNotification(ctx, canvasWidth, canvasHeight, currentBiome, playerHeight) {
        // Initialize tracking if not exists
        if (!this.lastNotifiedBiome) {
            this.lastNotifiedBiome = null;
            this.biomeNotificationTime = 0;
        }
        
        // Check if we've entered a new biome
        if (this.lastNotifiedBiome !== currentBiome.name) {
            this.lastNotifiedBiome = currentBiome.name;
            this.biomeNotificationTime = Date.now();
        }
        
        // Show notification for 3 seconds after entering new biome
        const timeSinceNotification = Date.now() - this.biomeNotificationTime;
        const notificationDuration = 3000; // 3 seconds
        
        if (timeSinceNotification < notificationDuration) {
            ctx.save();
            
            // Fade in/out animation
            let alpha = 1;
            if (timeSinceNotification < 500) {
                // Fade in over first 500ms
                alpha = timeSinceNotification / 500;
            } else if (timeSinceNotification > notificationDuration - 500) {
                // Fade out over last 500ms
                alpha = (notificationDuration - timeSinceNotification) / 500;
            }
            
            ctx.globalAlpha = alpha;
            
            // Position centered at top of screen, out of main gameplay area
            const notificationX = canvasWidth / 2;
            const notificationY = 25;
            
            // Sleek background with gradient and border
            const bgWidth = 180;
            const bgHeight = 32;
            
            // Background gradient
            const gradient = ctx.createLinearGradient(
                notificationX - bgWidth/2, notificationY - bgHeight/2,
                notificationX + bgWidth/2, notificationY + bgHeight/2
            );
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
            gradient.addColorStop(1, 'rgba(30, 30, 30, 0.8)');
            
            ctx.fillStyle = gradient;
            
            // Draw rounded rectangle (with fallback for older browsers)
            if (ctx.roundRect) {
                ctx.roundRect(notificationX - bgWidth/2, notificationY - bgHeight/2, bgWidth, bgHeight, 8);
                ctx.fill();
            } else {
                // Fallback: regular rectangle
                ctx.fillRect(notificationX - bgWidth/2, notificationY - bgHeight/2, bgWidth, bgHeight);
            }
            
            // Text with subtle glow effect
            ctx.textAlign = 'center';
            ctx.font = '14px "SF Pro Display", system-ui, sans-serif';
            
            // Text glow
            ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
            ctx.shadowBlur = 2;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(currentBiome.name, notificationX, notificationY + 4);
            
            // Reset shadow
            ctx.shadowBlur = 0;
        }
        
        ctx.restore();
    }

    // Draw the pond scene for the ground biome (water, lily pads, cattails)
    drawRestaurantBuildings(ctx, canvasWidth, canvasHeight, scrollY) {
        ctx.save();
        const waterY = canvasHeight - 34;

        // Pond water band along the bottom
        ctx.fillStyle = 'rgba(69, 200, 242, 0.55)';
        ctx.fillRect(0, waterY, canvasWidth, canvasHeight - waterY + 12);

        // Water shimmer lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        const shimmer = (scrollY * 0.05) % 60;
        for (let i = -1; i < canvasWidth / 60 + 1; i++) {
            const sx = i * 60 - shimmer;
            ctx.beginPath();
            ctx.moveTo(sx, waterY + 13);
            ctx.quadraticCurveTo(sx + 15, waterY + 9, sx + 30, waterY + 13);
            ctx.stroke();
        }

        // Floating lily pads (parallax)
        const padOffset = (scrollY * 0.06) % 220;
        for (let i = -1; i < canvasWidth / 110 + 1; i++) {
            const px = i * 110 - padOffset + 30;
            this.drawLilyPad(ctx, px, waterY + 15 + (i % 2) * 7, 24 + (i % 3) * 6);
        }

        // Cattails / reeds rising from the water (slower parallax)
        const reedOffset = (scrollY * 0.04) % 130;
        for (let i = -1; i < canvasWidth / 65 + 2; i++) {
            const rx = i * 65 - reedOffset + 12;
            this.drawReed(ctx, rx, waterY + 4, 44 + (i % 3) * 24, i % 2 === 0);
        }

        ctx.restore();
    }

    // A single lily pad
    drawLilyPad(ctx, cx, cy, r) {
        ctx.save();
        ctx.fillStyle = 'rgba(46, 140, 42, 0.9)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r * 0.44, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(10, 58, 20, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // notch wedge (background lime) + a couple veins
        ctx.fillStyle = 'rgba(220, 253, 82, 0.5)';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + r * 0.9, cy - r * 0.22);
        ctx.lineTo(cx + r * 0.9, cy + r * 0.22);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(10, 58, 20, 0.28)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy); ctx.lineTo(cx - r * 0.7, cy - r * 0.28);
        ctx.moveTo(cx, cy); ctx.lineTo(cx - r * 0.7, cy + r * 0.28);
        ctx.stroke();
        ctx.restore();
    }

    // A single reed/cattail stalk
    drawReed(ctx, x, baseY, h, cattail) {
        ctx.save();
        ctx.strokeStyle = 'rgba(28, 108, 40, 0.6)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, baseY);
        ctx.quadraticCurveTo(x + 6, baseY - h * 0.6, x + 2, baseY - h);
        ctx.stroke();
        if (cattail) {
            ctx.fillStyle = 'rgba(120, 72, 30, 0.75)';
            ctx.beginPath();
            ctx.ellipse(x + 2, baseY - h, 4, 11, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.strokeStyle = 'rgba(40, 130, 50, 0.55)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + 2, baseY - h * 0.5);
            ctx.quadraticCurveTo(x + 16, baseY - h * 0.72, x + 20, baseY - h * 0.96);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Draw individual restaurant building
    drawRestaurantBuilding(ctx, x, canvasHeight, type) {
        const groundLevel = canvasHeight - 50; // Buildings sit on ground
        
        // Building base dimensions (vary by type)
        const buildings = [
            { width: 80, height: 120, color: '#8B4513', roofColor: '#A0522D' }, // Restaurant
            { width: 60, height: 90, color: '#CD853F', roofColor: '#D2691E' },  // Cafe
            { width: 100, height: 140, color: '#A0522D', roofColor: '#8B4513' } // Hotel
        ];
        
        const building = buildings[type];
        const buildingY = groundLevel - building.height;
        
        // Draw building body
        ctx.fillStyle = building.color;
        ctx.fillRect(x, buildingY, building.width, building.height);
        
        // Draw roof
        ctx.fillStyle = building.roofColor;
        ctx.beginPath();
        ctx.moveTo(x - 10, buildingY);
        ctx.lineTo(x + building.width/2, buildingY - 20);
        ctx.lineTo(x + building.width + 10, buildingY);
        ctx.closePath();
        ctx.fill();
        
        // Draw windows
        ctx.fillStyle = '#FFFF99'; // Warm yellow window light
        const windowSize = 12;
        const windowRows = Math.floor(building.height / 30);
        const windowCols = Math.floor(building.width / 25);
        
        for (let row = 0; row < windowRows; row++) {
            for (let col = 0; col < windowCols; col++) {
                const windowX = x + 10 + (col * 25);
                const windowY = buildingY + 10 + (row * 30);
                ctx.fillRect(windowX, windowY, windowSize, windowSize);
            }
        }
        
        // Draw door for ground floor
        if (type === 0) { // Restaurant gets a nice door
            ctx.fillStyle = '#654321';
            ctx.fillRect(x + building.width/2 - 8, buildingY + building.height - 25, 16, 25);
            
            // Door handle
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(x + building.width/2 + 4, buildingY + building.height - 12, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Draw a marsh of tall reeds & cattails for the "Cattail Marsh" biome
    drawCitySkyline(ctx, canvasWidth, canvasHeight, scrollY) {
        ctx.save();
        const baseY = canvasHeight - 16;

        // Back layer — pale, taller reeds (slow parallax)
        ctx.globalAlpha = 0.5;
        const backOffset = (scrollY * 0.025) % 70;
        for (let i = -1; i < canvasWidth / 35 + 2; i++) {
            const rx = i * 35 - backOffset;
            const h = 150 + Math.sin(i * 0.6) * 60;
            this.drawReed(ctx, rx, baseY, h, i % 4 === 0);
        }

        // Front layer — denser, closer reeds
        ctx.globalAlpha = 0.85;
        const frontOffset = (scrollY * 0.045) % 55;
        for (let i = -1; i < canvasWidth / 55 + 2; i++) {
            const rx = i * 55 - frontOffset + 20;
            const h = 100 + Math.sin(i * 0.9 + 1.5) * 45;
            this.drawReed(ctx, rx, baseY, h, i % 3 === 0);
        }

        ctx.restore();
    }

    // Draw individual city building
    drawCityBuilding(ctx, x, canvasHeight, height, seed) {
        const groundLevel = canvasHeight - 30;
        const width = 60 + (seed % 3) * 20;
        const buildingY = groundLevel - height;
        
        // Building colors (grays and blues for modern city)
        const colors = ['#4A4A4A', '#5A5A5A', '#6A6A6A', '#404080', '#505090'];
        const color = colors[seed % colors.length];
        
        // Draw building body
        ctx.fillStyle = color;
        ctx.fillRect(x, buildingY, width, height);
        
        // Draw many windows in a grid pattern
        ctx.fillStyle = seed % 2 === 0 ? '#FFFF99' : '#B0E0E6'; // Warm or cool light
        const windowSize = 6;
        const windowSpacing = 12;
        
        for (let y = buildingY + 10; y < buildingY + height - 10; y += windowSpacing) {
            for (let wx = x + 8; wx < x + width - 8; wx += windowSpacing) {
                // Use seed-based deterministic pattern instead of random for consistent lights
                const windowRow = Math.floor((y - buildingY) / windowSpacing);
                const windowCol = Math.floor((wx - x) / windowSpacing);
                const windowSeed = (seed * 37 + windowRow * 13 + windowCol * 7) % 100;
                
                if (windowSeed > 30) { // 70% of windows are on (consistent per building)
                    ctx.fillRect(wx, y, windowSize, windowSize);
                }
            }
        }
        
        // Add rooftop details for taller buildings
        if (height > 250) {
            ctx.fillStyle = '#666666';
            ctx.fillRect(x + width/4, buildingY - 15, width/2, 15);
            
            // Antenna or spire
            ctx.fillStyle = '#888888';
            ctx.fillRect(x + width/2 - 2, buildingY - 30, 4, 15);
        }
    }

    // Draw planets for space biome
    drawPlanets(ctx, canvasWidth, canvasHeight, scrollY) {
        ctx.save();
        
        // Draw planets that move very slowly
        const planetOffset = (scrollY * 0.01) % 2000;
        const planets = [
            { x: 150, y: 100, size: 40, color: '#FF6B47' }, // Mars-like
            { x: 400, y: 200, size: 60, color: '#4B79BD' }, // Earth-like
            { x: 600, y: 150, size: 30, color: '#FFA500' }, // Jupiter-like
        ];
        
        planets.forEach((planet, i) => {
            const planetY = (planet.y - planetOffset + i * 500) % (canvasHeight + 200) - 100;
            
            if (planetY > -planet.size && planetY < canvasHeight + planet.size) {
                // Draw planet
                ctx.fillStyle = planet.color;
                ctx.beginPath();
                ctx.arc(planet.x, planetY, planet.size, 0, Math.PI * 2);
                ctx.fill();
                
                // Add planet glow
                const gradient = ctx.createRadialGradient(
                    planet.x, planetY, planet.size,
                    planet.x, planetY, planet.size * 1.5
                );
                gradient.addColorStop(0, planet.color + '40');
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(planet.x, planetY, planet.size * 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        
        ctx.restore();
    }

    // Draw cosmic effects for cosmos biome
    drawCosmicEffects(ctx, canvasWidth, canvasHeight, scrollY) {
        ctx.save();
        
        // Draw nebula-like effects
        const time = Date.now() * 0.001;
        const nebulaOffset = (scrollY * 0.005) % 1000;
        
        // Multiple colored nebula clouds
        const nebulas = [
            { x: 100, y: 150, color: '#FF00FF', size: 150 },
            { x: 300, y: 80, color: '#00FFFF', size: 120 },
            { x: 500, y: 200, color: '#FF4500', size: 100 },
        ];
        
        nebulas.forEach((nebula, i) => {
            const nebulaY = (nebula.y - nebulaOffset + i * 300) % (canvasHeight + 300) - 150;
            const pulse = Math.sin(time + i) * 0.3 + 0.7;
            
            if (nebulaY > -nebula.size && nebulaY < canvasHeight + nebula.size) {
                const gradient = ctx.createRadialGradient(
                    nebula.x, nebulaY, 0,
                    nebula.x, nebulaY, nebula.size * pulse
                );
                gradient.addColorStop(0, nebula.color + '60');
                gradient.addColorStop(0.5, nebula.color + '20');
                gradient.addColorStop(1, 'transparent');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(nebula.x, nebulaY, nebula.size * pulse, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        
        // Draw cosmic energy streams
        ctx.strokeStyle = '#FFFFFF40';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < 5; i++) {
            const waveY = (i * 100 - nebulaOffset) % canvasHeight;
            const amplitude = 30 + Math.sin(time + i) * 10;
            
            ctx.moveTo(0, waveY);
            for (let x = 0; x <= canvasWidth; x += 20) {
                const y = waveY + Math.sin((x + time * 50) * 0.01) * amplitude;
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
        
        ctx.restore();
    }

    // Draw stars for space sections
    drawStars(ctx, canvasWidth, canvasHeight, scrollY, opacity) {
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        
        // Create a deterministic star field based on scroll position (ensure positive seed)
        const starSeed = Math.abs(Math.floor(scrollY / 100));
        const starCount = Math.floor(50 * opacity);
        
        for (let i = 0; i < starCount; i++) {
            // Use pseudo-random positioning based on seed (ensure positive values)
            const x = Math.abs((starSeed + i * 37) % 97) * (canvasWidth / 97);
            const y = Math.abs(((starSeed + i * 73) % 113) * (canvasHeight / 113) + (scrollY * 0.02)) % canvasHeight;
            const size = Math.max(1, Math.abs((starSeed + i * 17) % 3) + 1); // Ensure size is always positive and at least 1
            
            // Safety check to prevent negative radius
            if (size > 0) {
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
                
                // Add twinkling effect for larger stars
                if (size > 2) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.5})`;
                    ctx.beginPath();
                    ctx.arc(x, y, size + 1, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                }
            }
        }
        
        ctx.restore();
    }
    
    // Draw clouds for atmospheric sections
    drawClouds(ctx, canvasWidth, canvasHeight, scrollY, opacity) {
        if (opacity <= 0) return;
        
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.4})`;
        
        const cloudOffset = (scrollY * 0.08) % 600;
        const cloudCount = Math.floor(4 * opacity);
        
        for(let i = 0; i < cloudCount; i++) {
                const cloudY = (i * 150) - cloudOffset;
                if(cloudY > -60 && cloudY < canvasHeight + 60) {
                    this.drawCloud(ctx, 60 + (i * 90) % (canvasWidth - 120), cloudY, 35, 18);
                }
            }
        
        ctx.restore();
    }

    // Draw cloud helper function
    drawCloud(ctx, x, y, width, height) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        
        // Draw cloud as multiple overlapping circles
        const circles = [
            {x: 0, y: 0, r: height/2},
            {x: width/3, y: -height/4, r: height/3},
            {x: 2*width/3, y: 0, r: height/2.5},
            {x: width, y: height/6, r: height/3}
        ];
        
        circles.forEach(circle => {
            ctx.beginPath();
            ctx.ellipse(x + circle.x, y + circle.y, circle.r, circle.r, 0, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.restore();
    }
    
    // Helper function to blend two hex colors
    blendColors(color1, color2, factor) {
        // Convert hex to RGB
        const hex1 = color1.replace('#', '');
        const hex2 = color2.replace('#', '');
        
        const r1 = parseInt(hex1.substr(0, 2), 16);
        const g1 = parseInt(hex1.substr(2, 2), 16);
        const b1 = parseInt(hex1.substr(4, 2), 16);
        
        const r2 = parseInt(hex2.substr(0, 2), 16);
        const g2 = parseInt(hex2.substr(2, 2), 16);
        const b2 = parseInt(hex2.substr(4, 2), 16);
        
        // Blend the colors
        const r = Math.round(r1 + (r2 - r1) * factor);
        const g = Math.round(g1 + (g2 - g1) * factor);
        const b = Math.round(b1 + (b2 - b1) * factor);
        
        // Convert back to hex
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    // Draw UI elements
    drawScore(ctx, score, x, y) {
        ctx.save();
        ctx.font = 'bold 24px "Fredoka", cursive';
        ctx.fillStyle = this.colors.ui.textShadow;
        ctx.fillText(score.toString(), x + 2, y + 2);
        ctx.fillStyle = this.colors.ui.score;
        ctx.fillText(score.toString(), x, y);
        ctx.restore();
    }

    // Draw a polished five-point collectible star.
    drawCollectibleStar(ctx, radius, fillColor, edgeColor, mark = null) {
        ctx.save();
        ctx.shadowColor = fillColor;
        ctx.shadowBlur = radius * 0.65;

        const gradient = ctx.createRadialGradient(
            -radius * 0.28,
            -radius * 0.32,
            radius * 0.08,
            0,
            0,
            radius
        );
        gradient.addColorStop(0, '#fffde8');
        gradient.addColorStop(0.34, fillColor);
        gradient.addColorStop(1, edgeColor);

        ctx.beginPath();
        for (let point = 0; point < 10; point++) {
            const pointRadius = point % 2 === 0 ? radius : radius * 0.47;
            const angle = -Math.PI / 2 + point * Math.PI / 5;
            const pointX = Math.cos(angle) * pointRadius;
            const pointY = Math.sin(angle) * pointRadius;

            if (point === 0) ctx.moveTo(pointX, pointY);
            else ctx.lineTo(pointX, pointY);
        }
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.lineWidth = Math.max(2, radius * 0.09);
        ctx.strokeStyle = edgeColor;
        ctx.lineJoin = 'round';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(-radius * 0.24, -radius * 0.28, radius * 0.09, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fill();

        if (mark) this.drawPowerupMark(ctx, mark, radius * 0.38);
        ctx.restore();
    }

    // Draw a mechanic marker without relying on emoji or another character sprite.
    drawPowerupMark(ctx, type, size) {
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#ffffff';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (type === 'coin') {
            ctx.beginPath();
            ctx.moveTo(size * 0.18, -size);
            ctx.lineTo(-size * 0.62, size * 0.08);
            ctx.lineTo(-size * 0.08, size * 0.08);
            ctx.lineTo(-size * 0.28, size);
            ctx.lineTo(size * 0.62, -size * 0.18);
            ctx.lineTo(size * 0.08, -size * 0.18);
            ctx.closePath();
            ctx.fill();
        } else if (type === 'shield') {
            ctx.lineWidth = Math.max(2, size * 0.24);
            ctx.beginPath();
            ctx.moveTo(0, -size);
            ctx.lineTo(size * 0.78, -size * 0.58);
            ctx.lineTo(size * 0.62, size * 0.45);
            ctx.quadraticCurveTo(0, size, -size * 0.62, size * 0.45);
            ctx.lineTo(-size * 0.78, -size * 0.58);
            ctx.closePath();
            ctx.stroke();
        } else if (type === 'magnet') {
            ctx.lineWidth = Math.max(3, size * 0.35);
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.68, Math.PI, 0, true);
            ctx.stroke();
            ctx.fillRect(-size * 0.86, -size * 0.2, size * 0.36, size * 0.48);
            ctx.fillRect(size * 0.5, -size * 0.2, size * 0.36, size * 0.48);
        }

        ctx.restore();
    }

    // Draw the collectible as a shiny gold $POGO coin (procedural — clearly a
    // coin, on-theme, and never confused with the Pogo-frog player sprite).
    drawToken(ctx, token) {
        if (token.collected) return;

        ctx.save();
        const time = Date.now() * 0.003;
        const bobOffset = Math.sin(time + token.bobOffset) * 3;
        const pulseScale = 1 + Math.sin(time * 2 + token.pulseTime) * 0.1;
        // Gentle coin "spin" by squashing horizontally
        const spin = 0.55 + Math.abs(Math.cos(time * 1.6 + token.bobOffset)) * 0.45;
        const centerX = token.x + token.width / 2;
        const centerY = token.y + token.height / 2 + bobOffset;
        const r = 16;

        ctx.translate(centerX, centerY);
        ctx.scale(pulseScale * spin, pulseScale);

        // Glow + rim
        ctx.shadowColor = 'rgba(251, 191, 36, 0.7)';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = '#c9820c';
        ctx.fill();
        ctx.shadowBlur = 0;

        // Coin face
        const grad = ctx.createRadialGradient(-r * 0.32, -r * 0.32, r * 0.1, 0, 0, r);
        grad.addColorStop(0, '#ffe680');
        grad.addColorStop(0.6, '#fbbf24');
        grad.addColorStop(1, '#e0930f');
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(146, 64, 14, 0.55)';
        ctx.stroke();

        // "P" mark (only when the coin is turned toward us)
        if (spin > 0.72) {
            ctx.save();
            ctx.scale(1 / spin, 1); // un-squash the letter so it stays legible
            ctx.fillStyle = 'rgba(120, 72, 12, 0.85)';
            ctx.font = `bold ${Math.round(r * 1.15)}px "Bungee", system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('P', 0, 1);
            ctx.restore();
        }

        // Shine highlight
        ctx.beginPath();
        ctx.arc(-r * 0.34, -r * 0.36, r * 0.16, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fill();

        ctx.restore();
    }

    // Draw collectible power-up with enhanced animations
    drawPowerup(ctx, powerup) {
        if (powerup.collected) return; // Don't draw collected power-ups
        
        ctx.save();
        
        // Update animation time
        const time = Date.now() * 0.004;
        
        // Enhanced floating motion
        const floatOffset = Math.sin(time + powerup.bobOffset) * 4;
        
        // Pulsing scale with more dramatic effect
        const pulseScale = 1.1 + Math.sin(time * 2.5 + powerup.pulseTime) * 0.2;
        
        // Rotation for power-ups
        const rotation = time * 0.5;
        
        const centerX = powerup.x + powerup.width / 2;
        const centerY = powerup.y + powerup.height / 2 + floatOffset;
        
        // Translate and apply transformations
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation);
        ctx.scale(pulseScale, pulseScale);
        
        // Get power-up config
        const config = this.powerUpTypes[powerup.type];
        const fillColor = config?.color || this.colors.powerups[powerup.type] || '#fbbf24';
        const edgeColor = config?.edgeColor || '#854d0e';
        this.drawCollectibleStar(ctx, 22, fillColor, edgeColor, powerup.type);
        
        ctx.restore();
    }

    drawGameOver(ctx, canvasWidth, canvasHeight, score, bestScore) {
        ctx.save();
        
        // Draw semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Game Over text
        ctx.font = 'bold 32px "Fredoka", cursive';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.colors.ui.textShadow;
        ctx.fillText('Game Over!', canvasWidth/2 + 2, canvasHeight/2 - 48);
        ctx.fillStyle = this.colors.ui.text;
        ctx.fillText('Game Over!', canvasWidth/2, canvasHeight/2 - 50);
        
        // Score display
        ctx.font = 'bold 20px "Fredoka", cursive';
        ctx.fillStyle = this.colors.ui.textShadow;
        ctx.fillText(`Score: ${score}`, canvasWidth/2 + 1, canvasHeight/2 - 9);
        ctx.fillStyle = this.colors.ui.score;
        ctx.fillText(`Score: ${score}`, canvasWidth/2, canvasHeight/2 - 10);
        
        // Best score
        if(bestScore > 0) {
            ctx.fillStyle = this.colors.ui.textShadow;
            ctx.fillText(`Best: ${bestScore}`, canvasWidth/2 + 1, canvasHeight/2 + 21);
            ctx.fillStyle = this.colors.ui.text;
            ctx.fillText(`Best: ${bestScore}`, canvasWidth/2, canvasHeight/2 + 20);
        }
        
        ctx.restore();
    }

    // Asset loading system
    async loadAssets() {
        const assetKeys = Object.keys(this.assetPaths);
        let loadedCount = 0;
        
        console.log('🎨 Loading custom game assets...');
        
        const loadPromises = assetKeys.map(key => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    this.images[key] = img;
                    loadedCount++;
                    this.loadingProgress = (loadedCount / assetKeys.length) * 100;
                    console.log(`✅ Loaded ${key}: ${this.loadingProgress.toFixed(0)}%`);
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`⚠️ Failed to load ${key}, using fallback`);
                    this.images[key] = null; // Will trigger fallback rendering
                    loadedCount++;
                    this.loadingProgress = (loadedCount / assetKeys.length) * 100;
                    resolve(); // Don't reject, just use fallback
                };
                img.src = this.assetPaths[key];
            });
        });
        
        try {
            await Promise.all(loadPromises);
            this.loaded = true;
            console.log('🎉 All game assets loaded successfully!');
        } catch (error) {
            console.warn('⚠️ Some assets failed to load, using fallbacks');
            this.loaded = true; // Still mark as loaded to proceed
        }
    }

    // Check if assets are ready
    isReady() {
        return this.loaded;
    }

    // Get appropriate sprite based on player state
    getPlayerSprite(velocityX, isGrounded) {
        // Pogo riding the pogo stick is always the hero. The legacy jump art is
        // retained only as a fallback if the dedicated sprite cannot be loaded.
        if (this.images.player) return this.images.player;
        if (this.images.jump) return this.images.jump;
        return null; // Fallback to procedural drawing
    }

    // Update method for animated assets
    update(deltaTime) {
        // Add any asset animations here (rotating elements, pulsing effects, etc.)
        // This method is called every frame to update dynamic visual elements
    }
}

// Export singleton instance
const gameAssets = new GameAssets();
console.log('🎨 Game assets loaded');
