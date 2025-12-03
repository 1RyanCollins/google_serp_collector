document.addEventListener("DOMContentLoaded", () => {

    document.getElementById("grab").addEventListener("click", async () => {
        try {
            let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) throw new Error("No active tab found.");

            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: grabTextFragmentLinksWithType
            });

            if (!results || !results[0] || !results[0].result) {
                document.getElementById("links").value = "";
                return;
            }

            const rows = results[0].result;

            // Display links in textarea with bullet and include type info
            document.getElementById("links").value = rows.map(r =>
                `- ${r.type}: ${r.link_raw}`
            ).join("\n");

            // Save for CSV download
            window._scrapedRows = rows;

        } catch (err) {
            console.error(err);
            alert("Error grabbing links: " + err.message);
        }
    });

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

    document.getElementById("download")?.addEventListener("click", () => {
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

// Clean text
function cleanText(str) {
    if (!str && str !== 0) return "";
    let s = String(str);
    s = s.replace(/\uFFFD/g,'').replace(/â€¢/g,'').replace(/[^\x09\x0A\x0D\x20-\x7E]/g,'');
    s = s.trim().replace(/\s+/g,' ');
    return s;
}

// Grab links with type detection
function grabTextFragmentLinksWithType() {
    const rows = [];
    const query = document.querySelector("textarea[name='q'], input[name='q'], input[aria-label='Search']")?.value || "";

    const anchors = Array.from(document.querySelectorAll("a[href*=':~:text=']"));

    anchors.forEach(a => {
        try {
            const href = a.href;
            const link_cleaned = href.split("#")[0];

            // Detect location/type
            let type = "Other";
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
        } catch (e) {}
    });

    return rows;
}



