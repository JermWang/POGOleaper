// ===== POGO'S LEAP PAD - POND SCRIPT =====

// === SUPABASE INTEGRATION ===
// Load Supabase client dynamically for live order tracking
let orderTracker = null;

async function loadSupabaseClient() {
    try {
        const module = await import('./supabase-client.js');
        orderTracker = module.default;
        console.log('✅ Supabase client loaded successfully');
        return true;
    } catch (error) {
        console.warn('⚠️ Supabase client not available:', error);
        return false;
    }
}

// === GLOBAL VARIABLES ===

// Restaurant state
let ordersServed = 0;
let audioEnabled = true;
window.audioEnabled = true; // Make available globally for game
let isLoaded = false;

// Current order state
const currentOrder = {
    base: 'POGO',
    hat: '',
    hatName: 'Bare Head',
    item: '',
    itemName: 'No Loot'
};

// Konami code state
let konamiCode = [];
let clickCount = 0;
let orderNumber = 1;

// Easter egg state
let easterEggFound = false;

// Audio context and audio enabled state
let audioContext;

// Constants
const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];

// Menu Items — Pogo's headgear and loot
const menuItems = {
    hats: [
        { id: '', name: 'Bare Head', description: 'Fresh out of the pond, no drip needed', price: 0.00, emoji: '🚫' },
        { id: 'crown', name: 'Pond Royalty', description: 'The one true Leaper King, golden and regal', price: 0.50, emoji: '👑' },
        { id: 'wizard', name: 'Swamp Wizard', description: 'Casts liquidity spells from the lily pad', price: 0.50, emoji: '🧙' },
        { id: 'mohawk', name: 'Punk Ribbit', description: 'Pond rock is not dead', price: 0.50, emoji: '🤘' },
        { id: 'bandana', name: 'Swamp Bandit', description: 'Outlaw of the outer marsh', price: 0.50, emoji: '🏴' },
        { id: 'chef-hat', name: 'Fly Chef', description: 'Serves the finest flies in the pond', price: 0.50, emoji: '👨‍🍳' },
        { id: 'cool-guy', name: 'Cool Croaker', description: 'Too cool for the tadpoles', price: 0.50, emoji: '😎' },
        { id: 'devil-horns', name: 'Devil Toad', description: 'Dangerously froggy, handle with care', price: 0.50, emoji: '😈' },
        { id: 'halo', name: 'Holy Hopper', description: 'Blessed by the pond spirits', price: 0.50, emoji: '😇' },
        { id: 'little-hat', name: 'Lil\' Topper', description: 'A tiny hat for a mighty leaper', price: 0.50, emoji: '🎩' },
        { id: 'rasta', name: 'Reggae Ribbit', description: 'Irie vibes from the island marsh', price: 0.50, emoji: '🌴' },
        { id: 'robinhood', name: 'Robin Hop', description: 'Steals from the whales, gives to the tadpoles', price: 0.50, emoji: '🏹' }
    ],
    items: [
        { id: '', name: 'No Loot', description: 'Keep it simple, frog only', price: 0.00, emoji: '🚫' },
        { id: 'coin', name: 'Pond Coin', description: 'Shiny treasure from the bottom of the pond', price: 1.00, emoji: '🪙' },
        { id: 'pogo-token', name: '$POGO Token', description: 'The official currency of the pond', price: 1.00, emoji: '🐸' },
        { id: 'wand', name: 'Magic Wand', description: 'Enchanted stick with leap-boosting powers', price: 1.00, emoji: '✨' },
        { id: 'joint', name: 'Swamp Joint', description: 'Rolled with secret pond herbs', price: 1.00, emoji: '🌿' },
        { id: 'bong', name: 'Bubbler', description: 'For the chillest frog in the bog', price: 1.00, emoji: '💨' },
        { id: 'drugs', name: 'Party Favors', description: 'What happens in the pond stays in the pond', price: 1.00, emoji: '💊' },
        { id: 'rh', name: 'Stonks App', description: 'To the moon — one leap at a time', price: 1.00, emoji: '📈' }
    ]
};

// Canvas and layer management - initialized after DOM load
let canvas = null;
let ctx = null;

// Layer images storage
const layers = {
    base: null,
    hat: null,
    item: null
};

// Revision the base URL whenever the source artwork is renewed so production
// browsers and CDNs cannot keep serving an older cached Pogo image.
const PFP_BASE_IMAGE_SRC = 'assets/base/POGO.png?v=renewed-20260715';

// Canvas renders are asynchronous because each selected asset is an image.
// Keep one revision counter and one shared cache so an older, slower request can
// never draw over a newer selection.
const pfpImageCache = new Map();
const pfpTraitOverlayCache = new Map();
const pfpBasePixelCache = new Map();
let pfpRenderRevision = 0;
let latestPFPRender = Promise.resolve();

// === LOADING SYSTEM ===

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
}

// Update order number dynamically in HTML
function updateOrderNumber() {
    try {
        const orderNumberElement = document.querySelector('.order-number');
        if (orderNumberElement) {
            orderNumberElement.textContent = `#${String(orderNumber).padStart(4, '0')}`;
        }
    } catch (error) {
        console.error('Error updating order number:', error);
    }
}

// Initialize order number on page load
function initializeOrderNumber() {
    try {
        // Generate order number based on orders served
        orderNumber = ordersServed + 1;
        updateOrderNumber();
    } catch (error) {
        console.error('Error initializing order number:', error);
    }
}

function updateOrdersServed() {
    const orderCounter = document.getElementById('ordersServed');
    if (orderCounter) {
        orderCounter.textContent = ordersServed.toLocaleString();
    }
}

// === RESTAURANT AUDIO SYSTEM ===

function initAudio() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Audio not supported in this browser');
            audioEnabled = false;
            window.audioEnabled = false; // Sync with global
        }
    }
}

function playTone(frequency, duration, type = 'sine', volume = 0.1) {
    if (!audioEnabled) return;
    initAudio();
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
        console.warn('Audio playback failed:', e);
    }
}

// Make playTone globally available for game
window.playTone = playTone;

// Restaurant-themed sound effects
function playSoftSelectSound() {
    if (!audioEnabled) return;
    // Soft, short, pleasant UI blip
    playTone(520, 0.08, 'sine', 0.03);
    setTimeout(() => playTone(660, 0.06, 'sine', 0.02), 90);
}

function playFrogSound() {
    if (!audioEnabled) return;
    // Redirect legacy call to soft selection sound
    playSoftSelectSound();
}

function playOrderSound() {
    if (!audioEnabled) return;
    playTone(523, 0.2);
    setTimeout(() => playTone(659, 0.3), 200);
}

function playCompleteOrderSound() {
    if (!audioEnabled) return;
    // Cash register sound
    playTone(800, 0.1);
    setTimeout(() => playTone(600, 0.1), 100);
    setTimeout(() => playTone(400, 0.2), 200);
}

function playKitchenSound() {
    if (!audioEnabled) return;
    // Softer UI tap for non-selection actions
    playTone(280, 0.06, 'triangle', 0.02);
}

