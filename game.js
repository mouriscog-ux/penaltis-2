/**
 * BRASILEIRÃO PENALTY 2026 - FIX TOTAL
 * "PROTOCOLO DE EMERGÊNCIA - ALGORITMO DE FERRO"
 */

const TEAMS = [
    { name: "Palmeiras", color: "#006400" }, { name: "Flamengo", color: "#ff0000" },
    { name: "Botafogo", color: "#000000" }, { name: "Fortaleza", color: "#0000ff" },
    { name: "São Paulo", color: "#ff0000" }, { name: "Internacional", color: "#ff0000" },
    { name: "Cruzeiro", color: "#0000ff" }, { name: "Bahia", color: "#0000ff" },
    { name: "Corinthians", color: "#ffffff" }, { name: "Vasco", color: "#000000" },
    { name: "Grêmio", color: "#00aae4" }, { name: "Atlético-MG", color: "#000000" },
    { name: "Fluminense", color: "#830000" }, { name: "Athletico-PR", color: "#ff0000" },
    { name: "Vitória", color: "#ff0000" }, { name: "Bragantino", color: "#ffffff" },
    { name: "Santos", color: "#ffffff" }, { name: "Coritiba", color: "#006400" },
    { name: "Mirassol", color: "#ffff00" }, { name: "Remo", color: "#000080" }
];

const STAGES = ["Oitavas de Final", "Quartas de Final", "Semifinal", "Grande Final"];

class GameEngine {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();

        // Engine State
        this.state = 'MENU'; // MENU, TEAM_SELECT, INTRO, PLAYING, RESULT
        this.subState = 'PLAYER_ATTACK'; // PLAYER_ATTACK, IA_ATTACK, DELAY

        this.playerTeam = null;
        this.cpuTeam = null;
        this.difficulty = 'normal';
        this.currentStageIdx = 0;

        this.score = { p: 0, c: 0 };

        // Logical Objects (Direct Coords)
        this.aim = { x: 0, y: 0, t: 0 };
        this.ball = { x: 0, y: 0, targetX: 0, targetY: 0, progress: 0, active: false };
        this.goalie = { x: 0, y: 0, targetX: 0, targetY: 0 };

