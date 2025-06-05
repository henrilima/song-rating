import React from "react";
import StarRating from "../../components/StarRating";
import {
    getTracksSubsetFromPlaylist,
    getTracksSubsetFromAlbum,
    getTracksSubsetFromLiked,
} from "./getTracks";

let lastUri = "";
let currentPageType = "";
let currentPageId = "";
const renderedRowsMap = new Map<HTMLElement, string>();
const trackCache = new Map<string, any>();
const pendingRequests = new Map<string, Promise<any>>();

function observeRowCountChanges(
    containerSelector: string,
    cacheKey: string,
    refetchCallback: () => Promise<void>
) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    let previousRowCount = container.getAttribute("aria-rowcount");

    const observer = new MutationObserver(async (mutations) => {
        for (const mutation of mutations) {
            if (
                mutation.type === "attributes" &&
                mutation.attributeName === "aria-rowcount"
            ) {
                const newRowCount = container.getAttribute("aria-rowcount");
                if (newRowCount !== previousRowCount) {
                    previousRowCount = newRowCount;

                    trackCache.delete(cacheKey);

                    await refetchCallback();
                }
            }
        }
    });

    observer.observe(container, {
        attributes: true,
        attributeFilter: ["aria-rowcount"],
    });
}

async function runPageLogic() {
    const mainElement = document.querySelector(
        'main[tabindex="-1"][aria-label]'
    );
    if (!mainElement) return;

    let pageType = "";
    let pageId = "";
    if (
        String(Spicetify.Platform.History.location.pathname).includes(
            "playlist"
        )
    ) {
        pageType = "playlist";
        const playlistElement = document.querySelector(
            'section[data-testid="playlist-page"]'
        );
        const uri = playlistElement?.getAttribute("data-test-uri") ?? "";
        if (!uri || uri === lastUri) return;
        lastUri = uri;
        pageId = uri.split(":")[2];
    } else if (
        String(Spicetify.Platform.History.location.pathname).includes("album")
    ) {
        pageType = "album";
        const albumPath = Spicetify.Platform.History.location.pathname;
        const match = albumPath.match(/album\/([a-zA-Z0-9]+)/);
        if (!match) return;
        pageId = match[1];
        if (pageId === lastUri) return;
        lastUri = pageId;
    } else if (
        String(Spicetify.Platform.History.location.pathname).includes(
            "collection/tracks"
        )
    ) {
        pageType = "liked";
        if (lastUri === "liked") return;
        pageId = "liked";
        lastUri = "liked";
    } else {
        return;
    }

    currentPageType = pageType;
    currentPageId = pageId;

    renderedRowsMap.clear();
}

