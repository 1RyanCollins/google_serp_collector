// Updated popup.js

document.getElementById("grab").addEventListener("click", async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: grabTextFragmentLinks
    }, (results) => {
        if (results && results[0] && results[0].result) {
            // Clean each link (remove weird characters)
            const rawLinks = results[0].result;
            const links = rawLinks.map(link => cleanText(link)).filter(l => l);

            // Use a plain hyphen bullet to avoid encoding/broken characters
            document.getElementById("links").value = links.map(link => `- ${link}`).join("\n");

            // Add credit into a dropdown in the popup UI.
            // If a dropdown with id "creditDropdown" doesn't exist, create one below the textarea.
            addCreditToDropdown("Developed by Ryan Collins - https://ryancollinsphd.com/");
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

// Remove non-printable / odd characters and normalize whitespace.
// Keeps standard printable ASCII and basic URL characters.
function cleanText(str) {
    if (!str && str !== 0) return "";
    // convert to string
    let s = String(str);

    // Replace common mojibake characters sometimes seen (optional)
    s = s.replace(/\uFFFD/g, ''); // replacement char
    s = s.replace(/â€¢/g, ''); // explicit removal if present

    // Remove control chars and non-ASCII beyond basic punctuation (but keep common URL chars)
    // Allowable chars: ASCII 0x20 (space) through 0x7E (~), plus tab/newline just in case
    s = s.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');

    // Trim and collapse multi-spaces
    s = s.trim().replace(/\s+/g, ' ');

    return s;
}

// Adds a dropdown/select to the popup (or updates if exists) and ensures the credit option is present.
function addCreditToDropdown(creditText) {
    try {
        let container = document.getElementById('creditDropdownContainer');

        // If no container, append one below the textarea
        if (!container) {
            container = document.createElement('div');
            container.id = 'creditDropdownContainer';
            container.style.marginTop = '8px';

            // try to insert after textarea if found
            const textarea = document.getElementById('links');
            if (textarea && textarea.parentNode) {
                textarea.parentNode.insertBefore(container, textarea.nextSibling);
            } else {
                document.body.appendChild(container);
            }
        }

        let select = document.getElementById('creditDropdown');

        if (!select) {
            select = document.createElement('select');
            select.id = 'creditDropdown';
            select.style.width = '100%';
            select.style.marginTop = '6px';
            container.appendChild(select);

            // default placeholder option
            const placeholder = document.createElement('option');
            placeholder.textContent = '-- Credit --';
            placeholder.value = '';
            placeholder.disabled = true;
            placeholder.selected = true;
            select.appendChild(placeholder);
        }

        // Avoid duplicate entries
        const already = Array.from(select.options).some(opt => opt.text === creditText);
        if (!already) {
            const opt = document.createElement('option');
            opt.value = creditText;
            opt.text = creditText;
            select.appendChild(opt);
        }
    } catch (e) {
        // don't break main flow if UI injection fails
        console.warn('addCreditToDropdown failed:', e);
    }
}

/* 
Original grabber function ( runs in the page context by executeScript ).
It returns an array of page URLs (cleaned from the fragment) that contain #:~:text=
*/
function grabTextFragmentLinks() {
    const links = [];

    // Grab all <a> links on the page
    const anchors = document.querySelectorAll("a[href]");
    anchors.forEach(a => {
        let href = a.href;

        // Only process links containing ":~:text="
        if (href && href.includes(":~:text=")) {
            try {
                // Strip the text fragment to get the main page URL
                const mainUrl = href.split("#")[0];
                links.push(mainUrl);
            } catch (e) {
                // ignore per-link errors
            }
        }
    });

    // remove duplicates while preserving order
    return Array.from(new Set(links));
}


