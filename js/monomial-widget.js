/**
 * js/monomial-widget.js
 * Interactive 2D Exponent Lattice & Newton Polyhedron for Monomial Ideals
 */
(function () {
    function initLatticeWidget() {
        const canvas = document.getElementById("lattice-canvas");
        const input = document.getElementById("gen-input");
        const updateBtn = document.getElementById("render-btn");
        const closureCheck = document.getElementById("show-closure");

        if (!canvas || !input || !updateBtn) return;
        const ctx = canvas.getContext("2d");

        // Handle Retina / HiDPI crispness
        const dpr = window.devicePixelRatio || 1;
        const logicalWidth = 460;
        const logicalHeight = 460;
        canvas.width = logicalWidth * dpr;
        canvas.height = logicalHeight * dpr;
        canvas.style.width = `${logicalWidth}px`;
        canvas.style.height = `${logicalHeight}px`;
        ctx.scale(dpr, dpr);

        const GRID_MAX = 9; // Grid runs 0 to 9
        const PADDING_LEFT = 45;
        const PADDING_BOTTOM = 40;
        const PADDING_TOP = 25;
        const PADDING_RIGHT = 25;

        const PLOT_W = logicalWidth - PADDING_LEFT - PADDING_RIGHT;
        const PLOT_H = logicalHeight - PADDING_TOP - PADDING_BOTTOM;
        const STEP_X = PLOT_W / GRID_MAX;
        const STEP_Y = PLOT_H / GRID_MAX;

        function toCoord(a, b) {
            return {
                x: PADDING_LEFT + a * STEP_X,
                y: logicalHeight - PADDING_BOTTOM - b * STEP_Y
            };
        }

        function parseInput(raw) {
            const terms = raw.split(",").map(s => s.trim().toLowerCase());
            const gens = [];

            terms.forEach(t => {
                if (!t) return;
                let a = 0;
                let b = 0;

                if (t.includes("x")) {
                    const m = t.match(/x(\^(\d+))?/);
                    a = (m && m[2]) ? parseInt(m[2], 10) : 1;
                }
                if (t.includes("y")) {
                    const m = t.match(/y(\^(\d+))?/);
                    b = (m && m[2]) ? parseInt(m[2], 10) : 1;
                }

                if (a > 0 || b > 0) {
                    gens.push({ a, b });
                }
            });
            return gens;
        }

        function getMinGens(gens) {
            const unique = [];
            gens.forEach(g => {
                if (!unique.some(u => u.a === g.a && u.b === g.b)) {
                    unique.push(g);
                }
            });

            return unique.filter((g1, i) => {
                return !unique.some((g2, j) => i !== j && g2.a <= g1.a && g2.b <= g1.b);
            }).sort((p1, p2) => p1.a - p2.a); // Sort ascending by degree in x
        }

        function draw() {
            ctx.clearRect(0, 0, logicalWidth, logicalHeight);

            const minGens = getMinGens(parseInput(input.value));
            const showClosure = closureCheck ? closureCheck.checked : false;

            // 1. Shading: Ideals & Closures (Drawn underneath grid)
            for (let a = 0; a <= GRID_MAX; a++) {
                for (let b = 0; b <= GRID_MAX; b++) {
                    const inIdeal = minGens.some(g => a >= g.a && b >= g.b);
                    const pt = toCoord(a, b);

                    if (inIdeal) {
                        ctx.fillStyle = "rgba(2, 132, 199, 0.18)";
                        ctx.fillRect(pt.x, pt.y - STEP_Y, STEP_X, STEP_Y);
                    } else if (showClosure && minGens.length > 1) {
                        // Check convex combination of consecutive boundary points
                        let inClosure = false;
                        for (let i = 0; i < minGens.length - 1; i++) {
                            const p1 = minGens[i];
                            const p2 = minGens[i + 1];
                            if (a >= p1.a && a <= p2.a) {
                                const t = (a - p1.a) / (p2.a - p1.a);
                                const segY = p1.b + t * (p2.b - p1.b);
                                if (b >= segY - 1e-6) {
                                    inClosure = true;
                                    break;
                                }
                            }
                        }
                        if (inClosure) {
                            ctx.fillStyle = "rgba(217, 119, 6, 0.22)";
                            ctx.fillRect(pt.x, pt.y - STEP_Y, STEP_X, STEP_Y);
                        }
                    }
                }
            }

            // 2. Draw Newton Polygon Lower Boundary
            if (showClosure && minGens.length > 1) {
                ctx.beginPath();
                ctx.strokeStyle = "#d97706";
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 3]);

                const start = toCoord(minGens[0].a, minGens[0].b);
                ctx.moveTo(start.x, start.y);

                for (let i = 1; i < minGens.length; i++) {
                    const pt = toCoord(minGens[i].a, minGens[i].b);
                    ctx.lineTo(pt.x, pt.y);
                }
                ctx.stroke();
                ctx.setLineDash([]); // Reset dash
            }

            // 3. Grid Lines & Coordinates
            ctx.strokeStyle = "#e2e8f0";
            ctx.lineWidth = 1;
            ctx.fillStyle = "#64748b";
            ctx.font = "11px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            for (let i = 0; i <= GRID_MAX; i++) {
                const ptX = toCoord(i, 0);
                const ptY = toCoord(0, i);

                // Vertical grid lines
                ctx.beginPath();
                ctx.moveTo(ptX.x, PADDING_TOP);
                ctx.lineTo(ptX.x, logicalHeight - PADDING_BOTTOM);
                ctx.stroke();
                ctx.fillText(i.toString(), ptX.x, logicalHeight - PADDING_BOTTOM + 14);

                // Horizontal grid lines
                ctx.beginPath();
                ctx.moveTo(PADDING_LEFT, ptY.y);
                ctx.lineTo(logicalWidth - PADDING_RIGHT, ptY.y);
                ctx.stroke();
                ctx.fillText(i.toString(), PADDING_LEFT - 14, ptY.y);
            }

            // 4. Main Axes
            ctx.strokeStyle = "#334155";
            ctx.lineWidth = 2;
            ctx.beginPath();
            const origin = toCoord(0, 0);
            ctx.moveTo(origin.x, origin.y);
            ctx.lineTo(logicalWidth - PADDING_RIGHT + 8, origin.y);
            ctx.moveTo(origin.x, origin.y);
            ctx.lineTo(origin.x, PADDING_TOP - 8);
            ctx.stroke();

            // Axis Title Badges
            ctx.fillStyle = "#1e293b";
            ctx.font = "bold 11px sans-serif";
            ctx.fillText("deg_x (a)", logicalWidth - PADDING_RIGHT - 10, origin.y + 24);
            ctx.fillText("deg_y (b)", origin.x, PADDING_TOP - 16);

            // 5. Plot Lattice Points
            for (let a = 0; a <= GRID_MAX; a++) {
                for (let b = 0; b <= GRID_MAX; b++) {
                    const pt = toCoord(a, b);
                    const isMinGen = minGens.some(g => g.a === a && g.b === b);
                    const inIdeal = minGens.some(g => a >= g.a && b >= g.b);

                    if (isMinGen) {
                        ctx.fillStyle = "#0284c7";
                        ctx.beginPath();
                        ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.strokeStyle = "#ffffff";
                        ctx.lineWidth = 2;
                        ctx.stroke();
                    } else if (inIdeal) {
                        ctx.fillStyle = "#0284c7";
                        ctx.beginPath();
                        ctx.arc(pt.x, pt.y, 3.5, 0, 2 * Math.PI);
                        ctx.fill();
                    } else if (showClosure && minGens.length > 1) {
                        let inClosure = false;
                        for (let i = 0; i < minGens.length - 1; i++) {
                            const p1 = minGens[i];
                            const p2 = minGens[i + 1];
                            if (a >= p1.a && a <= p2.a) {
                                const t = (a - p1.a) / (p2.a - p1.a);
                                const segY = p1.b + t * (p2.b - p1.b);
                                if (b >= segY - 1e-6) {
                                    inClosure = true;
                                    break;
                                }
                            }
                        }

                        if (inClosure) {
                            ctx.fillStyle = "#d97706";
                            ctx.beginPath();
                            ctx.arc(pt.x, pt.y, 4, 0, 2 * Math.PI);
                            ctx.fill();
                        } else {
                            ctx.fillStyle = "#cbd5e1";
                            ctx.beginPath();
                            ctx.arc(pt.x, pt.y, 2, 0, 2 * Math.PI);
                            ctx.fill();
                        }
                    } else {
                        ctx.fillStyle = "#cbd5e1";
                        ctx.beginPath();
                        ctx.arc(pt.x, pt.y, 2, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                }
            }
        }

        updateBtn.addEventListener("click", draw);
        if (closureCheck) closureCheck.addEventListener("change", draw);
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") draw();
        });

        draw();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initLatticeWidget);
    } else {
        initLatticeWidget();
    }
})();