async function renderVisibleRows() {
    if (!currentPageType) return;

    let pageElement: HTMLElement | null = null;

    if (currentPageType === "playlist") {
        pageElement = document.querySelector(
            'section[data-testid="playlist-page"]'
        );
    } else if (currentPageType === "album") {
        pageElement = document.querySelector(
            'section[data-testid="album-page"]'
        );
    } else if (currentPageType === "liked") {
        pageElement = document.querySelector(
            'section[data-testid="playlist-page"]'
        );
    }

    if (!pageElement) return;

    const rows = Array.from(
        pageElement.querySelectorAll('div[role="row"]')
    ).filter(
        (row) => !row.closest(".playlist-playlist-recommendedTrackList")
    ) as HTMLElement[];

    if (rows.length === 0) return;

    const rowIndexes = rows.map((row) =>
        Number(row.getAttribute("aria-rowindex"))
    );

    const offset = Math.min(...rowIndexes) - 1;
    const limit = 100;

    const totalRowCountAttr = pageElement
        .querySelector('div[role="grid"].main-trackList-trackList')
        ?.getAttribute("aria-rowcount");

    const totalRowCount = totalRowCountAttr ? Number(totalRowCountAttr) : 0;

    const rowCountKey = `${currentPageType}:${currentPageId}:rowCount`;

    if (!trackCache.has(rowCountKey) && totalRowCount > 0) {
        trackCache.set(rowCountKey, totalRowCount);
    }

    const tracks = await getTracksWithCache(
        currentPageType,
        currentPageId,
        offset,
        limit,
        Number(trackCache.get(rowCountKey)) !== totalRowCount,
        pageElement
    );

    for (const row of rows) {
        const index = Number(row.getAttribute("aria-rowindex")) - offset - 2;
        const track = tracks[index];
        if (!track) continue;

        const target = row.querySelector(
            ".main-trackList-rowSectionStart"
        ) as HTMLElement | null;
        if (!target) continue;

        if (renderedRowsMap.get(row) === track.uri) continue;

        let container = target.querySelector(
            ".song-rating-extension-row"
        ) as HTMLElement | null;

        if (!container) {
            container = document.createElement("div");
            container.className = "song-rating-extension-row";
            container.style.display = "flex";
            container.style.alignItems = "center";
            target.appendChild(container);
        } else {
            Spicetify.ReactDOM.unmountComponentAtNode(container);
        }

        target.style.display = "flex";
        target.style.justifyContent = "space-between";
        target.style.alignItems = "center";

        Spicetify.ReactDOM.render(
            React.createElement(StarRating, {
                track: { name: track.name, uri: track.uri },
                size: "15",
                maxStars: 5,
                editable: true,
            }),
            container
        );

        renderedRowsMap.set(row, track.uri);
    }

    // Limpeza de rows antigos
    for (const row of renderedRowsMap.keys()) {
        if (!rows.includes(row)) {
            const target = row.querySelector(
                ".main-trackList-rowSectionStart"
            ) as HTMLElement | null;
            const container = target?.querySelector(
                ".song-rating-extension-row"
            );
            if (container) {
                Spicetify.ReactDOM.unmountComponentAtNode(container);
                container.remove();
            }
            renderedRowsMap.delete(row);
        }
    }
}

async function getTracksWithCache(
    pageType: string,
    pageId: string,
    offset: number,
    limit: number,
    force: boolean = false,
    pageElement: HTMLElement
) {
    const cacheKey = `${pageType}:${pageId}:all`;
    const rowCountKey = `${pageType}:${pageId}:rowCount`;

    const totalRowCountAttr = pageElement
        .querySelector('div[role="grid"].main-trackList-trackList')
        ?.getAttribute("aria-rowcount");

    const totalRowCount = totalRowCountAttr ? Number(totalRowCountAttr) : 0;

    if (!force && trackCache.has(cacheKey)) {
        trackCache.set(rowCountKey, totalRowCount);

        return trackCache.get(cacheKey);
    }

    if (!force && pendingRequests.has(cacheKey)) {
        return pendingRequests.get(cacheKey);
    }

    trackCache.set(rowCountKey, totalRowCount);

    let promise = (async () => {
        let data;

        if (pageType === "playlist") {
            let observerKey = cacheKey;
            observeRowCountChanges(
                'div[role="grid"].main-trackList-trackList',
                observerKey,
                async () => {
                    const updated = await getTracksSubsetFromPlaylist(
                        pageId,
                        0,
                        100,
                        true
                    );
                    trackCache.set(observerKey, updated);
                }
            );

            data = await getTracksSubsetFromPlaylist(pageId, 0, 100, true);
        } else if (pageType === "album") {
            data = await getTracksSubsetFromAlbum(pageId);
        } else if (pageType === "liked") {
            Spicetify.showNotification(
                "Rating stars will load only the first 100 liked songs."
            );

            const observerKey = cacheKey;
            observeRowCountChanges(
                'div[role="grid"].main-trackList-trackList',
                observerKey,
                async () => {
                    const updated = await getTracksSubsetFromLiked(0, 50, true);
                    trackCache.set(observerKey, updated);
                }
            );

            data = await getTracksSubsetFromLiked(0, 50, true);
        }

        trackCache.set(cacheKey, data);
        pendingRequests.delete(cacheKey);
        return data;
    })();

    pendingRequests.set(cacheKey, promise);

    return promise;
}

function resetLastUri() {
    lastUri = "";
}

export { runPageLogic, renderVisibleRows, resetLastUri };
