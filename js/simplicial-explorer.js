/**
 * js/simplicial-explorer.js
 * Integrated Simplicial Complex & Alexander Dual Explorer
 */
(function () {
    function initSimplicialExplorer() {
        const canvas = document.getElementById("sc-canvas");
        const input = document.getElementById("sc-facets-input");
        const updateBtn = document.getElementById("sc-update-btn");
        const presetBtns = document.querySelectorAll(".sc-preset-btn");

        const viewOrigBtn = document.getElementById("sc-view-orig");
        const viewDualBtn = document.getElementById("sc-view-dual");
        const activeLabel = document.getElementById("sc-active-label");

        const dualFacetsBox = document.getElementById("sc-dual-facets-display");
        const dimBox = document.getElementById("sc-dim-display");
        const fvecBox = document.getElementById("sc-fvec-display");
        const eulerBox = document.getElementById("sc-euler-display");
        const compBox = document.getElementById("sc-components-display");

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

        let currentMode = "orig"; // "orig" or "dual"
        let cachedPrimalFacets = [];
        let cachedDualFacets = [];
        let globalVertices = [];

        function parseFacets(raw) {
            return raw
                .split(",")
                .map(s => s.trim().replace(/[^0-9a-zA-Z]/g, ""))
                .filter(Boolean)
                .map(tok => Array.from(new Set(tok.split(""))).sort());
        }

        function getSubsets(arr) {
            return arr.reduce((subsets, val) => subsets.concat(subsets.map(s => [...s, val])), [[]]);
        }

        function isSubset(subset, superset) {
            return subset.every(elem => superset.includes(elem));
        }

        // Full analysis of an arbitrary simplicial complex defined by its facets
        function analyzeComplex(facets, allVertices) {
            const facesByDim = {};
            const facesSet = new Set();

            facets.forEach(facet => {
                const subs = getSubsets(facet);
                subs.forEach(s => {
                    const dim = s.length - 1;
                    if (!facesByDim[dim]) facesByDim[dim] = new Set();
                    facesByDim[dim].add(s.join(""));
                    if (s.length > 0) facesSet.add(s.join(""));
                });
            });

            // Dimension and pureness
            const facetDims = facets.map(f => f.length - 1);
            const maxDim = facetDims.length > 0 ? Math.max(...facetDims) : -1;
            const isPure = facetDims.length > 0 && facetDims.every(d => d === maxDim);

            // f-vector
            const fVector = [];
            for (let d = -1; d <= maxDim; d++) {
                fVector.push(facesByDim[d] ? facesByDim[d].size : 0);
            }

            // Euler characteristic
            let chi = 0;
            for (let d = 0; d <= maxDim; d++) {
                chi += Math.pow(-1, d) * (facesByDim[d] ? facesByDim[d].size : 0);
            }
            const tildeChi = chi - 1;

            // Connected components via DFS
            const adj = {};
            allVertices.forEach(v => adj[v] = []);
            if (facesByDim[1]) {
                facesByDim[1].forEach(edgeStr => {
                    const [u, v] = edgeStr.split("");
                    adj[u].push(v);
                    adj[v].push(u);
                });
            }

            const visited = new Set();
            const components = [];
            allVertices.forEach(v => {
                if (!visited.has(v)) {
                    const comp = [];
                    const stack = [v];
                    visited.add(v);
                    while (stack.length > 0) {
                        const curr = stack.pop();
                        comp.push(curr);
                        adj[curr].forEach(nb => {
                            if (!visited.has(nb)) {
                                visited.add(nb);
                                stack.push(nb);
                            }
                        });
                    }
                    components.push(comp);
                }
            });

            return { facesByDim, facesSet, maxDim, isPure, fVector, chi, tildeChi, components };
        }

        // Compute Alexander Dual facets:
        // tau in Delta* <=> V \ tau not in Delta.
        // Facets of Delta* are V \ sigma for all minimal non-faces sigma of Delta.
        function computeAlexanderDual(primalFacets, allVertices) {
            const primalData = analyzeComplex(primalFacets, allVertices);
            const allSubsets = getSubsets(allVertices).filter(s => s.length >= 2);
            const minNonFaces = [];

            allSubsets.forEach(cand => {
                const candKey = cand.join("");
                if (!primalData.facesSet.has(candKey)) {
                    const proper = getSubsets(cand).filter(s => s.length > 0 && s.length < cand.length);
                    if (proper.every(ps => primalData.facesSet.has(ps.join("")))) {
                        minNonFaces.push(cand);
                    }
                }
            });

            // Facets of Delta* are complements of minimal non-faces
            const rawDualFacets = minNonFaces.map(nf => {
                return allVertices.filter(v => !nf.includes(v));
            });

            // Filter to maximal dual facets
            return rawDualFacets.filter((f1, i) => {
                return !rawDualFacets.some((f2, j) => i !== j && isSubset(f1, f2));
            });
        }

        function draw(facets, { facesByDim }, allVertices, isDual) {
            ctx.clearRect(0, 0, width, height);
            const n = allVertices.length;
            if (n === 0) return;

            const centerX = width / 2;
            const centerY = height / 2;
            const radius = width * 0.38;
            const coords = {};

            allVertices.forEach((v, idx) => {
                const angle = (2 * Math.PI * idx) / n - Math.PI / 2;
                coords[v] = {
                    x: centerX + radius * Math.cos(angle),
                    y: centerY + radius * Math.sin(angle)
                };
            });

            const primaryColor = isDual ? "#d97706" : "#0284c7"; // Amber for dual, cyan for primal
            const fillColor = isDual ? "rgba(217, 119, 6, 0.18)" : "rgba(2, 132, 199, 0.18)";

            // 1. Shaded 2-faces (triangles)
            if (facesByDim[2]) {
                facesByDim[2].forEach(triStr => {
                    const [v1, v2, v3] = triStr.split("");
                    const p1 = coords[v1], p2 = coords[v2], p3 = coords[v3];
                    ctx.fillStyle = fillColor;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.lineTo(p3.x, p3.y);
                    ctx.closePath();
                    ctx.fill();
                });
            }

            // 2. 1-skeleton edges
            if (facesByDim[1]) {
                facesByDim[1].forEach(edgeStr => {
                    const [v1, v2] = edgeStr.split("");
                    ctx.strokeStyle = primaryColor;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(coords[v1].x, coords[v1].y);
                    ctx.lineTo(coords[v2].x, coords[v2].y);
                    ctx.stroke();
                });
            }

            // 3. Vertices
            allVertices.forEach(v => {
                const pt = coords[v];
                ctx.fillStyle = "#ffffff";
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 11, 0, 2 * Math.PI);
                ctx.fill();
                ctx.strokeStyle = "#1e293b";
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.fillStyle = "#0f172a";
                ctx.font = "bold 11px monospace";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(v, pt.x, pt.y);
            });
        }

        function renderActiveView() {
            const isDual = currentMode === "dual";
            const facets = isDual ? cachedDualFacets : cachedPrimalFacets;
            const data = analyzeComplex(facets, globalVertices);

            draw(facets, data, globalVertices, isDual);

            // Update Label & Toggle Styles
            if (isDual) {
                activeLabel.textContent = "Viewing: Alexander Dual Complex Δ^v";
                activeLabel.style.color = "#d97706";
                viewDualBtn.classList.add("active");
                viewDualBtn.style.background = "#d97706";
                viewOrigBtn.classList.remove("active");
                viewOrigBtn.style.background = "#f1f5f9";
                viewOrigBtn.style.color = "var(--text-color)";
            } else {
                activeLabel.textContent = "Viewing: Primal Complex Δ";
                activeLabel.style.color = "var(--def-color)";
                viewOrigBtn.classList.add("active");
                viewOrigBtn.style.background = "var(--def-color)";
                viewDualBtn.classList.remove("active");
                viewDualBtn.style.background = "#f1f5f9";
                viewDualBtn.style.color = "var(--text-color)";
            }

            // Dimension & Pureness
            const pureBadge = data.isPure ? "Pure" : "Non-pure";
            dimBox.textContent = `dim = ${data.maxDim} (${pureBadge})`;

            // f-vector
            fvecBox.textContent = `(${data.fVector.join(", ")})`;
            fvecBox.style.color = isDual ? "#d97706" : "var(--def-color)";

            // Euler Characteristic
            eulerBox.innerHTML = `&chi; = ${data.chi} &nbsp;|&nbsp; <span style="color: var(--muted-color);">&chi;&#771; = ${data.tildeChi}</span>`;

            // Components
            compBox.textContent = `${data.components.length} component(s): ${data.components.map(c => "{" + c.join(",") + "}").join(", ")}`;
        }

        function recalculate() {
            const raw = parseFacets(input.value);
            cachedPrimalFacets = raw.filter((f1, i) => !raw.some((f2, j) => i !== j && isSubset(f1, f2)));
            globalVertices = Array.from(new Set(cachedPrimalFacets.flat())).sort();

            // Compute Alexander Dual facets
            cachedDualFacets = computeAlexanderDual(cachedPrimalFacets, globalVertices);

            // Render Alexander Dual Facet Badges
            dualFacetsBox.innerHTML = "";
            if (cachedDualFacets.length === 0) {
                dualFacetsBox.innerHTML = `<span style="color: var(--muted-color); font-size: 0.85rem;">Void complex (empty)</span>`;
            } else {
                cachedDualFacets.forEach(df => {
                    const badge = document.createElement("span");
                    badge.className = "gen-badge";
                    badge.style.borderColor = "#d97706";
                    badge.style.color = "#d97706";
                    badge.textContent = df.length > 0 ? `{${df.join(", ")}}` : "∅";
                    dualFacetsBox.appendChild(badge);
                });
            }

            renderActiveView();
        }

        // Toggle handlers
        viewOrigBtn.addEventListener("click", () => {
            currentMode = "orig";
            renderActiveView();
        });

        viewDualBtn.addEventListener("click", () => {
            currentMode = "dual";
            renderActiveView();
        });

        presetBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                input.value = btn.getAttribute("data-preset");
                currentMode = "orig";
                recalculate();
            });
        });

        updateBtn.addEventListener("click", recalculate);
        input.addEventListener("keydown", e => {
            if (e.key === "Enter") recalculate();
        });

        recalculate();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initSimplicialExplorer);
    } else {
        initSimplicialExplorer();
    }
})();
