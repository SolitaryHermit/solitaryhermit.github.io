/**
 * math-notes.js
 * Enhancements for mathematical notes:
 * 1. Automatically unfolds all proof blocks when <body> has the "editing" class.
 * 2. Dynamically populates cross-reference link texts matching counter-generated titles.
 */
document.addEventListener("DOMContentLoaded", () => {
    // 1. Unfold proofs in editing mode
    if (document.body.classList.contains("editing")) {
        document.querySelectorAll("details.proof").forEach((proof) => {
            proof.open = true;
        });
    }

    // 2. Dynamic in-page cross references (<a class="ref" data-target="element-id">)
    document.querySelectorAll("a.ref").forEach((link) => {
        const targetId = link.getAttribute("data-target");
        const targetEl = document.getElementById(targetId);

        if (targetEl) {
            link.setAttribute("href", `#${targetId}`);

            const titleEl = targetEl.querySelector(".math-title");
            if (titleEl) {
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
});

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".code-block pre code").forEach((codeEl) => {
        const lines = codeEl.textContent.split("\n");

        // Remove an initial empty line if present
        if (lines.length > 0 && lines[0].trim() === "") {
            lines.shift();
        }

        // Find the minimum indentation across non-empty lines
        const indentRegex = /^\s*/;
        const indents = lines
            .filter((line) => line.trim().length > 0)
            .map((line) => line.match(indentRegex)[0].length);

        const minIndent = Math.min(...indents);

        // Strip that shared indentation from each line
        if (minIndent > 0 && minIndent !== Infinity) {
            codeEl.textContent = lines
                .map((line) => line.slice(minIndent))
                .join("\n")
                .trimEnd();
        }
    });
});


