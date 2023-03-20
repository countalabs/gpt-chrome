// This is the content script that runs in the context of the page

// ----------------------------
// Manage the prompt requests. Only one prompt can be active at a time.
let latestPrompt = null;
let latestSendResponse = null;

function pushPrompt(prompt, sendResponse) {
    if (latestSendResponse) {
        latestSendResponse({ error: "ignored an outdated prompt" });
    }
    latestPrompt = prompt;
    latestSendResponse = sendResponse;
}

function popPrompt() {
    const prompt = latestPrompt;
    if (latestSendResponse) {
        latestSendResponse({ error: null });
    }
    latestPrompt = null;
    latestSendResponse = null;
    return prompt;
}

// ----------------------------
// Wait for the page and scripts to be fully loaded.
let pageReadyResolve = null;
let pageReady = new Promise((resolve) => {
    pageReadyResolve = resolve;
});
// Wait for the page load, for an element to appear, and another moment to make sure the page is fully loaded.
window.addEventListener('load', () => {
    waitForElement("textarea", (_textarea) => {
        setTimeout(() => {
            pageReadyResolve();
        }, 1 * 1000);
    });
});

function waitForElement(selector, callback) {
    const element = document.querySelector(selector);

    if (element) {
        callback(element);
    } else {
        const observer = new MutationObserver((mutations, observerInstance) => {
            const element = document.querySelector(selector);
            if (element) {
                callback(element);
                observerInstance.disconnect(); // Stop observing once the element is found
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }
}

function waitForElementStable(selector, callback) {
    pageReady.then(() => {
        waitForElement(selector, callback);
    });
}

//---------------------------
// Listen for messages from the background script.
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {

    if (request.type === 'PROMPT') {
        console.log("Prompt request received:", request.value);
        pushPrompt(request.value, sendResponse);

        waitForElementStable("textarea[data-id]", (textarea) => {
            let form = textarea.closest("form");
            if (!form) {
                console.error("No form found for textarea");
                return;
            }

            let prompt = popPrompt();
            if (!prompt) {
                console.error("No prompt found");
                return;
            }

            console.log("Form found, submit prompt:", prompt);
            dispatchText(textarea, prompt);
            dispatchSubmit(form);
        });
    }

    return true;
});

// ----------------------------
// DOM and React helper functions.
function dispatchText(element, value) {
    // Set the input value
    element.value = value;

    // Create and dispatch an input event
    const event = new Event('input', { bubbles: true, cancelable: true });
    element.dispatchEvent(event);
}

function dispatchSubmit(form) {
    // Create and dispatch a submit event
    const event = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
}

// ----------------------------
console.log("Content script loaded");

/*
const copyHtml = `<button class="flex ml-auto gap-2"><svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>Copy code</button>`;
*/
