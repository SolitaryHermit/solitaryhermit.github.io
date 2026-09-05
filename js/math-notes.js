/**
 * math-notes.js
 * Comprehensive client-side enhancements for mathematical research notes:
 * 1. Draft Mode: Unfolds all proof blocks when <body> has the "editing" class.
 * 2. In-Page Cross-References: Dynamically derives label text from CSS counters.
 * 3. Smooth Anchor Scrolling: Cleanly scrolls to targets and clears URL hash clutter.
 * 4. Automated Table of Contents (TOC): Scans sections and generates link lists.
 * 5. Code Block Dedenting: Trims IDE-induced leading whitespace in <pre><code> blocks.
 * 6. Floating Back-to-Top Button: Provides smooth return navigation on long documents.
 */

document.addEventListener("DOMContentLoaded", () => {
    // =========================================================================
    // 1. Draft Mode (Auto-unfold proofs during drafting)
    // =========================================================================
    if (document.body.classList.contains("editing")) {
        document.querySelectorAll("details.proof").forEach((proof) => {
            proof.open = true;
        });
    }

    // =========================================================================
    // 2. Dynamic Cross-Referencing (<a class="ref" data-target="element-id">)
    // =========================================================================
    document.querySelectorAll("a.ref").forEach((link) => {
        const targetId = link.getAttribute("data-target");
        const targetEl = document.getElementById(targetId);

        if (targetEl) {
            link.setAttribute("href", `#${targetId}`);

            const titleEl = targetEl.querySelector(".math-title");
            if (titleEl) {
                // Extract the generated counter string (e.g., "Theorem 1.1 ")
                const generatedText = window.getComputedStyle(titleEl, "::before")
                    .content
                    .replace(/['"]/g, "")
                    .trim();

                if (generatedText) {
                    link.textContent = generatedText;
                }
            }
        }
    });

    // =========================================================================
    // 3. Smooth Anchor Navigation & URL Hash Management
    // =========================================================================
    document.addEventListener("click", (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (!link) return;

        const hash = link.getAttribute("href");
        if (hash === "#" || hash === "") return;

        const targetId = hash.slice(1);
        const targetEl = document.getElementById(targetId);

        if (targetEl) {
            e.preventDefault();
            targetEl.scrollIntoView({ behavior: "smooth" });

            // Strip the fragment identifier so page refreshes don't anchor down
            history.replaceState(null, "", window.location.pathname + window.location.search);
        }
    });

    // =========================================================================
    // 4. Automated Table of Contents Builder
    // =========================================================================
    const tocContainer = document.getElementById("toc");
    if (tocContainer) {
        const sections = document.querySelectorAll(".math-page section");

        if (sections.length > 0) {
            const tocTitle = document.createElement("div");
            tocTitle.className = "toc-title";
            tocTitle.textContent = "Contents";
            tocContainer.appendChild(tocTitle);

            const tocList = document.createElement("ol");
            tocList.className = "toc-list";

            let sectionIndex = 0;

            sections.forEach((sec, idx) => {
                const heading = sec.querySelector("h2");
                if (!heading) return;

                // Guarantee a target ID exists for jumping
                if (!sec.id) {
                    sec.id = `section-${idx + 1}`;
                }

                const isUnnumbered = sec.classList.contains("unnumbered");
                let labelText = heading.textContent.trim();

                if (!isUnnumbered) {
                    sectionIndex += 1;
                    labelText = `${sectionIndex}. ${labelText}`;
                }

                const listItem = document.createElement("li");
                listItem.className = isUnnumbered ? "toc-item unnumbered" : "toc-item";

                const link = document.createElement("a");
                link.href = `#${sec.id}`;
                link.textContent = labelText;

                listItem.appendChild(link);
                tocList.appendChild(listItem);
            });

            tocContainer.appendChild(tocList);
        }
    }

    // =========================================================================
    // 5. Code Block Left-Alignment & Dedenting (Macaulay2 / Snippets)
    // =========================================================================
    document.querySelectorAll(".code-block pre code").forEach((codeEl) => {
        const lines = codeEl.textContent.split("\n");

        // Remove a potential initial empty line caused by opening tags
        if (lines.length > 0 && lines[0].trim() === "") {
            lines.shift();
        }

        // Measure minimum shared indent among non-blank lines
        const indentRegex = /^\s*/;
        const indents = lines
            .filter((line) => line.trim().length > 0)
            .map((line) => line.match(indentRegex)[0].length);

        if (indents.length > 0) {
            const minIndent = Math.min(...indents);
            if (minIndent > 0 && minIndent !== Infinity) {
                codeEl.textContent = lines
                    .map((line) => line.slice(minIndent))
                    .join("\n")
                    .trimEnd();
            }
        }
    });

    // =========================================================================
    // 6. Floating Back-to-Top Button
    // =========================================================================
    let topBtn = document.getElementById("back-to-top");
    
    // Inject the button dynamically if it isn't already hardcoded in the HTML
    if (!topBtn) {
        topBtn = document.createElement("button");
        topBtn.id = "back-to-top";
        topBtn.className = "back-to-top-btn";
        topBtn.title = "Back to top";
        topBtn.innerHTML = "&uarr;";
        document.body.appendChild(topBtn);
    }

    window.addEventListener("scroll", () => {
        topBtn.style.display = window.scrollY > 450 ? "flex" : "none";
    });

    topBtn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
});
