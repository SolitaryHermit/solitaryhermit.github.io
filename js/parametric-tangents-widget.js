/**
 * js/parametric-tangents-widget.js
 * Interactive Parametric Curve, Velocity Vector, and Tangent Line Visualizer
 */
(function () {
    function initParametricWidget() {
        const canvas = document.getElementById("pt-canvas");
        const slider = document.getElementById("pt-t-slider");
        const tValLabel = document.getElementById("pt-t-val");
        const playBtn = document.getElementById("pt-play-btn");
        const presetBtns = document.querySelectorAll(".pt-preset-btn");

        const eqDisplay = document.getElementById("pt-eq-display");
        const posDisplay = document.getElementById("pt-pos-display");
        const derivDisplay = document.getElementById("pt-deriv-display");
        const slopeDisplay = document.getElementById("pt-slope-display");

        if (!canvas || !slider) return;
        const ctx = canvas.getContext("2d");

        // High-DPI Display Scaling
        const dpr = window.devicePixelRatio || 1;
        const width = 440;
        const height = 440;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(dpr, dpr);

        // Curve Library with explicit derivative functions
        const PRESETS = {
            cusp: {
                name: "Semicubical Parabola",
                eqText: "x(t) = t²,  y(t) = t³",
                tMin: -1.7,
                tMax: 1.7,
                xScale: 1.2,
                yScale: 1.2,
                x: t => t * t,
                y: t => t * t * t,
                dx: t => 2 * t,
                dy: t => 3 * t * t
            },
            ellipse: {
                name: "Ellipse",
                eqText: "x(t) = 2 cos(t),  y(t) = 1.3 sin(t)",
                tMin: -Math.PI,
                tMax: Math.PI,
                xScale: 0.9,
                yScale: 0.9,
                x: t => 2 * Math.cos(t),
                y: t => 1.3 * Math.sin(t),
                dx: t => -2 * Math.sin(t),
                dy: t => 1.3 * Math.cos(t)
            },
            loop: {
                name: "Nodal Cubic (Loop)",
                eqText: "x(t) = t² - 1,  y(t) = t³ - t",
                tMin: -1.6,
                tMax: 1.6,
                xScale: 1.1,
                yScale: 1.1,
                x: t => t * t - 1,
                y: t => t * t * t - t,
                dx: t => 2 * t,
                dy: t => 3 * t * t - 1
            },
            astroid: {
                name: "Astroid",
                eqText: "x(t) = cos³(t),  y(t) = sin³(t)",
                tMin: -Math.PI,
                tMax: Math.PI,
                xScale: 1.5,
                yScale: 1.5,
                x: t => Math.pow(Math.cos(t), 3),
                y: t => Math.pow(Math.sin(t), 3),
                dx: t => -3 * Math.pow(Math.cos(t), 2) * Math.sin(t),
                dy: t => 3 * Math.pow(Math.sin(t), 2) * Math.cos(t)
            }
        };

        let currentCurve = PRESETS.cusp;
        let isPlaying = false;
        let animFrameId = null;

        const origin = { x: width / 2, y: height / 2 };
        const BASE_UNIT = 85; // Canvas pixels per mathematical unit

        function toCanvas(mx, my) {
            return {
                x: origin.x + mx * BASE_UNIT * currentCurve.xScale,
                y: origin.y - my * BASE_UNIT * currentCurve.yScale
            };
        }

        function drawAxes() {
            ctx.strokeStyle = "#e2e8f0";
            ctx.lineWidth = 1;

            // Grid lines
            for (let i = -3; i <= 3; i++) {
                if (i === 0) continue;
                const pX = toCanvas(i, 0);
                const pY = toCanvas(0, i);

                ctx.beginPath();
                ctx.moveTo(pX.x, 0);
                ctx.lineTo(pX.x, height);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(0, pY.y);
                ctx.lineTo(width, pY.y);
                ctx.stroke();
            }

            // Main Axes
            ctx.strokeStyle = "#64748b";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, origin.y);
            ctx.lineTo(width, origin.y);
            ctx.moveTo(origin.x, 0);
            ctx.lineTo(origin.x, height);
            ctx.stroke();

            // Labels
            ctx.fillStyle = "#64748b";
            ctx.font = "11px monospace";
            ctx.fillText("x", width - 15, origin.y - 6);
            ctx.fillText("y", origin.x + 8, 14);
        }

        function render() {
            ctx.clearRect(0, 0, width, height);
            drawAxes();

            const t = parseFloat(slider.value);
            tValLabel.textContent = `t = ${t.toFixed(2)}`;

            // 1. Draw Parametric Curve Path
            ctx.strokeStyle = "#0284c7";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            const samples = 400;
            const step = (currentCurve.tMax - currentCurve.tMin) / samples;

            for (let i = 0; i <= samples; i++) {
                const s = currentCurve.tMin + i * step;
                const pt = toCanvas(currentCurve.x(s), currentCurve.y(s));
                if (i === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            }
            ctx.stroke();

            // 2. Evaluate point, derivatives, and velocities
            const px = currentCurve.x(t);
            const py = currentCurve.y(t);
            const vx = currentCurve.dx(t);
            const vy = currentCurve.dy(t);
            const canvasPt = toCanvas(px, py);

            const EPS = 1e-4;
            const isZeroDx = Math.abs(vx) < EPS;
            const isZeroDy = Math.abs(vy) < EPS;

            // 3. Draw Tangent Line
            ctx.save();
            if (isZeroDx && isZeroDy) {
                // Singular Point: Draw a warning circle around the point
                ctx.strokeStyle = "#ef4444";
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.arc(canvasPt.x, canvasPt.y, 18, 0, 2 * Math.PI);
                ctx.stroke();
            } else if (isZeroDx) {
                // Exact Vertical Tangent
                ctx.strokeStyle = "#dc2626";
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 4]);
                ctx.beginPath();
                ctx.moveTo(canvasPt.x, 0);
                ctx.lineTo(canvasPt.x, height);
                ctx.stroke();
            } else if (isZeroDy) {
                // Exact Horizontal Tangent
                ctx.strokeStyle = "#16a34a";
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 4]);
                ctx.beginPath();
                ctx.moveTo(0, canvasPt.y);
                ctx.lineTo(width, canvasPt.y);
                ctx.stroke();
            } else {
                // Standard Tangent Line extended across the screen
                const slope = vy / vx;
                ctx.strokeStyle = "#d97706";
                ctx.lineWidth = 1.75;
                ctx.setLineDash([5, 4]);

                // Compute two far points along the tangent line
                const dxCanvas = 300;
                const dyCanvas = -slope * dxCanvas * (currentCurve.yScale / currentCurve.xScale);

                ctx.beginPath();
                ctx.moveTo(canvasPt.x - dxCanvas, canvasPt.y + dyCanvas);
                ctx.lineTo(canvasPt.x + dxCanvas, canvasPt.y - dyCanvas);
                ctx.stroke();
            }
            ctx.restore();

            // 4. Draw Velocity Vector r'(t) anchored at (px, py)
            const speed = Math.sqrt(vx * vx + vy * vy);
            if (speed > 1e-3) {
                const vecScale = 0.45;
                const vEnd = toCanvas(px + vx * vecScale, py + vy * vecScale);

                ctx.strokeStyle = "#475569";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(canvasPt.x, canvasPt.y);
                ctx.lineTo(vEnd.x, vEnd.y);
                ctx.stroke();

                // Arrowhead
                const angle = Math.atan2(vEnd.y - canvasPt.y, vEnd.x - canvasPt.x);
                const headLen = 8;
                ctx.fillStyle = "#475569";
                ctx.beginPath();
                ctx.moveTo(vEnd.x, vEnd.y);
                ctx.lineTo(vEnd.x - headLen * Math.cos(angle - Math.PI / 6), vEnd.y - headLen * Math.sin(angle - Math.PI / 6));
                ctx.lineTo(vEnd.x - headLen * Math.cos(angle + Math.PI / 6), vEnd.y - headLen * Math.sin(angle + Math.PI / 6));
                ctx.fill();
            }

            // 5. Draw Curve Point
            ctx.fillStyle = isZeroDx && isZeroDy ? "#ef4444" : "#0284c7";
            ctx.beginPath();
            ctx.arc(canvasPt.x, canvasPt.y, 6, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Update DOM Info Panel
            eqDisplay.textContent = currentCurve.eqText;
            posDisplay.textContent = `(${px.toFixed(3)}, ${py.toFixed(3)})`;
            derivDisplay.innerHTML = `x'(t) = ${vx.toFixed(3)}<br>y'(t) = ${vy.toFixed(3)}<br>|r'(t)| = ${speed.toFixed(3)}`;

            if (isZeroDx && isZeroDy) {
                slopeDisplay.innerHTML = `<span style="color: #ef4444;">Singular Point: x'=0 & y'=0</span><br><small style="color:var(--muted-color);">Tangent direction requires limit study.</small>`;
            } else if (isZeroDx) {
                slopeDisplay.innerHTML = `<span style="color: #dc2626;">Vertical Tangent</span> (dx/dt = 0, dy/dx undefined)`;
            } else if (isZeroDy) {
                slopeDisplay.innerHTML = `<span style="color: #16a34a;">Horizontal Tangent</span> (dy/dx = 0)`;
            } else {
                const m = vy / vx;
                slopeDisplay.innerHTML = `<span style="color: #d97706;">Regular Tangent</span> (dy/dx = ${m.toFixed(3)})`;
            }
        }

        // Slider Event
        slider.addEventListener("input", render);

        // Animation Loop
        function animate() {
            if (!isPlaying) return;
            let nextT = parseFloat(slider.value) + 0.015;
            if (nextT > currentCurve.tMax) nextT = currentCurve.tMin;
            slider.value = nextT;
            render();
            animFrameId = requestAnimationFrame(animate);
        }

        playBtn.addEventListener("click", () => {
            isPlaying = !isPlaying;
            playBtn.textContent = isPlaying ? "Pause" : "Animate";
            if (isPlaying) animate();
            else cancelAnimationFrame(animFrameId);
        });

        // Preset Switching
        presetBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                presetBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");

                const key = btn.getAttribute("data-preset");
                currentCurve = PRESETS[key];

                slider.min = currentCurve.tMin;
                slider.max = currentCurve.tMax;
                slider.value = (currentCurve.tMin + currentCurve.tMax) / 4;

                if (isPlaying) {
                    isPlaying = false;
                    playBtn.textContent = "Animate";
                    cancelAnimationFrame(animFrameId);
                }

                render();
            });
        });

        // Initialize
        render();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initParametricWidget);
    } else {
        initParametricWidget();
    }
})();