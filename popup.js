// popup.js

document.getElementById("grab").addEventListener("click", async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: grabTextFragmentLinksWithType
    }, (results) => {
        if (results && results[0] && results[0].result) {
            const rows = results[0].result;

            // Display in textarea
            const displayText = rows.map(r =>
                `- ${r.link_raw}`
            ).join("\n");
            document.getElementById("links").value = displayText;

            // Save data for CSV download
            window._scrapedRows = rows;
        }
    });
});

document.getElementById("download").addEventListener("click", () => {
    if (!window._scrapedRows || window._scrapedRows.length === 0) {
        alert("No data to download. Grab links first.");
        return;
    }

    // Build CSV
    const csvHeader = ['query', 'url_with_text_fragment', 'url_cleaned', 'type'];
    const csvRows = window._scrapedRows.map(r =>
        [
            `"${r.query.replace(/"/g, '""')}"`,
            `"${r.link_raw}"`,
            `"${r.link_cleaned}"`,
            `"${r.type}"`
        ].join(',')
    );
    const csvContent = [csvHeader.join(','), ...csvRows].join('\n');

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({
        url: url,
        filename: "text_fragment_links.csv"
    });
});

// Clean non-printable characters
function cleanText(str) {
    if (!str && str !== 0) return "";
    let s = String(str);
    s = s.replace(/\uFFFD/g, '');
    s = s.replace(/â€¢/g, '');
    s = s.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
    s = s.trim().replace(/\s+/g, ' ');
    return s;
}

// Scrape text-fragment links with type determination
function grabTextFragmentLinksWithType() {
    const rows = [];
    const query = document.querySelector("textarea[name='q'], input[name='q']")?.value || "";

    const anchors = Array.from(document.querySelectorAll("a[href*=':~:text=']"));

    anchors.forEach(a => {
        try {
            const href = a.href;
            const cleaned = href.split('#')[0];

            // Determine type based on proximity in DOM to known containers
            let type = "Other";

            // AI Overview heuristics
            const aiContainer = a.closest("div[data-hveid][data-async-context], div[jscontroller='EEGHee'], div[jscontroller='VXpV4c'], div[jscontroller='Uut0Ic']");
            if (aiContainer) type = "AI Overview";

            // People Also Ask heuristics
            const paaContainer = a.closest("div[jsname='Cpkphb'], div[jscontroller='CedFv']");
            if (paaContainer) type = "People Also Ask";

            rows.push({
                query: cleanText(query),
                link_raw: href,
                link_cleaned: cleaned,
                type
            });
        } catch (e) {}
    });

    return rows;
}



