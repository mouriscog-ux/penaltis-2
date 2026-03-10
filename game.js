/**
 * BRASILEIRÃO PENALTY CUP 2026
 * PROTOCOLO MESTRE - IMPLEMENTAÇÃO BLINDADA
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

        // State Machine (Protocolo Item 1)
        this.state = 0; // 0:Selection, 1:Attack, 2:Defense, 3:Transition

        this.playerTeam = null;
        this.cpuTeam = null;
        this.difficulty = 'normal';
        this.currentStageIdx = 0;

        this.score = { p: 0, c: 0 };

        // Alvo-Coordenado (Protocolo Item 2)
        this.aim = { x: 0, y: 0, t: 0 };
        this.ball = { x: 0, y: 0, z: 0, active: false, progress: 0, targetX: 0, targetY: 0 };
        this.goalie = { x: 0, y: 0, targetX: 0, targetY: 0 };

        this.init();
    }

    resize() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    init() {
        window.addEventListener('resize', () => this.resize());

        // UI Initialization
        const grid = document.getElementById('team-grid');
        CLUBS.forEach(team => {
            const btn = document.createElement('button');
            btn.className = 'team-btn';
            btn.innerText = team.name.toUpperCase();
            btn.onclick = () => this.selectTeam(team);
            grid.appendChild(btn);
        });

        document.getElementById('start-btn').onclick = () => this.switchScreen('team-screen');
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.onclick = () => this.selectDifficulty(btn.dataset.diff);
        });
        document.getElementById('play-btn').onclick = () => this.startMatch();
        document.getElementById('next-btn').onclick = () => this.resetScoreAndAdvance();
        document.getElementById('home-btn').onclick = () => location.reload();

        // Controls
        this.canvas.addEventListener('click', () => this.handlePlayerKick());
        window.addEventListener('keydown', (e) => this.handleGoalieJump(e));

        this.loop();
    }

    switchScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(id);
        if (target) target.classList.add('active');
    }

    selectTeam(team) {
        this.playerTeam = team;
        document.documentElement.style.setProperty('--team-color', team.color);
        this.switchScreen('difficulty-screen');
    }

    selectDifficulty(diff) {
        this.difficulty = diff;
        this.prepareIntro();
    }

    prepareIntro() {
        this.cpuTeam = CLUBS[Math.floor(Math.random() * CLUBS.length)];
        while (this.cpuTeam.name === this.playerTeam.name) {
            this.cpuTeam = CLUBS[Math.floor(Math.random() * CLUBS.length)];
        }

        document.getElementById('stage-title').innerText = STAGES[this.currentStageIdx].toUpperCase();
        document.getElementById('player-team-display').innerText = this.playerTeam.name.toUpperCase();
        document.getElementById('cpu-team-display').innerText = this.cpuTeam.name.toUpperCase();

        document.getElementById('p-name').innerText = this.playerTeam.name.substring(0, 3).toUpperCase();
        document.getElementById('c-name').innerText = this.cpuTeam.name.substring(0, 3).toUpperCase();

        this.switchScreen('intro-screen');
    }

    startMatch() {
        this.state = 1; // ESTADO 1: Ataque
        this.switchScreen('gameplay-placeholder'); // Hide all screens
        document.getElementById('hud').classList.remove('hidden');
        this.resetPositions();
    }

    resetPositions() {
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        this.ball = {
            x: cw / 2, y: ch * 0.85, z: 0,
            active: false, progress: 0,
            startX: cw / 2, startY: ch * 0.85,
            targetX: 0, targetY: 0
        };

        this.goalie = { x: cw / 2, y: ch * 0.35, targetX: cw / 2, targetY: ch * 0.35 };
        this.aim.t = Math.random() * 10;

        const instruction = this.state === 1 ? "SUA VEZ DE BATER!" : "DEFENDA! (USE ← →)";
        document.getElementById('instruction-text').innerText = instruction;

        if (this.state === 2) {
            this.prepareIAKick();
        }
    }

    handlePlayerKick() {
        if (this.state !== 1 || this.ball.active) return;

        this.ball.active = true;
        this.ball.targetX = this.aim.x;
        this.ball.targetY = this.aim.y;

        // IA Defense Probability (Protocolo Item 3)
        const chance = { 'normal': 0.25, 'hard': 0.50, 'super-hard': 0.85 }[this.difficulty];
        const willSave = Math.random() < chance;

        if (willSave) {
            setTimeout(() => {
                this.goalie.targetX = this.ball.targetX;
                this.goalie.targetY = this.ball.targetY;
            }, this.difficulty === 'super-hard' ? 0 : 300);
        }
    }

    prepareIAKick() {
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        // Random Target inside goal
        const targetX = cw * 0.35 + Math.random() * (cw * 0.3);
        const targetY = ch * 0.15 + Math.random() * (ch * 0.2);

        setTimeout(() => {
            this.ball.active = true;
            this.ball.targetX = targetX;
            this.ball.targetY = targetY;
        }, 1200);
    }

    handleGoalieJump(e) {
        if (this.state !== 2 || this.ball.active) return;

        const cw = this.canvas.width;
        const jumpOffset = cw * 0.15;

        if (e.code === 'ArrowLeft') this.goalie.targetX = cw / 2 - jumpOffset;
        if (e.code === 'ArrowRight') this.goalie.targetX = cw / 2 + jumpOffset;
        if (e.code === 'ArrowUp') this.goalie.targetY = this.canvas.height * 0.25;
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }

    update() {
        if (this.state !== 1 && this.state !== 2) return;

        // Aim Management (Eixos X, Y)
        if (!this.ball.active && this.state === 1) {
            const cw = this.canvas.width;
            const ch = this.canvas.height;
            const speed = { 'normal': 0.04, 'hard': 0.08, 'super-hard': 0.12 }[this.difficulty];
            this.aim.t += speed;
            this.aim.x = cw / 2 + Math.sin(this.aim.t) * (cw * 0.22);
            this.aim.y = ch * 0.25 + Math.cos(this.aim.t * 0.8) * (ch * 0.1);
        }

        // Chute "Alvo-Coordenado" (Protocolo Item 2 - LERP)
        if (this.ball.active) {
            this.ball.progress += 0.04; // Constant 0.4s travel time (~25 frames)
            if (this.ball.progress >= 1) {
                this.ball.progress = 1;
                this.checkResult();
            }

            // Lerp Position
            this.ball.x = this.ball.startX + (this.ball.targetX - this.ball.startX) * this.ball.progress;
            this.ball.y = this.ball.startY + (this.ball.targetY - this.ball.startY) * this.ball.progress;
            this.ball.z = this.ball.progress * 40;
        }

        // Goalie Smooth Movement
        this.goalie.x += (this.goalie.targetX - this.goalie.x) * 0.15;
        this.goalie.y += (this.goalie.targetY - this.goalie.y) * 0.15;
    }

    checkResult() {
        this.ball.active = false;

        // Basic Rectangle collision for Goalie Hands
        const dist = Math.hypot(this.ball.x - this.goalie.x, this.ball.y - this.goalie.y);
        const saved = dist < 70;

        if (saved) {
            document.getElementById('instruction-text').innerText = "DEFENDEU!";
        } else {
            // Check if inside goal area (Protocol Rule)
            const cw = this.canvas.width;
            const ch = this.canvas.height;
            const gw = cw * 0.5, gh = ch * 0.35;
            const gl = (cw - gw) / 2, gt = ch * 0.1;

            if (this.ball.x > gl && this.ball.x < gl + gw && this.ball.y > gt && this.ball.y < gt + gh) {
                document.getElementById('instruction-text').innerText = "GOL!!!";
                if (this.state === 1) this.score.p++; else this.score.c++;
            } else {
                document.getElementById('instruction-text').innerText = "PRA FORA!";
            }
        }

        this.updateScoreboard();

        // Protocol Item 2: Delay 1.5s the state switch
        setTimeout(() => {
            this.checkWinner();
        }, 1500);
    }

    updateScoreboard() {
        document.getElementById('p-score').innerText = this.score.p;
        document.getElementById('c-score').innerText = this.score.c;
    }

    checkWinner() {
        // Regra dos 3 Gols (Protocolo Item 4)
        if (this.score.p >= 3 || this.score.c >= 3) {
            this.state = 3; // ESTADO 3: Transição
            this.endMatch();
        } else {
            // Alternar Turno (Ciclo 1 <-> 2)
            this.state = this.state === 1 ? 2 : 1;
            this.resetPositions();
        }
    }

    endMatch() {
        document.getElementById('hud').classList.add('hidden');
        this.switchScreen('result-screen');
        if (this.score.p >= 3) {
            document.getElementById('result-text').innerText = "VITÓRIA!";
            document.getElementById('next-btn').classList.remove('hidden');
            document.getElementById('restart-btn').classList.add('hidden');
        } else {
            document.getElementById('result-text').innerText = "GAME OVER";
            document.getElementById('next-btn').classList.add('hidden');
            document.getElementById('restart-btn').classList.remove('hidden');
        }
    }

    resetScoreAndAdvance() {
        // Reset de Placar (Protocolo Item 4)
        this.score = { p: 0, c: 0 };
        this.updateScoreboard();

        this.currentStageIdx++;
        if (this.currentStageIdx >= STAGES.length) {
            this.switchScreen('champion-screen');
            document.getElementById('champion-name').innerText = this.playerTeam.name.toUpperCase();
        } else {
            this.prepareIntro();
        }
    }

    draw() {
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        this.ctx.clearRect(0, 0, cw, ch);

        if (this.state === 0 || this.state === 3) return;

        // Pit
        this.ctx.fillStyle = '#1e5e22';
        this.ctx.fillRect(0, ch * 0.45, cw, ch * 0.55);

        // Goal Structure
        this.ctx.strokeStyle = '#fff'; this.ctx.lineWidth = 10;
        const gw = cw * 0.5, gh = ch * 0.35, gl = (cw - gw) / 2, gt = ch * 0.1;
        this.ctx.strokeRect(gl, gt, gw, gh);

        // Net (visual only)
        this.ctx.strokeStyle = 'rgba(255,255,255,0.1)'; this.ctx.lineWidth = 1;
        for (let x = gl; x <= gl + gw; x += 15) { this.ctx.beginPath(); this.ctx.moveTo(x, gt); this.ctx.lineTo(x, gt + gh); this.ctx.stroke(); }
        for (let y = gt; y <= gt + gh; y += 15) { this.ctx.beginPath(); this.ctx.moveTo(gl, y); this.ctx.lineTo(gl + gw, y); this.ctx.stroke(); }

        // Aim
        if (this.state === 1 && !this.ball.active) {
            this.ctx.beginPath(); this.ctx.arc(this.aim.x, this.aim.y, 20, 0, Math.PI * 2);
            this.ctx.strokeStyle = this.playerTeam.color; this.ctx.lineWidth = 3; this.ctx.stroke();
        }

        // Goalkeeper
        this.ctx.fillStyle = this.state === 1 ? this.cpuTeam.color : this.playerTeam.color;
        this.ctx.fillRect(this.goalie.x - 50, this.goalie.y - 70, 100, 140);
        this.ctx.fillStyle = '#fff'; this.ctx.font = '900 16px Outfit'; this.ctx.textAlign = 'center';
        this.ctx.fillText(this.state === 1 ? "GOLEIRO CPU" : "VOCÊ", this.goalie.x, this.goalie.y - 80);

        // Ball
        const ballSize = 20 - (this.ball.z * 0.2);
        this.ctx.beginPath(); this.ctx.arc(this.ball.x, this.ball.y, ballSize, 0, Math.PI * 2);
        this.ctx.fillStyle = '#fff'; this.ctx.fill(); this.ctx.strokeStyle = '#000'; this.ctx.lineWidth = 1; this.ctx.stroke();
    }
}

window.onload = () => new PenaltyGame();
