import React, { useState, useEffect } from "react";
import { addToPlaylist, removeFromPlaylist } from "./modules/managerPlaylists";

type StarRatingProps = {
    track: { name: string; uri: string };
    maxStars: number;
    editable: boolean;
    size: string;
};

const StarRating = ({
    size = "20",
    maxStars = 5,
    editable,
    track,
}: StarRatingProps) => {
    const [rating, setRating] = useState(0);
    const [hovered, setHovered] = useState(0);

    useEffect(() => {
        const saved = Number(localStorage.getItem(`TRACK-${track.uri}`));
        if (!isNaN(saved) && saved > 0) {
            setRating(saved);
        }

        const onExternalRatingChange = (e: any) => {
            if (e.detail?.uri === track.uri) {
                const newRating = Number(e.detail.rating);
                if (!isNaN(newRating)) {
                    if (e.detail?.clear) {
                        setRating(0);
                    } else {
                        setRating(newRating);
                    }
                }
            }
        };

        window.addEventListener("rating-changed", onExternalRatingChange);
        return () => {
            window.removeEventListener(
                "rating-changed",
                onExternalRatingChange
            );
        };
    }, [track.uri]);

    const handleClick = (starValue: number) => {
        if (!editable) return;

        if (
            Number(starValue) ===
            Number(localStorage.getItem(`TRACK-${track.uri}`))
        ) {
            removeFromPlaylist(starValue, track.uri);
            localStorage.removeItem(`TRACK-${track.uri}`);
            window.dispatchEvent(
                new CustomEvent("rating-changed", {
                    detail: { uri: track.uri, rating: starValue, clear: true },
                })
            );
        } else {
            const lastRate = rating;
            setRating(starValue);
            addToPlaylist(lastRate, starValue, track.uri);
            localStorage.setItem(`TRACK-${track.uri}`, String(starValue));
            window.dispatchEvent(
                new CustomEvent("rating-changed", {
                    detail: { uri: track.uri, rating: starValue, clear: false },
                })
            );
            Spicetify.showNotification(
                `The song '${track.name}' has been rated.`
            );
        }
    };

    const handleMouseEnter = (starValue: number) => {
        if (editable) setHovered(starValue);
    };

    const handleMouseLeave = () => {
        if (editable) setHovered(0);
    };

    return (
        <div
            style={{
                display: "flex",
                gap: 5,
                cursor: editable ? "pointer" : "default",
                userSelect: "none",
                pointerEvents: "auto",
            }}
        >
            {Array.from({ length: maxStars }, (_, index) => {
                const starValue = index + 1;
                const filled =
                    hovered >= starValue || (!hovered && rating >= starValue);

                return (
                    <svg
                        key={starValue}
                        onClick={() => handleClick(starValue)}
                        onMouseEnter={() => handleMouseEnter(starValue)}
                        onMouseLeave={handleMouseLeave}
                        xmlns="http://www.w3.org/2000/svg"
                        width={size}
                        height={size}
                        viewBox="0 0 24 24"
                        fill={filled ? "gold" : "gray"}
                        style={{ transition: "fill 0.2s", flexShrink: 0 }}
                    >
                        <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.884 1.508 8.31L12 18.896l-7.444 4.604 1.508-8.31L.001 9.306l8.332-1.151z" />
                    </svg>
                );
            })}
        </div>
    );
};

export default StarRating;
