document.getElementById("grab").addEventListener("click", async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: grabAILinks
    }, (results) => {
        if(results && results[0].result){
            document.getElementById("links").value = results[0].result.join("\n");
        }
    });
});

document.getElementById("download").addEventListener("click", () => {
    const text = document.getElementById("links").value;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({
        url: url,
        filename: "ai_overview_links.txt"
    });
});

function grabAILinks() {
    const anchors = Array.from(document.querySelectorAll("a"));
    let links = anchors.map(a => a.href)
                       .filter(href => href.includes("ai") || href.toLowerCase().includes("artificial-intelligence"))
                       .filter(href => href.startsWith("http") || href.startsWith("https"));
    return Array.from(new Set(links)); // remove duplicates
}
