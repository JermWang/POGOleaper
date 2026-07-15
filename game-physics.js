// ===== POGO LEAP - GAME PHYSICS MODULE =====

/**
 * Game Physics Engine
 * Handles all physics calculations, collision detection, and movement
 * Designed for smooth 60fps performance on mobile devices
 */

class GamePhysics {
    constructor() {
        // CLASSIC DOODLE JUMP PHYSICS VALUES
        this.gravity = 0.5;              // Simple gravity per frame
        this.jumpForce = 16;             // Auto-jump force when hitting platform - MUST MATCH gameAssets.config.player.jumpForce!
        this.horizontalSpeed = 5;        // Left/right movement speed (increased for better feel)
        this.friction = 0.85;            // Horizontal friction (simple!)
        this.terminalVelocity = 15;      // Max fall speed
        
        // Simple collision settings (like original)
        this.platformTolerance = 5;      // Landing tolerance - much simpler!
    }

    // Update player physics - SIMPLE DOODLE JUMP STYLE!
    updatePlayer(player, deltaTime, canvasWidth) {
        // FLYING MODE (coin power-up)
        if (player.isFlying && player.flyingTimeLeft > 0) {
            player.flyingTimeLeft -= deltaTime;
            
            // Reduced gravity + upward force when flying
            player.velocityY += this.gravity * 0.3;  // Much less gravity
            player.velocityY -= player.flyingPower * 0.6;  // Flying force
            
            if (player.flyingTimeLeft <= 0) {
                player.isFlying = false;
                player.flyingTimeLeft = 0;
                console.log('🪙 Flying mode ended');
            }
        } else {
            // SIMPLE GRAVITY - just add it every frame!
            player.velocityY += this.gravity;
        }
        
        // SIMPLE HORIZONTAL FRICTION (not complex air resistance!)
        // Apply ice effect - reduce friction on ice platforms
        const currentFriction = player.onIce ? this.friction * 0.95 : this.friction; // Less friction on ice
        player.velocityX *= currentFriction;
        
        // CLAMP VELOCITIES  
        player.velocityY = Math.min(player.velocityY, this.terminalVelocity);
        player.velocityX = Math.max(-15, Math.min(15, player.velocityX));
        
        // UPDATE POSITION - SIMPLE!
        player.x += player.velocityX;
        player.y += player.velocityY;
        
        // SCREEN WRAPPING (classic Doodle Jump!)
        if (player.x + player.width < 0) {
            player.x = canvasWidth;
        } else if (player.x > canvasWidth) {
            player.x = -player.width;
        }
        
        // SIMPLE ROTATION based on horizontal movement
        const targetRotation = player.velocityX * 0.05;
        player.rotation = this.lerp(player.rotation, targetRotation, 0.2);
        
        // TRAIL EFFECT (occasionally)
        if (Math.random() < 0.7) {
            this.updatePlayerTrail(player);
        }
    }

    // Update player trail effect
    updatePlayerTrail(player) {
        if (!player.trail) {
            player.trail = [];
        }
        
        // Add current position to trail
        player.trail.unshift({
            x: player.x + player.width/2,
            y: player.y + player.height/2,
            alpha: 1.0
        });
        
        // Update trail alpha and remove old positions
        for (let i = player.trail.length - 1; i >= 0; i--) {
            player.trail[i].alpha -= 0.15;
            if (player.trail[i].alpha <= 0 || i >= gameAssets.config.effects.trailLength) {
                player.trail.splice(i, 1);
            }
        }
    }

    // Check collision - SIMPLE DOODLE JUMP STYLE!
    checkPlatformCollision(player, platform) {
        // ONLY CHECK IF FALLING (original Doodle Jump behavior)
        if (player.velocityY <= 0) {
            return false; // Moving up or not moving, no collision
        }
        
        // SIMPLE HORIZONTAL OVERLAP CHECK
        const playerCenter = player.x + player.width / 2;
        const platformLeft = platform.x;
        const platformRight = platform.x + platform.width;
        
        // Player center must be over platform
        if (playerCenter < platformLeft || playerCenter > platformRight) {
            return false;
        }
        
        // SIMPLE VERTICAL COLLISION (like original!)
        const playerBottom = player.y + player.height;
        const platformTop = platform.y;
        
        // Landing on platform with simple tolerance
        if (playerBottom >= platformTop - this.platformTolerance && 
            playerBottom <= platformTop + this.platformTolerance) {
            return true;
        }
        
        return false;
    }