function playPartySound() {
    if (!audioEnabled) return;
    playTone(523, 0.2);
    setTimeout(() => playTone(659, 0.2), 100);
    setTimeout(() => playTone(784, 0.2), 200);
    setTimeout(() => playTone(1047, 0.3), 300);
}

// === SUPABASE ORDER TRACKING ===

// Record order globally in Supabase
async function recordGlobalOrder(orderData) {
    try {
        console.log('🔍 Recording order with data:', orderData);
        
        if (!orderTracker) {
            console.log('📝 Order recorded locally only (Supabase not available)');
            return { success: false, reason: 'Supabase not available' };
        }

        const result = await orderTracker.recordOrder(orderData);
        if (result.success) {
            console.log('✅ Global order recorded successfully');
            // Update global stats after successful recording
            updateGlobalStats();
            return { success: true };
        } else {
            console.error('❌ Failed to record global order:', result.error);
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error('Exception recording global order:', error);
        return { success: false, error: error.message };
    }
}

// Update global statistics in navbar
async function updateGlobalStats() {
    try {
        if (!orderTracker) {
            // Update with local stats only
            const ordersServedElement = document.getElementById('ordersServed');
            if (ordersServedElement) {
                ordersServedElement.textContent = ordersServed.toLocaleString();
            }
            return;
        }

        const globalCount = await orderTracker.getGlobalOrderCount();
        if (globalCount.success) {
            ordersServed = globalCount.count;
            // Update the orders served stat in navbar
            const ordersServedElement = document.getElementById('ordersServed');
            if (ordersServedElement) {
                ordersServedElement.textContent = globalCount.count.toLocaleString();
            }
            console.log(`📊 Global order count updated: ${globalCount.count}`);
        }
    } catch (error) {
        console.warn('⚠️ Could not update global stats:', error);
    }
}

// Initialize global stats on page load (with timeout protection)
async function initializeGlobalStats() {
    try {
        // First try to load Supabase client
        const supabaseLoaded = await loadSupabaseClient();
        if (!supabaseLoaded || !orderTracker) {
            console.warn('⚠️ Supabase client not available, using local stats only');
            return;
        }

        // Test connection with timeout
        const connectionPromise = orderTracker.testConnection();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), 3000)
        );
        
        const connectionTest = await Promise.race([connectionPromise, timeoutPromise]);
        
        if (connectionTest.success) {
            console.log('✅ Supabase connected successfully');
            await updateGlobalStats();
            
            // Start real-time subscription for live updates
            setupLiveOrderTracking();
        } else {
            console.warn('⚠️ Supabase connection failed, using local stats only');
        }
    } catch (error) {
        console.warn('⚠️ Supabase unavailable, using local stats only:', error);
    }
}

// Set up real-time order tracking
function setupLiveOrderTracking() {
    try {
        if (!orderTracker) {
            console.log('📡 Live order tracking not available (Supabase not loaded)');
            return;
        }

        orderTracker.subscribeToLiveOrders(
            // When someone else places an order
            (newOrder) => {
                handleLiveOrderNotification(newOrder);
                updateGlobalStats(); // Refresh the navbar count
            },
            // When an order is updated (less common)
            (updatedOrder) => {
                console.log('🔄 Order updated:', updatedOrder);
            }
        );
    } catch (error) {
        console.warn('⚠️ Could not set up live order tracking:', error);
    }
}

// Handle live order notifications from other users
function handleLiveOrderNotification(order) {
    // Don't show notification for our own orders (avoid duplicate notifications)
    const isOwnOrder = Date.now() - new Date(order.created_at).getTime() < 5000; // Within 5 seconds
    
    if (!isOwnOrder) {
        // Show live order notification
        const hatName = order.hat_name || 'Bare Head';
        const itemName = order.item_name || 'No Loot';
        
        showLiveOrderNotification(hatName, itemName);
        
        // Add subtle visual effect
        pulseOrderCounter();
    }
}

// Show live order notification for other users' orders
function showLiveOrderNotification(hatName, itemName) {
    const messages = [
        `🔴 LIVE: Someone ordered ${hatName} with ${itemName}!`,
        `👨‍🍳 Fresh order: ${hatName} + ${itemName}`,
        `🪷 Another customer chose ${hatName} with ${itemName}`,
        `🎉 Live order: ${hatName} & ${itemName}`,
        `👥 Someone else is enjoying ${hatName} + ${itemName}`
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    showNotification(randomMessage, 3000);
}

// Pulse the order counter when live orders come in
function pulseOrderCounter() {
    const orderCountElement = document.querySelector('.stat-item .stat-number');
    if (orderCountElement) {
        orderCountElement.style.animation = 'none';
        setTimeout(() => {
            orderCountElement.style.animation = 'pulse 0.5s ease-in-out';
        }, 10);
    }
}

// === NOTIFICATION SYSTEM ===

// Global notification timeout variable
let notificationTimeout = null;

function showNotification(message, typeOrDuration = 'info', duration = 1800) {
    const notification = document.getElementById('notification');
    if (!notification) return;

    const type = typeof typeOrDuration === 'string' ? typeOrDuration : 'info';
    const displayDuration = typeof typeOrDuration === 'number' ? typeOrDuration : duration;
    
    // Clear any existing notification timeout to prevent overlapping
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
        notificationTimeout = null;
    }
    
    // Immediately update and show the new notification
    notification.textContent = message;
    notification.classList.remove('show', 'success', 'error', 'warning', 'info');
    notification.classList.add(type);
    
    // Force reflow to ensure CSS transition resets
    notification.offsetHeight;
    
    // Show the new notification
    notification.classList.add('show');
    
    // Set new timeout to hide this notification
    notificationTimeout = setTimeout(() => {
        notification.classList.remove('show');
        notificationTimeout = null;
    }, displayDuration);
}

// === MENU GENERATION ===

function createMenuItem(category, item) {
    const menuItem = document.createElement('div');
    menuItem.className = 'menu-item';
    menuItem.setAttribute('data-category', category);
    menuItem.setAttribute('data-value', item.id);
    menuItem.setAttribute('data-item-id', item.id); // Added data-item-id
    menuItem.setAttribute('role', 'button');
    menuItem.setAttribute('tabindex', '0');
    menuItem.setAttribute('aria-label', `Add ${item.name} to order`);
    
    // Real artwork thumbnails throughout, including a clean base-Pogo preview
    // for the "none" options so the tray stays visually consistent.
    const thumbDir = category === 'hats' ? 'hat' : 'item';
    const visual = item.id
        ? `<img src="assets/thumbs/${thumbDir}/${item.id}.png" alt="" loading="lazy"
               onerror="this.parentElement.textContent='${item.emoji}';">`
        : `<img src="${PFP_BASE_IMAGE_SRC}" alt="" loading="lazy">`;

    menuItem.innerHTML = `
        <div class="item-image">${visual}</div>
        <div class="item-name">${item.name}</div>
    `;
    
    menuItem.onclick = () => selectMenuItem(category, item.id, menuItem);
    menuItem.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectMenuItem(category, item.id, menuItem);
        }
    };
    
    return menuItem;
}

