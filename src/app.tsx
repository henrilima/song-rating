import styles from "./css/app.module.scss";
import React, { useState, useEffect } from "react";

import StarRating from "./components/StarRating";

interface TrackInfo {
    uri: string;
    name: string;
    artist: string;
    album: string;
    image: string;
    duration: number;
    progress: number;
    uris: {
        artist: string;
        album: string;
    };
}

interface AppState {
    trackInfo: TrackInfo | null;
    playlistValues: { rate: number; url: string | null }[];
}

function RatingApp() {
    const [track, setTrack] = useState(Spicetify?.Player?.data?.item ?? null);
    const [version, setVersion] = useState(0);

    useEffect(() => {
        const onSongChange = () => {
            setTrack(Spicetify?.Player?.data?.item ?? null);
            setVersion((v) => v + 1);
        };

        Spicetify.Player.addEventListener("songchange", onSongChange);

        return () => {
            Spicetify.Player.removeEventListener("songchange", onSongChange);
        };
    }, []);

    if (!track) return null;

    return (
        <StarRating
            key={`${track.uri}-${version}`}
            size="25"
            track={track}
            maxStars={5}
            editable={true}
        />
    );
}

function savePlaylists() {
    const playlistsId: Array<any> = [1, 2, 3, 4, 5];
    const playlistsUrl: Array<{ rate: number; url: string }> = [];

    playlistsId.forEach((id, index) => {
        const input = document.getElementById(
            `playlist-rate-${id}`
        ) as HTMLInputElement | null;

        const value = input?.value?.trim();

        const spotifyPlaylistRegex =
            /^(https?:\/\/open\.spotify\.com\/playlist\/|spotify:playlist:)([a-zA-Z0-9]+)(\?.*)?$/;

        if (value && spotifyPlaylistRegex.test(value)) {
            const match = value.match(spotifyPlaylistRegex);

            if (match && match[2]) {
                playlistsId[index] = true;
                playlistsUrl.push({
                    rate: id,
                    url: match.join(""),
                });
            }
        } else {
            playlistsId[index] = false;
        }
    });

    if (playlistsId.includes(false) || playlistsUrl.length !== 5) {
        return Spicetify.showNotification(
            "You need to add the URL for all playlists."
        );
    }

    for (let u in playlistsUrl) {
        localStorage.setItem(
            `SONGRATING-PLAYLIST-${playlistsUrl[u].rate}`,
            playlistsUrl[u].url
        );
    }

    return Spicetify.showNotification(
        "Playlists saved successfully. Song ratings will be added to them."
    );
}

function deleteAllPlaylistSettings() {
    [1, 2, 3, 4, 5].forEach((rate) => {
        localStorage.removeItem(`SONGRATING-PLAYLIST-${rate}`);
    });

    Spicetify.showNotification("All playlist settings have been deleted.");
}

class App extends React.Component<{}, AppState> {
    updateInterval: ReturnType<typeof setInterval> | null = null;

    constructor(props: {}) {
        super(props);
        this.state = {
            trackInfo: null,
            playlistValues: [1, 2, 3, 4, 5].map((i) => ({
                rate: i,
                url: localStorage.getItem(`SONGRATING-PLAYLIST-${i}`),
            })),
        };
    }

    componentDidMount() {
        this.updateTrackInfo();

        this.updateInterval = setInterval(() => {
            this.updateTrackInfo();
        }, 1000);
    }

    componentWillUnmount() {
        if (this.updateInterval) clearInterval(this.updateInterval);
    }

    updateTrackInfo() {
        const data = (window as any).Spicetify?.Player?.data;
        if (!data?.item) {
            this.setState({ trackInfo: null });
            return;
        }

        const metadata = data.item.metadata || {};
        const trackInfo: TrackInfo = {
            uri: data.item.uri,
            name: metadata.title || "Sem título",
            artist: metadata.artist_name || "Desconhecido",
            album: metadata.album_title || "Desconhecido",
            image:
                metadata.image_url || data.item.album?.images?.[0]?.url || "",
            duration: (window as any).Spicetify.Player.getDuration(),
            progress: (window as any).Spicetify.Player.getProgress(),
            uris: {
                artist: metadata.artist_uri || "",
                album: metadata.album_uri || "",
            },
        };

        this.setState({ trackInfo });
    }

