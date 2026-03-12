import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Trophy } from "lucide-react";
import { isAdmin } from "../api";
import ThemeToggle from "../components/ThemeToggle";

type PieceSpec = { symbol: string; col: number; row: number; anim: string; delay?: string };

const SLIDES: Array<{ title: string; sub: string; accent: string; pieces: PieceSpec[] }> = [
  {
    title: "Fair Pairings",
    sub: "Fair matchmaking — every round",
    accent: "#d4af37",
    pieces: [
      { symbol: "♞", col: 3, row: 3, anim: "pieceHop" },
      { symbol: "♟", col: 4, row: 4, anim: "pieceBob" },
      { symbol: "♟", col: 5, row: 4, anim: "pieceBob", delay: "0.4s" },
      { symbol: "♖", col: 7, row: 6, anim: "piecePulse" },
      { symbol: "♙", col: 2, row: 5, anim: "pieceBob", delay: "0.2s" },
      { symbol: "♛", col: 5, row: 2, anim: "piecePulse", delay: "0.6s" },
      { symbol: "♔", col: 7, row: 7, anim: "kingMove" },
      { symbol: "♚", col: 4, row: 1, anim: "kingMove", delay: "0.3s" },
    ],
  },
  {
    title: "Live Standings",
    sub: "Real-time scores as results arrive",
    accent: "#7ec8e3",
    pieces: [
      { symbol: "♚", col: 5, row: 7, anim: "kingMove" },
      { symbol: "♔", col: 4, row: 1, anim: "kingMove", delay: "0.5s" },
      { symbol: "♜", col: 1, row: 4, anim: "rookSlide" },
      { symbol: "♝", col: 6, row: 3, anim: "bishopDiag" },
      { symbol: "♟", col: 3, row: 5, anim: "pieceBob" },
      { symbol: "♙", col: 6, row: 2, anim: "pieceBob", delay: "0.3s" },
      { symbol: "♕", col: 3, row: 3, anim: "queenSweep" },
      { symbol: "♘", col: 2, row: 6, anim: "pieceHop", delay: "0.4s" },
    ],
  },
  {
    title: "Export Reports",
    sub: "Download tournament data in one click",
    accent: "#b5e7a0",
    pieces: [
      { symbol: "♔", col: 7, row: 7, anim: "checkGlow" },
      { symbol: "♛", col: 5, row: 5, anim: "queenSweep" },
      { symbol: "♖", col: 7, row: 3, anim: "rookSlide", delay: "0.2s" },
      { symbol: "♚", col: 8, row: 8, anim: "checkGlow", delay: "0.15s" },
      { symbol: "♟", col: 7, row: 6, anim: "pieceBob" },
      { symbol: "♟", col: 6, row: 7, anim: "pieceBob", delay: "0.35s" },
      { symbol: "♗", col: 4, row: 4, anim: "bishopDiag", delay: "0.25s" },
    ],
  },
];

const NAV_ITEMS = [
  { piece: "♚", label: "Dashboard", to: "/dashboard", desc: "Leaderboards · Active tournaments · Highlights" },
  { piece: "♞", label: "Players", to: "/players", desc: "Player profiles · ELO ratings · Match history" },
  { piece: "♛", label: "Stats", to: "/stats", desc: "Winning streaks · Giant killers · Legends board" },
  { piece: "♜", label: "Admin", to: "/admin", desc: "Create tournaments · Generate rounds · Reports" },
];

