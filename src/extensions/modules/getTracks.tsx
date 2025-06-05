import { sleep } from "./utils";

async function getTracksSubsetFromPlaylist(
        playlistId: string,
        offset: number,
        limit: number,
        fetchAll: boolean = false
    ) {
        const allTracks = [];

        do {
            const result = await Spicetify.CosmosAsync.get(
                `https://api.spotify.com/v1/playlists/${playlistId}/tracks?offset=${offset}&limit=${limit}`
            );

            const tracks =
                result?.items
                    ?.map((item: any, index: number) => {
                        if (!item.track) return null;
                        return {
                            name: item.track.name,
                            artist: item.track.artists
                                .map((a: any) => a.name)
                                .join(", "),
                            uri: item.track.uri,
                            index: offset + index,
                        };
                    })
                    .filter(Boolean) ?? [];

            allTracks.push(...tracks);

            if (!fetchAll || tracks.length < limit) break;

            offset += limit;
            await sleep(500);
        } while (true);

        return allTracks;
    }

    async function getTracksSubsetFromAlbum(albumId: string) {
        const result = await Spicetify.CosmosAsync.get(
            `https://api.spotify.com/v1/albums/${albumId}`
        );

        return (
            result?.tracks?.items
                ?.map((item: any, index: number) => {
                    return {
                        name: item.name,
                        artists: item.artists
                            .map((a: any) => a.name)
                            .join(", "),
                        uri: item.uri,
                        index,
                    };
                })
                .filter(Boolean) ?? []
        );
    }

    async function getTracksSubsetFromLiked(
        offset: number,
        limit: number,
        fetchAll: boolean = false
    ) {
        const allTracks = [];
        let totalLoaded = 0;
        let fetchOffset = offset;
        const MAX_LIKED = 100;

        do {
            const result = await Spicetify.CosmosAsync.get(
                `https://api.spotify.com/v1/me/tracks?offset=${fetchOffset}&limit=${limit}`
            );

            const tracks =
                result?.items
                    ?.map((item: any, index: number) => {
                        if (!item.track) return null;
                        return {
                            name: item.track.name,
                            artist: item.track.artists
                                .map((a: any) => a.name)
                                .join(", "),
                            uri: item.track.uri,
                            index: fetchOffset + index,
                        };
                    })
                    .filter(Boolean) ?? [];

            allTracks.push(...tracks);
            totalLoaded += tracks.length;

            if (!fetchAll || tracks.length < limit || totalLoaded >= MAX_LIKED)
                break;

            fetchOffset += 50;
            await sleep(500);
        } while (true);

        return allTracks;
    }

export { getTracksSubsetFromPlaylist, getTracksSubsetFromAlbum, getTracksSubsetFromLiked };