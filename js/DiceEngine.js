(() => {
    class DiceEngine {
        static randomInt(max) {
            return Math.floor(Math.random() * max) + 1;
        }

        static rollPool(pool) {
            const results = [];
            let subtotal = 0;

            pool.forEach((entry) => {
                const value = DiceEngine.randomInt(entry.sides);
                subtotal += value;
                results.push({ type: entry.type, sides: entry.sides, value });
            });

            const total = subtotal;
            const d20Results = results.filter((r) => r.type === "d20").map((r) => r.value);
            const crit = DiceEngine.getCritState(d20Results);

            return { results, total, crit };
        }

        static getCritState(d20Results) {
            if (d20Results.length === 0) {
                return { message: "", className: "" };
            }

            const hasNat20 = d20Results.includes(20);
            const hasNat1 = d20Results.includes(1);

            if (hasNat20 && hasNat1) {
                return { message: "Идеальный хаос: и 20, и 1!", className: "mix" };
            }

            if (hasNat20) {
                return { message: "Критический успех!", className: "ok" };
            }

            if (hasNat1) {
                return { message: "Критический провал!", className: "fail" };
            }

            return { message: "", className: "" };
        }
    }

    window.DiceEngine = DiceEngine;
})();
