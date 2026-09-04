/**
 * Client-side pagination for static blog lists.
 */
document.addEventListener("DOMContentLoaded", () => {
    const postsPerPage = 5;
    const postList = document.getElementById("paginated-posts");
    const controls = document.getElementById("pagination-controls");

    if (!postList || !controls) return;

    const items = Array.from(postList.querySelectorAll(".post-item"));
    const totalPages = Math.ceil(items.length / postsPerPage);

    // If there is only 1 page (or none), hide controls completely
    if (totalPages <= 1) return;

    let currentPage = 1;

    function showPage(page) {
        currentPage = page;
        const start = (page - 1) * postsPerPage;
        const end = start + postsPerPage;

        items.forEach((item, idx) => {
            item.style.display = (idx >= start && idx < end) ? "flex" : "none";
        });

        renderControls();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function renderControls() {
        controls.innerHTML = "";

        // Previous button
        const prevBtn = document.createElement("button");
        prevBtn.className = "page-btn";
        prevBtn.innerHTML = "&larr;";
        prevBtn.disabled = (currentPage === 1);
        prevBtn.addEventListener("click", () => showPage(currentPage - 1));
        controls.appendChild(prevBtn);

        // Numeric page buttons
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement("button");
            btn.className = `page-btn ${i === currentPage ? "active" : ""}`;
            btn.textContent = i;
            btn.addEventListener("click", () => showPage(i));
            controls.appendChild(btn);
        }

        // Next button
        const nextBtn = document.createElement("button");
        nextBtn.className = "page-btn";
        nextBtn.innerHTML = "&rarr;";
        nextBtn.disabled = (currentPage === totalPages);
        nextBtn.addEventListener("click", () => showPage(currentPage + 1));
        controls.appendChild(nextBtn);
    }

    // Initialize first page view
    showPage(1);
});
