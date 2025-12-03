document.addEventListener("DOMContentLoaded", () => {

    // --- Select Section Mode ---
    document.getElementById("selectSection").addEventListener("click", async () => {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;

        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: enableSectionSelection
        });

        alert("Hover over the section you want and click it. Then click 'Grab Links'.");
    });

    // --- Grab Links ---
    document.getElementById("grab").addEventListener("click", async () => {
        try {
            let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) throw new Error("No active tab found.");

            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: grabLinksFromSelectedSection
            });

            if (!results || !results[0] || !results[0].result) {
                document.getElementById("links").value = "";
                return;
            }

            const rows = results[0].result;

            // Display links in textarea
            document.getElementById("links").value = rows.map(r =>
                `- ${r.type}: ${r.link_raw}`
            ).join("\n");

            // Save for CSV
            window._scrapedRows = rows;

        } catch (err) {
            console.error(err);
            alert("Error grabbing links: " + err.message);
        }
    });

    // --- Copy to clipboard ---
    document.getElementById("copy").addEventListener("click", async () => {
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
    document.getElementById("download").addEventListener("click", () => {
        if (!window._scrapedRows || window._scrapedRows.length === 0) {
            alert("No data to download. Grab links first.");
            return;
        }

        const csvHeader = ['query','link_raw','link_cleaned','type'];
        const csvRows = window._scrapedRows.map(r =>
            [
                `"${r.query.replace(/"/g,'""')}"`,
                `"${r.link_raw}"`,
                `"${r.link_cleaned}"`,
                `"${r.type}"`
            ].join(',')
        );
        const csvContent = [csvHeader.join(','), ...csvRows].join('\n');

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({ url: url, filename: "text_fragment_links.csv" });
    });

});

// --- Helpers ---

function cleanText(str) {
    if (!str && str !== 0) return "";
    let s = String(str);
    s = s.replace(/\uFFFD/g,'').replace(/â€¢/g,'').replace(/[^\x09\x0A\x0D\x20-\x7E]/g,'');
    s = s.trim().replace(/\s+/g,' ');
    return s;
}

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
        window._selectedSection = e.target;
    }

    document.addEventListener('mouseover', mouseOverHandler, true);
    document.addEventListener('mouseout', mouseOutHandler, true);
    document.addEventListener('click', clickHandler, true);
}

// --- Page Script: Grab all links from selected section ---
function grabLinksFromSelectedSection() {
    const container = window._selectedSection || document.body;
    const query = document.querySelector("textarea[name='q'], input[name='q'], input[aria-label='Search']")?.value || "";

    const anchors = Array.from(container.querySelectorAll("a[href]"));
    const rows = [];

    anchors.forEach(a => {
        try {
            const href = a.href;
            if (!href) return;

            const link_cleaned = href.split("#")[0];

            let type = "Custom Section"; // default
            if (a.closest("div[data-hveid][data-async-context], div[jscontroller='EEGHee'], div[jscontroller='VXpV4c'], div[jscontroller='Uut0Ic']")) {
                type = "AI Overview";
            } else if (a.closest("div[jsname='Cpkphb'], div[jscontroller='CedFv']")) {
                type = "People Also Ask";
            }

            rows.push({
                query: cleanText(query),
                link_raw: href,
                link_cleaned: link_cleaned,
                type
            });
        } catch (e) {
            // ignore broken links
        }
    });

    // Remove duplicates by raw URL
    const uniqueRows = [];
    const seen = new Set();
    rows.forEach(r => {
        if (!seen.has(r.link_raw)) {
            seen.add(r.link_raw);
            uniqueRows.push(r);
        }
    });

    return uniqueRows;
}


