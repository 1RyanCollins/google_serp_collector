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

/* =========================
   PAGE-CONTEXT FUNCTIONS
   ========================= */

// --- Top Organic Results (H3-based) ---
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
        if (!h3.offsetParent) continue;

        results.push(href);
    }

    return results;
}

// --- Manual Section Selection ---
function enableSectionSelection() {
    const style = document.createElement('style');
    style.innerHTML = `
        .serp-highlight {
            outline: 3px solid red !important;
            cursor: pointer !important;
        }
    `;
    document.head.appendChild(style);

    let lastHighlighted = null;

    function mouseOver(e) {
        if (lastHighlighted) lastHighlighted.classList.remove('serp-highlight');

        const target =
            e.target.closest('.MjjYud') ||
            e.target.closest('[role="region"]') ||
            e.target.closest('div');

        if (!target) return;

        target.classList.add('serp-highlight');
        lastHighlighted = target;
        e.stopPropagation();
    }

    function mouseOut() {
        // do nothing – keep highlight stable
    }

    function clickHandler(e) {
        e.preventDefault();
        e.stopPropagation();

        const selected =
            e.target.closest('.MjjYud') ||
            e.target.closest('[role="region"]') ||
            e.target.closest('div');

        if (!selected) return;

        window._selectedSection = selected;

        // Cleanup listeners
        document.removeEventListener('mouseover', mouseOver, true);
        document.removeEventListener('mouseout', mouseOut, true);
        document.removeEventListener('click', clickHandler, true);

        if (lastHighlighted) lastHighlighted.classList.remove('serp-highlight');

        alert('Section selected. Now click "Grab Links".');
    }

    document.addEventListener('mouseover', mouseOver, true);
    document.addEventListener('mouseout', mouseOut, true);
    document.addEventListener('click', clickHandler, true);
}

// --- Grab Links From Selected Section ---
function grabLinksFromSelectedSection() {
    if (!window._selectedSection) return [];

    const anchors = Array.from(
        window._selectedSection.querySelectorAll('a[href]')
    );

    return [...new Set(
        anchors
            .map(a => a.href)
            .filter(h => h && !h.includes('google.com'))
    )];
}

// --- People Also Ask (NO CLICKS, NO PAGE CHANGE) ---
function grabPeopleAlsoAskLinks() {
    const heading = [...document.querySelectorAll('div, span, h1, h2, h3')]
        .find(el => el.innerText.trim() === 'People also ask');

    if (!heading) return [];

    const container = heading.closest('[role="region"]') || heading.parentElement;

    return [...new Set(
        [...container.querySelectorAll('a[href]')]
            .map(a => a.href)
            .filter(h => h && !h.includes('google.com'))
    )];
}

// --- AI Overview ---
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

// --- Videos ---
function grabVideosLinks() {
    const containers = Array.from(document.querySelectorAll('.KYaZsb'));
    const anchors = containers.flatMap(c => Array.from(c.querySelectorAll('a[href]')));

    return [...new Set(
        anchors.map(a => a.href).filter(h => h && !h.includes('google.com'))
    )];
}














