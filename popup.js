document.getElementById("grab").addEventListener("click", async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: scrapeGoogleLinks
    }, (results) => {
        if (!results || !results[0].result) return;

        let rows = results[0].result;

        // Build text output for copying
        let formatted = rows.map(r => 
            [
                cleanText(r.date),
                cleanText(r.query),
                cleanText(r.link_raw),
                cleanText(r.link_cleaned),
                cleanText(r.type)
            ].join("\t")
        ).join("\n");

        // Add your footer
        formatted += `\n\nDeveloped by Ryan Collins - https://ryancollinsphd.com/`;

        document.getElementById("links").value = formatted;
    });
});

document.getElementById("copy").addEventListener("click", () => {
    const text = document.getElementById("links").value;
    navigator.clipboard.writeText(text).then(() => {
        alert("Copied!");
    });
});

// Removes strange characters like “â€¢”
function cleanText(str) {
    if (!str) return "";
    return str.replace(/[^\x20-\x7E]/g, ""); 
}

/* 
Runs inside the Google SERP page & extracts:
- Raw link
- Cleaned link
- Detects whether it's People Also Ask or AI Overview
*/
function scrapeGoogleLinks() {
    const rows = [];
    const date = new Date().toISOString().slice(0, 10);

    const query = document.querySelector("textarea[name='q'], input[name='q']")?.value || "";

    // --- 1. AI OVERVIEW LINKS ---
    document.querySelectorAll("div[data-hveid][data-async-context] a[href]").forEach(a => {
        const href = a.href;
        if (href.includes(":~:text=")) {
            rows.push({
                date,
                query,
                link_raw: href,
                link_cleaned: href.split("#")[0],
                type: "AI Overview"
            });
        }
    });

    // --- 2. PEOPLE ALSO ASK LINKS ---
    document.querySelectorAll("div[jsname='Cpkphb'] a[href]").forEach(a => {
        const href = a.href;
        if (href.includes(":~:text=")) {
            rows.push({
                date,
                query,
                link_raw: href,
                link_cleaned: href.split("#")[0],
                type: "People Also Ask"
            });
        }
    });

    return rows;
}


    return Array.from(new Set(links)); // remove duplicates
}


