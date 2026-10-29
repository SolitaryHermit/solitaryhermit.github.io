/**
 * js/stanley-reisner-widget.js
 * Interactive Simplicial Complex Visualizer and Stanley-Reisner Algebra Engine
 */
(function () {
    function initSRWidget() {
        const canvas = document.getElementById("sr-canvas");
        const input = document.getElementById("sr-facets-input");
        const updateBtn = document.getElementById("sr-update-btn");
        const presetBtns = document.querySelectorAll(".sr-preset-btn");

        const nonfacesBox = document.getElementById("sr-nonfaces-display");
        const idealBox = document.getElementById("sr-ideal-display");
        const primesBox = document.getElementById("sr-primes-display");
        const fvectorBox = document.getElementById("sr-fvector-display");

        if (!canvas || !input || !updateBtn) return;
        const ctx = canvas.getContext("2d");

        // High-DPI support
        const dpr = window.devicePixelRatio || 1;
        const width = 340;
        const height = 340;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(dpr, dpr);

        function parseFacets(str) {
            return str
                .split(",")
                .map(s => s.trim().replace(/[^0-9a-zA-Z]/g, ""))
                .filter(Boolean)
                .map(tok => {
                    const chars = Array.from(new Set(tok.split(""))).sort();
                    return chars;
                });
        }

        // Generate power set of array
        function getSubsets(arr) {
            return arr.reduce((subsets, value) => {
                return subsets.concat(subsets.map(set => [...set, value]));
            }, [[]]);
        }

        function arraysEqual(a, b) {
            return a.length === b.length && a.every((val, idx) => val === b[idx]);
        }

        function isSubset(subset, superset) {
            return subset.every(elem => superset.includes(elem));
        }

        function computeComplex(facets) {
            const allVertices = Array.from(new Set(facets.flat())).sort();
            const faces = new Set();

            facets.forEach(facet => {
                const sub = getSubsets(facet);
                sub.forEach(f => {
                    if (f.length > 0) faces.add(f.join(""));
                });
            });

            // Minimal non-faces: subsets of V that are not in Delta, but all proper subsets are in Delta
            const allSubsets = getSubsets(allVertices).filter(s => s.length >= 2);
            const nonFaces = [];

            allSubsets.forEach(candidate => {
                const candKey = candidate.join("");
                if (!faces.has(candKey)) {
                    // Check if all strict subsets are valid faces
                    const properSubsets = getSubsets(candidate).filter(
                        s => s.length > 0 && s.length < candidate.length
                    );
                    const allProperAreFaces = properSubsets.every(ps => faces.has(ps.join("")));
                    if (allProperAreFaces) {
                        nonFaces.push(candidate);
                    }
                }
            });

            // f-vector calculation: (f_-1, f_0, f_1, ...)
            const fVec = { "-1": 1, "0": allVertices.length, "1": 0, "2": 0 };
            faces.forEach(fStr => {
                const dim = fStr.length - 1;
                if (dim >= 1 && dim <= 2) {
                    fVec[dim] = (fVec[dim] || 0) + 1;
                }
            });

            return { allVertices, faces, nonFaces, fVec };
        }

        function draw(facets, { allVertices, faces }) {
            ctx.clearRect(0, 0, width, height);

            const n = allVertices.length;
            if (n === 0) return;

            // Distribute vertices uniformly on a circle
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = width * 0.38;
            const vertexCoords = {};

            allVertices.forEach((v, idx) => {
                const angle = (2 * Math.PI * idx) / n - Math.PI / 2;
                vertexCoords[v] = {
                    x: centerX + radius * Math.cos(angle),
                    y: centerY + radius * Math.sin(angle)
                };
            });

            // 1. Draw 2-faces (triangles) with light shading
            facets.forEach(facet => {
                if (facet.length >= 3) {
                    // Draw filled triangles for 3-element subsets
                    const tris = getSubsets(facet).filter(s => s.length === 3);
                    tris.forEach(tri => {
                        const [p1, p2, p3] = tri.map(v => vertexCoords[v]);
                        ctx.fillStyle = "rgba(2, 132, 199, 0.15)";
                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.lineTo(p3.x, p3.y);
                        ctx.closePath();
                        ctx.fill();
                    });
                }
            });

            // 2. Draw 1-faces (edges)
            faces.forEach(fStr => {
                if (fStr.length === 2) {
                    const p1 = vertexCoords[fStr[0]];
                    const p2 = vertexCoords[fStr[1]];
                    ctx.strokeStyle = "#0284c7";
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            });

            // 3. Draw 0-faces (vertices) & labels
            allVertices.forEach(v => {
                const pt = vertexCoords[v];

                // Outer circle
                ctx.fillStyle = "#ffffff";
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 11, 0, 2 * Math.PI);
                ctx.fill();
                ctx.strokeStyle = "#0f172a";
                ctx.lineWidth = 2;
                ctx.stroke();

                // Vertex label
                ctx.fillStyle = "#0f172a";
                ctx.font = "bold 11px monospace";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(v, pt.x, pt.y);
            });
        }

        function update() {
            const rawFacets = parseFacets(input.value);
            // Eliminate non-maximal inputs
            const facets = rawFacets.filter((f1, i) => {
                return !rawFacets.some((f2, j) => i !== j && isSubset(f1, f2));
            });

            const computed = computeComplex(facets);

            // Render Graphic
            draw(facets, computed);

            // 1. Display Minimal Non-Faces
            nonfacesBox.innerHTML = "";
            if (computed.nonFaces.length === 0) {
                nonfacesBox.innerHTML = `<span style="color: var(--muted-color); font-size: 0.85rem;">None (Simplex $\\Delta_{${computed.allVertices.length - 1}}$)</span>`;
            } else {
                computed.nonFaces.forEach(nf => {
                    const badge = document.createElement("span");
                    badge.className = "gen-badge";
                    badge.textContent = `{${nf.join(", ")}}`;
                    nonfacesBox.appendChild(badge);
                });
            }

            // 2. Display Stanley–Reisner Ideal
            if (computed.nonFaces.length === 0) {
                idealBox.textContent = "I_Δ = (0)";
            } else {
                const gens = computed.nonFaces.map(nf => nf.map(v => `x_{${v}}`).join(""));
                idealBox.textContent = `I_Δ = (${gens.join(", ")})`;
            }

            // 3. Display Minimal Primes
            const primes = facets.map(facet => {
                const complement = computed.allVertices.filter(v => !facet.includes(v));
                if (complement.length === 0) return "(0)";
                return `(${complement.map(v => `x_{${v}}`).join(", ")})`;
            });
            primesBox.textContent = `I_Δ = ${primes.join(" ∩ ")}`;

            // 4. Display f-vector
            fvectorBox.textContent = `f(Δ) = (f_{-1}, f_0, f_1, f_2) = (1, ${computed.fVec["0"]}, ${computed.fVec["1"]}, ${computed.fVec["2"]})`;
        }

        presetBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                input.value = btn.getAttribute("data-preset");
                update();
            });
        });

        updateBtn.addEventListener("click", update);
        input.addEventListener("keydown", e => {
            if (e.key === "Enter") update();
        });

        update();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initSRWidget);
    } else {
        initSRWidget();
    }
})();