// Create and populate menu items
function createMenuItems() {
    // Initialize hat menu items
    const hatContainer = document.getElementById('hatMenuItems');
    if (hatContainer) {
        hatContainer.innerHTML = ''; // Clear existing items
        menuItems.hats.forEach(hat => {
            hatContainer.appendChild(createMenuItem('hats', hat));
        });
    }
    
    // Initialize item menu items
    const itemContainer = document.getElementById('itemMenuItems');
    if (itemContainer) {
        itemContainer.innerHTML = ''; // Clear existing items
        menuItems.items.forEach(item => {
            itemContainer.appendChild(createMenuItem('items', item));
        });
    }
    
    console.log('✅ Menu items created with emojis');
}

// Initialize menu system
function initializeMenu() {
    console.log('🍽️ Setting up menu...');
    
    // Create menu items
    createMenuItems();
    
    // Set up menu interactions
    setupMenuInteractions();
    
    console.log('✅ Menu setup complete');
}

// Set up menu interaction handlers
function setupMenuInteractions() {
    // Add keyboard navigation for menu items
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const focusedElement = document.activeElement;
            if (focusedElement && focusedElement.classList.contains('menu-item')) {
                e.preventDefault();
                focusedElement.click();
            }
        }
    });
}

// === ORDER MANAGEMENT ===

// Select menu item function
function selectMenuItem(category, itemId, element) {
    try {
        console.log(`Selecting ${category}: ${itemId}`);
        
        // Remove previous selection in this category
        document.querySelectorAll(`[data-category="${category}"]`).forEach(item => {
            item.classList.remove('selected');
        });
        
        // Add selected class to current item
        element.classList.add('selected');
        
        // Update current order
        if (category === 'hats') {
            currentOrder.hat = itemId;
            currentOrder.hatName = getMenuItemName(itemId, category) || 'Bare Head';
        } else if (category === 'items') {
            currentOrder.item = itemId;
            currentOrder.itemName = getMenuItemName(itemId, category) || 'No Loot';
        }
        
        // Render the complete selection as one deterministic stack.
        loadBaseImage();
        updateOrderSummary();
        
        // Play selection sound
        playSound('select');
        
        // Show notification
        const itemName = getMenuItemName(itemId, category) || (category === 'hats' ? 'Bare Head' : 'No Loot');
        showNotification(`Selected: ${itemName}`, 'success');
        
        console.log(`✅ Selected ${itemName}`);
    } catch (error) {
        console.error('Error in selectMenuItem:', error);
    }
}

function loadLayer(type, value) {
    if (type === 'hat') currentOrder.hat = value || '';
    if (type === 'item') currentOrder.item = value || '';
    return loadBaseImage();
}

// Generate random price between min and max
function getRandomPrice(min = 0.10, max = 15.99) {
    return Math.random() * (max - min) + min;
}

// Parse user amount from string (e.g., "$12.34" -> 12.34)
function parseUserAmount(amountString) {
    if (!amountString) return 0;
    const cleanString = amountString.toString().replace(/[$,]/g, '');
    const parsed = parseFloat(cleanString);
    return isNaN(parsed) ? 0 : parsed;
}

// Calculate current order total from DOM elements
function calculateOrderTotal() {
    const totalElement = document.querySelector('.total-amount');
    if (!totalElement) return 0;
    return parseUserAmount(totalElement.textContent);
}

// Update the order summary display with randomized prices
function updateOrderSummary() {
    const orderItemsContainer = document.querySelector('.order-items');
    const subtotalElement = document.querySelector('.subtotal-amount');
    const totalElement = document.querySelector('.total-amount');

    // The premium generator presents the current traits as a look summary,
    // rather than inventing checkout prices for a free PFP download.
    if (orderItemsContainer && document.querySelector('.pg-selected-actions')) {
        const selections = [
            {
                label: 'Headgear',
                name: currentOrder.hatName || getMenuItemName(currentOrder.hat, 'hats') || 'Bare Head',
                image: currentOrder.hat
                    ? `assets/thumbs/hat/${currentOrder.hat}.png`
                    : PFP_BASE_IMAGE_SRC
            },
            {
                label: 'Loot',
                name: currentOrder.itemName || getMenuItemName(currentOrder.item, 'items') || 'No Loot',
                image: currentOrder.item
                    ? `assets/thumbs/item/${currentOrder.item}.png`
                    : PFP_BASE_IMAGE_SRC
            }
        ];

        orderItemsContainer.innerHTML = selections.map(selection => `
            <div class="selected-trait">
                <div class="selected-trait-thumb">
                    <img src="${selection.image}" alt="" loading="lazy">
                </div>
                <div class="selected-trait-copy">
                    <span>${selection.label}</span>
                    <strong>${selection.name}</strong>
                </div>
            </div>
        `).join('');

        if (subtotalElement) subtotalElement.textContent = '$0.00';
        if (totalElement) totalElement.textContent = '$0.00';
        updateOrdersServed();
        return;
    }
    
    // Clear current items
    orderItemsContainer.innerHTML = '';
    
    let subtotal = 0;
    
    // Add base frog
    if (currentOrder.base) {
        const basePrice = getRandomPrice(2.99, 8.99);
        const baseItem = document.createElement('div');
        baseItem.className = 'order-item';
        baseItem.innerHTML = `
            <div class="order-item-left">
                <div class="item-qty">1</div>
                <div class="item-name">Original Pogo</div>
            </div>
            <div class="item-price">$${basePrice.toFixed(2)}</div>
        `;
        orderItemsContainer.appendChild(baseItem);
        subtotal += basePrice;
    }
    
    // Add hat/topping
    if (currentOrder.hat) {
        const hatName = currentOrder.hatName || getMenuItemName(currentOrder.hat, 'hats');
        if (hatName && hatName !== 'Bare Head' && hatName !== 'Bare Head') {
            const hatPrice = getRandomPrice(0.50, 4.99);
            const hatItem = document.createElement('div');
            hatItem.className = 'order-item';
            hatItem.innerHTML = `
                <div class="order-item-left">
                    <div class="item-qty">1</div>
                    <div class="item-name">${hatName}</div>
                </div>
                <div class="item-price">$${hatPrice.toFixed(2)}</div>
            `;
            orderItemsContainer.appendChild(hatItem);
            subtotal += hatPrice;
        }
    }
    
    // Add item/side
    if (currentOrder.item) {
        const itemName = currentOrder.itemName || getMenuItemName(currentOrder.item, 'items');
        if (itemName && itemName !== 'No Loot' && itemName !== 'No Loot') {
            const itemPrice = getRandomPrice(1.99, 6.99);
            const sideItem = document.createElement('div');
            sideItem.className = 'order-item';
            sideItem.innerHTML = `
                <div class="order-item-left">
                    <div class="item-qty">1</div>
                    <div class="item-name">${itemName}</div>
                </div>
                <div class="item-price">$${itemPrice.toFixed(2)}</div>
            `;
            orderItemsContainer.appendChild(sideItem);
            subtotal += itemPrice;
        }
    }
    
    // Show "Bare Head" if no hat selected
    if (!currentOrder.hat || currentOrder.hatName === 'Bare Head') {
        const noToppingPrice = getRandomPrice(0.25, 2.50);
        const noToppingItem = document.createElement('div');
        noToppingItem.className = 'order-item';
        noToppingItem.innerHTML = `
            <div class="order-item-left">
                <div class="item-qty">1</div>
                <div class="item-name">Bare Head</div>
            </div>
            <div class="item-price">$${noToppingPrice.toFixed(2)}</div>
        `;
        orderItemsContainer.appendChild(noToppingItem);
        subtotal += noToppingPrice;
    }
    
    // Show "No Loot" if no item selected
    if (!currentOrder.item || currentOrder.itemName === 'No Loot') {
        const noSidePrice = getRandomPrice(0.10, 1.99);
        const noSideItem = document.createElement('div');
        noSideItem.className = 'order-item';
        noSideItem.innerHTML = `
            <div class="order-item-left">
                <div class="item-qty">1</div>
                <div class="item-name">No Loot</div>
            </div>
            <div class="item-price">$${noSidePrice.toFixed(2)}</div>
        `;
        orderItemsContainer.appendChild(noSideItem);
        subtotal += noSidePrice;
    }
    
    // Update totals with random blockchain fee
    const blockchainFee = getRandomPrice(0.001, 0.025);
    const total = subtotal + blockchainFee;
    
    if (subtotalElement) subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
    if (totalElement) totalElement.textContent = `$${total.toFixed(2)}`;
    
    // Update order count
    updateOrdersServed();
}

