document.addEventListener("DOMContentLoaded", () => {

    // --- Feature Buttons ---
    document.getElementById("grabPAA")?.addEventListener("click", async () => {
        await grabFeature(grabPeopleAlsoAskLinks);
    });

    document.getElementById("grabAI")?.addEventListener("click", async () => {
        await grabFeature(grabAIOverviewLinks);
    });

    document.getElementById("grabVideos")?.addEventListener("click", async () => {
        await grabFeature(grabVideosLinks);
    });

    document.getElementById("grabDiscussions")?.addEventListener("click", async () => {
        await grabFeature(grabDiscussionsLinks);
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
        try {
            await navigator.clipboard.writeText(text);
            alert("Copied to clipboard!");
        } catch (e) {
            console.error(e);
            alert("Copy failed: " + e.message);
        }
    });

    // --- Download CSV ---
    document.getElementById("download")?.addEventListener("click", () => {
        if (!window._scrapedRows || window._scrapedRows.length === 0) {
            alert("No data to download. Grab links first.");
            return;
        }

        const csvHeader = ['url'];
        const csvRows = window._scrapedRows.map(r => `"${r.replace(/"/g,'""')}"`);
        const csvContent = [csvHeader.join(','), ...csvRows].join('\n');

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({ url: url, filename: "links.csv" });
    });

});

// --- Page Script: Enable section selection ---
function enableSectionSelection() {
    const style = document.createElement('style');
    style.innerHTML = `.highlighted-section { outline: 3px solid red !important; cursor: pointer; }`;
    document.head.appendChild(style);

    function mouseOverHandler(e) {
        e.target.classList.add('highlighted-section');
        e.stopPropagation();
    }
    function mouseOutHandler(e) {
        e.target.classList.remove('highlighted-section');
        e.stopPropagation();
    }
    function clickHandler(e) {
        e.preventDefault();
        e.stopPropagation();
        document.removeEventListener('mouseover', mouseOverHandler, true);
        document.removeEventListener('mouseout', mouseOutHandler, true);
        document.removeEventListener('click', clickHandler, true);

        alert('Section selected! Now click "Grab Links".');
        window._selectedSection = e.target.closest('[role="region"]') || e.target;
    }

    document.addEventListener('mouseover', mouseOverHandler, true);
    document.addEventListener('mouseout', mouseOutHandler, true);
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

    return [...new Set(
        [...container.querySelectorAll('a[href]')].map(a => a.href)
    )];
}

// --- Grab Videos (class KYaZsb) ---
function grabVideosLinks() {
    const containers = Array.from(document.querySelectorAll('.KYaZsb'));
    if (!containers.length) return [];

    const anchors = containers.flatMap(container => Array.from(container.querySelectorAll('a[href]')));

    return [...new Set(
        anchors
            .map(a => a.href)
            .filter(h => h && !h.includes('google.com'))
    )];
}

// --- Grab Discussions and Forums (classes KYg7td + INpicf) ---
function grabDiscussionsLinks() {
    const containers = [
        ...Array.from(document.querySelectorAll('.KYg7td')),
        ...Array.from(document.querySelectorAll('.INpicf'))
    ];
    if (!containers.length) return [];

    const anchors = containers.flatMap(container => Array.from(container.querySelectorAll('a[href]')));

    return [...new Set(
        anchors
            .map(a => a.href)
            .filter(h => h && !h.includes('google.com'))
    )];
}










