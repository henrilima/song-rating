import React, { useState, useEffect } from "react";
import StarRating from "../../components/StarRating";

export default function RatingApp() {
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
            size="15"
            track={track}
            maxStars={5}
            editable={true}
        />
    );
}