function updateOrderTotal() {
    let subtotal = 0;
    
    // Add hat price
    if (currentOrder.hat) {
        const hatItem = menuItems.hats.find(h => h.id === currentOrder.hat);
        if (hatItem) subtotal += hatItem.price;
    }
    
    // Add item price
    if (currentOrder.item) {
        const itemItem = menuItems.items.find(i => i.id === currentOrder.item);
        if (itemItem) subtotal += itemItem.price;
    }
    
    const blockchainFee = 0.01;
    const total = subtotal + blockchainFee;
    
    // Update display
    const subtotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('finalTotal');
    
    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
}

// === PFP GENERATION ===

function loadPFPImage(src) {
    if (pfpImageCache.has(src)) return pfpImageCache.get(src);

    const request = new Promise((resolve, reject) => {
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Failed to load PFP layer: ${src}`));
        image.src = src;
    }).catch(error => {
        // A failed request should be retryable on the next selection.
        pfpImageCache.delete(src);
        throw error;
    });

    pfpImageCache.set(src, request);
    return request;
}

function getPFPBasePixels(baseImage, width, height) {
    const cacheKey = `${width}x${height}`;
    if (pfpBasePixelCache.has(cacheKey)) return pfpBasePixelCache.get(cacheKey);

    const baseCanvas = document.createElement('canvas');
    baseCanvas.width = width;
    baseCanvas.height = height;
    const baseContext = baseCanvas.getContext('2d', { willReadFrequently: true });
    baseContext.drawImage(baseImage, 0, 0, width, height);
    const pixels = baseContext.getImageData(0, 0, width, height).data;
    pfpBasePixelCache.set(cacheKey, pixels);
    return pixels;
}

// The supplied trait PNGs are full Pogo composites, not transparent accessory
// layers. Convert each one into a true overlay by removing every pixel that is
// unchanged from the bare base. Category bounds provide an additional hard
// guarantee that loot never repaints the head and headgear never repaints the
// lower-body loot area.
function createPFPTraitOverlay(baseImage, traitImage, category) {
    const cacheKey = `${category}:${traitImage.src}`;
    if (pfpTraitOverlayCache.has(cacheKey)) return pfpTraitOverlayCache.get(cacheKey);

    const width = traitImage.naturalWidth || traitImage.width;
    const height = traitImage.naturalHeight || traitImage.height;
    const overlayCanvas = document.createElement('canvas');
    overlayCanvas.width = width;
    overlayCanvas.height = height;

    const overlayContext = overlayCanvas.getContext('2d', { willReadFrequently: true });
    overlayContext.drawImage(traitImage, 0, 0, width, height);

    const overlayImageData = overlayContext.getImageData(0, 0, width, height);
    const overlayPixels = overlayImageData.data;
    const basePixels = getPFPBasePixels(baseImage, width, height);
    const lootStartY = Math.floor(height * 0.48);
    const headgearEndY = Math.floor(height * 0.62);

    for (let offset = 0; offset < overlayPixels.length; offset += 4) {
        const y = Math.floor((offset / 4) / width);

        if (
            (category === 'item' && y < lootStartY) ||
            (category === 'hat' && y > headgearEndY)
        ) {
            overlayPixels[offset + 3] = 0;
            continue;
        }

        const traitAlpha = overlayPixels[offset + 3];
        if (traitAlpha === 0) continue;

        const maxColorDelta = Math.max(
            Math.abs(overlayPixels[offset] - basePixels[offset]),
            Math.abs(overlayPixels[offset + 1] - basePixels[offset + 1]),
            Math.abs(overlayPixels[offset + 2] - basePixels[offset + 2])
        );
        const alphaDelta = Math.abs(traitAlpha - basePixels[offset + 3]);

        // PNG layers are lossless, but a tiny tolerance also removes edge pixels
        // whose only difference is harmless export noise.
        if (maxColorDelta <= 4 && alphaDelta <= 2) {
            overlayPixels[offset + 3] = 0;
        }
    }

    overlayContext.clearRect(0, 0, width, height);
    overlayContext.putImageData(overlayImageData, 0, 0);
    pfpTraitOverlayCache.set(cacheKey, overlayCanvas);
    return overlayCanvas;
}

async function renderCurrentPFP() {
    if (!canvas || !ctx) return false;

    const revision = ++pfpRenderRevision;
    const selection = {
        hat: currentOrder.hat || '',
        item: currentOrder.item || '',
        hatName: currentOrder.hatName || 'Bare Head',
        itemName: currentOrder.itemName || 'No Loot'
    };

    try {
        const [baseImage, hatImage, itemImage] = await Promise.all([
            loadPFPImage(PFP_BASE_IMAGE_SRC),
            selection.hat ? loadPFPImage(`assets/hat/${selection.hat}.png`) : Promise.resolve(null),
            selection.item ? loadPFPImage(`assets/item/${selection.item}.png`) : Promise.resolve(null)
        ]);

        // Ignore stale work if the user changed either category while the
        // images were loading.
        if (
            revision !== pfpRenderRevision ||
            selection.hat !== (currentOrder.hat || '') ||
            selection.item !== (currentOrder.item || '')
        ) {
            return false;
        }

        layers.base = baseImage;
        layers.hat = hatImage ? createPFPTraitOverlay(baseImage, hatImage, 'hat') : null;
        layers.item = itemImage ? createPFPTraitOverlay(baseImage, itemImage, 'item') : null;
        drawPFP();

        canvas.dataset.renderedHat = selection.hat;
        canvas.dataset.renderedItem = selection.item;
        canvas.dataset.renderRevision = String(revision);
        console.log(`✅ PFP rendered: ${selection.hat || 'bare'} + ${selection.item || 'no loot'}`);
        return true;
    } catch (error) {
        if (revision === pfpRenderRevision) {
            console.error('PFP render failed:', error);
            showNotification('Unable to load that Pogo trait. Please try again.', 'error');
        }
        return false;
    }
}

function loadBaseImage() {
    latestPFPRender = renderCurrentPFP();
    return latestPFPRender;
}

async function waitForLatestPFPRender() {
    let pending;
    do {
        pending = latestPFPRender;
        await pending;
    } while (pending !== latestPFPRender);
}

function drawPFP() {
    if (!canvas || !ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Keep the complete native 1:1 artwork inside the square export. Matching
    // the layer bounds to the canvas prevents tall hats and wide loot from being
    // cropped while preserving the exact alignment of every trait.
    const layerWidth = canvas.width;
    const layerHeight = canvas.height;
    const layerX = 0;
    const layerY = 0;
    
    // Draw base frog
    if (layers.base) {
        ctx.drawImage(layers.base, layerX, layerY, layerWidth, layerHeight);
    }
    
    // Draw hat topping
    if (layers.hat) {
        ctx.drawImage(layers.hat, layerX, layerY, layerWidth, layerHeight);
    }
    
    // Draw item side
    if (layers.item) {
        ctx.drawImage(layers.item, layerX, layerY, layerWidth, layerHeight);
    }
    
    // Update canvas aria-label
    const hat = currentOrder.hatName || 'no topping';
    const item = currentOrder.itemName || 'no side';
    if (canvas) {
        canvas.setAttribute('aria-label', `Your custom Pogo frog with ${hat} and ${item}`);
    }
}

// === QUICK ORDERS ===

function quickOrder(hatId, itemId) {
    playFrogSound();
    
    // Find the menu items
    const hatItem = menuItems.hats.find(h => h.id === hatId);
    const itemItem = menuItems.items.find(i => i.id === itemId);
    
    // Clear current selections
    document.querySelectorAll('.menu-item.selected').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Update order state immediately
    if (hatItem) {
        const hatElement = document.querySelector(`[data-category="hats"][data-value="${hatId}"]`);
        if (hatElement) {
            hatElement.classList.add('selected');
            currentOrder.hat = hatId;
            currentOrder.hatName = hatItem.name;
        }
    }
    
    if (itemItem) {
        const itemElement = document.querySelector(`[data-category="items"][data-value="${itemId}"]`);
        if (itemElement) {
            itemElement.classList.add('selected');
            currentOrder.item = itemId;
            currentOrder.itemName = itemItem.name;
        }
    }
    
    if (!canvas) return;
    loadBaseImage();
    
    updateOrderSummary();
    updateOrderTotal();
    
    showNotification(`🍽️ Quick order prepared! ${hatItem?.name} with ${itemItem?.name}`);
}

function randomizePFP() {
    playPartySound();
    
    // Random selections
    const randomHat = Math.random() < 0.7 ? menuItems.hats[Math.floor(Math.random() * menuItems.hats.length)] : null;
    const randomItem = Math.random() < 0.7 ? menuItems.items[Math.floor(Math.random() * menuItems.items.length)] : null;
    
    // Clear current selections
    document.querySelectorAll('.menu-item.selected').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Update order state immediately
    if (randomHat) {
        const hatElement = document.querySelector(`[data-category="hats"][data-value="${randomHat.id}"]`);
        if (hatElement) {
            hatElement.classList.add('selected');
            currentOrder.hat = randomHat.id;
            currentOrder.hatName = randomHat.name;
        }
    } else {
        // Select "Bare Head"
        const noHatElement = document.querySelector(`[data-category="hats"][data-value=""]`);
        if (noHatElement) {
            noHatElement.classList.add('selected');
            currentOrder.hat = '';
            currentOrder.hatName = '';
        }
    }
    
    if (randomItem) {
        const itemElement = document.querySelector(`[data-category="items"][data-value="${randomItem.id}"]`);
        if (itemElement) {
            itemElement.classList.add('selected');
            currentOrder.item = randomItem.id;
            currentOrder.itemName = randomItem.name;
        }
    } else {
        // Select "No Loot"
        const noItemElement = document.querySelector(`[data-category="items"][data-value=""]`);
        if (noItemElement) {
            noItemElement.classList.add('selected');
            currentOrder.item = '';
            currentOrder.itemName = '';
        }
    }
    
    if (!canvas) return;
    loadBaseImage();
    
    updateOrderSummary();
    updateOrderTotal();
    
    showNotification('🎲 Surprise order prepared by our chef!');
}

// Clear order function
function clearOrder() {
    console.log('🗑️ Clearing order...');
    
    // Reset selections
    document.querySelectorAll('.menu-item.selected').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Reset current order to defaults
    currentOrder.base = 'POGO';
    currentOrder.hat = '';
    currentOrder.hatName = 'Bare Head';
    currentOrder.item = '';
    currentOrder.itemName = 'No Loot';
    
    // Select default "none" options and render immediately.
    const noToppingElement = document.querySelector('[data-item-id=""][data-category="hats"]');
    if (noToppingElement) noToppingElement.classList.add('selected');

    const noSideElement = document.querySelector('[data-item-id=""][data-category="items"]');
    if (noSideElement) noSideElement.classList.add('selected');

    loadBaseImage();
    updateOrderSummary();
    
            playKitchenSound();
    
    // Show notification
    showNotification('Order cleared! Back to basics 🐸', 'info');
    
    console.log('✅ Order cleared successfully');
}

// === INTERACTIVE ELEMENTS ===

function canvasClicked() {
    playKitchenSound();
    if (canvas) {
        canvas.style.transform = 'scale(1.05) rotate(5deg)';
        setTimeout(() => {
            canvas.style.transform = '';
        }, 300);
    }
    
    clickCount++;
    if (clickCount === 3) {
        showNotification('🐸 Your frog loves the attention!');
        createParticleBurst(10);
        clickCount = 0;
    }
    
    setTimeout(() => {
        if (clickCount > 0) clickCount--;
    }, 1000);
}

function logoClicked() {
    playKitchenSound();
    const logo = document.querySelector('.header-logo');
    if (logo) {
        logo.style.transform = 'scale(1.2) rotate(360deg)';
        setTimeout(() => {
            logo.style.transform = '';
        }, 500);
    }
    
    createParticleBurst(5);
}

function enterPartyMode() {
    playPartySound();
    showNotification('🎉 RESTAURANT PARTY MODE!', 4000);
    
    const logo = document.querySelector('.header-logo');
    const title = document.querySelector('.palace-title');
    
    if (logo) logo.style.animation = 'float 1s ease-in-out infinite';
    if (title) title.style.animation = 'pulse 1s ease-in-out infinite';
    
    // Spawn flying frogs
    for (let i = 0; i < 5; i++) {
        setTimeout(() => spawnFlyingFrog(), i * 800);
    }
    
    createParticleBurst(20);
    
    const originalTitle = document.title;
    document.title = '🎉 PARTY AT POGO\'S! 🪷 ' + originalTitle;
    
    setTimeout(() => {
        if (logo) logo.style.animation = '';
        if (title) title.style.animation = '';
        document.title = originalTitle;
    }, 10000);
}

function spawnFlyingFrog() {
    const frog = document.createElement('div');
    frog.textContent = '🪷';
    frog.className = 'flying-frog';
    frog.style.top = Math.random() * 50 + 20 + '%';
    frog.style.fontSize = Math.random() * 20 + 30 + 'px';
    frog.style.animationDuration = (Math.random() * 2 + 3) + 's';
    
    document.body.appendChild(frog);
    
    setTimeout(() => {
        if (document.body.contains(frog)) {
            document.body.removeChild(frog);
        }
    }, 5000);
}

// === PARTICLE SYSTEM ===

function createParticle() {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + 'vw';
    particle.style.animationDelay = Math.random() * 6 + 's';
    particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
    
    const colors = ['#16a34a', '#fbbf24', '#22c55e'];
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
    
    const size = Math.random() * 8 + 4;
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    
    document.body.appendChild(particle);
    
    setTimeout(() => {
        if (document.body.contains(particle)) {
            document.body.removeChild(particle);
        }
    }, 6000);
}

function createParticleBurst(count = 10) {
    for (let i = 0; i < count; i++) {
        setTimeout(() => createParticle(), i * 100);
    }
}

// === KONAMI CODE ===

function setupKonamiCode() {
    document.addEventListener('keydown', function(e) {
        konamiCode.push(e.code);
        if (konamiCode.length > konamiSequence.length) {
            konamiCode.shift();
        }
        
        if (konamiCode.length === konamiSequence.length && 
            konamiCode.every((key, i) => key === konamiSequence[i])) {
            enterPartyMode();
            showNotification('🎮 Secret restaurant code activated!', 5000);
            konamiCode = [];
            
            setTimeout(() => {
                showNotification('🏆 You found the secret menu!', 4000);
            }, 2000);
        }
    });
}

// === BUTTON FUNCTIONS ===

function buyPogo() {
    playKitchenSound();
    showNotification('🚀 Redirecting to franchise opportunities...');
    setTimeout(() => {
        showNotification('💡 Add your DEX link in the buyPogo() function');
    }, 2000);
}

function copyContract() {
    const contractAddress = '0xb63bea8989b5016ddf63751c828b953da9287777';

    if (navigator.clipboard) {
        navigator.clipboard.writeText(contractAddress).then(() => {
            playKitchenSound();
            showNotification('🐸 $POGO CA copied — stay froggy!');
        }).catch(() => {
            showNotification('❌ Failed to copy');
        });
    } else {
        playKitchenSound();
        showNotification('🐸 $POGO CA copied — stay froggy!');
    }
}

function openDiscord() {
    try {
        window.open('https://discord.gg/JYFwCzmUK5', '_blank', 'noopener,noreferrer');
        playKitchenSound();
        showNotification('Opening the Pogo Pond Discord...', 'info');
    } catch (error) {
        console.error('Error opening Discord:', error);
        showNotification('Unable to open Discord. Please try again.', 'error');
    }
}

function openTwitter() {
    try {
        window.open('https://x.com/PogoTheLeaper', '_blank');
        playKitchenSound();
        showNotification('🐦 Opening Pogo Updates...', 'info');
    } catch (error) {
        console.error('Error opening Twitter:', error);
    }
}

function openDexScreener() {
    // TODO: replace with the real DexScreener pair at launch
    playKitchenSound();
    showNotification('📊 $POGO chart goes live at launch!', 'info');
}

function openTelegram() {
    // TODO: replace with the real Pogo Telegram invite at launch
    playKitchenSound();
    showNotification('📱 Pogo Pond Telegram opening soon!', 'info');
}

function openDEX() {
    try {
        // Placeholder URL - can be updated with actual DEX link later
        window.open('https://app.uniswap.org/#/swap', '_blank');
        playKitchenSound();
        showNotification('💱 Opening franchise opportunities...', 'info');
    } catch (error) {
        console.error('Error opening DEX:', error);
    }
}

// === UTILITY FUNCTIONS ===

function savePreferences() {
    const prefs = {

        ordersServed,
        easterEggFound,
        orderNumber,
        timestamp: Date.now()
    };
    localStorage.setItem('pogoRestaurantPrefs', JSON.stringify(prefs));
}

function loadPreferences() {
    try {
        const saved = localStorage.getItem('pogoRestaurantPrefs');
        if (saved) {
            const prefs = JSON.parse(saved);
        
            ordersServed = prefs.ordersServed || 0;
            easterEggFound = prefs.easterEggFound || false;
            orderNumber = prefs.orderNumber || 1;
            updateOrdersServed();
            updateOrderNumber();
        }
    } catch (e) {
        console.warn('Failed to load preferences:', e);
    }
}

// Error handling - avoid showing errors for authentication flows
window.addEventListener('error', function(e) {
    console.error('Restaurant error:', e.error);
    
    // Don't show kitchen hiccup for authentication-related errors
    const errorMessage = e.error?.message || e.message || '';
    const isAuthError = errorMessage.toLowerCase().includes('twitter') || 
                       errorMessage.toLowerCase().includes('auth') ||
                       errorMessage.toLowerCase().includes('token') ||
                       window.location.pathname.includes('callback');
    
    if (!isAuthError) {
        showNotification('⚠️ Kitchen hiccup, but we\'re still cooking!');
    }
});

// Handle visibility change
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        savePreferences();
    }
});

// === PAGE INITIALIZATION ===

// Simple loading screen fix - hide after 3 seconds no matter what
setTimeout(() => {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
}, 3000);

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM loaded, starting restaurant initialization...');
    
    try {
        // Initialize restaurant
        initializeRestaurant();
        console.log('✅ Restaurant initialized successfully');
    } catch (error) {
        console.error('❌ Error during restaurant initialization:', error);
    }
});



// === MAIN INITIALIZATION ===

function initializeRestaurant() {
    console.log('🪷 Initializing Pogo\'s Leap Pad...');
    
    try {
        // Set initial base selection
        currentOrder.base = 'POGO';
        
        // Initialize menu sections
        createMenuItems();
        
        // Initialize order number
        initializeOrderNumber();

        // Initialize canvas
        initializeCanvas();

        // Apply defaults synchronously. The former delayed reset could run after
        // an early user click and silently clear the other selected category.
        const noToppingElement = document.querySelector('[data-item-id=""][data-category="hats"]');
        if (noToppingElement) noToppingElement.classList.add('selected');

        const noSideElement = document.querySelector('[data-item-id=""][data-category="items"]');
        if (noSideElement) noSideElement.classList.add('selected');

        currentOrder.hat = '';
        currentOrder.hatName = 'Bare Head';
        currentOrder.item = '';
        currentOrder.itemName = 'No Loot';
        loadBaseImage();
        updateOrderSummary();
        
        // Load saved preferences
        loadPreferences();
        
        // Setup Konami code if function exists
        if (typeof setupKonamiCode === 'function') {
            setupKonamiCode();
        }
        
        // Initialize tab system
        initializeTabSystem();
        
        // Initialize mobile-specific UI adjustments
        initializeMobileUI();
        
        // Initialize global stats from Supabase (non-blocking)
        initializeGlobalStats().catch(error => {
            console.warn('⚠️ Supabase initialization failed silently:', error);
        });
        
        console.log('✅ Restaurant initialized successfully!');
        
        // Hide loading screen after successful initialization
        setTimeout(() => {
            hideLoadingScreen();
        }, 500);
        
    } catch (error) {
        console.error('❌ Error in initializeRestaurant:', error);
        // Ensure we still update the order summary even if other things fail
        try {
            updateOrderSummary();
        } catch (e) {
            console.error('❌ Error updating order summary:', e);
        }
        
        // Hide loading screen even if initialization fails
        setTimeout(() => {
            hideLoadingScreen();
        }, 1000);
    }
}

// Save preferences before page unload
window.addEventListener('beforeunload', savePreferences);

// === TAB SYSTEM MANAGEMENT ===

// Initialize tab system
function initializeTabSystem() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            switchTab(targetTab);
            
            // Play navigation sound
            playKitchenSound();
        });
        
        // Keyboard support
        button.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                button.click();
            }
        });
    });
    
    console.log('✅ Tab system initialized');
}

// Initialize mobile-specific UI adjustments - RESTORED ORIGINAL SYSTEM
function initializeMobileUI() {
    if (isMobileDevice()) {
        console.log('📱 Mobile device detected, applying original optimizations...');
        
        // Apply mobile-optimized body class for CSS targeting
        document.body.classList.add('mobile-optimized');
        
        // Update copy button for mobile users
        const copyBtn = document.querySelector('.copy-btn');
        if (copyBtn) {
            // Add mobile indicator to copy button
            copyBtn.innerHTML = '📋 COPY <small style="opacity: 0.8; font-size: 0.7em; display: block; margin-top: 2px;">May not work on all browsers</small>';
            
            // Add mobile-specific styling
            copyBtn.style.fontSize = '0.85em';
            copyBtn.style.padding = '8px 12px';
            copyBtn.style.lineHeight = '1.2';
        }
        
        // Emphasize download button for mobile
        const downloadBtn = document.querySelector('.place-order-btn');
        if (downloadBtn) {
            downloadBtn.innerHTML = '📥 DOWNLOAD <small style="opacity: 0.9; font-size: 0.8em; display: block; margin-top: 1px;">Recommended for mobile</small>';
        }
        
        // Hide elements that waste space on mobile
        const elementsToHide = [
            '.combo-buttons', // Quick combos take too much space
            '.item-name', // Item names are redundant with emojis
            '.palace-tagline', // Extra text in header
            '.abstract-text' // Text next to logo
        ];
        
        elementsToHide.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.display = 'none';
            });
        });
        
        // Optimize mobile game instructions
        const gameInstructions = document.querySelector('.mobile-instructions p');
        if (gameInstructions) {
            gameInstructions.textContent = 'Tap left or right to move. Climb higher to score more.';
        }
        
        // Add mobile orientation optimization
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                console.log('📱 Orientation changed, adjusting layout...');
                // Force layout recalculation after orientation change
                window.dispatchEvent(new Event('resize'));
            }, 100);
        });
        
        console.log('✅ Original mobile optimizations restored and applied');
    }
}

function switchTab(targetTab) {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    // Update button states
    tabButtons.forEach(button => {
        const isActive = button.getAttribute('data-tab') === targetTab;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-selected', isActive.toString());
    });
    
    // Update panel visibility
    tabPanels.forEach(panel => {
        const isActive = panel.id === `${targetTab}-panel`;
        panel.classList.toggle('active', isActive);
    });
    
    // Handle game-specific initialization
    if (targetTab === 'game') {
        // Initialize game when switching to game tab
        setTimeout(() => {
            if (typeof initializeGame === 'function') {
                initializeGame();
            }
        }, 100);
    }
    
    console.log(`🔄 Switched to ${targetTab} tab`);
}

// Note: Main initialization is handled by the DOMContentLoaded event listener above
// This redundant initialization block has been removed to prevent conflicts 

// Bind the compact navigation from the main application script as a reliable
// fallback for browsers that defer the small inline navigation initializer.
function setupPremiumMobileNavigation() {
    const button = document.getElementById('mobileMenuBtn');
    const overlay = document.getElementById('mobileMenuOverlay');
    if (!button || !overlay || button.dataset.premiumNavBound === 'true') return;

    button.dataset.premiumNavBound = 'true';
    button.addEventListener('click', () => {
        overlay.style.display = 'block';
        overlay.classList.add('active');
        button.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
}

setupPremiumMobileNavigation();

// === ESSENTIAL MISSING FUNCTIONS ===

// Get menu item name by ID and category
function getMenuItemName(itemId, category) {
    try {
        if (!itemId) return null;
        
        const items = category === 'hats' ? menuItems.hats : menuItems.items;
        const item = items.find(item => item.id === itemId);
        return item ? item.name : null;
    } catch (error) {
        console.error('Error getting menu item name:', error);
        return null;
    }
}

// Initialize canvas for PFP generation
function initializeCanvas() {
    try {
        canvas = document.getElementById('pfpCanvas');
        if (!canvas) {
            console.error('Canvas element not found');
            return false;
        }
        
        ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Canvas context not available');
            return false;
        }
        
        // Native square export resolution used by every Pogo source layer.
        canvas.width = 1000;
        canvas.height = 1000;
        
        // Clear canvas with transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        console.log('✅ Canvas initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing canvas:', error);
        return false;
    }
}

// Play sound - maps to specific restaurant sounds
function playSound(soundType) {
    if (!audioEnabled) return;
    
    try {
        switch(soundType) {
            case 'select':
                playSoftSelectSound(); // Trait selection gets soft sound
                break;
            case 'clear':
                playKitchenSound(); // Clear order gets kitchen sound
                break;
            case 'click':
                playOrderSound(); // Button clicks get order sound
                break;
            case 'success':
                playCompleteOrderSound(); // Success gets cash register sound
                break;
            case 'welcome':
                playCompleteOrderSound(); // Welcome gets cash register sound
                break;
            default:
                playSoftSelectSound(); // Default to soft sound
                break;
        }
    } catch (e) {
        console.log('Audio playback failed:', e);
    }
}

// Draw fallback image if base image fails to load
function drawFallbackImage(ctx, canvas) {
    try {
        // Draw a simple fallback
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw frog emoji as text
        ctx.fillStyle = '#000';
        ctx.font = '100px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🐸', canvas.width / 2, canvas.height / 2);
        
        console.log('✅ Fallback image drawn');
    } catch (error) {
        console.error('Error drawing fallback:', error);
    }
} 

// === DOWNLOAD & ORDER FUNCTIONS ===

// Download PFP function (called by place order button)
async function downloadPFP() {
    try {
        console.log('📋 Processing order...');

        // Never export an older frame while the newest trait stack is loading.
        await waitForLatestPFPRender();
        
        const canvas = document.getElementById('pfpCanvas');
        if (!canvas) {
            showNotification('Canvas not found!', 'error');
            return;
        }
        
        // Create download link
        const link = document.createElement('a');
        link.download = `pogo-pfp-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Record order in Supabase database for global tracking
        console.log('📊 Recording download order to Supabase...');
        const orderResult = await recordGlobalOrder({
            hat: currentOrder.hat,
            hatName: currentOrder.hatName,
            item: currentOrder.item,
            itemName: currentOrder.itemName,
            total: calculateOrderTotal()
        });
        
        if (orderResult && orderResult.success) {
            console.log('✅ Download order recorded successfully');
        } else {
            console.warn('⚠️ Download order recording failed:', orderResult?.error || 'Unknown error');
        }
        
        // Update local orders served count
        ordersServed++;
        localStorage.setItem('ordersServed', ordersServed.toString());
        
        // Update order number for next order
        orderNumber++;
        updateOrderNumber();
        
        playKitchenSound();
        
        // Show success message
        showNotification('🎉 Order complete! Your Pogo has been downloaded!', 'success');
        
        console.log('✅ Order processed successfully');
    } catch (error) {
        console.error('Error downloading PFP:', error);
        showNotification('Download failed. Please try again.', 'error');
    }
}

// Detect if device is mobile
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
        || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
}

