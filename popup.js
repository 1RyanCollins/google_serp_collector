document.addEventListener("DOMContentLoaded", () => {

    // ---------------------------
    // Feature button handlers
    // ---------------------------
    document.getElementById("grabPAA")?.addEventListener("click", () =>
        grabFeature(grabPeopleAlsoAskLinks)
    );

    document.getElementById("grabAI")?.addEventListener("click", () =>
        grabFeature(grabAIOverviewLinks)
    );

    document.getElementById("grabProducts")?.addEventListener("click", () =>
        grabFeature(grabPopularProductsLinks)
    );

    document.getElementById("grabVideos")?.addEventListener("click", () =>
        grabFeature(grabVideoLinks)
    );

    async function grabFeature(func) {
        try {
            let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) return;

            const res = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func
            });

            const rows = res?.[0]?.result || [];
            document.getElementById("links").value = rows.join("\n");
            window._scrapedRows = rows;
        } catch (e) {
            alert("Error grabbing feature");
            console.error(e);
        }
    }

    // ---------------------------
    // Manual section selection
    // ---------------------------
    document.getElementById("selectSection")?.addEventListener("click", async () => {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;

        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: enableSectionSelection
        });

        alert("Hover a section, click it, then press 'Grab Links'.");
    });

    document.getElementById("grab")?.addEventListener("click", async () => {
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
    // Copy + Download
    // ---------------------------
    document.getElementById("copy")?.addEventListener("click", async () => {
        const text = document.getElementById("links").value;
        if (!text) return alert("Nothing to copy");
        await navigator.clipboard.writeText(text);
        alert("Copied!");
    });

    document.getElementById("download")?.addEventListener("click", () => {
        if (!window._scrapedRows?.length) return alert("No data");

        const csv = ["url", ...window._scrapedRows.map(u => `"${u.replace(/"/g,'""')}"`)].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        chrome.downloads.download({
            url: URL.createObjectURL(blob),
            filename: "links.csv"
        });
    });

    // ---------------------------
    // Detect SERP features on open
    // ---------------------------
    (async function detectFeatures() {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;

        const res = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => ({
                paa: detectByHeading("People also ask"),
                ai: detectByHeading("AI Overview"),
                products: detectByHeading("Popular products") || detectByHeading("Products"),
                videos: detectByHeading("Videos")
            })
        });

        const d = res?.[0]?.result || {};
        const found = [];

        toggle("grabPAA", d.paa, found, "People Also Ask");
        toggle("grabAI", d.ai, found, "AI Overview");
        toggle("grabProducts", d.products, found, "Popular Products");
        toggle("grabVideos", d.videos, found, "Videos");

        document.getElementById("detectedFeature").textContent =
            found.length ? `Detected: ${found.join(", ")}` : "No SERP features detected";
    })();

    function toggle(id, enabled, list, label) {
        const btn = document.getElementById(id);
        btn.disabled = !enabled;
        if (enabled) list.push(label);
    }
});

// ---------------------------
// Page-context helpers
// ---------------------------
function detectByHeading(text) {
    return [...document.querySelectorAll("div, span, h1, h2, h3")]
        .some(el => el.innerText.trim() === text);
}

function enableSectionSelection() {
    const style = document.createElement("style");
    style.textContent = `.highlighted-section { outline: 3px solid red !important; }`;
    document.head.appendChild(style);

    function over(e){ e.target.classList.add("highlighted-section"); }
    function out(e){ e.target.classList.remove("highlighted-section"); }
    function click(e){
        e.preventDefault(); e.stopPropagation();
        document.removeEventListener("mouseover", over, true);
        document.removeEventListener("mouseout", out, true);
        document.removeEventListener("click", click, true);
        window._selectedSection = e.target.closest("[role='region']") || e.target;
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

// ---------------------------
// Feature grabbers
// ---------------------------
function grabPeopleAlsoAskLinks() {
    const h = [...document.querySelectorAll("*")].find(e => e.innerText.trim() === "People also ask");
    if (!h) return [];
    const c = h.closest("[role='region']") || h.parentElement;
    c.querySelectorAll("[role='button']").forEach(b => b.click());
    return [...new Set([...c.querySelectorAll("a[href]")].map(a => a.href))];
}

function grabAIOverviewLinks() {
    const h = [...document.querySelectorAll("*")].find(e => e.innerText.trim() === "AI Overview");
    if (!h) return [];
    const c = h.closest("[role='region']") || h.parentElement;
    return [...new Set([...c.querySelectorAll("a[href]")].map(a => a.href))];
}

function grabPopularProductsLinks() {
    const h = [...document.querySelectorAll("*")].find(e =>
        ["Popular products", "Products"].includes(e.innerText.trim())
    );
    if (!h) return [];
    const c = h.closest("[role='region']") || h.parentElement;
    return [...new Set([...c.querySelectorAll("a[href]")].map(a => a.href))];
}

function grabVideoLinks() {
    const h = [...document.querySelectorAll("*")].find(e => e.innerText.trim() === "Videos");
    if (!h) return [];
    const c = h.closest("[role='region']") || h.parentElement;
    return [...new Set([...c.querySelectorAll("a[href]")].map(a => a.href))];
}