    // Handle platform jump - STRATEGIC BOUNCE SYSTEM!
    handlePlatformJump(player, platform) {
        // STRATEGIC JUMP FORCES WITH COLOR CODING
        let jumpForce = this.jumpForce;
        let particleColor = 'feather';
        
        switch(platform.type) {
            case 'superspring':
                jumpForce = this.jumpForce * 2.1; // MEGA BOOST for very difficult sections!
                particleColor = 'gold';
                this.createJumpParticles(player.x + player.width / 2, player.y, 'spark', 35);
                break;
            case 'spring':
                jumpForce = this.jumpForce * 1.7; // Strong spring boost
                particleColor = 'green';
                this.createJumpParticles(player.x + player.width / 2, player.y, 'spark', 25);
                break;
            case 'minispring':
                jumpForce = this.jumpForce * 1.35; // Small helpful boost
                particleColor = 'blue';
                this.createJumpParticles(player.x + player.width / 2, player.y, 'spark', 15);
                break;
            case 'cloud':
                jumpForce = this.jumpForce * 0.8; // Softer cloud bounce
                break;
            case 'evil':
                jumpForce = this.jumpForce * 0.6; // Weaker evil platform
                break;
            default:
                jumpForce = this.jumpForce; // Normal bounce
                break;
        }
        
        // AUTO-BOUNCE! (key Doodle Jump mechanic)
        player.velocityY = -jumpForce;
        
        // Position player on platform surface
        player.y = platform.y - player.height;
        
        // Small random horizontal variation (subtle!)
        const horizontalBoost = (Math.random() - 0.5) * 1.0;
        player.velocityX += horizontalBoost;
        
        return {
            type: platform.type,
            jumpForce: jumpForce,
            position: { x: platform.x, y: platform.y }
        };
    }

    // Update platform physics - SIMPLE DOODLE JUMP STYLE!
    updatePlatform(platform, deltaTime, canvasWidth) {
        if (platform.type === 'moving') {
            // Initialize movement if not set
            if (platform.velocityX === undefined) {
                platform.velocityX = (Math.random() > 0.5 ? 1 : -1) * 2;
            }
            
            // SIMPLE PLATFORM MOVEMENT!
            platform.x += platform.velocityX;
            
            // BOUNCE OFF WALLS (simple!)
            if (platform.x <= 0 || platform.x >= canvasWidth - platform.width) {
                platform.velocityX = -platform.velocityX;
                platform.x = Math.max(0, Math.min(canvasWidth - platform.width, platform.x));
            }
        }
        
        if (platform.type === 'breaking' && platform.breakTimer !== undefined) {
            // SIMPLE BREAK TIMER 
            platform.breakTimer += deltaTime;
            if (platform.breakTimer >= 30) { // ~500ms at 60fps
                platform.broken = true;
            }
        }
        
        if (platform.type === 'disappearing' && platform.fadeTimer !== undefined) {
            // DISAPPEARING PLATFORM TIMER
            platform.fadeTimer += deltaTime;
            if (platform.fadeTimer >= 90) { // ~1.5 seconds at 60fps
                platform.broken = true;
            }
        }
    }

