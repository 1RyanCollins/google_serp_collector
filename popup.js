document.addEventListener("DOMContentLoaded", () => {

    // --- Feature Buttons ---
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

    // --- Select Section Mode ---
    document.getElementById("selectSection")?.addEventListener("click", async () => {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;

        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: enableSectionSelection
        });

        alert("Hover over the section you want and click it. Then click 'Grab Links'.");
    });

    // --- Grab Links from Selected Section ---
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

    // --- Copy to Clipboard ---
    document.getElementById("copy")?.addEventListener("click", async () => {
        const text = document.getElementById("links").value;
        if (!text) { alert("Nothing to copy!"); return; }
        await navigator.clipboard.writeText(text);
        alert("Copied to clipboard!");
    });

    // --- Download CSV ---
    document.getElementById("download")?.addEventListener("click", () => {
        if (!window._scrapedRows || window._scrapedRows.length === 0) {
            alert("No data to download. Grab links first.");
            return;
        }

        const csvRows = window._scrapedRows.map(r => `"${r.replace(/"/g, '""')}"`);
        const csvContent = ["url", ...csvRows].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({ url, filename: "links.csv" });
    });

});

// --- Grab Top Organic Results (Page 1) ---
function grabTopOrganicResults() {
    const results = [];

    const organicResults = Array.from(document.querySelectorAll('div.g'));

    for (const result of organicResults) {
        if (results.length >= 10) break;

        const link = result.querySelector('h3 a[href]');
        if (!link) continue;

        const href = link.href;
        if (!href || href.includes('google.com')) continue;

        results.push(href);
    }

    return results;
}

// --- Page Script: Enable section selection ---
function enableSectionSelection() {
    const style = document.createElement('style');
    style.innerHTML = `.highlighted-section { outline: 3px solid red !important; cursor: pointer; }`;
    document.head.appendChild(style);

    function clickHandler(e) {
        e.preventDefault();
        e.stopPropagation();
        document.removeEventListener('click', clickHandler, true);
        window._selectedSection = e.target.closest('[role="region"]') || e.target;
        alert('Section selected! Now click "Grab Links".');
    }

    document.addEventListener('click', clickHandler, true);
}

// --- Grab all links from selected section ---
function grabLinksFromSelectedSection() {
    const container = window._selectedSection || document.body;
    const anchors = Array.from(container.querySelectorAll("a[href]"));
    return [...new Set(anchors.map(a => a.href))];
}

// --- Grab People Also Ask ---
function grabPeopleAlsoAskLinks() {
    const heading = [...document.querySelectorAll('div, span, h1, h2, h3')]
        .find(el => el.innerText.trim() === 'People also ask');
    if (!heading) return [];

    const container = heading.closest('[role="region"]') || heading.parentElement;
    container.querySelectorAll('[role="button"]').forEach(btn => btn.click());

    return [...new Set(
        [...container.querySelectorAll('a[href]')]
            .map(a => a.href)
            .filter(h => !h.includes('google.com'))
    )];
}

// --- Grab AI Overview ---
function grabAIOverviewLinks() {
    const heading = [...document.querySelectorAll('div, span, h1, h2, h3')]
        .find(el => el.innerText.trim() === 'AI Overview');
    if (!heading) return [];

    const container = heading.closest('[role="region"]') || heading.parentElement;
    return [...new Set([...container.querySelectorAll('a[href]')].map(a => a.href))];
}

// --- Grab Videos ---
function grabVideosLinks() {
    const containers = Array.from(document.querySelectorAll('.KYaZsb'));
    const anchors = containers.flatMap(c => Array.from(c.querySelectorAll('a[href]')));

    return [...new Set(
        anchors.map(a => a.href).filter(h => h && !h.includes('google.com'))
    )];
}