// Check if clipboard image support is available
async function hasClipboardImageSupport() {
    try {
        // Check basic clipboard support
        if (!navigator.clipboard || !navigator.clipboard.write) {
            return false;
        }
        
        // Test if ClipboardItem is available and works
        if (typeof ClipboardItem === 'undefined') {
            return false;
        }
        
        // Additional check for mobile browsers
        if (isMobileDevice()) {
            // Many mobile browsers have limited ClipboardItem support
            // We'll attempt the operation but with better error handling
            return 'limited';
        }
        
        return true;
    } catch (error) {
        console.warn('Clipboard image support check failed:', error);
        return false;
    }
}

// === TRADES TAB FUNCTIONALITY ===

function openTradesApp() {
    // Check if trades are enabled on the main server
    fetch('/config')
        .then(response => response.json())
        .then(config => {
            if (config.trades) {
                // Redirect to the trades route on the same port
                window.location.href = '/trades';
            } else {
                // Fallback to PogoGame app
                window.open('http://localhost:3001/trades', '_blank');
                showNotification('🔄 Opening Pogo Trades in new window...', 'info');
            }
        })
        .catch(() => {
            // If config fails, try PogoGame app
            window.open('http://localhost:3001/trades', '_blank');
            showNotification('🔄 Opening Pogo Trades in new window...', 'info');
        });
}

