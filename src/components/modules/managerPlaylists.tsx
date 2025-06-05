const spotifyPlaylistRegex =
    /^(https?:\/\/open\.spotify\.com\/playlist\/|spotify:playlist:)([a-zA-Z0-9]+)(\?.*)?$/;

async function addToPlaylist(lastRate: number, rate: number, track: string) {
    const value = localStorage.getItem(`SONGRATING-PLAYLIST-${rate}`);

    if (!value) return;

    const match = value.match(spotifyPlaylistRegex);
    if (!match) return;

    if (lastRate === rate) {
        await Spicetify.CosmosAsync.post(
            `https://api.spotify.com/v1/playlists/${match[2]}/tracks`,
            {
                uris: [track],
            }
        );
    } else {
        await removeFromPlaylist(lastRate, track);
        await Spicetify.CosmosAsync.post(
            `https://api.spotify.com/v1/playlists/${match[2]}/tracks`,
            {
                uris: [track],
            }
        );
    }
}

async function removeFromPlaylist(rate: number, track: string) {
    const value = localStorage.getItem(`SONGRATING-PLAYLIST-${rate}`);
    if (!value) return;

    const match = value.match(spotifyPlaylistRegex);
    if (!match) return;

    await Spicetify.CosmosAsync.del(
        `https://api.spotify.com/v1/playlists/${match[2]}/tracks`,
        {
            tracks: [{ uri: track }],
        }
    );
}

export { addToPlaylist, removeFromPlaylist };
