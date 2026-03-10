/**
 * BRASILEIRÃO PENALTY CUP 2026 - PROTOCOLO DEFINITIVO
 * ALGORITMO DE FERRO - RECONSTRUÇÃO TOTAL
 */

const TEAMS = [
    { name: "Palmeiras", color: "#006400" }, { name: "Flamengo", color: "#ff0000" },
    { name: "Botafogo", color: "#000000" }, { name: "Fortaleza", color: "#001e9c" },
    { name: "São Paulo", color: "#ff0000" }, { name: "Internacional", color: "#e30613" },
    { name: "Cruzeiro", color: "#003399" }, { name: "Bahia", color: "#005baa" },
    { name: "Corinthians", color: "#ffffff" }, { name: "Vasco", color: "#000000" },
    { name: "Grêmio", color: "#00aae4" }, { name: "Atlético-MG", color: "#000000" },
    { name: "Fluminense", color: "#800020" }, { name: "Athletico-PR", color: "#cc0000" },
    { name: "Vitória", color: "#ff0000" }, { name: "Bragantino", color: "#ffffff" },
    { name: "Santos", color: "#ffffff" }, { name: "Coritiba", color: "#006400" },
    { name: "Mirassol", color: "#ffff00" }, { name: "Remo", color: "#000080" }
];

const STAGES = ["Oitavas de Final", "Quartas de Final", "Semifinal", "Grande Final"];

class GameCore {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();

        // Tópico 4: Máquina de Estados
        this.state = 'MENU'; // MENU, INTRO, PLAYING, RESULT, FINALE
        this.subState = 'ATTACK'; // ATTACK (Player), DEFENSE (IA)

        this.playerBox = null;
        this.cpuBox = null;
        this.diff = 'normal';
        this.stageIdx = 0;
        this.score = { p: 0, c: 0 };

        // Tópico 3: Alvo-Coordenado e Lerp
        this.ball = { x: 0, y: 0, z: 0, start: { x: 0, y: 0 }, target: { x: 0, y: 0 }, progress: 0, moving: false };
        this.goalie = { x: 0, y: 0, targetX: 0, targetY: 0 };
        this.aim = { x: 0, y: 0, t: 0 };