export default function LandingPage() {
  const admin = isAdmin();
  const [slide, setSlide] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    let timeoutId: number;
    const intervalId = setInterval(() => {
      setTransitioning(true);
      timeoutId = window.setTimeout(() => {
        setSlide((s) => (s + 1) % SLIDES.length);
        setTransitioning(false);
      }, 450);
    }, 5000);
    return () => {
      clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, []);

  function goTo(i: number) {
    if (i === slide || transitioning) return;
    setTransitioning(true);
    window.setTimeout(() => {
      setSlide(i);
      setTransitioning(false);
    }, 450);
  }

  const cur = SLIDES[slide];

  return (
    <div className="landingRoot">
      {/* Ambient floating background pieces */}
      <div className="landingAmbient" aria-hidden="true">
        {"♟♞♝♜♛♚♙♘♗♖♕♔".split("").map((p, i) => (
          <span
            key={i}
            className="ambientPiece"
            style={{
              left: `${(i * 7.9 + 3) % 98}%`,
              top: `${(i * 13.1 + 5) % 88}%`,
              fontSize: `${20 + (i % 3) * 14}px`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${9 + (i % 5) * 2}s`,
            }}
          >
            {p}
          </span>
        ))}
      </div>

      {/* Header */}
      <header className="landingHeader">
        <div className="landingBrand">
          <span className="landingBrandPiece">♔</span>
          <div>
            <div className="landingBrandName"> C-PAT CHESS ARENA</div>
            <div className="landingBrandTagline">Chess Tournament Platform</div>
          </div>
        </div>
        <div className="landingHeaderNav">
          <ThemeToggle />
          <Link className="btn" to="/dashboard">
            <Trophy size={16} /> Open App
          </Link>
          {admin ? (
            <Link className="btn" to="/admin">
              <Shield size={16} /> Admin
            </Link>
          ) : (
            <Link className="btn" to="/admin/login">
              <Shield size={16} /> Login
            </Link>
          )}
        </div>
      </header>

      {/* Hero + Carousel */}
      <section className="landingHero">
        <div className="landingHeroLeft">
          <div className="landingHeroEyebrow">♟ Chess · ELO</div>
          <h1 className="landingHeroTitle">
            Host. Pair.
            <br />
            Conquer.
          </h1>
          <p className="landingHeroSub">
            Create Chess tournaments, generate fair pairings, track live standings and export results — built for C-DAC communities by C-DAC Patna.
          </p>
          <div className="landingHeroBtns">
            <Link className="btn primary landingHeroBtn" to="/dashboard">
              Open Dashboard
            </Link>
            {!admin && (
              <Link className="btn landingHeroBtn" to="/admin/login">
                Admin Login
              </Link>
            )}
          </div>
        </div>

        {/* 3D Board Carousel */}
        <div className="landingCarouselWrap">
          <div className="carouselViewport">
            <div className={`carouselPanel ${transitioning ? "carouselExit" : "carouselEnter"}`}>
              <div className="board3DPerspective">
                <div className="board3DGrid">
                  {Array.from({ length: 64 }, (_, idx) => {
                    const col = (idx % 8) + 1;
                    const row = Math.floor(idx / 8) + 1;
                    const light = (col + row) % 2 === 0;
                    const piece = cur.pieces.find((p) => p.col === col && p.row === row);
                    return (
                      <div key={idx} className={`boardCell ${light ? "bcLight" : "bcDark"}`}>
                        {piece && (
                          <span className={`boardPiece bp-${piece.anim}`} style={{ animationDelay: piece.delay ?? "0s", color: cur.accent }}>
                            {piece.symbol}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="carouselCaption">
                <span className="carouselCaptionTitle">{cur.title}</span>
                <span className="carouselCaptionSub">{cur.sub}</span>
              </div>
            </div>
          </div>

          <div className="carouselDots">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`carouselDot ${i === slide ? "carouselDotActive" : ""}`}
                onClick={() => goTo(i)}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Sidebar Nav Highlights */}
      <section className="landingNav">
        <h2 className="landingNavTitle">Everything in one place</h2>
        <div className="landingNavGrid">
          {NAV_ITEMS.map((item, idx) => (
            <Link key={item.label} to={item.to} className="landingNavCard" style={{ animationDelay: `${idx * 0.12}s` }}>
              <div className="landingNavPiece" style={{ animationDelay: `${idx * 0.5}s` }}>
                {item.piece}
              </div>
              <div className="landingNavLabel">{item.label}</div>
              <div className="landingNavDesc">{item.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="landingFooter">
        <span className="landingFooterPiece">♔</span>
        <span>© {new Date().getFullYear()} C-DAC PATNA, All rights reserved.</span>
      </footer>
    </div>
  );
}
