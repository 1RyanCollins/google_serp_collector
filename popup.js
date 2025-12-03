// popup.js


// Click handlers
document.getElementById("grab").addEventListener("click", async () => {
try {
let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
if (!tab?.id) throw new Error('No active tab found');


const results = await chrome.scripting.executeScript({
target: { tabId: tab.id },
func: scrapeGoogleLinks
});


if (!results || !results[0] || !results[0].result || results[0].result.length === 0) {
document.getElementById('links').value = '';
alert('No text-fragment links found on this page.');
return;
}


const rows = results[0].result;


// Build text output for copying (tab-separated)
const formatted = rows.map(r => [
cleanText(r.date),
cleanText(r.query),
cleanText(r.link_raw),
cleanText(r.link_cleaned),
cleanText(r.type)
].join('\t')).join('\n');


document.getElementById('links').value = formatted;


} catch (err) {
console.error(err);
alert('Error: ' + (err.message || err));
}
});


// Copy to clipboard
document.getElementById('copy').addEventListener('click', async () => {
const text = document.getElementById('links').value;
if (!text) { alert('Nothing to copy'); return; }
try {
await navigator.clipboard.writeText(text);
alert('Copied to clipboard');
} catch (e) {
console.error(e);
alert('Copy failed: ' + e.message);
}
});


// Clean non-printable characters
function cleanText(str) {
if (!str && str !== 0) return '';
return String(str).replace(/[^\x20-\x7E\t\n]/g, '');
}


}

