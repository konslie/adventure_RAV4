/**
 * Toyota RAV4 - American Road Adventure
 * Pure HTML5 Canvas Game
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const startScreen = document.getElementById('start-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const hud = document.getElementById('hud');
const scoreVal = document.getElementById('score-val');
const speedVal = document.getElementById('speed-val');
const hpBar = document.getElementById('hp-bar');
const finalScore = document.getElementById('final-score');
const leftBtn = document.getElementById('left-btn');
const rightBtn = document.getElementById('right-btn');
const controlsDiv = document.getElementById('controls');
const warningBanner = document.getElementById('warning-banner');

// Load RAV4 Image Sprite
const playerImg = new Image();
playerImg.src = 'https://autoimg.danawa.com/photo/4173/model_360.png';
playerImg.onload = () => {
    console.log('RAV4 image loaded.');
};
playerImg.onerror = () => {
    console.error('Failed to load RAV4 image. Running vector fallback.');
};

// Game constants
const GAME_WIDTH = 450;
const GAME_HEIGHT = 800;
const ROAD_WIDTH = 270;
const LANE_WIDTH = ROAD_WIDTH / 3;
const ROAD_LEFT = (GAME_WIDTH - ROAD_WIDTH) / 2;

// Lane center X coordinates
const LANES = [
    ROAD_LEFT + LANE_WIDTH * 0.5, // Left Lane
    ROAD_LEFT + LANE_WIDTH * 1.5, // Center Lane
    ROAD_LEFT + LANE_WIDTH * 2.5  // Right Lane
];

// Game State
let gameState = {
    running: false,
    score: 0, // distance in km
    speed: 0, // current speed in km/h
    targetSpeed: 120,
    hp: 100,
    currentLane: 1, // 0 = Left, 1 = Center, 2 = Right
    playerX: LANES[1],
    playerY: 650,
    playerWidth: 50,
    playerHeight: 90,
    obstacles: [],
    scenery: [],
    particles: [],
    bgScrollOffset: 0,
    laneLineOffset: 0,
    lastTime: 0,
    spawnTimer: 0,
    sceneryTimer: 0,
    invincibilityFrames: 0,
    messageActive: false,
    messageText: '',
    messageTimer: 0
};

// Setup canvas scale for high DPI
function resizeCanvas() {
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    // Set actual rendering size to match the style size
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Input Listeners
window.addEventListener('keydown', (e) => {
    if (!gameState.running) return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        moveLeft();
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        moveRight();
    }
});

leftBtn.addEventListener('click', () => {
    if (gameState.running) moveLeft();
});

rightBtn.addEventListener('click', () => {
    if (gameState.running) moveRight();
});

// Touch controls for mobile to feel responsive
leftBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState.running) moveLeft();
});
rightBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState.running) moveRight();
});

function moveLeft() {
    if (gameState.currentLane > 0) {
        gameState.currentLane--;
        triggerDustParticles();
    }
}

function moveRight() {
    if (gameState.currentLane < 2) {
        gameState.currentLane++;
        triggerDustParticles();
    }
}

// Particle System
class Particle {
    constructor(x, y, color, speedX, speedY, size, life) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.speedX = speedX;
        this.speedY = speedY;
        this.size = size;
        this.maxLife = life;
        this.life = life;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life--;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function triggerDustParticles() {
    const carX = gameState.playerX;
    const carY = gameState.playerY + gameState.playerHeight;
    for (let i = 0; i < 15; i++) {
        gameState.particles.push(new Particle(
            carX + (Math.random() - 0.5) * 40,
            carY - 10,
            'rgba(240, 230, 200, 0.6)',
            (Math.random() - 0.5) * 4,
            Math.random() * 2 + 1,
            Math.random() * 5 + 3,
            30 + Math.random() * 20
        ));
    }
}

function triggerSparkParticles(x, y) {
    const colors = ['#ff3b30', '#ff9500', '#ffcc00', '#ffffff'];
    for (let i = 0; i < 25; i++) {
        gameState.particles.push(new Particle(
            x,
            y,
            colors[Math.floor(Math.random() * colors.length)],
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8 + 3,
            Math.random() * 4 + 2,
            20 + Math.random() * 15
        ));
    }
}

// Scenery Assets & Obstacle classes
class Scenery {
    constructor(side) {
        this.side = side; // 'left' or 'right'
        this.type = Math.floor(Math.random() * 3); // 0: Tree, 1: Farm House, 2: Windmill / Fence
        
        // Horizontal placement off-road
        if (side === 'left') {
            this.x = Math.random() * (ROAD_LEFT - 60) - 20;
        } else {
            this.x = GAME_WIDTH - Math.random() * (ROAD_LEFT - 60) - 40;
        }
        
        this.y = -100;
        this.speedY = 0;
        this.scale = 0.6 + Math.random() * 0.5;
    }

    update(speedMultiplier) {
        this.y += speedMultiplier * 10;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);

        if (this.type === 0) {
            // Pine Tree
            ctx.fillStyle = '#3e2723';
            ctx.fillRect(-6, 20, 12, 20); // Trunk
            
            ctx.fillStyle = '#2e7d32'; // Leaves
            ctx.beginPath();
            ctx.moveTo(0, -30);
            ctx.lineTo(-30, 20);
            ctx.lineTo(30, 20);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#1b5e20'; // Shading layer
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(-24, 20);
            ctx.lineTo(24, 20);
            ctx.closePath();
            ctx.fill();
        } else if (this.type === 1) {
            // Cute Red Barn House
            ctx.fillStyle = '#c62828'; // Main body
            ctx.fillRect(-30, 0, 60, 40);
            
            ctx.fillStyle = '#b71c1c'; // Shading
            ctx.fillRect(-30, 0, 30, 40);

            // Roof
            ctx.fillStyle = '#eeeeee';
            ctx.beginPath();
            ctx.moveTo(0, -25);
            ctx.lineTo(-35, 2);
            ctx.lineTo(35, 2);
            ctx.closePath();
            ctx.fill();

            // Door
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-12, 15, 24, 25);
            ctx.fillStyle = '#3a3a3c';
            ctx.fillRect(-10, 17, 20, 23);
        } else {
            // Windmill
            ctx.fillStyle = '#78909c';
            ctx.beginPath();
            ctx.moveTo(-8, 30);
            ctx.lineTo(8, 30);
            ctx.lineTo(3, -20);
            ctx.lineTo(-3, -20);
            ctx.closePath();
            ctx.fill();

            // Blades (rotating slightly based on time)
            ctx.save();
            ctx.translate(0, -20);
            const angle = (Date.now() / 1000) % (Math.PI * 2);
            ctx.rotate(angle);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            for (let i = 0; i < 4; i++) {
                ctx.rotate(Math.PI / 2);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, 25);
                ctx.stroke();
                // blade canvas
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.fillRect(-4, 10, 8, 15);
            }
            ctx.restore();
        }
        ctx.restore();
    }
}

class Obstacle {
    constructor() {
        this.lane = Math.floor(Math.random() * 3);
        this.x = LANES[this.lane];
        this.y = -150;
        
        // Types: 0: Rock, 1: Cute Puppy, 2: American Truck, 3: Classic Sedan
        const rng = Math.random();
        if (rng < 0.25) {
            this.type = 0; // Rock
            this.width = 44;
            this.height = 35;
        } else if (rng < 0.50) {
            this.type = 1; // Cute Puppy
            this.width = 38;
            this.height = 38;
            this.wiggle = 0;
        } else if (rng < 0.78) {
            this.type = 2; // US Semi-Truck (Heavy)
            this.width = 56;
            this.height = 140;
            this.color = ['#ffcc00', '#007aff', '#ff3b30', '#8e8e93'][Math.floor(Math.random()*4)];
        } else {
            this.type = 3; // Classic Sedan / Traffic Car
            this.width = 48;
            this.height = 85;
            this.color = ['#34c759', '#ff9500', '#af52de', '#5ac8fa'][Math.floor(Math.random()*4)];
        }

        // Relative speed of standard traffic
        this.relSpeed = (this.type === 2) ? -3 : (this.type === 3) ? -1 : 0; // Trucks scroll faster down (slower relative speed)
    }

    update(speedMultiplier) {
        // Road speed + relative obstacle speed
        this.y += speedMultiplier * 10 + this.relSpeed;
        
        if (this.type === 1) {
            // Puppy happy bouncing animation
            this.wiggle = Math.sin(Date.now() * 0.01) * 5;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.type === 0) {
            // Draw Rock
            ctx.fillStyle = '#8e8e93';
            ctx.beginPath();
            ctx.moveTo(-this.width/2, this.height/2);
            ctx.lineTo(-this.width/2 + 5, -this.height/2 + 8);
            ctx.lineTo(0, -this.height/2);
            ctx.lineTo(this.width/2 - 4, -this.height/2 + 6);
            ctx.lineTo(this.width/2, this.height/2);
            ctx.closePath();
            ctx.fill();

            // Rock Shading
            ctx.fillStyle = '#636366';
            ctx.beginPath();
            ctx.moveTo(0, -this.height/2);
            ctx.lineTo(this.width/2 - 4, -this.height/2 + 6);
            ctx.lineTo(this.width/2, this.height/2);
            ctx.lineTo(0, this.height/2);
            ctx.closePath();
            ctx.fill();
        } 
        else if (this.type === 1) {
            // Draw Cute Puppy 🐶
            const w = this.width;
            const h = this.height;
            
            ctx.translate(0, this.wiggle);

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath();
            ctx.ellipse(0, h/2 - 2, 16, 6, 0, 0, Math.PI*2);
            ctx.fill();

            // Body (Golden retriever colors)
            ctx.fillStyle = '#f5b041';
            ctx.beginPath();
            ctx.arc(0, 5, 12, 0, Math.PI*2); // main body/head combined
            ctx.fill();

            // Snout/Mouth
            ctx.fillStyle = '#fdfefe';
            ctx.beginPath();
            ctx.arc(0, 8, 5, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#1c1c1e';
            ctx.beginPath();
            ctx.arc(0, 6, 2, 0, Math.PI*2); // Nose
            ctx.fill();

            // Eyes
            ctx.fillStyle = '#1c1c1e';
            ctx.beginPath();
            ctx.arc(-4, 3, 1.8, 0, Math.PI*2);
            ctx.arc(4, 3, 1.8, 0, Math.PI*2);
            ctx.fill();

            // Flappy Ears
            ctx.fillStyle = '#d35400';
            // Left Ear
            ctx.beginPath();
            ctx.ellipse(-10, 0, 4, 8, Math.PI/6, 0, Math.PI*2);
            ctx.fill();
            // Right Ear
            ctx.beginPath();
            ctx.ellipse(10, 0, 4, 8, -Math.PI/6, 0, Math.PI*2);
            ctx.fill();

            // Red Collar
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(-6, 12, 12, 3);
        } 
        else if (this.type === 2) {
            // US Semi-Truck 🚛
            const w = this.width;
            const h = this.height;

            // Truck Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(-w/2 - 4, -h/2 + 10, w + 8, h);

            // Container / Trailer (Silver/White corrugated)
            ctx.fillStyle = '#e5e5ea';
            ctx.fillRect(-w/2, -h/2, w, h - 35);
            
            // Container vertical lines
            ctx.strokeStyle = '#d1d1d6';
            ctx.lineWidth = 2;
            for (let i = -h/2 + 10; i < h/2 - 35; i += 15) {
                ctx.beginPath();
                ctx.moveTo(-w/2, i);
                ctx.lineTo(w/2, i);
                ctx.stroke();
            }

            // Cab / Front part (Colored truck head)
            ctx.fillStyle = this.color;
            ctx.fillRect(-w/2 + 2, h/2 - 35, w - 4, 30);
            
            // Windshield
            ctx.fillStyle = '#1c1c1e';
            ctx.fillRect(-w/2 + 6, h/2 - 12, w - 12, 6);

            // Side Mirrors
            ctx.fillStyle = '#3a3a3c';
            ctx.fillRect(-w/2 - 2, h/2 - 25, 2, 6);
            ctx.fillRect(w/2, h/2 - 25, 2, 6);

            // Exhaust Pipes (US Truck classic chrome)
            ctx.fillStyle = '#aeaea2';
            ctx.fillRect(-w/2 + 3, h/2 - 38, 4, 8);
            ctx.fillRect(w/2 - 7, h/2 - 38, 4, 8);
        }
        else if (this.type === 3) {
            // Classic Traffic Sedan 🚗
            const w = this.width;
            const h = this.height;

            // Car Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(-w/2 - 2, -h/2 + 6, w + 4, h);

            // Body
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.roundRect(-w/2, -h/2, w, h, 8);
            ctx.fill();

            // Windshield Front
            ctx.fillStyle = '#2c3e50';
            ctx.beginPath();
            ctx.roundRect(-w/2 + 5, h/2 - 22, w - 10, 10, 2);
            ctx.fill();

            // Back Glass
            ctx.beginPath();
            ctx.roundRect(-w/2 + 5, -h/2 + 10, w - 10, 8, 2);
            ctx.fill();

            // Roof (Slightly lighter shade)
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(-w/2 + 4, -h/2 + 22, w - 8, h - 48);

            // Headlights (Yellow glowing at front)
            ctx.fillStyle = '#ffe066';
            ctx.fillRect(-w/2 + 4, h/2 - 2, 8, 2);
            ctx.fillRect(w/2 - 12, h/2 - 2, 8, 2);

            // Brake lights
            ctx.fillStyle = '#ff3b30';
            ctx.fillRect(-w/2 + 3, -h/2, 6, 2);
            ctx.fillRect(w/2 - 9, -h/2, 6, 2);
        }

        ctx.restore();
    }
}

// Draw Toyota RAV4 (Player Car)
function drawPlayer(x, y, width, height) {
    ctx.save();
    ctx.translate(x, y);

    // Dynamic leaning effect based on moving speed
    const diffX = x - gameState.playerX;
    const tilt = diffX * 0.05; // Leaning angle
    ctx.rotate(tilt);

    // Invincibility flashing effect
    if (gameState.invincibilityFrames > 0 && Math.floor(gameState.invincibilityFrames / 4) % 2 === 0) {
        ctx.restore();
        return;
    }

    if (playerImg.complete && playerImg.naturalWidth > 0) {
        // Draw real image loaded from danawa
        // Keep aspect ratio. Typically the image is wider (approx 1.5 aspect ratio)
        // Let's size it so it matches lanes nicely
        const aspect = playerImg.naturalHeight / playerImg.naturalWidth;
        const drawW = 90; // slightly wider for 3D car profile
        const drawH = drawW * aspect;
        
        // Draw shadow under the image car
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(0, drawH/2 - 5, drawW/2 - 5, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.drawImage(playerImg, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
        // Fallback: RAV4 Main Body (Sporty Red Toyota style)
        const w = width;
        const h = height;

        // 1. Car Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, h/2 - 4, w/2 + 6, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#e60012'; // Toyota Red
        ctx.beginPath();
        ctx.roundRect(-w/2, -h/2, w, h, [12, 12, 8, 8]);
        ctx.fill();

        // 3. Black Trim / Off-road Wheel Arches (Fenders)
        ctx.fillStyle = '#1c1c1e';
        ctx.fillRect(-w/2 - 1, -h/2 + 18, 2, 15); // Front left wheel arch
        ctx.fillRect(w/2 - 1, -h/2 + 18, 2, 15);  // Front right wheel arch
        ctx.fillRect(-w/2 - 1, h/2 - 28, 2, 18);  // Rear left arch
        ctx.fillRect(w/2 - 1, h/2 - 28, 2, 18);   // Rear right arch

        // Rear Roof Spoiler
        ctx.fillStyle = '#1c1c1e';
        ctx.fillRect(-w/2 + 3, h/2 - 3, w - 6, 4);

        // 4. Windshield & Windows
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.roundRect(-w/2 + 4, -h/2 + 22, w - 8, 14, 4);
        ctx.fill();

        // Windshield Reflection highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.moveTo(-w/2 + 6, -h/2 + 22);
        ctx.lineTo(w/2 - 12, -h/2 + 22);
        ctx.lineTo(w/2 - 20, -h/2 + 36);
        ctx.lineTo(-w/2 + 6, -h/2 + 36);
        ctx.closePath();
        ctx.fill();

        // Rear Window
        ctx.fillStyle = '#1c1c1e';
        ctx.beginPath();
        ctx.roundRect(-w/2 + 6, h/2 - 20, w - 12, 10, 2);
        ctx.fill();

        // Roof Glass/Sunroof (Panoramic style)
        ctx.fillStyle = '#1c1c1e';
        ctx.fillRect(-w/2 + 8, -h/2 + 42, w - 16, 20);

        // 5. Hood Lines / Grille Accent (RAV4 Distinct front)
        ctx.fillStyle = '#9e000d'; // darker red for creases
        ctx.fillRect(-w/2 + 10, -h/2 + 8, 2, 10);
        ctx.fillRect(w/2 - 12, -h/2 + 8, 2, 10);
        
        // Front Grille border
        ctx.fillStyle = '#1c1c1e';
        ctx.fillRect(-w/2 + 8, -h/2, w - 16, 5);

        // 6. Silver Roof Rails (Adventure Utility Look)
        ctx.fillStyle = '#d1d1d6';
        ctx.fillRect(-w/2 + 2, -h/2 + 30, 2, 38);
        ctx.fillRect(w/2 - 4, -h/2 + 30, 2, 38);

        // 7. Headlights (Bright White-Blue LEDs facing top of screen)
        ctx.fillStyle = '#e4f1fe';
        ctx.shadowColor = '#5ac8fa';
        ctx.shadowBlur = 8;
        ctx.fillRect(-w/2 + 3, -h/2 + 1, 8, 3);
        ctx.fillRect(w/2 - 11, -h/2 + 1, 8, 3);
        ctx.shadowBlur = 0;

        // 8. Taillights (Red LED strips at bottom)
        ctx.fillStyle = '#ff3b30';
        ctx.fillRect(-w/2 + 2, h/2 - 2, 8, 3);
        ctx.fillRect(w/2 - 10, h/2 - 2, 8, 3);
    }

    ctx.restore();
}

// Draw Scene Environment (Parallax Background)
function drawSceneryBackground() {
    // 1. Base Meadow (Lush green field)
    ctx.fillStyle = '#4f772d';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 2. Parallax Grass Textures (Scrolling)
    ctx.fillStyle = '#3f5e27';
    const numBlades = 12;
    for (let i = 0; i < numBlades; i++) {
        const y = ((i * (GAME_HEIGHT / numBlades)) + gameState.bgScrollOffset) % GAME_HEIGHT;
        // Draw some pattern to simulate grass speed
        ctx.fillRect(15, y, 4, 30);
        ctx.fillRect(ROAD_LEFT - 25, y + 20, 6, 25);
        ctx.fillRect(ROAD_LEFT + ROAD_WIDTH + 15, y + 10, 5, 20);
        ctx.fillRect(GAME_WIDTH - 20, y + 40, 4, 30);
    }

    // 3. Draw Fences along the Highway (American Midwest Style)
    ctx.strokeStyle = '#a67c52';
    ctx.lineWidth = 3;
    const fenceInterval = 120;
    const fenceYStart = (gameState.bgScrollOffset % fenceInterval) - fenceInterval;
    
    for (let y = fenceYStart; y < GAME_HEIGHT + fenceInterval; y += fenceInterval) {
        // Left fence line posts
        ctx.fillStyle = '#5c4033';
        ctx.fillRect(ROAD_LEFT - 12, y, 5, 8);
        ctx.fillRect(ROAD_LEFT - 12, y + 60, 5, 8);
        
        // Horizontal fence wire
        ctx.beginPath();
        ctx.moveTo(ROAD_LEFT - 10, y);
        ctx.lineTo(ROAD_LEFT - 10, y + fenceInterval);
        ctx.stroke();

        // Right fence line posts
        ctx.fillRect(ROAD_LEFT + ROAD_WIDTH + 7, y, 5, 8);
        ctx.fillRect(ROAD_LEFT + ROAD_WIDTH + 7, y + 60, 5, 8);
        
        ctx.beginPath();
        ctx.moveTo(ROAD_LEFT + ROAD_WIDTH + 9, y);
        ctx.lineTo(ROAD_LEFT + ROAD_WIDTH + 9, y + fenceInterval);
        ctx.stroke();
    }

    // 4. Draw Road (Asphalt Dark Grey)
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, GAME_HEIGHT);

    // Road shoulders (Concrete boundaries)
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(ROAD_LEFT - 4, 0, 4, GAME_HEIGHT);
    ctx.fillRect(ROAD_LEFT + ROAD_WIDTH, 0, 4, GAME_HEIGHT);

    // 5. Lane markings (White dotted lines separating the 3 lanes)
    ctx.fillStyle = '#ffffff';
    const dashHeight = 40;
    const gapHeight = 30;
    const lineYStart = (gameState.laneLineOffset % (dashHeight + gapHeight)) - (dashHeight + gapHeight);

    for (let y = lineYStart; y < GAME_HEIGHT; y += (dashHeight + gapHeight)) {
        // Line between lane 0 and 1
        ctx.fillRect(ROAD_LEFT + LANE_WIDTH - 2, y, 4, dashHeight);
        // Line between lane 1 and 2
        ctx.fillRect(ROAD_LEFT + LANE_WIDTH * 2 - 2, y, 4, dashHeight);
    }
}

// Collision detection (AABB)
function checkCollision(rect1, rect2) {
    return rect1.x - rect1.width/2 < rect2.x + rect2.width/2 &&
           rect1.x + rect1.width/2 > rect2.x - rect2.width/2 &&
           rect1.y - rect1.height/2 < rect2.y + rect2.height/2 &&
           rect1.y + rect1.height/2 > rect2.y - rect2.height/2;
}

// Show Warning Text on Screen (e.g. Puppy Dodge, Collision)
function showWarningMessage(text) {
    gameState.messageActive = true;
    gameState.messageText = text;
    gameState.messageTimer = 60; // frames to show
    
    // Update HTML overlay banner
    warningBanner.innerText = text;
    warningBanner.classList.remove('hidden');
}

// Reset Game State
function resetGame() {
    gameState.score = 0;
    gameState.speed = 100;
    gameState.targetSpeed = 120;
    gameState.hp = 100;
    gameState.currentLane = 1;
    gameState.playerX = LANES[1];
    gameState.obstacles = [];
    gameState.scenery = [];
    gameState.particles = [];
    gameState.spawnTimer = 0;
    gameState.sceneryTimer = 0;
    gameState.invincibilityFrames = 0;
    gameState.messageActive = false;
    gameState.messageText = '';
    warningBanner.classList.add('hidden');
    
    // UI Update
    hpBar.style.width = '100%';
    hpBar.style.backgroundColor = '#34c759';
    scoreVal.innerText = '0.0 km';
    speedVal.innerText = '100 km/h';
}

// Start Game Play
function startGame() {
    resetGame();
    gameState.running = true;
    gameState.lastTime = performance.now();
    
    startScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    controlsDiv.classList.remove('hidden');

    requestAnimationFrame(gameLoop);
}

// End Game Play
function gameOver() {
    gameState.running = false;
    hud.classList.add('hidden');
    controlsDiv.classList.add('hidden');
    gameoverScreen.classList.remove('hidden');
    finalScore.innerText = gameState.score.toFixed(1);
}

// Main Game Loop
function gameLoop(timestamp) {
    if (!gameState.running) return;

    const dt = timestamp - gameState.lastTime;
    gameState.lastTime = timestamp;

    update(dt);
    render();

    requestAnimationFrame(gameLoop);
}

// Update game physics & elements
function update(dt) {
    // 1. Calculate travel distance & score
    gameState.score += (gameState.speed / 3600) * (dt / 1000) * 15; // accelerated scale for game feel
    scoreVal.innerText = gameState.score.toFixed(1) + ' km';

    // 2. Handle Invincibility
    if (gameState.invincibilityFrames > 0) {
        gameState.invincibilityFrames--;
    }

    // 3. Target Speed interpolation (gradual acceleration/deceleration)
    const speedLerpFactor = 0.05;
    gameState.speed += (gameState.targetSpeed - gameState.speed) * speedLerpFactor;
    speedVal.innerText = Math.round(gameState.speed) + ' km/h';

    // Speed up standard target speed as score increases (difficulty ramping)
    gameState.targetSpeed = 120 + Math.min(60, gameState.score * 5);

    // 4. Smooth Player lane transition
    const targetX = LANES[gameState.currentLane];
    const playerLerpFactor = 0.22;
    gameState.playerX += (targetX - gameState.playerX) * playerLerpFactor;

    // 5. Scroll Background
    const speedMultiplier = gameState.speed / 100;
    gameState.bgScrollOffset += speedMultiplier * 4;
    gameState.laneLineOffset += speedMultiplier * 10;

    // 6. Spawn Scenery (Trees, barns off-road)
    gameState.sceneryTimer += dt;
    if (gameState.sceneryTimer > 1000 / speedMultiplier) {
        gameState.sceneryTimer = 0;
        const side = Math.random() < 0.5 ? 'left' : 'right';
        gameState.scenery.push(new Scenery(side));
    }

    // Update scenery positions
    for (let i = gameState.scenery.length - 1; i >= 0; i--) {
        const item = gameState.scenery[i];
        item.update(speedMultiplier);
        if (item.y > GAME_HEIGHT + 100) {
            gameState.scenery.splice(i, 1);
        }
    }

    // 7. Spawn Obstacles (Stones, Dogs, Trucks, Sedans)
    gameState.spawnTimer += dt;
    // Spawn rate scales up with speed
    const baseSpawnRate = 1800; // ms
    const currentSpawnRate = Math.max(800, baseSpawnRate - gameState.score * 120);
    
    if (gameState.spawnTimer > currentSpawnRate) {
        gameState.spawnTimer = 0;
        gameState.obstacles.push(new Obstacle());
    }

    // Update obstacles & Check Collisions
    const playerRect = {
        x: gameState.playerX,
        y: gameState.playerY,
        width: gameState.playerWidth,
        height: gameState.playerHeight
    };

    for (let i = gameState.obstacles.length - 1; i >= 0; i--) {
        const obs = gameState.obstacles[i];
        obs.update(speedMultiplier);

        // Check if out of screen
        if (obs.y > GAME_HEIGHT + 150) {
            gameState.obstacles.splice(i, 1);
            continue;
        }

        // Collision Check
        const obsRect = {
            x: obs.x,
            y: obs.y,
            width: obs.width,
            height: obs.height
        };

        if (checkCollision(playerRect, obsRect)) {
            if (obs.type === 1) {
                // IT'S A PUPPY! 🐶 
                // RAV4 brakes hard and avoids hitting it! No damage to puppy, but speed and HP penalty due to emergency brakes!
                gameState.obstacles.splice(i, 1);
                
                // Visual spark particles representing brake tires smoking/sparking
                triggerDustParticles();
                
                // Play emergency warning
                showWarningMessage('⚠️ PUPPY AVOIDED! SLOWED DOWN!');
                
                // Slow vehicle immediately
                gameState.speed = 10;
                gameState.targetSpeed = 10;
                
                // Light damage for emergency brake impact
                if (gameState.invincibilityFrames === 0) {
                    gameState.hp = Math.max(0, gameState.hp - 10);
                    gameState.invincibilityFrames = 40;
                }
            } else {
                // Hits a rock, truck, or sedan!
                // Trigger heavy damage, sparks
                triggerSparkParticles(obs.x, (obs.y + playerRect.y) / 2);
                
                let damage = 20;
                let hitText = 'COLLISION!';
                
                if (obs.type === 2) {
                    damage = 35; // Heavy Truck hit!
                    hitText = '⚠️ TRUCK CRASH!';
                } else if (obs.type === 0) {
                    damage = 15; // Rock hit
                    hitText = 'ROCK HIT!';
                }

                showWarningMessage(hitText);
                gameState.obstacles.splice(i, 1);

                // Speed penalty
                gameState.speed = 30;

                if (gameState.invincibilityFrames === 0) {
                    gameState.hp = Math.max(0, gameState.hp - damage);
                    gameState.invincibilityFrames = 60; // 1 second of blink
                }
            }

            // Update HP Bar UI
            hpBar.style.width = gameState.hp + '%';
            if (gameState.hp > 50) {
                hpBar.style.backgroundColor = '#34c759'; // Green
            } else if (gameState.hp > 25) {
                hpBar.style.backgroundColor = '#ff9500'; // Orange
            } else {
                hpBar.style.backgroundColor = '#ff3b30'; // Red
            }

            if (gameState.hp <= 0) {
                gameOver();
            }
        }
    }

    // 8. Update Particles
    for (let i = gameState.particles.length - 1; i >= 0; i--) {
        const p = gameState.particles[i];
        p.update();
        if (p.life <= 0) {
            gameState.particles.splice(i, 1);
        }
    }

    // 9. Update Warning Message UI timer
    if (gameState.messageActive) {
        gameState.messageTimer--;
        if (gameState.messageTimer <= 0) {
            gameState.messageActive = false;
            warningBanner.classList.add('hidden');
        }
    }
}

// Draw game frame
function render() {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 1. Environmental background
    drawSceneryBackground();

    // 2. Off-road Scenery items
    gameState.scenery.forEach(item => item.draw());

    // 3. Obstacles
    gameState.obstacles.forEach(obs => obs.draw());

    // 4. Particles (Dust & Sparks)
    gameState.particles.forEach(p => p.draw());

    // 5. RAV4 Player Car
    drawPlayer(gameState.playerX, gameState.playerY, gameState.playerWidth, gameState.playerHeight);

    // 6. On-screen Warnings (Removed canvas draw - now using HTML warning-banner)
}

// Button Click binds
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
