(() => {
    const DICE_TYPES = ["d4", "d6", "d8", "d10", "d12", "d20", "d100"];

    const isTelegramWebApp = Boolean(window.Telegram && window.Telegram.WebApp);
    if (isTelegramWebApp) {
        document.body.classList.add("tg-webapp");
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
    }

    class DiceApp {
        constructor() {
            this.counts = Object.fromEntries(DICE_TYPES.map((type) => [type, 0]));
            this.isRolling = false;
            this.rollTicker = null;

            this.cacheDom();
            this.renderDiceGrid();
            this.bindEvents();
            this.spawnSparks(30);
            this.render();
        }

        cacheDom() {
            this.grid = document.getElementById("dice-grid");
            this.resultCore = document.querySelector(".result-core");
            this.total = document.getElementById("total");
            this.status = document.getElementById("status");
            this.summary = document.getElementById("summary");
            this.log = document.getElementById("log");
            this.rollBtn = document.getElementById("roll-btn");
            this.resetBtn = document.getElementById("reset-btn");
            this.sparkField = document.getElementById("spark-field");
        }

        renderDiceGrid() {
            this.grid.innerHTML = DICE_TYPES.map((type) => `
                <article class="die-card" data-type="${type}">
                    <div class="die-type">${type.toUpperCase()}</div>
                    <div class="die-controls">
                        <button class="circle-btn dec" type="button" data-action="dec" data-type="${type}" aria-label="Убрать ${type}">-</button>
                        <output class="die-count" data-count="${type}">0</output>
                        <button class="circle-btn inc" type="button" data-action="inc" data-type="${type}" aria-label="Добавить ${type}">+</button>
                    </div>
                </article>
            `).join("");
        }

        bindEvents() {
            this.grid.addEventListener("click", (event) => {
                const button = event.target.closest("button[data-action]");
                if (!button || this.isRolling) {
                    return;
                }

                const type = button.dataset.type;
                if (button.dataset.action === "inc") {
                    this.incrementDie(type);
                } else {
                    this.decrementDie(type);
                }
                this.render();
            });

            this.rollBtn.addEventListener("click", () => this.roll());
            this.resetBtn.addEventListener("click", () => this.reset());

            document.addEventListener("keydown", (event) => {
                if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
                    return;
                }
                if (event.code === "Space") {
                    event.preventDefault();
                    this.roll();
                }
                if (event.key.toLowerCase() === "r") {
                    this.reset();
                }
            });
        }

        incrementDie(type) {
            this.counts[type] = Math.min(30, this.counts[type] + 1);
        }

        decrementDie(type) {
            this.counts[type] = Math.max(0, this.counts[type] - 1);
        }

        getPool() {
            const pool = [];
            DICE_TYPES.forEach((type) => {
                const count = this.counts[type];
                const sides = Number.parseInt(type.slice(1), 10);
                for (let i = 0; i < count; i += 1) {
                    pool.push({ type, sides });
                }
            });
            return pool;
        }

        render() {
            DICE_TYPES.forEach((type) => {
                const countEl = this.grid.querySelector(`[data-count="${type}"]`);
                const card = this.grid.querySelector(`.die-card[data-type="${type}"]`);
                countEl.textContent = this.counts[type];
                card.classList.toggle("active", this.counts[type] > 0);
            });

            const totalDice = this.getPool().length;
            this.summary.textContent = `Кубиков выбрано: ${totalDice}`;
            this.rollBtn.disabled = totalDice === 0 || this.isRolling;
            this.resetBtn.disabled = this.isRolling;
        }

        roll() {
            const pool = this.getPool();
            if (pool.length === 0 || this.isRolling) {
                return;
            }

            this.isRolling = true;
            this.render();
            this.status.textContent = "Кубики катятся по столу...";
            this.status.className = "status";
            this.total.classList.add("rolling");
            this.log.innerHTML = "";

            const maxPossible = pool.reduce((sum, die) => sum + die.sides, 0);
            this.startTicker(Math.max(8, maxPossible));

            window.setTimeout(() => {
                const result = window.DiceEngine.rollPool(pool);
                this.finishRoll(result);
            }, 860);
        }

        startTicker(maxValue) {
            this.stopTicker();
            this.rollTicker = window.setInterval(() => {
                this.total.textContent = String(Math.floor(Math.random() * maxValue) + 1);
            }, 40);
        }

        stopTicker() {
            if (this.rollTicker) {
                window.clearInterval(this.rollTicker);
                this.rollTicker = null;
            }
        }

        finishRoll(result) {
            this.stopTicker();
            this.resultCore.classList.remove("state-ok", "state-fail", "state-mix");
            this.total.classList.remove("hit");
            void this.total.offsetWidth;
            this.total.classList.add("hit");
            this.total.textContent = String(result.total);
            this.total.classList.remove("rolling");

            this.log.innerHTML = result.results.map((entry) => `<span class="tag">${entry.type}:${entry.value}</span>`).join("");

            if (result.crit.message) {
                this.status.textContent = result.crit.message;
                this.status.className = `status ${result.crit.className}`;
                this.resultCore.classList.add(`state-${result.crit.className}`);
            } else {
                this.status.textContent = `Сумма броска: ${result.total}`;
                this.status.className = "status";
            }

            this.isRolling = false;
            this.render();
        }

        reset() {
            if (this.isRolling) {
                return;
            }

            this.counts = Object.fromEntries(DICE_TYPES.map((type) => [type, 0]));
            this.stopTicker();
            this.resultCore.classList.remove("state-ok", "state-fail", "state-mix");
            this.total.classList.remove("rolling");
            this.total.textContent = "0";
            this.log.innerHTML = "";
            this.status.textContent = "Выбери кубики и бросай.";
            this.status.className = "status";
            this.render();
        }

        spawnSparks(count) {
            this.sparkField.innerHTML = "";
            for (let i = 0; i < count; i += 1) {
                const spark = document.createElement("i");
                spark.className = "spark";
                spark.style.left = `${Math.random() * 100}%`;
                spark.style.top = `${55 + Math.random() * 45}%`;
                spark.style.setProperty("--dur", `${7 + Math.random() * 8}s`);
                spark.style.setProperty("--delay", `${Math.random() * 5}s`);
                this.sparkField.appendChild(spark);
            }
        }
    }

    window.addEventListener("DOMContentLoaded", () => {
        window.app = new DiceApp();
    });
})();