    // Create particle effects
    createJumpParticles(x, y, type = 'feather', biomeColor = '#fbbf24') {
        const particles = [];
        const particleCount = gameAssets.config.effects.particleCount;
        
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 10,
                velocityX: (Math.random() - 0.5) * 4,
                velocityY: -Math.random() * 3 - 1,
                size: Math.random() * 3 + 2,
                type: type,
                biomeColor: biomeColor,
                alpha: 1.0,
                life: 60 // 1 second at 60fps
            });
        }
        
        return particles;
    }

    // DOODLE JUMP HORIZONTAL MOVEMENT - CLASSIC FEEL!
    movePlayerHorizontal(player, direction) {
        // direction: -1 for left, 1 for right, 0 for no input
        if (direction !== 0) {
            // ACCELERATE in movement direction (like original!)
            player.velocityX += direction * this.horizontalSpeed * 0.5; // Increased from 0.3 to 0.5
        }
        
        // CLAMP TO MAX SPEED (more responsive)
        const maxSpeed = this.horizontalSpeed * 3.0; // Increased from 2.5 to 3.0
        player.velocityX = Math.max(-maxSpeed, Math.min(maxSpeed, player.velocityX));
    }

    // ACCURATE MOBILE TOUCH - PRECISION + RESPONSIVENESS!
    movePlayerHorizontalEnhanced(player, direction, deltaTime) {
        if (direction !== 0) {
            // BALANCED RESPONSE - responsive but accurate for single taps
            const touchAcceleration = this.horizontalSpeed * 0.6; // Reduced from 1.2 for better accuracy
            const frameAdjustment = Math.min(deltaTime / 16.67, 1.8); // Slightly reduced cap
            
            // CONTROLLED velocity application for accurate movement
            const velocityChange = direction * touchAcceleration * frameAdjustment;
            player.velocityX += velocityChange;
            
            // MODERATE friction when actively touching (better control)
            player.velocityX *= 0.97; // More friction than before for precision
        } else {
            // Stronger friction when not touching (quicker stops)
            player.velocityX *= 0.90; // More friction for better control
        }
        
        // CONTROLLED max speed for mobile precision
        const maxSpeed = this.horizontalSpeed * 3.0; // Reduced from 4.0 for accuracy
        player.velocityX = Math.max(-maxSpeed, Math.min(maxSpeed, player.velocityX));
    }

    // PRECISE DESKTOP/KEYBOARD MOVEMENT - CONTROLLED PRECISION!
    movePlayerHorizontalPrecise(player, direction, deltaTime) {
        if (direction !== 0) {
            // PRECISE acceleration - much more controlled than mobile
            const desktopAcceleration = this.horizontalSpeed * 0.35; // Much lower than mobile (0.35 vs 1.2)
            const frameAdjustment = Math.min(deltaTime / 16.67, 1.5); // Slightly lower cap for consistency
            
            // GRADUAL velocity buildup for precise control
            const velocityChange = direction * desktopAcceleration * frameAdjustment;
            player.velocityX += velocityChange;
            
            // GRADUAL friction when moving (for fine control)
            player.velocityX *= 0.98; // More friction than touch for precision
        } else {
            // Strong friction when not pressing keys (quick stops)
            player.velocityX *= 0.88; // Stronger friction for precise stops
        }
        
        // CONTROLLED max speed for precision
        const maxSpeed = this.horizontalSpeed * 2.5; // Lower than touch (2.5 vs 4.0)
        player.velocityX = Math.max(-maxSpeed, Math.min(maxSpeed, player.velocityX));
    }

    // Update particles - SIMPLE style!
    updateParticles(particles, deltaTime) {
        // Simple particle updates
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            
            // SIMPLE position updates
            particle.x += particle.velocityX;
            particle.y += particle.velocityY;
            
            // Simple gravity for particles
            particle.velocityY += this.gravity * 0.2;
            
            // SIMPLE particle aging
            if (particle.life !== undefined) {
                particle.life--;
                particle.alpha = particle.life / 60;
                
                if (particle.life <= 0) {
                    particles.splice(i, 1);
                }
            } else if (particle.decay !== undefined) {
                particle.alpha -= particle.decay;
                
                if (particle.alpha <= 0) {
                    particles.splice(i, 1);
                }
            }
        }
    }

    // Generate platforms using procedural generation with pattern variety
    generatePlatforms(startY, endY, canvasWidth, existingPlatforms = []) {
        const platforms = [];
        const platformConfig = gameAssets.config.platform;
        

        let currentY = startY;
        
        // PATTERN SYSTEM - Create varied jumping challenges
        let currentPattern = null;
        let patternProgress = 0;
        let patternLength = 0;
        
        while (currentY > endY) {
            // Progressive difficulty based on height
            const height = Math.abs(currentY);
            let minGap, maxGap;
            
            if (height < 400) {
                // Very easy start - close platforms for confidence building
                minGap = platformConfig.easyMinGap;
                maxGap = platformConfig.easyMaxGap;
            } else if (height < 1000) {
                // Early game - gentle progression  
                const factor = (height - 400) / 600; // 0 to 1
                minGap = platformConfig.easyMinGap + factor * (platformConfig.minGap - platformConfig.easyMinGap) * 0.7;
                maxGap = platformConfig.easyMaxGap + factor * (platformConfig.maxGap - platformConfig.easyMaxGap) * 0.7;
            } else if (height < 2500) {
                // Mid game - normal difficulty with good flow
                const factor = (height - 1000) / 1500; // 0 to 1
                minGap = platformConfig.minGap * (0.9 + factor * 0.1);
                maxGap = platformConfig.maxGap * (0.9 + factor * 0.1);
            } else if (height < 7500) {
                // Advanced - challenging but fair with gradual increase
                const factor = Math.min(1, (height - 2500) / 5000); // 0 to 1 over 5000 pixels
                minGap = platformConfig.minGap + factor * (platformConfig.hardMinGap - platformConfig.minGap) * 0.85;
                maxGap = platformConfig.maxGap + factor * (platformConfig.hardMaxGap - platformConfig.maxGap) * 0.75; // Cap at 75% of max hard gap
            } else {
                // Expert level - maximum challenge but still beatable
                minGap = platformConfig.minGap + (platformConfig.hardMinGap - platformConfig.minGap) * 0.85;
                maxGap = platformConfig.maxGap + (platformConfig.hardMaxGap - platformConfig.maxGap) * 0.75; // Never go full hard mode
            }
            
            // Calculate next platform position with progressive difficulty
            const gapSize = minGap + Math.random() * (maxGap - minGap);
            currentY -= gapSize;
            
            // IMPROVED X positioning - guarantee reachability based on physics
            let x;
            if (platforms.length === 0) {
                // First platform - place with variety to avoid center clustering
                const startPositions = [0.3, 0.7, 0.4, 0.6, 0.5]; // Varied but accessible starting positions
                const startIndex = Math.floor(Math.random() * startPositions.length);
                x = (canvasWidth - platformConfig.width) * startPositions[startIndex];
            } else {
                // Calculate actual horizontal reach based on jump physics
                const lastPlatform = platforms[platforms.length - 1];
                const jumpForce = this.jumpForce; // Use physics engine jump force for consistency
                const gravity = this.gravity;
                const maxSpeed = gameAssets.config.player.maxSpeed;
                
                // Physics-based horizontal reach calculation - FIXED
                // Time to fall from jump height: t = 2 * jumpForce / gravity
                const jumpTime = (2 * jumpForce) / gravity;
                // Horizontal distance with air control: distance = maxSpeed * jumpTime * airControlFactor
                const trueHorizontalReach = maxSpeed * jumpTime * 0.8; // 0.8 = air control factor
                // Use actual physics calculation, not arbitrary cap - this gives ~282px reach!
                const maxHorizontalReach = Math.min(250, trueHorizontalReach); // Increased cap to 250px
                
                // Ensure platform is within reach, with reasonable safety margin
                const safetyMargin = 15; // Reduced from 20 to allow more placement flexibility
                const effectiveReach = maxHorizontalReach - safetyMargin;
                
                const minX = Math.max(0, lastPlatform.x - effectiveReach);
                const maxX = Math.min(canvasWidth - platformConfig.width, lastPlatform.x + effectiveReach);
                
                // Guarantee valid range - IMPROVED FALLBACK LOGIC
                if (minX >= maxX) {
                    // If calculated range is invalid, find the closest valid position
                    console.warn('⚠️ Invalid platform range detected, using fallback placement');
                    const canvasCenter = canvasWidth / 2;
                    const lastPlatformCenter = lastPlatform.x + platformConfig.width / 2;
                    
                    // Try to place platform as close to reachable as possible
                    if (lastPlatformCenter < canvasWidth / 2) {
                        // Last platform on left side, place new one slightly right but within reach
                        x = Math.min(lastPlatform.x + effectiveReach * 0.8, canvasWidth - platformConfig.width);
                    } else {
                        // Last platform on right side, place new one slightly left but within reach
                        x = Math.max(lastPlatform.x - effectiveReach * 0.8, 0);
                    }
                } else {
                    // PATTERN-BASED PLACEMENT SYSTEM - Create varied jumping challenges
                    x = this.calculatePatternBasedPosition(platforms, minX, maxX, canvasWidth, height, currentPattern, patternProgress, patternLength);
                    
                    // Update pattern system
                    const patternResult = this.updatePatternSystem(currentPattern, patternProgress, patternLength, height);
                    currentPattern = patternResult.pattern;
                    patternProgress = patternResult.progress;
                    patternLength = patternResult.length;
                }
            }
            
            // STRATEGIC PLATFORM TYPE DETERMINATION
            let type = 'normal';
            const rand = Math.random();
            
            // Check if we need a strategic bounce platform - IMPROVED CALCULATIONS
            const gapFromLast = platforms.length > 0 ? Math.abs(currentY - platforms[platforms.length - 1].y) : 0;
            const horizontalDistanceFromLast = platforms.length > 0 ? Math.abs(x - platforms[platforms.length - 1].x) : 0;
            
            // Calculate if this gap is approaching maximum reachability  
            const actualJumpForce = this.jumpForce; // Use physics engine jump force for consistency
            const maxReachableGap = (actualJumpForce * actualJumpForce) / this.gravity; // Physics-based max height
            const isLargeGap = gapFromLast > maxReachableGap * 0.7; // 70% of max reach
            const isVeryLargeGap = gapFromLast > maxReachableGap * 0.85; // 85% of max reach
            
            // Use the corrected horizontal reach for difficulty assessment
            const correctedHorizontalReach = Math.min(250, gameAssets.config.player.maxSpeed * ((2 * actualJumpForce) / this.gravity) * 0.8);
            const isHorizontallyDifficult = horizontalDistanceFromLast > (correctedHorizontalReach * 0.6); // 60% of max horizontal reach
            const isVeryHorizontallyDifficult = horizontalDistanceFromLast > (correctedHorizontalReach * 0.8); // 80% of max horizontal reach
            
            // Count recent spring platforms to avoid clustering
            let recentSprings = 0;
            let recentEvil = 0;
            for (let i = Math.max(0, platforms.length - 3); i < platforms.length; i++) {
                if (platforms[i].type.includes('spring')) recentSprings++;
                if (platforms[i].type === 'evil') recentEvil++;
            }
            
            // STRATEGIC PLACEMENT LOGIC - SAFETY FIRST, THEN DIFFICULTY
            // Always prioritize reachability over difficulty level - ENHANCED WITH HORIZONTAL DIFFICULTY
            if ((isVeryLargeGap || isVeryHorizontallyDifficult) && recentSprings === 0) {
                // Emergency super spring for very difficult sections (ANY height)
                type = 'superspring';
                console.log('🟡 Placed SUPERSPRING for extreme gap:', gapFromLast, 'px vertical,', horizontalDistanceFromLast, 'px horizontal');
            } else if ((isLargeGap || isVeryHorizontallyDifficult) && recentSprings < 2) {
                // Regular spring for challenging sections (ANY height)
                type = 'spring';
                console.log('🟢 Placed SPRING for large gap:', gapFromLast, 'px vertical,', horizontalDistanceFromLast, 'px horizontal');
            } else if ((gapFromLast > maxReachableGap * 0.6 || isHorizontallyDifficult) && recentSprings < 1) {
                // Safety net for medium-large gaps or horizontal difficulty at ANY height
                type = Math.random() < 0.8 ? 'spring' : 'minispring';
                console.log('🔵 Placed safety spring for moderate difficulty:', gapFromLast, 'px vertical,', horizontalDistanceFromLast, 'px horizontal');
            } else if (recentEvil >= 2) {
                // Force a helpful platform after multiple evil platforms - NEVER allow 3+ evil in sequence
                type = Math.random() < 0.7 ? 'spring' : 'minispring';
            } else if (height < 400) {
                // Early game - mostly normal with frequent helpful springs
                if (gapFromLast > maxReachableGap * 0.4) type = 'minispring'; // Extra safety for early game
                else if (rand < 0.25) type = 'minispring'; // More frequent mini springs
            } else if (height < 800) {
                // Early-mid game - introduce springs strategically
                if (rand < 0.08) type = 'spring';
                else if (rand < 0.18) type = 'minispring';
                else if (rand < 0.25) type = 'moving';
                else if (rand < 0.28) type = 'ice'; // Introduce ice platforms early
            } else if (height < 1500) {
                // Mid game - balanced challenge with strategic recovery
                if ((isHorizontallyDifficult || isVeryHorizontallyDifficult) && rand < 0.4) type = 'spring'; // More help with horizontal challenges
                else if (rand < 0.05) type = 'spring';
                else if (rand < 0.15) type = 'minispring';
                else if (rand < 0.25) type = 'moving';
                else if (rand < 0.30) type = 'ice';
                else if (rand < 0.35) type = 'cloud';
                else if (rand < 0.40) type = 'disappearing';
                else if (rand < 0.42) type = 'breaking';
                else if (rand < 0.45 && this.isEvilPlatformSafe(platforms, height)) type = 'evil'; // Add evil toads earlier
            } else if (height < 3000) {
                // Advanced game - more challenge but strategic recovery
                if (isVeryHorizontallyDifficult && rand < 0.6) type = 'spring'; // Much more help for very difficult horizontal gaps
                else if (isHorizontallyDifficult && rand < 0.4) type = 'spring'; // More help for horizontal challenges
                else if (rand < 0.08) type = 'spring';
                else if (rand < 0.18) type = 'minispring';
                else if (rand < 0.28) type = 'moving';
                else if (rand < 0.35) type = 'ice';
                else if (rand < 0.42) type = 'cloud';
                else if (rand < 0.48) type = 'disappearing';
                else if (rand < 0.52) type = 'breaking';
                else if (rand < 0.55 && this.isEvilPlatformSafe(platforms, height)) type = 'evil'; // Only if safe
            } else {
                // Expert level - maximum strategic placement with guaranteed help - ENHANCED
                if ((isVeryLargeGap || isVeryHorizontallyDifficult) && rand < 0.85) type = 'superspring'; // Very high chance of mega help for extreme gaps
                else if ((isLargeGap || isVeryHorizontallyDifficult) && rand < 0.7) type = 'spring'; // Higher chance of spring help
                else if (isHorizontallyDifficult && rand < 0.8) type = 'spring'; // Much higher chance for horizontal challenges
                else if (rand < 0.18) type = 'spring'; // More springs in general
                else if (rand < 0.32) type = 'minispring'; // More mini springs
                else if (rand < 0.38) type = 'moving';
                else if (rand < 0.42) type = 'ice';
                else if (rand < 0.46) type = 'cloud';
                else if (rand < 0.50) type = 'disappearing';
                else if (rand < 0.54) type = 'breaking';
                else if (rand < 0.56 && this.isEvilPlatformSafe(platforms, height)) type = 'evil'; // Only if safe - Reduced evil at expert level
            }
            
            // FINAL REACHABILITY VALIDATION - Ensure every platform is truly reachable
            let finalX = x;
            let finalType = type;
            
            if (platforms.length > 0) {
                const lastPlatform = platforms[platforms.length - 1];
                const verticalGap = Math.abs(currentY - lastPlatform.y);
                const horizontalGap = Math.abs(x - lastPlatform.x);
                
                // Double-check physics: Can we actually reach this platform?
                const jumpHeight = (this.jumpForce * this.jumpForce) / this.gravity; // Max theoretical jump height
                const jumpTime = (2 * this.jumpForce) / this.gravity;
                const maxHorizontalDistance = gameAssets.config.player.maxSpeed * jumpTime * 0.8;
                
                const isVerticallyUnreachable = verticalGap > jumpHeight * 0.9; // 90% of max height
                const isHorizontallyUnreachable = horizontalGap > maxHorizontalDistance * 0.9; // 90% of max distance
                
                if (isVerticallyUnreachable || isHorizontallyUnreachable) {
                    console.warn('🚨 UNREACHABLE PLATFORM DETECTED! Adjusting...');
                    console.log(`   Vertical gap: ${verticalGap}px (max: ${jumpHeight}px)`);
                    console.log(`   Horizontal gap: ${horizontalGap}px (max: ${maxHorizontalDistance}px)`);
                    
                    // Force a spring to make it reachable
                    if (isVerticallyUnreachable) {
                        finalType = 'superspring';
                        console.log('   🟡 Forced SUPERSPRING for vertical gap');
                    } else if (isHorizontallyUnreachable) {
                        // Move platform closer horizontally and add spring
                        const safeHorizontalDistance = maxHorizontalDistance * 0.7;
                        if (lastPlatform.x < canvasWidth / 2) {
                            finalX = Math.min(lastPlatform.x + safeHorizontalDistance, canvasWidth - platformConfig.width);
                        } else {
                            finalX = Math.max(lastPlatform.x - safeHorizontalDistance, 0);
                        }
                        finalType = 'spring';
                        console.log('   🟢 Adjusted position and added SPRING for horizontal gap');
                    }
                }
            }
            
            platforms.push({
                x: finalX,
                y: currentY,
                width: platformConfig.width,
                height: platformConfig.height,
                type: finalType,
                touched: false,
                broken: false
            });
        }
        
        // POST-GENERATION VALIDATION - Final safety check for impossible sequences
        this.validateAndFixPlatformSequence(platforms, canvasWidth);
        
        return platforms;
    }

    // Validate and fix platform sequences to ensure all platforms are reachable
    validateAndFixPlatformSequence(platforms, canvasWidth) {
        if (platforms.length < 2) return; // Need at least 2 platforms to validate
        
        const jumpHeight = (this.jumpForce * this.jumpForce) / this.gravity;
        const jumpTime = (2 * this.jumpForce) / this.gravity;
        const maxHorizontalDistance = gameAssets.config.player.maxSpeed * jumpTime * 0.8;
        
        let fixesApplied = 0;
        
        for (let i = 1; i < platforms.length; i++) {
            const currentPlatform = platforms[i];
            const previousPlatform = platforms[i - 1];
            
            const verticalGap = Math.abs(currentPlatform.y - previousPlatform.y);
            const horizontalGap = Math.abs(currentPlatform.x - previousPlatform.x);
            
            const isVerticallyUnreachable = verticalGap > jumpHeight * 0.95; // Very strict check
            const isHorizontallyUnreachable = horizontalGap > maxHorizontalDistance * 0.95;
            
            if (isVerticallyUnreachable || isHorizontallyUnreachable) {
                console.warn(`🚨 POST-GEN FIX: Platform ${i} unreachable from platform ${i-1}`);
                console.log(`   Gaps: ${verticalGap}px vertical, ${horizontalGap}px horizontal`);
                
                // Apply fix based on the type of unreachability
                if (isVerticallyUnreachable) {
                    // Make the previous platform a superspring to bridge the gap
                    platforms[i - 1].type = 'superspring';
                    console.log(`   🟡 Fixed: Made platform ${i-1} a SUPERSPRING`);
                    fixesApplied++;
                } else if (isHorizontallyUnreachable) {
                    // Move current platform closer and make previous one a spring
                    const safeDistance = maxHorizontalDistance * 0.7;
                    const platformConfig = gameAssets.config.platform;
                    
                    if (previousPlatform.x < canvasWidth / 2) {
                        currentPlatform.x = Math.min(previousPlatform.x + safeDistance, canvasWidth - platformConfig.width);
                    } else {
                        currentPlatform.x = Math.max(previousPlatform.x - safeDistance, 0);
                    }
                    
                    platforms[i - 1].type = 'spring';
                    console.log(`   🟢 Fixed: Moved platform ${i} closer and made platform ${i-1} a SPRING`);
                    fixesApplied++;
                }
            }
        }
        
        if (fixesApplied > 0) {
            console.log(`✅ Post-generation validation complete: ${fixesApplied} fixes applied`);
        }
    }

    // Pattern-based position calculation for varied jumping challenges
    calculatePatternBasedPosition(platforms, minX, maxX, canvasWidth, height, currentPattern, patternProgress, patternLength) {
        const lastPlatform = platforms[platforms.length - 1];
        const range = maxX - minX;
        const center = minX + range / 2;
        const canvasCenter = canvasWidth / 2;
        
        let x = center; // Default fallback
        
        switch (currentPattern) {
            case 'zigzag':
                // Alternating left-right pattern for dynamic movement
                const zigzagDirection = (patternProgress % 2 === 0) ? -1 : 1;
                const zigzagIntensity = Math.min(0.8, 0.3 + (height / 5000)); // Increase intensity with height
                x = center + (zigzagDirection * range * zigzagIntensity * 0.5);
                break;
                
            case 'spiral':
                // Circular/spiral pattern around canvas center
                const spiralAngle = (patternProgress / patternLength) * Math.PI * 4; // 2 full rotations
                const spiralRadius = Math.min(range * 0.4, 80 + (height / 100));
                const spiralCenterX = Math.max(minX + 60, Math.min(maxX - 60, canvasCenter));
                x = spiralCenterX + Math.cos(spiralAngle) * spiralRadius;
                break;
                
            case 'edges':
                // Force movement to canvas edges for challenging wall-jumps
                const edgeChoice = patternProgress % 3;
                if (edgeChoice === 0) {
                    x = minX + range * 0.1; // Far left
                } else if (edgeChoice === 1) {
                    x = maxX - range * 0.1; // Far right
                } else {
                    x = center; // Occasional center relief
                }
                break;
                
            case 'cluster':
                // Group platforms in tight clusters with gaps between clusters
                const clusterPhase = Math.floor(patternProgress / 3);
                if (patternProgress % 6 < 3) {
                    // Tight cluster - stay near last platform
                    const clusterSpread = Math.min(range * 0.2, 40);
                    x = lastPlatform.x + (Math.random() - 0.5) * clusterSpread;
                } else {
                    // Gap jump to new cluster location
                    const newClusterSide = (clusterPhase % 2 === 0) ? 0.2 : 0.8;
                    x = minX + range * newClusterSide;
                }
                break;
                
            case 'wave':
                // Smooth wave pattern across the screen
                const wavePhase = (patternProgress / patternLength) * Math.PI * 2;
                const waveAmplitude = Math.min(range * 0.4, 100);
                x = center + Math.sin(wavePhase) * waveAmplitude;
                break;
                
            case 'pendulum':
                // Pendulum swing from side to side
                const pendulumProgress = patternProgress / patternLength;
                const pendulumAngle = Math.sin(pendulumProgress * Math.PI);
                x = minX + range * (0.5 + pendulumAngle * 0.4);
                break;
                
            case 'challenge':
                // Maximum difficulty spread for expert players
                const challengePositions = [0.1, 0.9, 0.3, 0.7, 0.5]; // Varied positions
                const challengeIndex = patternProgress % challengePositions.length;
                x = minX + range * challengePositions[challengeIndex];
                break;
                
            default:
                // Enhanced random with bias away from center
                const centerBias = Math.abs((lastPlatform.x + lastPlatform.width/2) - canvasCenter) / (canvasWidth/2);
                if (centerBias < 0.3) {
                    // Too central - bias toward edges
                    x = Math.random() < 0.5 ? 
                        minX + range * (0.7 + Math.random() * 0.3) : 
                        minX + range * (0.0 + Math.random() * 0.3);
                } else {
                    // Good spread - normal random
                    x = minX + Math.random() * range;
                }
                break;
        }
        
        // Ensure x is within valid bounds
        return Math.max(minX, Math.min(maxX, x));
    }

    // Update pattern system - decides when to change patterns
    updatePatternSystem(currentPattern, patternProgress, patternLength, height) {
        // Pattern difficulty scaling
        const difficultyFactor = Math.min(1.0, height / 10000); // 0 to 1 over 10000px
        
        // Start new pattern if current one is complete or null
        if (!currentPattern || patternProgress >= patternLength) {
            const patterns = this.getAvailablePatterns(height, difficultyFactor);
            const newPattern = patterns[Math.floor(Math.random() * patterns.length)];
            const newLength = this.getPatternLength(newPattern, difficultyFactor);
            
            console.log(`🎨 New pattern: ${newPattern} (length: ${newLength}) at height ${height}px`);
            
            return {
                pattern: newPattern,
                progress: 0,
                length: newLength
            };
        }
        
        // Continue current pattern
        return {
            pattern: currentPattern,
            progress: patternProgress + 1,
            length: patternLength
        };
    }

    // Get available patterns based on height/difficulty
    getAvailablePatterns(height, difficultyFactor) {
        const basePatterns = ['zigzag', 'wave', 'enhanced_random'];
        
        if (height < 500) {
            // Early game - simple patterns only
            return ['enhanced_random', 'zigzag'];
        } else if (height < 1500) {
            // Early-mid game - introduce variety
            return ['zigzag', 'wave', 'cluster', 'enhanced_random'];
        } else if (height < 3000) {
            // Mid game - more complex patterns
            return ['zigzag', 'wave', 'spiral', 'cluster', 'pendulum', 'enhanced_random'];
        } else if (height < 6000) {
            // Advanced - all patterns except maximum challenge
            return ['zigzag', 'wave', 'spiral', 'cluster', 'pendulum', 'edges', 'enhanced_random'];
        } else {
            // Expert - all patterns including maximum challenge
            return ['zigzag', 'wave', 'spiral', 'cluster', 'pendulum', 'edges', 'challenge', 'enhanced_random'];
        }
    }

    // Determine pattern length based on type and difficulty
    getPatternLength(pattern, difficultyFactor) {
        const baseLengths = {
            'enhanced_random': 3 + Math.floor(Math.random() * 3), // 3-5 platforms
            'zigzag': 4 + Math.floor(Math.random() * 4), // 4-7 platforms
            'wave': 6 + Math.floor(Math.random() * 4), // 6-9 platforms
            'spiral': 8 + Math.floor(Math.random() * 4), // 8-11 platforms
            'cluster': 6 + Math.floor(Math.random() * 3), // 6-8 platforms
            'pendulum': 5 + Math.floor(Math.random() * 3), // 5-7 platforms
            'edges': 4 + Math.floor(Math.random() * 3), // 4-6 platforms
            'challenge': 3 + Math.floor(Math.random() * 2) // 3-4 platforms (intense!)
        };
        
        const baseLength = baseLengths[pattern] || 5;
        
        // Slightly shorter patterns at higher difficulty for more variety
        const difficultyAdjustment = Math.floor(difficultyFactor * 2);
        return Math.max(3, baseLength - difficultyAdjustment);
    }

    // Validate if placing an Evil platform is safe (ensures alternative paths exist)
    isEvilPlatformSafe(platforms, currentHeight) {
        // NEVER place evil platforms in very early game
        if (currentHeight < 600) {
            return false;
        }
        
        // Check recent evil platform density
        let recentEvil = 0;
        let recentNormal = 0;
        const checkRange = 5; // Check last 5 platforms
        
        for (let i = Math.max(0, platforms.length - checkRange); i < platforms.length; i++) {
            if (platforms[i].type === 'evil') {
                recentEvil++;
            } else if (['normal', 'spring', 'minispring', 'superspring'].includes(platforms[i].type)) {
                recentNormal++;
            }
        }
        
        // SAFETY RULES:
        // 1. Never allow more than 1 evil in last 5 platforms
        if (recentEvil >= 1) {
            console.log('🚫 Evil platform blocked: Recent evil detected');
            return false;
        }
        
        // 2. Must have at least 2 normal/spring platforms in recent history
        if (recentNormal < 2) {
            console.log('🚫 Evil platform blocked: Not enough safe platforms recently');
            return false;
        }
        
        // 3. CRITICAL: Check if current pattern could create isolation
        // If we're in a challenging pattern, avoid evil platforms
        const patternBasedRisk = this.assessPatternRisk(platforms, currentHeight);
        if (patternBasedRisk) {
            console.log('🚫 Evil platform blocked: Pattern-based risk detected');
            return false;
        }
        
        // 4. Probabilistic safety - reduce evil chance at higher difficulties
        const difficultyFactor = Math.min(1.0, currentHeight / 10000);
        const safetyChance = 0.7 - (difficultyFactor * 0.3); // 70% to 40% chance allowed
        
        if (Math.random() > safetyChance) {
            console.log('🚫 Evil platform blocked: Safety probability check');
            return false;
        }
        
        console.log('✅ Evil platform approved: Safe placement conditions met');
        return true;
    }

    // Assess if current pattern creates risk for evil platform placement
    assessPatternRisk(platforms, currentHeight) {
        if (platforms.length < 3) return false;
        
        const last3 = platforms.slice(-3);
        
        // Check for risky patterns:
        // 1. All platforms are at canvas edges (pattern: edges)
        const canvasWidth = gameAssets.config.canvas.width;
        const edgeThreshold = 60; // pixels from edge
        
        let edgePlatforms = 0;
        for (const platform of last3) {
            if (platform.x < edgeThreshold || platform.x > (canvasWidth - platform.width - edgeThreshold)) {
                edgePlatforms++;
            }
        }
        
        if (edgePlatforms >= 2) {
            return true; // Risky - platforms at edges make evil dangerous
        }
        
        // 2. Large horizontal distances (pattern: challenge, spiral)
        let largeGaps = 0;
        for (let i = 1; i < last3.length; i++) {
            const horizontalGap = Math.abs(last3[i].x - last3[i-1].x);
            if (horizontalGap > 100) {
                largeGaps++;
            }
        }
        
        if (largeGaps >= 2) {
            return true; // Risky - large gaps make evil dangerous
        }
        
        // 3. Moving or breaking platform clusters
        let unstablePlatforms = 0;
        for (const platform of last3) {
            if (['moving', 'breaking'].includes(platform.type)) {
                unstablePlatforms++;
            }
        }
        
        if (unstablePlatforms >= 2) {
            return true; // Risky - unstable platforms make evil dangerous
        }
        
        return false; // Pattern looks safe for evil placement
    }

    // Calculate score based on height reached
    calculateScore(playerY, startY) {
        const heightDifference = Math.max(0, startY - playerY);
        return Math.floor(heightDifference / 10) * gameAssets.config.score.heightMultiplier;
    }

    // Linear interpolation utility
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    // Check if point is in circle (for circular collision detection)
    pointInCircle(pointX, pointY, circleX, circleY, radius) {
        const dx = pointX - circleX;
        const dy = pointY - circleY;
        return dx * dx + dy * dy <= radius * radius;
    }

    // Check rectangle collision
    rectCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    // Get camera target position (following player with some offset)
    getCameraTarget(player, canvasHeight) {
        // Keep player in lower third of screen when jumping up
        return player.y - canvasHeight * 0.7;
    }

    // Update camera with smooth following - IMPROVED for frame-rate independence
    updateCamera(camera, targetY, deltaTime) {
        const normalizedDelta = deltaTime / 16.67; // Consistent normalization
        const followSpeed = 0.1;
        
        // Smooth camera interpolation with frame-rate independence
        const lerpFactor = Math.min(1.0, followSpeed * normalizedDelta);
        camera.y = this.lerp(camera.y, targetY, lerpFactor);
        
        // Prevent camera from going down (only follow upward movement)
        camera.y = Math.min(camera.y, camera.maxY || camera.y);
        camera.maxY = camera.y;
    }
}

// Export singleton instance
const gamePhysics = new GamePhysics();
console.log('⚡ Game physics loaded');
console.log('⚡ Game physics loaded');