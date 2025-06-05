function waitForElement(
    selector: string,
    callback: (element: Element) => void
) {
    const interval = setInterval(() => {
        const element = document.querySelector(selector);
        if (element) {
            clearInterval(interval);
            callback(element);
        }
    }, 300);
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export { waitForElement, sleep };
