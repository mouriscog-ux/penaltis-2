/**
 * BRASILEIRÃO PENALTY CUP 2026
 * Core Game Engine
 */

const TEAMS = [
    { name: "Flamengo", primary: "#ff0000", secondary: "#000000" },
    { name: "Fluminense", primary: "#830000", secondary: "#006400" },
    { name: "Botafogo", primary: "#000000", secondary: "#ffffff" },
    { name: "Vasco", primary: "#000000", secondary: "#ffffff" },
    { name: "Palmeiras", primary: "#006400", secondary: "#ffffff" },
    { name: "São Paulo", primary: "#ff0000", secondary: "#ffffff" },
    { name: "Corinthians", primary: "#ffffff", secondary: "#000000" },
    { name: "Bragantino", primary: "#ffffff", secondary: "#000000" },
    { name: "Santos", primary: "#ffffff", secondary: "#000000" },
    { name: "Atlético-MG", primary: "#000000", secondary: "#ffffff" },
    { name: "Cruzeiro", primary: "#0000ff", secondary: "#ffffff" },
    { name: "Grêmio", primary: "#00aae4", secondary: "#000000" },
    { name: "Internacional", primary: "#ff0000", secondary: "#ffffff" },
    { name: "Athletico-PR", primary: "#ff0000", secondary: "#000000" },
    { name: "Coritiba", primary: "#006400", secondary: "#ffffff" },
    { name: "Chapecoense", primary: "#006400", secondary: "#ffffff" },
    { name: "Bahia", primary: "#0000ff", secondary: "#ff0000" },
    { name: "Vitória", primary: "#ff0000", secondary: "#000000" },
    { name: "Remo", primary: "#000080", secondary: "#ffffff" },
    { name: "Mirassol", primary: "#ffff00", secondary: "#006400" }
];

