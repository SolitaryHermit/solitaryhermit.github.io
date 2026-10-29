/**
 * js/monomial-reducer.js
 * Interactive Minimal Generator Reducer using Dickson's Lemma / Monomial Divisibility
 */
(function () {
    function initReducer() {
        const input = document.getElementById("reducer-input");
        const runBtn = document.getElementById("run-reducer-btn");
        const stepBtn = document.getElementById("step-reducer-btn");
        const resetBtn = document.getElementById("reset-reducer-btn");
        const badgesContainer = document.getElementById("ming-display");
        const logContainer = document.getElementById("reducer-log");

        if (!input || !runBtn || !badgesContainer || !logContainer) return;

        let originalTerms = [];
        let activeTerms = [];
        let eliminations = []; // { target: str, eliminatedBy: str }
        let currentStepIdx = 0;

        // Parse variable exponents, e.g. "x^2*y^3*z" -> { raw: "...", exp: { x: 2, y: 3, z: 1 } }
        function parseMonomial(str) {
            const clean = str.trim().toLowerCase().replace(/\s+/g, "");
            const exp = {};

            // Match segments like x^2, x_1^3, y, z^10
            const regex = /([a-z](?:_\d+)?)(?:\^(\d+))?/g;
            let match;
            let foundAny = false;

            while ((match = regex.exec(clean)) !== null) {
                foundAny = true;
                const varName = match[1];
                const power = match[2] ? parseInt(match[2], 10) : 1;
                exp[varName] = (exp[varName] || 0) + power;
            }

            return foundAny ? { raw: clean, exp } : null;
        }

        // Returns true if m1 divides m2: exp(m1) <= exp(m2) componentwise
        function divides(m1, m2) {
            const allVars = new Set([...Object.keys(m1.exp), ...Object.keys(m2.exp)]);
            for (const v of allVars) {
                const e1 = m1.exp[v] || 0;
                const e2 = m2.exp[v] || 0;
                if (e1 > e2) return false;
            }
            return true;
        }

        function resetState() {
            const rawTokens = input.value.split(",").map(s => s.trim()).filter(Boolean);
            const parsed = [];
            const seen = new Set();

            rawTokens.forEach(tok => {
                const p = parseMonomial(tok);
                if (p && !seen.has(p.raw)) {
                    seen.add(p.raw);
                    parsed.push(p);
                }
            });

            originalTerms = parsed;
            activeTerms = [...parsed];
            eliminations = [];
            currentStepIdx = 0;

            render();
            logContainer.innerHTML = `<li style="color: var(--muted-color);">Parsed ${originalTerms.length} unique monomial generators. Click "Step-by-Step" or "Compute MinG(I)".</li>`;
        }

        function render() {
            badgesContainer.innerHTML = "";
            originalTerms.forEach(term => {
                const badge = document.createElement("span");
                badge.className = "gen-badge";
                badge.textContent = term.raw;

                const isElim = eliminations.some(e => e.target === term.raw);
                if (isElim) {
                    badge.classList.add("eliminated");
                }
                badgesContainer.appendChild(badge);
            });
        }

        function step() {
            if (currentStepIdx >= originalTerms.length) {
                const logItem = document.createElement("li");
                logItem.className = "keep-log";
                logItem.textContent = `Reduction complete: MinG(I) = { ${activeTerms.map(t => t.raw).join(", ")} }`;
                logContainer.appendChild(logItem);
                logContainer.scrollTop = logContainer.scrollHeight;
                return;
            }

            const candidate = originalTerms[currentStepIdx];
            currentStepIdx++;

            // If already eliminated by a prior generator, continue
            if (eliminations.some(e => e.target === candidate.raw)) {
                step();
                return;
            }

            // Check if any other existing generator strictly divides candidate
            const strictlyDivides = activeTerms.find(other => 
                other.raw !== candidate.raw && divides(other, candidate)
            );

            if (strictlyDivides) {
                eliminations.push({ target: candidate.raw, eliminatedBy: strictlyDivides.raw });
                activeTerms = activeTerms.filter(t => t.raw !== candidate.raw);

                const logItem = document.createElement("li");
                logItem.className = "elim-log";
                logItem.textContent = `Eliminated ${candidate.raw} (divisible by ${strictlyDivides.raw})`;
                logContainer.appendChild(logItem);
            } else {
                const logItem = document.createElement("li");
                logItem.className = "keep-log";
                logItem.textContent = `Retained ${candidate.raw} (minimal so far)`;
                logContainer.appendChild(logItem);
            }

            render();
            logContainer.scrollTop = logContainer.scrollHeight;
        }

        function runAll() {
            resetState();
            logContainer.innerHTML = "";
            while (currentStepIdx < originalTerms.length) {
                step();
            }
        }

        runBtn.addEventListener("click", runAll);
        stepBtn.addEventListener("click", step);
        resetBtn.addEventListener("click", resetState);
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") runAll();
        });

        // Initialize on load
        resetState();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initReducer);
    } else {
        initReducer();
    }
})();