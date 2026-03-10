/**
 * BRASILEIRÃO PENALTY CUP 2026
 * PROTOCOLO FINAL: ALVO DIRETO E MÁQUINA DE ESTADOS BLINDADA
 */

const TEAMS = [
    { name: "Flamengo", color: "#ff0000" }, { name: "Palmeiras", color: "#006400" },
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

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();

        // Game State Variables
        this.gameState = 'MENU'; // MENU, TEAM_SELECT, DIFF_SELECT, INTRO, PLAYING, RESULT, CHAMPION
        this.subState = 'WAITING'; // WAITING, TURNO_JOGADOR, DELAY, TURNO_IA, CHECAGEM

        this.playerTeam = null;
        this.cpuTeam = null;
        this.difficulty = 'normal'; // normal, hard, super-hard
        this.currentStageIdx = 0;

        this.score = { p: 0, c: 0 };

        // Protocol Objects
        this.aim = { x: 0, y: 0, t: 0 };
        this.ball = { x: 0, y: 0, z: 0, targetX: 0, targetY: 0, progress: 0, moving: false };
        this.goalie = { x: 0, y: 0, targetX: 0, targetY: 0, handsX: 0, handsY: 0 };

        this.init();
    }

    resize() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    init() {
        const grid = document.getElementById('team-grid');
        TEAMS.forEach(team => {
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
        document.getElementById('next-btn').onclick = () => this.resetForNextPhase();
        document.getElementById('restart-btn').onclick = () => location.reload();
        document.getElementById('home-btn').onclick = () => location.reload();

        window.addEventListener('keydown', (e) => this.handleInput(e));
        this.canvas.onclick = () => this.handlePlayerKick();

        this.loop();
    }

    switchScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    }

    selectTeam(team) {
        this.playerTeam = team;
        document.documentElement.style.setProperty('--team-primary', team.color);
        this.switchScreen('difficulty-screen');
    }

    selectDifficulty(diff) {
        this.difficulty = diff;
        document.getElementById('diff-indicator').innerText = diff.toUpperCase();
        this.prepareIntro();
    }

    prepareIntro() {
        this.cpuTeam = TEAMS[Math.floor(Math.random() * TEAMS.length)];
        while (this.cpuTeam.name === this.playerTeam.name) {
            this.cpuTeam = TEAMS[Math.floor(Math.random() * TEAMS.length)];
        }

        document.getElementById('stage-title').innerText = STAGES[this.currentStageIdx].toUpperCase();
        document.getElementById('player-team-display').innerText = this.playerTeam.name.toUpperCase();
        document.getElementById('cpu-team-display').innerText = this.cpuTeam.name.toUpperCase();
        document.getElementById('p-team-name').innerText = this.playerTeam.name.substring(0, 3).toUpperCase();
        document.getElementById('c-team-name').innerText = this.cpuTeam.name.substring(0, 3).toUpperCase();

        this.switchScreen('intro-screen');
    }

    startMatch() {
        this.gameState = 'PLAYING';
        this.subState = 'TURNO_JOGADOR';
        this.switchScreen('gameplay-placeholder'); // hide all
        document.getElementById('hud').style.display = 'flex';
        this.resetTurn();
    }

    resetTurn() {
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        this.ball = { x: cw / 2, y: ch * 0.85, z: 0, targetX: 0, targetY: 0, progress: 0, moving: false };
        this.goalie = { x: cw / 2, y: ch * 0.35, targetX: cw / 2, targetY: ch * 0.35, handsX: cw / 2, handsY: ch * 0.35 };
        this.aim.t = Math.random() * 100;

        if (this.subState === 'TURNO_JOGADOR') {
            document.getElementById('instruction-text').innerText = "SUA VEZ DE BATER!";
        } else {
            document.getElementById('instruction-text').innerText = "DEFENDA! (SETAS)";
            this.initIAKick();
        }
    }

    handlePlayerKick() {
        if (this.subState !== 'TURNO_JOGADOR' || this.ball.moving) return;

        this.ball.moving = true;
        this.ball.targetX = this.aim.x;
        this.ball.targetY = this.aim.y;

        // IA Reaction Logic (Protocolo item 4)
        const delays = { 'normal': 1000, 'hard': 300, 'super-hard': 0 };
        setTimeout(() => {
            if (this.ball.moving) {
                this.goalie.targetX = this.ball.targetX;
                this.goalie.targetY = this.ball.targetY;
            }
        }, delays[this.difficulty]);
    }

    initIAKick() {
        // IA choosing a spot
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        const targetX = cw * 0.35 + Math.random() * (cw * 0.3);
        const targetY = ch * 0.2 + Math.random() * (ch * 0.25);

        setTimeout(() => {
            this.ball.moving = true;
            this.ball.targetX = targetX;
            this.ball.targetY = targetY;
        }, 1000);
    }

    handleInput(e) {
        if (this.subState !== 'TURNO_IA' || this.ball.moving) return;

        const cw = this.canvas.width;
        const ch = this.canvas.height;

        if (e.code === 'ArrowLeft') this.goalie.targetX = cw * 0.35;
        if (e.code === 'ArrowRight') this.goalie.targetX = cw * 0.65;
        if (e.code === 'ArrowUp') this.goalie.targetY = ch * 0.25;
        if (e.code === 'ArrowDown') this.goalie.targetY = ch * 0.4;
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }

    update() {
        if (this.gameState !== 'PLAYING') return;

        // Aim Oscillation (Protocolo item 1)
        if (!this.ball.moving && this.subState === 'TURNO_JOGADOR') {
            this.aim.t += 0.05 * (this.difficulty === 'normal' ? 1 : 2.5);
            const cw = this.canvas.width;
            const ch = this.canvas.height;
            this.aim.x = cw / 2 + Math.sin(this.aim.t) * (cw * 0.2);
            this.aim.y = ch * 0.3 + Math.cos(this.aim.t * 0.7) * (ch * 0.1);
        }

        // Ball Interpolation (Protocolo item 1 - Alvo Direto)
        if (this.ball.moving) {
            this.ball.progress += 0.035; // Const delay ~0.4s
            if (this.ball.progress >= 1) {
                this.ball.progress = 1;
                this.finishKick();
            }
            const cw = this.canvas.width;
            const ch = this.canvas.height;
            const startX = cw / 2, startY = ch * 0.85;
            this.ball.x = startX + (this.ball.targetX - startX) * this.ball.progress;
            this.ball.y = startY + (this.ball.targetY - startY) * this.ball.progress;
            this.ball.z = this.ball.progress * 40;
        }

        // Goalie Movement
        this.goalie.x += (this.goalie.targetX - this.goalie.x) * 0.15;
        this.goalie.y += (this.goalie.targetY - this.goalie.y) * 0.15;
    }

    finishKick() {
        this.ball.moving = false;

        // Protocol Collision Check
        const dist = Math.hypot(this.ball.x - this.goalie.x, this.ball.y - this.goalie.y);
        const saved = dist < 70;

        if (!saved) {
            if (this.subState === 'TURNO_JOGADOR') this.score.p++;
            else this.score.c++;
            document.getElementById('instruction-text').innerText = "GOL!!!";
        } else {
            document.getElementById('instruction-text').innerText = "DEFENDEU!";
        }

        this.updateScoreboard();

        // Protocol Step 2: DELAY 1.5s
        setTimeout(() => {
            this.checkWinner();
        }, 1500);
    }

    updateScoreboard() {
        document.getElementById('p-score').innerText = this.score.p;
        document.getElementById('c-score').innerText = this.score.c;
    }

    checkWinner() {
        if (this.score.p >= 3 || this.score.c >= 3) {
            this.endMatch();
        } else {
            // Protocol Step 2: Alternância de Turnos
            this.subState = this.subState === 'TURNO_JOGADOR' ? 'TURNO_IA' : 'TURNO_JOGADOR';
            this.resetTurn();
        }
    }

    endMatch() {
        this.gameState = 'RESULT';
        document.getElementById('hud').style.display = 'none';

        if (this.score.p >= 3) {
            this.switchScreen('result-screen');
            document.getElementById('result-text').innerText = "VITÓRIA!";
            document.getElementById('next-btn').classList.remove('hidden');
            document.getElementById('restart-btn').classList.add('hidden');
        } else {
            this.switchScreen('result-screen');
            document.getElementById('result-text').innerText = "FIM DE JOGO";
            document.getElementById('next-btn').classList.add('hidden');
            document.getElementById('restart-btn').classList.remove('hidden');
        }
    }

    resetForNextPhase() {
        this.currentStageIdx++;
        if (this.currentStageIdx >= STAGES.length) {
            this.switchScreen('champion-screen');
            document.getElementById('champion-team-name').innerText = this.playerTeam.name.toUpperCase();
        } else {
            // Protocol Step 3: RESET PLACAR (Obrigatório 0-0)
            this.score = { p: 0, c: 0 };
            this.updateScoreboard();
            this.prepareIntro();
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.gameState !== 'PLAYING') return;

        const cw = this.canvas.width, ch = this.canvas.height;

        // Pit (simplified Protocol items 5)
        this.ctx.fillStyle = '#1e5d22';
        this.ctx.fillRect(0, ch * 0.4, cw, ch * 0.6);

        // Goal Area
        this.ctx.strokeStyle = '#fff'; this.ctx.lineWidth = 10;
        const gw = cw * 0.5, gh = ch * 0.35, gl = (cw - gw) / 2, gt = ch * 0.1;
        this.ctx.strokeRect(gl, gt, gw, gh);

        // Aim
        if (this.subState === 'TURNO_JOGADOR' && !this.ball.moving) {
            this.ctx.beginPath(); this.ctx.arc(this.aim.x, this.aim.y, 20, 0, Math.PI * 2);
            this.ctx.strokeStyle = this.playerTeam.color; this.ctx.lineWidth = 3; this.ctx.stroke();
        }

        // Goalie
        this.ctx.fillStyle = this.subState === 'TURNO_JOGADOR' ? this.cpuTeam.color : this.playerTeam.color;
        this.ctx.fillRect(this.goalie.x - 40, this.goalie.y - 60, 80, 120);
        this.ctx.fillStyle = '#fff'; this.ctx.font = '700 14px Outfit'; this.ctx.textAlign = 'center';
        this.ctx.fillText(this.subState === 'TURNO_JOGADOR' ? "GOLEIRO CPU" : "VOCÊ", this.goalie.x, this.goalie.y - 70);

        // Ball
        let ballR = 20 - (this.ball.z * 0.2);
        this.ctx.beginPath(); this.ctx.arc(this.ball.x, this.ball.y, ballR, 0, Math.PI * 2);
        this.ctx.fillStyle = '#fff'; this.ctx.fill(); this.ctx.strokeStyle = '#000'; this.ctx.lineWidth = 1; this.ctx.stroke();
    }
}

window.onload = () => new Game();
