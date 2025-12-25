document.addEventListener("DOMContentLoaded", () => {

    // =========================
    // FEATURE BUTTONS
    // =========================

    document.getElementById("grabOrganic")?.addEventListener("click", async () => {
        await grabFeature(grabTopOrganicResults);
    });

    document.getElementById("grabPAA")?.addEventListener("click", async () => {
        await grabFeature(grabPeopleAlsoAskLinks);
    });

    document.getElementById("grabAI")?.addEventListener("click", async () => {
        await grabFeature(grabAIOverviewLinks);
    });

    document.getElementById("grabVideos")?.addEventListener("click", async () => {
        await grabFeature(grabVideosLinks);
    });

    async function grabFeature(featureFunc) {
        try {
            let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) throw new Error("No active tab found.");

            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: featureFunc
            });

            const rows = results?.[0]?.result || [];
            document.getElementById("links").value = rows.join("\n");
            window._scrapedRows = rows;
        } catch (err) {
            console.error(err);
            alert("Error grabbing links: " + err.message);
        }
    }

    // =========================
    // MANUAL SECTION SELECTION
    // =========================

    document.getElementById("selectSection")?.addEventListener("click", async () => {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;

        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: enableSectionSelection
        });

        alert("Hover over a section and click it. Then click 'Grab Links'.");
    });

    document.getElementById("grab")?.addEventListener("click", async () => {
        try {
            let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) throw new Error("No active tab found.");

            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: grabLinksFromSelectedSection
            });

            const rows = results?.[0]?.result || [];
            document.getElementById("links").value = rows.join("\n");
            window._scrapedRows = rows;
        } catch (err) {
            console.error(err);
            alert("Error grabbing links: " + err.message);
        }
    });

    // =========================
    // COPY + DOWNLOAD
    // =========================

    document.getElementById("copy")?.addEventListener("click", async () => {
        const text = document.getElementById("links").value;
        if (!text) return alert("Nothing to copy!");
        await navigator.clipboard.writeText(text);
        alert("Copied to clipboard!");
    });

    document.getElementById("download")?.addEventListener("click", () => {
        if (!window._scrapedRows || !window._scrapedRows.length) {
            alert("No data to download.");
            return;
        }

        const csv = ["url", ...window._scrapedRows.map(u =>
            `"${u.replace(/"/g, '""')}"`
        )].join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);

        chrome.downloads.download({ url, filename: "links.csv" });
    });

});

/* =========================================================
   PAGE-CONTEXT FUNCTIONS
   ========================================================= */

// =========================
// TOP ORGANIC RESULTS (H3)
// =========================
function grabTopOrganicResults() {
    const results = [];

    const h3s = Array.from(document.querySelectorAll('h3'));

    for (const h3 of h3s) {
        if (results.length >= 10) break;

        const link = h3.closest('a[href]');
        if (!link) continue;

        if (!h3.innerText.trim()) continue;

        const href = link.href;
        if (!href || href.includes('google.com')) continue;

        // Must be visible (filters hidden SERP features)
        if (!h3.offsetParent) continue;

        results.push(href);
    }

    return results;
}

// =========================
// MANUAL SECTION SELECT
// =========================
function enableSectionSelection() {
    const style = document.createElement('style');
    style.innerHTML = `
        .highlighted-section {
            outline: 3px solid red !important;
            cursor: pointer !important;
        }
    `;
    document.head.appendChild(style);

    function mouseOver(e) {
        e.target.classList.add('highlighted-section');
        e.stopPropagation();
    }

    function mouseOut(e) {
        e.target.classList.remove('highlighted-section');
        e.stopPropagation();
    }

    function clickHandler(e) {
        e.preventDefault();
        e.stopPropagation();

        document.removeEventListener('mouseover', mouseOver, true);
        document.removeEventListener('mouseout', mouseOut, true);
        document.removeEventListener('click', clickHandler, true);

        window._selectedSection = e.target.closest('[role="region"]') || e.target;
        alert('Section selected. Now click "Grab Links".');
    }

    document.addEventListener('mouseover', mouseOver, true);
    document.addEventListener('mouseout', mouseOut, true);
    document.addEventListener('click', clickHandler, true);
}

// =========================
// GRAB LINKS FROM SECTION
// =========================
function grabLinksFromSelectedSection() {
    const container = window._selectedSection || document.body;

    const anchors = Array.from(container.querySelectorAll('a[href]'));

    return [...new Set(
        anchors
            .map(a => a.href)
            .filter(h => h && !h.includes('google.com'))
    )];
}

// =========================
// PEOPLE ALSO ASK
// =========================
function grabPeopleAlsoAskLinks() {
    const heading = [...document.querySelectorAll('div, span, h1, h2, h3')]
        .find(el => el.innerText.trim() === 'People also ask');

    if (!heading) return [];

    const container = heading.closest('[role="region"]') || heading.parentElement;

    container.querySelectorAll('[role="button"]').forEach(b => b.click());

    return [...new Set(
        [...container.querySelectorAll('a[href]')]
            .map(a => a.href)
            .filter(h => !h.includes('google.com'))
    )];
}

// =========================
// AI OVERVIEW
// =========================
function grabAIOverviewLinks() {
    const heading = [...document.querySelectorAll('div, span, h1, h2, h3')]
        .find(el => el.innerText.trim() === 'AI Overview');

    if (!heading) return [];

    const container = heading.closest('[role="region"]') || heading.parentElement;

    return [...new Set(
        [...container.querySelectorAll('a[href]')]
            .map(a => a.href)
            .filter(h => h && !h.includes('google.com'))
    )];
}

// =========================
// VIDEOS
// =========================
function grabVideosLinks() {
    const containers = Array.from(document.querySelectorAll('.KYaZsb'));
    const anchors = containers.flatMap(c =>
        Array.from(c.querySelectorAll('a[href]'))
    );

    return [...new Set(
        anchors
            .map(a => a.href)
            .filter(h => h && !h.includes('google.com'))
    )];
}













