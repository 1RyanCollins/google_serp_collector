document.getElementById("grab").addEventListener("click", async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: grabAllLinksFromTable
    }, (results) => {
        if(results && results[0].result){
            const links = results[0].result;
            // Display links as bullet points
            document.getElementById("links").value = links.map(link => `• ${link}`).join("\n");
        }
    });
});

document.getElementById("download").addEventListener("click", () => {
    const text = document.getElementById("links").value;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({
        url: url,
        filename: "all_table_links.txt"
    });
});

function grabAllLinksFromTable() {
    const links = [];
    
    // Grab all links from the Google table with class zVKf0d w2xCsc
    const tables = document.querySelectorAll("div.zVKf0d.w2xCsc");
    tables.forEach(table => {
        const anchors = table.querySelectorAll("a[href]");
        anchors.forEach(a => {
            let href = a.href;
            // Include direct links
            if (href.startsWith("http") || href.startsWith("https")) {
                links.push(href);
            }
            // Handle Google redirect URLs (/url?q=...)
            else if (href.startsWith("/url?q=")) {
                try {
                    const urlParams = new URLSearchParams(href.split("?")[1]);
                    const realUrl = urlParams.get("q");
                    if (realUrl) links.push(realUrl);
                } catch (e) {}
            }
        });
    });

    return Array.from(new Set(links)); // remove duplicates
}

