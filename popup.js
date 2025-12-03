document.getElementById("grab").addEventListener("click", async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: grabTextFragmentLinks
    }, (results) => {
        if(results && results[0].result){
            const links = results[0].result;
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
        filename: "text_fragment_links.txt"
    });
});

function grabTextFragmentLinks() {
    const links = [];

    // Grab all <a> links on the page
    const anchors = document.querySelectorAll("a[href]");
    anchors.forEach(a => {
        let href = a.href;

        // Only process links containing ":~:text="
        if (href.includes(":~:text=")) {
            try {
                // Strip the text fragment to get the main page URL
                const mainUrl = href.split("#")[0];
                links.push(mainUrl);
            } catch (e) {}
        }
    });

    return Array.from(new Set(links)); // remove duplicates
}