function learnMoreTrades() {
    showNotification('📖 Trades feature documentation coming soon!', 'info');
    // Could open a modal or navigate to documentation
}

// Copy PFP to clipboard function
async function copyPFPToClipboard() {
    try {
        console.log('📋 Copying to clipboard...');

        await waitForLatestPFPRender();
        
        const canvas = document.getElementById('pfpCanvas');
        if (!canvas) {
            showNotification('Canvas not found!', 'error');
            return;
        }
        
        // Check clipboard support first
        const clipboardSupport = await hasClipboardImageSupport();
        
        if (clipboardSupport === false) {
            showNotification('📋 Clipboard images not supported on this device. Use Download instead.', 'error');
            return;
        }
        
        // Convert canvas to blob
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/png');
        });
        
        if (!blob) {
            showNotification('Failed to create image', 'error');
            return;
        }
        
        // Try to copy to clipboard
        try {
            const clipboardItem = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([clipboardItem]);
            
            // Success! Record the order and update UI
            await recordOrderAndUpdateUI();
            
            // Show success message
            const message = clipboardSupport === 'limited' 
                ? '📋 Pogo copied! (Note: Some mobile browsers may not paste images correctly)'
                : '📋 Pogo copied to clipboard!';
            showNotification(message, 'success');
            console.log('✅ PFP copied to clipboard successfully');
            
        } catch (clipboardError) {
            console.warn('Clipboard write failed:', clipboardError);
            
            // On mobile, offer alternative
            if (isMobileDevice()) {
                showNotification('📋 Mobile clipboard limitations detected. Use Download or try again.', 'warning');
            } else {
                throw clipboardError; // Re-throw for desktop error handling
            }
        }
        
    } catch (error) {
        console.error('Error copying PFP to clipboard:', error);
        
        // Check if it's a permission error
        if (error.name === 'NotAllowedError') {
            showNotification('📋 Clipboard permission denied. Use Download instead.', 'error');
        } else if (error.name === 'NotSupportedError') {
            showNotification('📋 Clipboard images not supported. Use Download instead.', 'error');
        } else {
            const message = isMobileDevice() 
                ? '📋 Mobile copy failed. Use Download instead.'
                : 'Copy failed. Use Download instead.';
            showNotification(message, 'error');
        }
    }
}

