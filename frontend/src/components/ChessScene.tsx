import React from "react";
import "./ChessScene.css";

const PIECES = ["♔", "♕", "♖", "♗", "♘", "♙", "♚", "♛", "♜", "♝", "♞", "♟"];

const FLOATERS: { piece: string; left: number; delay: number; duration: number; size: number; rotate: number }[] = Array.from(
  { length: 28 },
  (_, i) => ({
    piece: PIECES[i % PIECES.length],
    left: Math.round((i / 28) * 100),
    delay: parseFloat(((i * 0.5) % 6).toFixed(1)),
    duration: parseFloat((10 + (i % 6)).toFixed(1)),
    size: parseFloat((1.4 + ((i * 7) % 24) / 10).toFixed(1)),
    rotate: (i % 2 === 0 ? 1 : -1) * (15 + (i % 30)),
  }),
);

export default function ChessScene() {
  return (
    <div className="chess-bg" aria-hidden="true">
      {FLOATERS.map((f, i) => (
        <span
          key={i}
          className="chess-float"
          style={
            {
              left: `${f.left}%`,
              fontSize: `${f.size}rem`,
              animationDelay: `${f.delay}s`,
              animationDuration: `${f.duration}s`,
              ["--rot"]: `${f.rotate}deg`,
            } as React.CSSProperties
          }
        >
          {f.piece}
        </span>
      ))}
    </div>
  );
}