const STAGES = ["Oitavas de Final", "Quartas de Final", "Semifinal", "Grande Final"];

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();

        this.state = 'MENU';
        this.playerTeam = null;
        this.cpuTeam = null;
        this.difficulty = 'normal';
        this.currentStageIdx = 0;

        this.score = { p: 0, c: 0 };
        this.turn = 'player'; // 'player' (kicker) or 'cpu' (goalie)

        // Game Objects
        this.ball = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 15 };
        this.goalie = { x: 0, y: 0, targetX: 0, width: 60, height: 100 };
        this.aim = { x: 0, y: 0, vx: 2 };

        this.setupEventListeners();
        this.initUI();
        this.loop();
    }

    resize() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    initUI() {
        const grid = document.getElementById('team-grid');
        TEAMS.forEach(team => {
            const btn = document.createElement('button');
            btn.className = 'team-btn';
            btn.innerText = team.name.toUpperCase();
            btn.style.borderLeft = `5px solid ${team.primary}`;
            btn.onclick = () => this.selectTeam(team);
            grid.appendChild(btn);
        });
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.resize());

        document.getElementById('start-btn').onclick = () => this.switchScreen('team-screen');
        document.getElementById('cancel-team').onclick = () => this.switchScreen('menu-screen');

        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.onclick = () => {
                this.difficulty = btn.dataset.diff;
                this.prepareMatch();
            };
        });

        document.getElementById('play-btn').onclick = () => {
            this.switchScreen('GAMEPLAY');
            document.getElementById('hud').style.display = 'flex';
        };

        window.addEventListener('keydown', (e) => this.handleInput(e));
    }

    switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        if (screenId === 'GAMEPLAY') {
            this.state = 'GAMEPLAY';
            this.resetPositions();
            return;
        }
        const el = document.getElementById(screenId);
        if (el) el.classList.add('active');
        this.state = screenId.replace('-screen', '').toUpperCase();
    }

    selectTeam(team) {
        this.playerTeam = team;
        document.documentElement.style.setProperty('--team-primary', team.primary);
        document.documentElement.style.setProperty('--team-secondary', team.secondary);
        this.switchScreen('difficulty-screen');
    }

    prepareMatch() {
        this.cpuTeam = TEAMS[Math.floor(Math.random() * TEAMS.length)];
        while (this.cpuTeam === this.playerTeam) {
            this.cpuTeam = TEAMS[Math.floor(Math.random() * TEAMS.length)];
        }

        document.getElementById('stage-title').innerText = STAGES[this.currentStageIdx];
        document.getElementById('player-team-display').innerText = this.playerTeam.name;
        document.getElementById('cpu-team-display').innerText = this.cpuTeam.name;

        document.getElementById('p-team-name').innerText = this.playerTeam.name;
        document.getElementById('c-team-name').innerText = this.cpuTeam.name;

        this.score = { p: 0, c: 0 };
        this.updateScoreboard();
        this.switchScreen('intro-screen');
    }

    updateScoreboard() {
        document.getElementById('p-score').innerText = this.score.p;
        document.getElementById('c-score').innerText = this.score.c;
    }

    resetPositions() {
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        this.ball = { x: cw / 2, y: ch * 0.8, z: 0, vx: 0, vy: 0, vz: 0, r: 15, active: false };
        this.goalie = { x: cw / 2, y: ch * 0.3, targetX: cw / 2, width: 80, height: 120, state: 'idle' };
        this.aim = { x: cw / 2, y: ch * 0.35, vx: this.getAimSpeed(), active: true };
    }

    getAimSpeed() {
        if (this.difficulty === 'hard') return 4;
        if (this.difficulty === 'super-hard') return 7;
        return 2.5;
    }

    handleInput(e) {
        if (this.state !== 'GAMEPLAY') return;
        if (this.ball.active) return;

        if (this.turn === 'player') {
            if (e.code === 'Space') {
                this.kickBall();
            }
        } else {
            // Player is Goalie
            if (e.code === 'ArrowLeft') this.goalie.targetX -= 50;
            if (e.code === 'ArrowRight') this.goalie.targetX += 50;
            if (e.code === 'Space') this.goalieJump();
        }
    }

    kickBall() {
        this.ball.active = true;
        this.aim.active = false;

        // Target relative to goal center
        const dx = (this.aim.x - this.canvas.width / 2) * 0.15;
        const dy = (this.aim.y - this.canvas.height * 0.8) * 0.12;

        this.ball.vx = dx;
        this.ball.vy = dy;
        this.ball.vz = 8; // Speed

        // AI Reaction based on difficulty
        const reactionDelay = { 'normal': 600, 'hard': 300, 'super-hard': 100 }[this.difficulty];
        const errorMargin = { 'normal': 80, 'hard': 40, 'super-hard': 10 }[this.difficulty];

        setTimeout(() => {
            if (this.ball.active) {
                this.goalie.targetX = this.aim.x + (Math.random() - 0.5) * errorMargin;
                // Simple dive height
                this.goalie.y = this.canvas.height * 0.3 + (this.aim.y - this.canvas.height * 0.3) * 0.8;
                this.goalie.state = 'diving';
            }
        }, reactionDelay);
    }

    goalieJump() {
        // Implementation for player controls
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }

    update() {
        if (this.state !== 'GAMEPLAY') return;

        // Aim Ping Pong
        if (this.aim.active) {
            this.aim.x += this.aim.vx;
            if (this.aim.x > this.canvas.width * 0.75 || this.aim.x < this.canvas.width * 0.25) {
                this.aim.vx *= -1;
            }
        }

        // Ball Physics
        if (this.ball.active) {
            this.ball.x += this.ball.vx;
            this.ball.y += this.ball.vy;
            this.ball.z += this.ball.vz;

            // Gravity effect
            this.ball.vy += 0.2;

            // Perspective scaling
            this.ball.r = 18 - (this.ball.z * 0.4);

            if (this.ball.z > 25) {
                this.checkResult();
            }
        }

        // Goalie Smooth Move
        this.goalie.x += (this.goalie.targetX - this.goalie.x) * 0.12;
        if (this.goalie.state === 'idle') {
            this.goalie.y += (this.canvas.height * 0.3 - this.goalie.y) * 0.1;
        }
    }

    checkResult() {
        this.ball.active = false;
        const goalWidth = this.canvas.width * 0.45;
        const goalHeight = this.canvas.height * 0.3;
        const goalLeft = (this.canvas.width - goalWidth) / 2;
        const goalRight = goalLeft + goalWidth;
        const goalTop = this.canvas.height * 0.15;
        const goalBottom = goalTop + goalHeight;

        const isInsideGoal = this.ball.x > goalLeft && this.ball.x < goalRight && this.ball.y > goalTop && this.ball.y < goalBottom;

        // Goalie hit detection
        const goalieDist = Math.hypot(this.ball.x - this.goalie.x, this.ball.y - this.goalie.y);
        const saved = goalieDist < 70;

        if (isInsideGoal && !saved) {
            if (this.turn === 'player') this.score.p++;
            else this.score.c++;
            this.showFeedback("GOL!!!");
        } else if (saved) {
            this.showFeedback("DEFENDEU!");
        } else {
            this.showFeedback("FORA!");
        }

        this.updateScoreboard();

        setTimeout(() => {
            this.goalie.state = 'idle';
            this.goalie.targetX = this.canvas.width / 2;

            if (this.score.p >= 3 || this.score.c >= 3) {
                this.endMatch();
            } else {
                this.turn = this.turn === 'player' ? 'cpu' : 'player';
                document.getElementById('instruction-text').innerText = this.turn === 'player' ? "SUA VEZ DE BATER!" : "DEFEZA! USE AS SETAS!";
                this.resetPositions();
            }
        }, 1500);
    }

    showFeedback(text) {
        document.getElementById('instruction-text').innerText = text;
    }

    endMatch() {
        document.getElementById('hud').style.display = 'none';
        if (this.score.p >= 3) {
            this.currentStageIdx++;
            if (this.currentStageIdx >= STAGES.length) {
                document.getElementById('champion-team-name').innerText = this.playerTeam.name;
                this.switchScreen('champion-screen');
            } else {
                document.getElementById('result-text').innerText = "VITÓRIA!";
                document.getElementById('next-btn').classList.remove('hidden');
                document.getElementById('restart-btn').classList.add('hidden');
                this.switchScreen('result-screen');
            }
        } else {
            document.getElementById('result-text').innerText = "FIM DE JOGO";
            document.getElementById('next-btn').classList.add('hidden');
            document.getElementById('restart-btn').classList.remove('hidden');
            this.currentStageIdx = 0; // Reset tournament
            this.switchScreen('result-screen');
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.state !== 'GAMEPLAY') return;

        const cw = this.canvas.width;
        const ch = this.canvas.height;

        // Draw Field
        this.ctx.fillStyle = '#1a5e20';
        this.ctx.fillRect(0, ch * 0.5, cw, ch * 0.5);
        this.ctx.fillStyle = '#2e7d32';
        for (let i = 0; i < 10; i++) {
            if (i % 2 == 0) this.ctx.fillRect(0, ch * 0.5 + (i * ch * 0.05), cw, ch * 0.05);
        }

        // Draw Goal lines
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 5;
        const gw = cw * 0.4;
        const gl = (cw - gw) / 2;
        this.ctx.strokeRect(gl, ch * 0.2, gw, ch * 0.25);

        // Draw Aim
        if (this.aim.active) {
            this.ctx.beginPath();
            this.ctx.arc(this.aim.x, this.aim.y, 20, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(this.aim.x - 30, this.aim.y);
            this.ctx.lineTo(this.aim.x + 30, this.aim.y);
            this.ctx.moveTo(this.aim.x, this.aim.y - 30);
            this.ctx.lineTo(this.aim.x, this.aim.y + 30);
            this.ctx.stroke();
        }

        // Draw Goalie
        this.ctx.fillStyle = this.turn === 'player' ? this.cpuTeam.primary : this.playerTeam.primary;
        this.ctx.fillRect(this.goalie.x - 40, this.goalie.y - 60, 80, 120);
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 12px Outfit';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.turn === 'player' ? "GOLEIRO CPU" : "VOCÊ", this.goalie.x, this.goalie.y - 70);

        // Draw Ball
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
        this.ctx.fillStyle = 'white';
        this.ctx.fill();
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Shadow
        this.ctx.beginPath();
        this.ctx.ellipse(this.ball.x, this.ball.y + this.ball.z * 5 + 10, this.ball.r, this.ball.r * 0.3, 0, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this.ctx.fill();
    }
}

// Start Game
window.onload = () => new Game();