        this.init();
    }

    resize() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    init() {
        window.addEventListener('resize', () => this.resize());

        // Buttons
        document.querySelectorAll('.diff-btn').forEach(b => {
            b.onclick = () => {
                document.querySelectorAll('.diff-btn').forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                this.diff = b.dataset.diff;
            };
        });

        const grid = document.getElementById('team-grid');
        TEAMS.forEach(t => {
            const item = document.createElement('div');
            item.className = 'team-item';
            item.innerText = t.name.toUpperCase();
            item.style.borderLeftColor = t.color;
            item.onclick = () => this.selectTeam(t);
            grid.appendChild(item);
        });

        document.getElementById('start-match-btn').onclick = () => this.startMatch();
        document.getElementById('next-action-btn').onclick = () => this.swapTurns();

        this.canvas.onclick = (e) => this.handleAction(e);
        window.onkeydown = (e) => this.handleKeys(e);

        this.loop();
    }

    selectTeam(team) {
        this.playerBox = team;
        document.documentElement.style.setProperty('--team-color', team.color);
        this.prepareIntro();
    }

    prepareIntro() {
        this.cpuBox = TEAMS[Math.floor(Math.random() * TEAMS.length)];
        while (this.cpuBox.name === this.playerBox.name) this.cpuBox = TEAMS[Math.floor(Math.random() * TEAMS.length)];

        document.getElementById('phase-title').innerText = STAGES[this.stageIdx].toUpperCase();
        document.getElementById('p-card').innerText = this.playerBox.name.toUpperCase();
        document.getElementById('c-card').innerText = this.cpuBox.name.toUpperCase();

        document.getElementById('p-tag').innerText = this.playerBox.name.substring(0, 3).toUpperCase();
        document.getElementById('c-tag').innerText = this.cpuBox.name.substring(0, 3).toUpperCase();
        document.getElementById('p-dot').style.background = this.playerBox.color;
        document.getElementById('c-dot').style.background = this.cpuBox.color;

        this.switchScreen('intro-screen');
    }

    switchScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(id);
        if (target) target.classList.add('active');
        this.state = id.split('-')[0].toUpperCase();
    }

    startMatch() {
        this.switchScreen('gameplay-placeholder');
        document.getElementById('hud').classList.remove('hidden');
        this.subState = 'ATTACK';
        this.score = { p: 0, c: 0 }; // Tópico 6: Reset match data
        this.updateHUD();
        this.resetTurn();
    }

    resetTurn() {
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        this.ball = {
            x: cw / 2, y: ch * 0.85, z: 0,
            start: { x: cw / 2, y: ch * 0.85 },
            target: { x: 0, y: 0 },
            progress: 0, moving: false
        };

        this.goalie = { x: cw / 2, y: ch * 0.35, targetX: cw / 2, targetY: ch * 0.35 };
        this.aim.t = Math.random() * 10;

        const label = this.subState === 'ATTACK' ? "SUA VEZ DE BATER!" : "DEFENDA! (USE SETAS)";
        document.getElementById('instruction-msg').innerText = label;

        if (this.subState === 'DEFENSE') {
            this.prepareIAKick();
        }
    }

    // Tópico 4: Transição / Turnos
    swapTurns() {
        this.switchScreen('gameplay-placeholder');
        document.getElementById('hud').classList.remove('hidden');

        // Tópico 5: Vitória Rápida (3 Gols)
        if (this.score.p >= 3 || this.score.c >= 3) {
            this.finalizeMatch();
        } else {
            this.subState = this.subState === 'ATTACK' ? 'DEFENSE' : 'ATTACK';
            this.resetTurn();
        }
    }

    handleAction(e) {
        // Tópico 9: Input Lock
        if (this.state !== 'PLAYING' || this.subState !== 'ATTACK' || this.ball.moving) return;

        const rect = this.canvas.getBoundingClientRect();
        this.ball.target.x = e.clientX - rect.left;
        this.ball.target.y = e.clientY - rect.top;
        this.ball.moving = true;

        // Tópico 7: IA Goleiro Probabilidade
        const chance = { 'normal': 0.25, 'hard': 0.50, 'super-hard': 0.85 }[this.diff];
        if (Math.random() < chance) {
            const delay = this.diff === 'normal' ? 400 : 0;
            setTimeout(() => {
                this.goalie.targetX = this.ball.target.x;
                this.goalie.targetY = this.ball.target.y;
            }, delay);
        }
    }

    handleKeys(e) {
        if (this.state !== 'PLAYING' || this.subState !== 'DEFENSE' || this.ball.moving) return;

        const cw = this.canvas.width;
        if (e.code === 'ArrowLeft') this.goalie.targetX = cw * 0.35;
        if (e.code === 'ArrowRight') this.goalie.targetX = cw * 0.65;
        if (e.code === 'ArrowUp') this.goalie.targetY = this.canvas.height * 0.2;
    }

    prepareIAKick() {
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        const tx = cw * 0.35 + Math.random() * (cw * 0.3);
        const ty = ch * 0.15 + Math.random() * (ch * 0.25);

        setTimeout(() => {
            if (this.subState === 'DEFENSE') {
                this.ball.target = { x: tx, y: ty };
                this.ball.moving = true;
            }
        }, 1200);
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }

    update() {
        if (this.state !== 'PLAYING') return;

        // Aim Animation
        if (!this.ball.moving && this.subState === 'ATTACK') {
            const speed = { 'normal': 0.05, 'hard': 0.09, 'super-hard': 0.14 }[this.diff];
            this.aim.t += speed;
            const cw = this.canvas.width, ch = this.canvas.height;
            this.aim.x = cw / 2 + Math.sin(this.aim.t) * (cw * 0.25);
            this.aim.y = ch * 0.3 + Math.cos(this.aim.t * 0.8) * (ch * 0.12);
        }

        // Tópico 3: Chute Interpolação (Lerp)
        if (this.ball.moving) {
            this.ball.progress += 0.05; // ~0.33s travel time
            if (this.ball.progress >= 1) {
                this.ball.progress = 1;
                this.processResult();
            }
            // Lerp
            this.ball.x = this.ball.start.x + (this.ball.target.x - this.ball.start.x) * this.ball.progress;
            this.ball.y = this.ball.start.y + (this.ball.target.y - this.ball.start.y) * this.ball.progress;
            this.ball.z = this.ball.progress * 40;
        }

        // Goalie Movements
        this.goalie.x += (this.goalie.targetX - this.goalie.x) * 0.18;
        this.goalie.y += (this.goalie.targetY - this.goalie.y) * 0.18;
    }

    processResult() {
        this.ball.moving = false;

        // Tópico 8: Feedback Mensagens
        const dist = Math.hypot(this.ball.x - this.goalie.x, this.ball.y - this.goalie.y);
        const saved = dist < 70;

        const cw = this.canvas.width, ch = this.canvas.height;
        const inGoal = this.ball.x > cw * 0.25 && this.ball.x < cw * 0.75 && this.ball.y > ch * 0.12 && this.ball.y < ch * 0.48;

        this.switchScreen('result-screen');
        document.getElementById('hud').classList.remove('hidden');

        if (saved) {
            document.getElementById('result-msg').innerText = "DEFENDEU!";
        } else if (inGoal) {
            document.getElementById('result-msg').innerText = "GOOOOOL!";
            if (this.subState === 'ATTACK') this.score.p++; else this.score.c++;
        } else {
            document.getElementById('result-msg').innerText = "PARA FORA!";
        }

        this.updateHUD();
    }

    updateHUD() {
        document.getElementById('p-score').innerText = this.score.p;
        document.getElementById('c-score').innerText = this.score.c;
    }

    finalizeMatch() {
        if (this.score.p >= 3) {
            document.getElementById('result-msg').innerText = "VOCÊ VENCEU A RODADA!";
            document.getElementById('next-action-btn').classList.add('hidden');
            document.getElementById('final-advance-btn').classList.remove('hidden');
            document.getElementById('final-advance-btn').onclick = () => this.advanceStage();
        } else {
            document.getElementById('result-msg').innerText = "FIM DE JOGO!";
            document.getElementById('next-action-btn').classList.add('hidden');
            document.getElementById('restart-btn').classList.remove('hidden');
        }
    }

    advanceStage() {
        this.stageIdx++;
        if (this.stageIdx >= STAGES.length) {
            this.switchScreen('champion-screen');
            document.getElementById('winner-team').innerText = this.playerBox.name.toUpperCase();
        } else {
            // Tópico 6: ResetMatchData() zerando placar
            this.score = { p: 0, c: 0 };
            this.prepareIntro();
        }
    }

    draw() {
        const cw = this.canvas.width, ch = this.canvas.height;
        this.ctx.clearRect(0, 0, cw, ch);

        if (this.state === 'MENU' || this.state === 'INTRO') return;

        // Tópico 1: Renderização Campo e Gol
        this.ctx.strokeStyle = '#fff'; this.ctx.lineWidth = 10;
        const gw = cw * 0.5, gh = ch * 0.36, gl = (cw - gw) / 2, gt = ch * 0.12;
        this.ctx.strokeRect(gl, gt, gw, gh);

        // Net lines
        this.ctx.strokeStyle = 'rgba(255,255,255,0.1)'; this.ctx.lineWidth = 1;
        for (let j = gl; j <= gl + gw; j += 15) { this.ctx.beginPath(); this.ctx.moveTo(j, gt); this.ctx.lineTo(j, gt + gh); this.ctx.stroke(); }

        // Goalie
        const gColor = this.subState === 'ATTACK' ? this.cpuBox.color : this.playerBox.color;
        this.ctx.fillStyle = gColor;
        this.ctx.fillRect(this.goalie.x - 45, this.goalie.y - 70, 90, 140);
        this.ctx.fillStyle = '#fff'; this.ctx.font = '900 14px Outfit'; this.ctx.textAlign = 'center';
        this.ctx.fillText(this.subState === 'ATTACK' ? "IA" : "VOCÊ", this.goalie.x, this.goalie.y - 80);

        // Aim (Tópico 3)
        if (this.subState === 'ATTACK' && !this.ball.moving) {
            this.ctx.beginPath(); this.ctx.arc(this.aim.x, this.aim.y, 20, 0, Math.PI * 2);
            this.ctx.strokeStyle = this.playerBox.color; this.ctx.lineWidth = 3; this.ctx.stroke();
        }

        // Ball (Persistence)
        const size = 22 - (this.ball.progress * 6);
        this.ctx.beginPath(); this.ctx.arc(this.ball.x, this.ball.y, size, 0, Math.PI * 2);
        this.ctx.fillStyle = '#fff'; this.ctx.fill(); this.ctx.strokeStyle = '#000'; this.ctx.lineWidth = 1; this.ctx.stroke();
    }
}

window.onload = () => new GameCore();
