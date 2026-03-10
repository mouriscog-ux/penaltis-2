/**
 * BRASILEIRÃO PENALTY CUP 2026
 * Core Game Engine - Refactored Version
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
        this.role = 'kicker'; // 'kicker' or 'goalie'

        // Aim Logic
        this.aim = { x: 0, y: 0, time: 0, speed: 0.05, active: true };

        // Game Objects
        this.ball = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 18, active: false };
        this.goalie = { x: 0, y: 0, targetX: 0, targetY: 0, width: 80, height: 120, state: 'idle' };

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
            btn.innerHTML = `<span>${team.name.toUpperCase()}</span>`;
            btn.style.borderLeft = `8px solid ${team.primary}`;
            btn.onclick = () => this.selectTeam(team);
            grid.appendChild(btn);
        });
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.resize());
        document.getElementById('start-btn').onclick = () => this.switchScreen('team-screen');
        document.getElementById('cancel-team').onclick = () => this.switchScreen('menu-screen');
        document.getElementById('cancel-diff').onclick = () => this.switchScreen('team-screen');

        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.onclick = () => {
                this.difficulty = btn.dataset.diff;
                this.prepareMatch();
            };
        });

        document.getElementById('play-btn').onclick = () => this.startGameplay();
        document.getElementById('next-btn').onclick = () => this.nextStage();
        document.getElementById('restart-btn').onclick = () => this.restartTournament();
        document.getElementById('home-btn').onclick = () => location.reload();

        window.addEventListener('keydown', (e) => this.handleInput(e));
    }

    switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const el = document.getElementById(screenId);
        if (el) el.classList.add('active');
        this.state = screenId.replace('-screen', '').toUpperCase();
    }

    selectTeam(team) {
        this.playerTeam = team;
        document.documentElement.style.setProperty('--team-primary', team.primary);
        this.switchScreen('difficulty-screen');
    }

    prepareMatch() {
        // Reset score for new phase
        this.score = { p: 0, c: 0 };
        this.updateScoreboard();

        // Pick CPU opponent (Rival for Final)
        if (this.currentStageIdx === 3) {
            // Find a team that isn't the player
            this.cpuTeam = TEAMS.find(t => t.name !== this.playerTeam.name);
        } else {
            this.cpuTeam = TEAMS[Math.floor(Math.random() * TEAMS.length)];
            while (this.cpuTeam === this.playerTeam) {
                this.cpuTeam = TEAMS[Math.floor(Math.random() * TEAMS.length)];
            }
        }

        document.getElementById('stage-title').innerText = STAGES[this.currentStageIdx].toUpperCase();
        document.getElementById('player-team-display').innerText = this.playerTeam.name.toUpperCase();
        document.getElementById('cpu-team-display').innerText = this.cpuTeam.name.toUpperCase();

        document.getElementById('p-team-name').innerText = this.playerTeam.name.toUpperCase();
        document.getElementById('c-team-name').innerText = this.cpuTeam.name.toUpperCase();

        this.switchScreen('intro-screen');
    }

    startGameplay() {
        this.state = 'GAMEPLAY';
        this.role = 'kicker';
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById('hud').style.display = 'flex';
        this.resetPositions();
    }

    resetPositions() {
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        this.ball = {
            x: cw / 2, y: ch * 0.85, z: 0,
            vx: 0, vy: 0, vz: 0,
            r: 20, active: false
        };

        this.goalie = {
            x: cw / 2, y: ch * 0.35,
            targetX: cw / 2, targetY: ch * 0.35,
            width: 100, height: 140, state: 'idle'
        };

        this.aim = {
            x: cw / 2, y: ch * 0.3,
            time: Math.random() * 10,
            active: true
        };

        const instruction = this.role === 'kicker' ? "Sua vez de bater! [ESPAÇO]" : "Defenda! [SETAS]";
        document.getElementById('instruction-text').innerText = instruction;
        document.getElementById('goalie-controls').classList.toggle('hidden', this.role === 'kicker');

        if (this.role === 'goalie') {
            this.cpuKick();
        }
    }

    handleInput(e) {
        if (this.state !== 'GAMEPLAY' || this.ball.active) return;

        if (this.role === 'kicker') {
            if (e.code === 'Space') this.kickBall();
        } else {
            // Goalkeeper controls
            if (e.code === 'ArrowLeft') this.jumpGoalie(-150);
            if (e.code === 'ArrowRight') this.jumpGoalie(150);
            if (e.code === 'ArrowUp') this.jumpGoalie(0, -50);
        }
    }

    jumpGoalie(offsetX, offsetY = 0) {
        if (this.goalie.state !== 'idle') return;
        this.goalie.state = 'jumping';
        this.goalie.targetX = this.canvas.width / 2 + offsetX;
        this.goalie.targetY = this.canvas.height * 0.35 + offsetY;
    }

    kickBall() {
        this.ball.active = true;
        this.aim.active = false;

        // Target is current aim
        const targetX = this.aim.x;
        const targetY = this.aim.y;

        const dx = (targetX - this.canvas.width / 2) * 0.12;
        const dy = (targetY - (this.canvas.height * 0.85)) * 0.08;

        this.ball.vx = dx;
        this.ball.vy = dy;
        this.ball.vz = 8;

        // CPU Goalie Intelligence
        const reactionTime = { 'normal': 600, 'hard': 300, 'super-hard': 100 }[this.difficulty];
        const accuracy = { 'normal': 100, 'hard': 60, 'super-hard': 20 }[this.difficulty];

        setTimeout(() => {
            if (this.ball.active) {
                this.goalie.state = 'jumping';
                this.goalie.targetX = targetX + (Math.random() - 0.5) * accuracy;
                this.goalie.targetY = targetY + (Math.random() - 0.5) * accuracy;
            }
        }, reactionTime);
    }

    cpuKick() {
        // AI chooses a spot
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        const targetX = cw * 0.35 + Math.random() * (cw * 0.3);
        const targetY = ch * 0.2 + Math.random() * (ch * 0.25);

        // Visual hint for player as goalie? No, make it real reaction.
        setTimeout(() => {
            this.ball.active = true;
            this.ball.vx = (targetX - cw / 2) * 0.12;
            this.ball.vy = (targetY - (ch * 0.85)) * 0.08;
            this.ball.vz = 8;
        }, 1000);
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }

    update() {
        if (this.state !== 'GAMEPLAY') return;

        // Floating Aim Logic (Sine/Cosine for infinity loop)
        if (this.aim.active) {
            this.aim.time += 0.03 * (this.difficulty === 'normal' ? 1 : (this.difficulty === 'hard' ? 2 : 3.5));
            const rangeX = this.canvas.width * 0.25;
            const rangeY = this.canvas.height * 0.12;

            this.aim.x = this.canvas.width / 2 + Math.sin(this.aim.time) * rangeX;
            this.aim.y = this.canvas.height * 0.3 + Math.cos(this.aim.time * 0.7) * rangeY;

            if (this.difficulty === 'super-hard') {
                this.aim.x += (Math.random() - 0.5) * 10;
                this.aim.y += (Math.random() - 0.5) * 10;
            }
        }

        // Ball Physics
        if (this.ball.active) {
            this.ball.x += this.ball.vx;
            this.ball.y += this.ball.vy;
            this.ball.z += this.ball.vz;
            this.ball.vy += 0.25; // Simple Gravity
            this.ball.r = 20 - this.ball.z * 0.4;

            if (this.ball.z > 23) {
                this.checkResult();
            }
        }

        // Goalie Smooth Animation
        this.goalie.x += (this.goalie.targetX - this.goalie.x) * 0.15;
        this.goalie.y += (this.goalie.targetY - this.goalie.y) * 0.15;
    }

    checkResult() {
        this.ball.active = false;

        const cw = this.canvas.width;
        const ch = this.canvas.height;
        const gw = cw * 0.45;
        const gh = ch * 0.3;
        const gl = (cw - gw) / 2;
        const gt = ch * 0.15;

        const inGoal = this.ball.x > gl && this.ball.x < gl + gw && this.ball.y > gt && this.ball.y < gt + gh;

        // Hand collision
        const dist = Math.hypot(this.ball.x - this.goalie.x, this.ball.y - this.goalie.y);
        const saved = dist < 75;

        if (inGoal && !saved) {
            if (this.role === 'kicker') this.score.p++;
            else this.score.c++;
            document.getElementById('instruction-text').innerText = "GOL!!!";
        } else if (saved) {
            document.getElementById('instruction-text').innerText = "DEFENDEU!";
        } else {
            document.getElementById('instruction-text').innerText = "FORA!";
        }

        this.updateScoreboard();

        setTimeout(() => {
            this.checkWinner();
        }, 1500);
    }

    updateScoreboard() {
        document.getElementById('p-score').innerText = this.score.p;
        document.getElementById('c-score').innerText = this.score.c;
    }

    checkWinner() {
        if (this.score.p >= 3) {
            this.endMatch(true);
        } else if (this.score.c >= 3) {
            this.endMatch(false);
        } else {
            // Switch turns
            this.role = this.role === 'kicker' ? 'goalie' : 'kicker';
            this.resetPositions();
        }
    }

    endMatch(playerWon) {
        this.state = 'RESULT';
        document.getElementById('hud').style.display = 'none';

        if (playerWon) {
            this.currentStageIdx++;
            if (this.currentStageIdx >= STAGES.length) {
                document.getElementById('champion-team-name').innerText = this.playerTeam.name.toUpperCase();
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
            document.getElementById('menu-btn').classList.remove('hidden');
            document.getElementById('menu-btn').onclick = () => location.reload();
            this.switchScreen('result-screen');
        }
    }

    nextStage() {
        this.prepareMatch();
    }

    restartTournament() {
        this.currentStageIdx = 0;
        this.prepareMatch();
    }

    draw() {
        if (this.state !== 'GAMEPLAY') {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            return;
        }

        const cw = this.canvas.width;
        const ch = this.canvas.height;
        this.ctx.clearRect(0, 0, cw, ch);

        // Pitch
        this.ctx.fillStyle = '#1e5d22';
        this.ctx.fillRect(0, ch * 0.45, cw, ch * 0.55);
        this.ctx.fillStyle = '#2e7d32';
        for (let i = 0; i < 10; i++) {
            if (i % 2 == 0) this.ctx.fillRect(0, ch * 0.45 + (i * ch * 0.06), cw, ch * 0.06);
        }

        // Goal Structure
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 10;
        this.ctx.lineJoin = 'round';
        const gw = cw * 0.45;
        const gl = (cw - gw) / 2;
        const gh = ch * 0.3;
        const gt = ch * 0.15;
        this.ctx.strokeRect(gl, gt, gw, gh);

        // Net (simplified)
        this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        this.ctx.lineWidth = 1;
        for (let x = gl; x < gl + gw; x += 20) {
            this.ctx.beginPath(); this.ctx.moveTo(x, gt); this.ctx.lineTo(x, gt + gh); this.ctx.stroke();
        }
        for (let y = gt; y < gt + gh; y += 20) {
            this.ctx.beginPath(); this.ctx.moveTo(gl, y); this.ctx.lineTo(gl + gw, y); this.ctx.stroke();
        }

        // Aim
        if (this.aim.active && this.role === 'kicker') {
            this.ctx.beginPath();
            this.ctx.arc(this.aim.x, this.aim.y, 25, 0, Math.PI * 2);
            this.ctx.strokeStyle = this.playerTeam.primary;
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([5, 5]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        // Goalkeeper
        this.ctx.fillStyle = this.role === 'kicker' ? this.cpuTeam.primary : this.playerTeam.primary;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
        this.ctx.fillRect(this.goalie.x - 50, this.goalie.y - 70, 100, 140);
        this.ctx.shadowBlur = 0;

        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 14px Outfit';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.role === 'kicker' ? "GOLEIRO CPU" : "VOCÊ", this.goalie.x, this.goalie.y - 85);

        // Ball & Shadow
        if (this.ball.z < 25) {
            this.ctx.beginPath();
            this.ctx.ellipse(this.ball.x, ch * 0.87, this.ball.r, this.ball.r * 0.3, 0, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
            this.ctx.fill();

            this.ctx.beginPath();
            this.ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
            this.ctx.fillStyle = 'white';
            this.ctx.fill();
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }
    }
}

window.onload = () => new Game();