        this.init();
    }

    resize() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    init() {
        window.addEventListener('resize', () => this.resize());

        // Menu Listeners
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.difficulty = btn.dataset.diff;
            };
        });

        document.getElementById('start-btn').onclick = () => this.switchScreen('team-screen');

        const grid = document.getElementById('team-grid');
        TEAMS.forEach(team => {
            const btn = document.createElement('div');
            btn.className = 'team-item';
            btn.innerText = team.name.toUpperCase();
            btn.onclick = () => this.selectTeam(team);
            grid.appendChild(btn);
        });

        document.getElementById('play-btn').onclick = () => this.startMatch();
        document.getElementById('next-phase-btn').onclick = () => this.nextPhase();

        // Interaction
        this.canvas.onclick = (e) => this.handlePlayerClick(e);
        window.onkeydown = (e) => this.handlePlayerKeys(e);

        this.loop();
    }

    switchScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const screen = document.getElementById(id);
        if (screen) screen.classList.add('active');
        this.state = id.split('-')[0].toUpperCase();
    }

    selectTeam(team) {
        this.playerTeam = team;
        document.documentElement.style.setProperty('--hud-color', team.color);
        this.prepareIntro();
    }

    prepareIntro() {
        this.cpuTeam = TEAMS[Math.floor(Math.random() * TEAMS.length)];
        while (this.cpuTeam.name === this.playerTeam.name) {
            this.cpuTeam = TEAMS[Math.floor(Math.random() * TEAMS.length)];
        }

        document.getElementById('phase-name').innerText = STAGES[this.currentStageIdx].toUpperCase();
        document.getElementById('p-team-card').innerText = this.playerTeam.name.toUpperCase();
        document.getElementById('c-team-card').innerText = this.cpuTeam.name.toUpperCase();

        document.getElementById('p-name').innerText = this.playerTeam.name.substring(0, 3).toUpperCase();
        document.getElementById('c-name').innerText = this.cpuTeam.name.substring(0, 3).toUpperCase();

        this.switchScreen('intro-screen');
    }

    startMatch() {
        this.state = 'PLAYING';
        this.subState = 'PLAYER_ATTACK';
        this.score = { p: 0, c: 0 };
        this.updateHUD();
        this.switchScreen('none');
        document.getElementById('hud').classList.remove('hidden');
        this.resetPositions();
    }

    resetPositions() {
        const cw = this.canvas.width, ch = this.canvas.height;
        this.ball = {
            x: cw / 2, y: ch * 0.85,
            startX: cw / 2, startY: ch * 0.85,
            targetX: 0, targetY: 0, progress: 1, active: false
        };
        this.goalie = { x: cw / 2, y: ch * 0.35, targetX: cw / 2, targetY: ch * 0.35 };
        this.aim.t = Math.random() * 10;

        const msg = this.subState === 'PLAYER_ATTACK' ? "SUA VEZ DE BATER!" : "DEFEZA! (SETAS)";
        document.getElementById('status-msg').innerText = msg;

        if (this.subState === 'IA_ATTACK') {
            this.prepareIAKick();
        }
    }

    handlePlayerClick(e) {
        if (this.state !== 'PLAYING' || this.subState !== 'PLAYER_ATTACK' || this.ball.active) return;

        // Capture Exact Coords (Protocol Section 1)
        const rect = this.canvas.getBoundingClientRect();
        this.ball.targetX = e.clientX - rect.left;
        this.ball.targetY = e.clientY - rect.top;
        this.ball.startX = this.canvas.width / 2;
        this.ball.startY = this.canvas.height * 0.85;
        this.ball.progress = 0;
        this.ball.active = true;

        // AI Goalie Reaction (Protocol Section 4)
        const chance = { 'normal': 0.2, 'hard': 0.5, 'super-hard': 0.9 }[this.difficulty];
        if (Math.random() < chance) {
            setTimeout(() => {
                this.goalie.targetX = this.ball.targetX;
                this.goalie.targetY = this.ball.targetY;
            }, 100);
        }
    }

    handlePlayerKeys(e) {
        if (this.state !== 'PLAYING' || this.subState !== 'IA_ATTACK' || this.ball.active) return;

        const cw = this.canvas.width;
        if (e.code === 'ArrowLeft') this.goalie.targetX = cw * 0.35;
        if (e.code === 'ArrowRight') this.goalie.targetX = cw * 0.65;
        if (e.code === 'ArrowUp') this.goalie.targetY = this.canvas.height * 0.25;
    }

    prepareIAKick() {
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        const tx = cw * 0.35 + Math.random() * (cw * 0.3);
        const ty = ch * 0.2 + Math.random() * (ch * 0.25);

        setTimeout(() => {
            this.ball.targetX = tx;
            this.ball.targetY = ty;
            this.ball.startX = cw / 2;
            this.ball.startY = ch * 0.85;
            this.ball.progress = 0;
            this.ball.active = true;
        }, 1200);
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }

    update() {
        if (this.state !== 'PLAYING') return;

        // Ball Interpolation (Protocol: 0.3 seconds travel)
        if (this.ball.active) {
            this.ball.progress += 0.055; // Complete in ~18 frames (0.3s at 60fps)
            if (this.ball.progress >= 1) {
                this.ball.progress = 1;
                this.finishTurn();
            }
            // LERP Equation
            this.ball.x = this.ball.startX + (this.ball.targetX - this.ball.startX) * this.ball.progress;
            this.ball.y = this.ball.startY + (this.ball.targetY - this.ball.startY) * this.ball.progress;
        }

        // Smooth Goalie Move
        this.goalie.x += (this.goalie.targetX - this.goalie.x) * 0.2;
        this.goalie.y += (this.goalie.targetY - this.goalie.y) * 0.2;
    }

    finishTurn() {
        this.ball.active = false;

        // Logical Hit Check
        const dist = Math.hypot(this.ball.x - this.goalie.x, this.ball.y - this.goalie.y);
        const saved = dist < 70;

        const cw = this.canvas.width, ch = this.canvas.height;
        const inGoal = this.ball.x > cw * 0.25 && this.ball.x < cw * 0.75 && this.ball.y > ch * 0.15 && this.ball.y < ch * 0.5;

        if (saved) {
            document.getElementById('status-msg').innerText = "DEFENDEU!";
        } else if (inGoal) {
            document.getElementById('status-msg').innerText = "GOL!!!";
            if (this.subState === 'PLAYER_ATTACK') this.score.p++; else this.score.c++;
        } else {
            document.getElementById('status-msg').innerText = "PRA FORA!";
        }

        this.updateHUD();

        // Delay 1.5s (Protocol Section 2)
        setTimeout(() => {
            this.checkGameProgress();
        }, 1500);
    }

    updateHUD() {
        document.getElementById('p-score').innerText = this.score.p;
        document.getElementById('c-score').innerText = this.score.c;
    }

    checkGameProgress() {
        // Victory Condition (3 Gols)
        if (this.score.p >= 3 || this.score.c >= 3) {
            this.endMatch();
        } else {
            // Turn Swap
            this.subState = this.subState === 'PLAYER_ATTACK' ? 'IA_ATTACK' : 'PLAYER_ATTACK';
            this.resetPositions();
        }
    }

    endMatch() {
        this.state = 'RESULT';
        document.getElementById('hud').classList.add('hidden');
        this.switchScreen('result-screen');

        if (this.score.p >= 3) {
            document.getElementById('result-text').innerText = "VITÓRIA!";
            document.getElementById('next-phase-btn').classList.remove('hidden');
            document.getElementById('retry-btn').classList.add('hidden');
        } else {
            document.getElementById('result-text').innerText = "DERROTA!";
            document.getElementById('next-phase-btn').classList.add('hidden');
            document.getElementById('retry-btn').classList.remove('hidden');
        }
    }

    nextPhase() {
        this.currentStageIdx++;
        if (this.currentStageIdx >= STAGES.length) {
            this.switchScreen('champion-screen');
            document.getElementById('champ-name').innerText = this.playerTeam.name.toUpperCase();
        } else {
            // Protocol Step 2: ZERA O PLACAR (0-0)
            this.score = { p: 0, c: 0 };
            this.prepareIntro();
        }
    }

    draw() {
        const cw = this.canvas.width, ch = this.canvas.height;
        this.ctx.clearRect(0, 0, cw, ch);

        if (this.state !== 'PLAYING') return;

        // Simple Pitch
        this.ctx.fillStyle = '#1e5e22';
        this.ctx.fillRect(0, ch * 0.45, cw, ch * 0.55);

        // Goal Rect
        this.ctx.strokeStyle = '#fff'; this.ctx.lineWidth = 10;
        const gw = cw * 0.5, gh = ch * 0.35, gl = (cw - gw) / 2, gt = ch * 0.15;
        this.ctx.strokeRect(gl, gt, gw, gh);

        // Net (visual dots)
        this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
        for (let rx = gl + 10; rx < gl + gw; rx += 20) {
            for (let ry = gt + 10; ry < gt + gh; ry += 20) {
                this.ctx.fillRect(rx, ry, 2, 2);
            }
        }

        // Goalkeeper
        this.ctx.fillStyle = this.subState === 'PLAYER_ATTACK' ? this.cpuTeam.color : this.playerTeam.color;
        this.ctx.fillRect(this.goalie.x - 40, this.goalie.y - 60, 80, 120);
        this.ctx.fillStyle = '#fff'; this.ctx.font = '900 14px Outfit'; this.ctx.textAlign = 'center';
        this.ctx.fillText(this.subState === 'PLAYER_ATTACK' ? "IA" : "VOCÊ", this.goalie.x, this.goalie.y - 70);

        // Ball
        const ballSize = 25 - (this.ball.progress * 10);
        this.ctx.beginPath(); this.ctx.arc(this.ball.x, this.ball.y, ballSize, 0, Math.PI * 2);
        this.ctx.fillStyle = '#fff'; this.ctx.fill(); this.ctx.strokeStyle = '#000'; this.ctx.stroke();
    }
}

window.onload = () => new GameEngine();
