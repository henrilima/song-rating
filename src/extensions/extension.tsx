import React from "react";

import {
    runPageLogic,
    renderVisibleRows,
    resetLastUri,
} from "./modules/getTracksWithCache";
import { waitForElement } from "./modules/utils";
import RatingApp from "./modules/RatingApp";

function observeMainContainer() {
    let observer: MutationObserver | null = null;

    const setup = () => {
        const main = document.querySelector("#main");
        if (!main) {
            setTimeout(setup, 500); // tenta novamente
            return;
        }

        // Limpa se já existir
        if (observer) observer.disconnect();

        observer = new MutationObserver(() => {
            resetLastUri();
            runPageLogic().then(renderVisibleRows);
        });

        observer.observe(main, {
            childList: true,
            subtree: true,
        });
    };

    setup();

    // Fallback: observar o document.body e reiniciar observer se #main sumir e voltar
    const fallback = new MutationObserver(() => {
        if (!document.querySelector("#main")) return;
        setup();
    });

    fallback.observe(document.body, {
        childList: true,
        subtree: true,
    });
}

(async () => {
    while (!Spicetify?.showNotification) {
        await new Promise((resolve) => setTimeout(resolve, 500));
    }

    Spicetify.showNotification("Song Rater is Working.");

    waitForElement('[data-testid="now-playing-widget"]', (element) => {
        let container = document.getElementById("song-rating-extension");
        if (!container) {
            container = document.createElement("div");
            container.id = "song-rating-extension";
            element.appendChild(container);
        }

        Spicetify.ReactDOM.render(<RatingApp />, container);
    });

    const observer = new MutationObserver(() => {
        runPageLogic().then(renderVisibleRows);
    });

    const observeTarget = document.querySelector("#main");
    if (observeTarget) {
        observer.observe(observeTarget, { childList: true, subtree: true });
    }

    runPageLogic();
    observeMainContainer();
    setInterval(renderVisibleRows, 1000);
})();
