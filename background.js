const targetUrl = 'https://chat.openai.com';

chrome.omnibox.onInputEntered.addListener((text, disposition) => {
    customSearch(text);
});

function customSearch(query) {
    // Your custom JavaScript action goes here
    console.log("Searching for:", query);

    findOrCreateTab((tab) => {
        sendPromptToTab(tab.id, query);
    });
}

function findOrCreateTab(callback) {
    // Example: Access the storage of a specific web origin and activate the most recently active tab
    chrome.tabs.query({ url: targetUrl + "/*" }, (tabs) => {
        console.log("Found tabs:", tabs);
        if (tabs.length > 0) {
            // Sort the tabs based on their creation time, descending (approximate).
            tabs.sort((a, b) => b.id - a.id);

            // Get the most recently active tab
            const targetTab = tabs[0];

            // Send the message to the content script in the target tab
            callback(targetTab);

            // Activate the tab
            chrome.tabs.update(targetTab.id, { active: true });

            // Bring the window containing the tab into focus
            chrome.windows.update(targetTab.windowId, { focused: true });

        } else {
            // Open the target URL in a new tab and send the message after the tab is created
            chrome.tabs.create({ url: targetUrl + "/" }, (newTab) => {
                // Wait for the tab to be fully loaded before sending the message
                chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
                    if (tabId === newTab.id && changeInfo.status === 'complete') {
                        chrome.tabs.onUpdated.removeListener(listener);
                        callback(newTab);
                    }
                });
            });
        }
    });
}

function sendPromptToTab(tabId, prompt) {
    chrome.tabs.sendMessage(tabId, { type: "PROMPT", value: prompt }, (response) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
        } else {
            console.log("Prompt response:", response);
        }
    });
}