    updatePlaylistValue(rate: number, url: string) {
        this.setState((prevState) => ({
            playlistValues: prevState.playlistValues.map((entry) =>
                entry.rate === rate ? { ...entry, url } : entry
            ),
        }));
    }

    render() {
        const { trackInfo } = this.state;

        return (
            <div className={styles.container}>
                {!trackInfo ? (
                    <div className={styles.title}>Carregando música...</div>
                ) : (
                    <>
                        <div className={styles.dataBox}>
                            <img
                                src={trackInfo.image}
                                alt="Capa do álbum"
                                style={{
                                    width: 128,
                                    height: 128,
                                    borderRadius: 10,
                                }}
                            />
                            <div>
                                <div className={styles.title}>
                                    {trackInfo.name}
                                </div>
                                <div
                                    onClick={() => {
                                        const uri = Spicetify.URI.fromString(
                                            trackInfo.uris.artist
                                        );
                                        if (
                                            uri &&
                                            uri.type ===
                                                Spicetify.URI.Type.ARTIST
                                        ) {
                                            Spicetify.Platform.History.push(
                                                `${uri.type}/${uri.id}`
                                            );
                                        }
                                    }}
                                    role="button"
                                    className={styles.artist}
                                >
                                    {trackInfo.artist}
                                </div>
                                <div
                                    onClick={() => {
                                        const uri = Spicetify.URI.fromString(
                                            trackInfo.uris.album
                                        );
                                        if (
                                            uri &&
                                            uri.type ===
                                                Spicetify.URI.Type.ALBUM
                                        ) {
                                            Spicetify.Platform.History.push(
                                                `${uri.type}/${uri.id}`
                                            );
                                        }
                                    }}
                                    role="button"
                                    className={styles.album}
                                >
                                    {trackInfo.album}
                                </div>
                            </div>
                        </div>

                        {trackInfo && (
                            <div style={{ marginTop: 32 }}>
                                <RatingApp />
                            </div>
                        )}
                    </>
                )}

                <h2
                    style={{
                        marginTop: 32,
                        textAlign: "center",
                        color: '#f2f2f2'
                    }}
                >
                    Song Rater Settings:
                </h2>

                <form
                    className={styles.playlistsAppComponent}
                    onSubmit={(e) => e.preventDefault()}
                >
                    {[1, 2, 3, 4, 5].map((star) => (
                        <div className={styles.playlistAppComponent} key={star}>
                            <label htmlFor={`playlist-rate-${star}`}>
                                Playlist for {star}-star rating URL
                                {star > 1 ? "s" : ""}:
                            </label>
                            <input
                                type="url"
                                name={`playlist-rate-${star}`}
                                id={`playlist-rate-${star}`}
                                placeholder={`Playlist for ${star}-star rating${
                                    star > 1 ? "s" : ""
                                }`}
                                onChange={(e) =>
                                    this.updatePlaylistValue(
                                        star,
                                        e.target.value
                                    )
                                }
                                value={
                                    this.state.playlistValues.find(
                                        (f) => f.rate === star
                                    )?.url || ""
                                }
                            />
                        </div>
                    ))}
                    <button
                        className={styles.savePlaylistsAppComponent}
                        type="button"
                        onClick={() => savePlaylists()}
                    >
                        Save Playlists
                    </button>
                    <button
                        className={styles.removePlaylistsAppComponent}
                        type="button"
                        onClick={() => deleteAllPlaylistSettings()}
                    >
                        Remove Playlists Links
                    </button>
                </form>

                <span
                    style={{
                        color: "#555555",
                    }}
                >
                    By{" "}
                    <a
                        style={{
                            color: "#555555",
                        }}
                        href="https://github.com/henrilima"
                    >
                        henrilima (github)
                    </a>
                </span>
            </div>
        );
    }
}

export default App;