// Helper function to record order and update UI
async function recordOrderAndUpdateUI() {
    // Record order in Supabase database for global tracking
    console.log('📊 Recording copy order to Supabase...');
    const orderResult = await recordGlobalOrder({
        hat: currentOrder.hat,
        hatName: currentOrder.hatName,
        item: currentOrder.item,
        itemName: currentOrder.itemName,
        total: calculateOrderTotal()
    });
    
    if (orderResult && orderResult.success) {
        console.log('✅ Copy order recorded successfully');
    } else {
        console.warn('⚠️ Copy order recording failed:', orderResult?.error || 'Unknown error');
    }
    
    // Update local orders served count
    ordersServed++;
    localStorage.setItem('ordersServed', ordersServed.toString());
    updateOrdersServed();
    
    // Update order number for next order
    orderNumber++;
    updateOrderNumber();
    
    // Play success sound
    playSound('success');
}

// Note: Duplicate functions have been removed - original implementations are above

// === DEBUG FUNCTIONS ===

// Test Supabase connection (can be called from browser console)
window.testSupabaseConnection = async function() {
    console.log('🔍 Testing Supabase connection...');
    
    if (!orderTracker) {
        console.error('❌ OrderTracker not loaded');
        return false;
    }
    
    try {
        const result = await orderTracker.testConnection();
        if (result.success) {
            console.log('✅ Supabase connection successful!');
            
            // Test getting order count
            const countResult = await orderTracker.getGlobalOrderCount();
            if (countResult.success) {
                console.log(`📊 Current global order count: ${countResult.count}`);
            } else {
                console.warn('⚠️ Could not get order count:', countResult.error);
            }
            
            return true;
        } else {
            console.error('❌ Supabase connection failed:', result.error);
            return false;
        }
    } catch (error) {
        console.error('❌ Connection test error:', error);
        return false;
    }
};

// Test order recording (can be called from browser console)
window.testOrderRecording = async function() {
    console.log('🔍 Testing order recording...');
    
    const testOrder = {
        hat: 'test-hat',
        hatName: 'Test Hat',
        item: 'test-item', 
        itemName: 'Test Item',
        total: 12.34
    };
    
    const result = await recordGlobalOrder(testOrder);
    if (result && result.success) {
        console.log('✅ Test order recorded successfully!');
        return true;
    } else {
        console.error('❌ Test order recording failed:', result?.error || 'Unknown error');
        return false;
    }
}; 
