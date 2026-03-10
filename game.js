/**
 * BRASILEIRÃO PENALTY CUP 2026 - MASTER SPECIFICATION
 * Implementation following "Documentação de Referência Final"
 */

const CLUBS = [
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

class PenaltyGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();

        // Game States
        this.gameState = 'MENU';
        this.role = 'kicker'; // kicker or goalie
        this.difficulty = 'normal';
        this.currentStageIdx = 0;

        this.playerTeam = null;
        this.cpuTeam = null;
        this.score = { p: 0, c: 0 };

        // Logical Objects
        this.aim = { x: 0, y: 0, t: 0 };
        this.ball = { x: 0, y: 0, progress: 0, active: false, startPos: { x: 0, y: 0 }, target: { x: 0, y: 0 } };
        this.goalie = { x: 0, y: 0, targetX: 0, targetY: 0 };

        this.init();
    }

    resize() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    init() {
        window.addEventListener('resize', () => this.resize());

        // UI Bindings
        document.getElementById('start-btn').onclick = () => this.switchScreen('team-screen');

        const grid = document.getElementById('team-grid');
        CLUBS.forEach(team => {
            const btn = document.createElement('button');
            btn.className = 'team-btn';
            btn.style.borderLeftColor = team.color;
            btn.innerText = team.name.toUpperCase();
            btn.onclick = () => this.selectTeam(team);
            grid.appendChild(btn);
        });

        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.difficulty = btn.dataset.diff;
            };
        });

        document.getElementById('play-btn').onclick = () => this.startGameplay();
        document.getElementById('next-btn').onclick = () => this.advancePhase();

        this.canvas.addEventListener('mousedown', (e) => this.handlePlayerAction(e));
        window.addEventListener('keydown', (e) => this.handlePlayerAction(e));

        this.gameLoop();
    }

    switchScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(id);
        if (target) target.classList.add('active');
    }

    selectTeam(team) {
        this.playerTeam = team;
        document.documentElement.style.setProperty('--player-color', team.color);
        this.prepareMatch();
    }

    prepareMatch() {
        this.cpuTeam = CLUBS[Math.floor(Math.random() * CLUBS.length)];
        while (this.cpuTeam.name === this.playerTeam.name) {
            this.cpuTeam = CLUBS[Math.floor(Math.random() * CLUBS.length)];
        }

        document.getElementById('stage-name').innerText = STAGES[this.currentStageIdx].toUpperCase();
        document.getElementById('p-card').innerText = this.playerTeam.name.toUpperCase();
        document.getElementById('c-card').innerText = this.cpuTeam.name.toUpperCase();

        document.getElementById('p-name').innerText = this.playerTeam.name.substring(0, 3).toUpperCase();
        document.getElementById('c-name').innerText = this.cpuTeam.name.substring(0, 3).toUpperCase();
        document.getElementById('p-shield').style.background = this.playerTeam.color;
        document.getElementById('c-shield').style.background = this.cpuTeam.color;

        this.switchScreen('intro-screen');
    }

    startGameplay() {
        this.gameState = 'PLAYING';
        this.role = 'kicker';
        this.score = { p: 0, c: 0 }; // Score Reset for the match
        this.updateHUD();
        this.switchScreen('gameplay'); // just clears UI layer
        document.getElementById('hud').classList.remove('hidden');
        this.resetTurnPositions();
    }

    resetTurnPositions() {
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        this.ball = {
            progress: 0, active: false,
            x: cw / 2, y: ch * 0.85,
            startPos: { x: cw / 2, y: ch * 0.85 },
            target: { x: 0, y: 0 }
        };

        this.goalie = { x: cw / 2, y: ch * 0.35, targetX: cw / 2, targetY: ch * 0.35 };
        this.aim.t = Math.random() * 100;

        document.getElementById('instruction-text').innerText =
            this.role === 'kicker' ? "SUA VEZ DE BATER!" : "SUA VEZ DE DEFENDER!";

        if (this.role === 'goalie') {
            this.prepareCPUKick();
        }
    }

    handlePlayerAction(e) {
        if (this.gameState !== 'PLAYING' || this.ball.active) return;

        if (this.role === 'kicker' && (e.type === 'mousedown')) {
            this.kickBall(this.aim.x, this.aim.y);
        } else if (this.role === 'goalie' && e.type === 'keydown') {
            // Defense Controls
            const cw = this.canvas.width;
            if (e.code === 'ArrowLeft') this.goalie.targetX = cw * 0.35;
            if (e.code === 'ArrowRight') this.goalie.targetX = cw * 0.65;
            if (e.code === 'ArrowUp') this.goalie.targetY = this.canvas.height * 0.2;
            if (e.code === 'ArrowDown') this.goalie.targetY = this.canvas.height * 0.4;
        }
    }

    kickBall(tx, ty) {
        this.ball.active = true;
        this.ball.target = { x: tx, y: ty };

        // AI Logic according to protocol (Dificuldade)
        if (this.role === 'kicker') {
            const chanceToSave = { 'normal': 0.25, 'hard': 0.5, 'super-hard': 0.85 }[this.difficulty];
            const reactionDelay = { 'normal': 500, 'hard': 100, 'super-hard': 0 }[this.difficulty];

            if (Math.random() < chanceToSave) {
                setTimeout(() => {
                    this.goalie.targetX = tx;
                    this.goalie.targetY = ty;
                }, reactionDelay);
            }
        }
    }

    prepareCPUKick() {
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        const tx = cw * 0.35 + Math.random() * (cw * 0.3);
        const ty = ch * 0.15 + Math.random() * (ch * 0.25);

        setTimeout(() => {
            this.kickBall(tx, ty);
        }, 1200);
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        if (this.gameState !== 'PLAYING') return;

        const cw = this.canvas.width;
        const ch = this.canvas.height;

        // Move Aim (Sin/Cos pattern for fixed trajectory logic)
        if (!this.ball.active && this.role === 'kicker') {
            const speed = { 'normal': 0.05, 'hard': 0.1, 'super-hard': 0.15 }[this.difficulty];
            this.aim.t += speed;
            this.aim.x = cw / 2 + Math.sin(this.aim.t) * (cw * 0.25);
            this.aim.y = ch * 0.3 + Math.cos(this.aim.t * 0.7) * (ch * 0.12);
        }

        // Move Ball (Lerp according to protocol B.1)
        if (this.ball.active) {
            this.ball.progress += 0.04; // ~0.4s travel time
            if (this.ball.progress >= 1) {
                this.ball.progress = 1;
                this.processKickResult();
            }
            // Linear Interpolation
            this.ball.x = this.ball.startPos.x + (this.ball.target.x - this.ball.startPos.x) * this.ball.progress;
            this.ball.y = this.ball.startPos.y + (this.ball.target.y - this.ball.startPos.y) * this.ball.progress;
        }

        // Smooth Goalie
        this.goalie.x += (this.goalie.targetX - this.goalie.x) * 0.15;
        this.goalie.y += (this.goalie.targetY - this.goalie.y) * 0.15;
    }

    processKickResult() {
        this.ball.active = false;

        // Collision logic (coordinates match goalie hands)
        const dist = Math.hypot(this.ball.x - this.goalie.x, this.ball.y - this.goalie.y);
        const saved = dist < 75;

        const cw = this.canvas.width;
        const ch = this.canvas.height;
        const gw = cw * 0.45, gh = ch * 0.35;
        const gl = (cw - gw) / 2, gt = ch * 0.12;

        const inGoal = this.ball.x > gl && this.ball.x < gl + gw && this.ball.y > gt && this.ball.y < gt + gh;

        if (saved) {
            document.getElementById('instruction-text').innerText = "DEFENDEU!";
        } else if (inGoal) {
            document.getElementById('instruction-text').innerText = "GOL!!!";
            if (this.role === 'kicker') this.score.p++; else this.score.c++;
        } else {
            document.getElementById('instruction-text').innerText = "PARA FORA!";
        }

        this.updateHUD();

        // 1.5s Delay before turn swap (Protocol 4.A)
        setTimeout(() => {
            this.checkVictory();
        }, 1500);
    }

    updateHUD() {
        document.getElementById('p-score').innerText = this.score.p;
        document.getElementById('c-score').innerText = this.score.c;
    }

    checkVictory() {
        // Regra de Vitória Rápida (Protocol 2.A)
        if (this.score.p >= 3 || this.score.c >= 3) {
            this.endMatch();
        } else {
            this.role = this.role === 'kicker' ? 'goalie' : 'kicker';
            this.resetTurnPositions();
        }
    }

    endMatch() {
        this.gameState = 'RESULT';
        document.getElementById('hud').classList.add('hidden');
        this.switchScreen('result-screen');

        if (this.score.p >= 3) {
            document.getElementById('result-title').innerText = "VITÓRIA!";
            document.getElementById('next-btn').classList.remove('hidden');
            document.getElementById('restart-btn').classList.add('hidden');
        } else {
            document.getElementById('result-title').innerText = "FIM DE JOGO";
            document.getElementById('next-btn').classList.add('hidden');
            document.getElementById('restart-btn').classList.remove('hidden');
            document.getElementById('restart-btn').onclick = () => location.reload();
        }
    }

    advancePhase() {
        this.currentStageIdx++;
        if (this.currentStageIdx >= STAGES.length) {
            this.switchScreen('champion-screen');
            document.getElementById('champ-team').innerText = this.playerTeam.name.toUpperCase();
        } else {
            // Reset Memória (Protocol 2.A)
            this.score = { p: 0, c: 0 };
            this.prepareMatch();
        }
    }

    draw() {
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        this.ctx.clearRect(0, 0, cw, ch);

        if (this.gameState !== 'PLAYING') return;

        // Pitch
        this.ctx.fillStyle = '#1e5e22';
        this.ctx.fillRect(0, ch * 0.45, cw, ch * 0.55);

        // Goal Post
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 12;
        this.ctx.lineJoin = 'round';
        const gw = cw * 0.45, gh = ch * 0.35;
        const gl = (cw - gw) / 2, gt = ch * 0.12;
        this.ctx.strokeRect(gl, gt, gw, gh);

        // Aim (Only when kicking)
        if (this.role === 'kicker' && !this.ball.active) {
            this.ctx.beginPath();
            this.ctx.arc(this.aim.x, this.aim.y, 20, 0, Math.PI * 2);
            this.ctx.strokeStyle = this.playerTeam.color;
            this.ctx.lineWidth = 4;
            this.ctx.stroke();
        }

        // Goalkeeper
        this.ctx.fillStyle = this.role === 'kicker' ? this.cpuTeam.color : this.playerTeam.color;
        this.ctx.fillRect(this.goalie.x - 45, this.goalie.y - 65, 90, 130);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '900 15px Outfit';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.role === 'kicker' ? "IA" : "VOCÊ", this.goalie.x, this.goalie.y - 75);

        // Ball
        const bSize = 20 - (this.ball.progress * 4);
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, bSize, 0, Math.PI * 2);
        this.ctx.fillStyle = '#fff';
        this.ctx.fill();
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }
}

window.onload = () => new PenaltyGame();
