document.addEventListener("DOMContentLoaded", () => {

    // ---------------------------
    // Feature buttons
    // ---------------------------
    document.getElementById("grabPAA").addEventListener("click", () =>
        grabFeature(() => {
            const h = [...document.querySelectorAll("*")]
                .find(e => e.innerText.trim() === "People also ask");
            if (!h) return [];

            const c = h.closest("[role='region']") || h.parentElement;
            c.querySelectorAll("[role='button']").forEach(b => b.click());

            return [...new Set([...c.querySelectorAll("a[href]")].map(a => a.href))];
        })
    );

    document.getElementById("grabAI").addEventListener("click", () =>
        grabFeature(() => {
            const h = [...document.querySelectorAll("*")]
                .find(e => e.innerText.trim() === "AI Overview");
            if (!h) return [];

            const c = h.closest("[role='region']") || h.parentElement;
            return [...new Set([...c.querySelectorAll("a[href]")].map(a => a.href))];
        })
    );

    document.getElementById("grabProducts").addEventListener("click", () =>
        grabFeature(() => {
            const h = [...document.querySelectorAll("*")]
                .find(e => ["Popular products", "Products"].includes(e.innerText.trim()));
            if (!h) return [];

            const c = h.closest("[role='region']") || h.parentElement;
            return [...new Set([...c.querySelectorAll("a[href]")].map(a => a.href))];
        })
    );

    document.getElementById("grabVideos").addEventListener("click", () =>
        grabFeature(() => {
            const h = [...document.querySelectorAll("*")]
                .find(e => e.innerText.trim() === "Videos");
            if (!h) return [];

            const c = h.closest("[role='region']") || h.parentElement;
            return [...new Set([...c.querySelectorAll("a[href]")].map(a => a.href))];
        })
    );

    async function grabFeature(func) {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;

        const res = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func
        });

        const rows = res?.[0]?.result || [];
        document.getElementById("links").value = rows.join("\n");
        window._scrapedRows = rows;
    }

    // ---------------------------
    // Manual section selection
    // ---------------------------
    document.getElementById("selectSection").addEventListener("click", async () => {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;

        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: enableSectionSelection
        });

        alert("Hover over a section, click it, then press 'Grab Links'.");
    });

    document.getElementById("grab").addEventListener("click", async () => {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;

        const res = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: grabLinksFromSelectedSection
        });

        const rows = res?.[0]?.result || [];
        document.getElementById("links").value = rows.join("\n");
        window._scrapedRows = rows;
    });

    // ---------------------------
    // Copy & Download
    // ---------------------------
    document.getElementById("copy").addEventListener("click", async () => {
        const text = document.getElementById("links").value;
        if (!text) return alert("Nothing to copy");
        await navigator.clipboard.writeText(text);
        alert("Copied!");
    });

    document.getElementById("download").addEventListener("click", () => {
        if (!window._scrapedRows?.length) return alert("No data");

        const csv = ["url", ...window._scrapedRows.map(
            u => `"${u.replace(/"/g, '""')}"`
        )].join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        chrome.downloads.download({
            url: URL.createObjectURL(blob),
            filename: "links.csv"
        });
    });
});

// ---------------------------
// Page-context helpers
// ---------------------------
function enableSectionSelection() {
    const style = document.createElement("style");
    style.textContent = `.highlighted-section { outline: 3px solid red !important; }`;
    document.head.appendChild(style);

    function over(e) { e.target.classList.add("highlighted-section"); }
    function out(e) { e.target.classList.remove("highlighted-section"); }

    function click(e) {
        e.preventDefault();
        e.stopPropagation();
        document.removeEventListener("mouseover", over, true);
        document.removeEventListener("mouseout", out, true);
        document.removeEventListener("click", click, true);
        window._selectedSection = e.target;
        alert("Section selected");
    }

    document.addEventListener("mouseover", over, true);
    document.addEventListener("mouseout", out, true);
    document.addEventListener("click", click, true);
}

function grabLinksFromSelectedSection() {
    const c = window._selectedSection || document.body;
    return [...new Set([...c.querySelectorAll("a[href]")].map(a => a.href))];
}








