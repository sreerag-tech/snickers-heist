import { useEffect, useRef, useState } from "react";

type PowerUpType = "speed" | "shield" | "freeze";
type EnemyType = "chaser" | "patrol" | "wander";
type Snicker = { id: number; x: number; y: number; value: number };
type PowerUp = { x: number; y: number; type: PowerUpType };
type Enemy = { id: number; x: number; y: number; vx: number; vy: number; type: EnemyType; speed: number };
type Obstacle = { x: number; y: number; w: number; h: number };

const ARENA_MARGIN = 44;
const PLAYER_SIZE = 76;
const SNICKER_SIZE = 60;
const POWERUP_SIZE = 54;
const ENEMY_SIZE = 76;
const BASE_SPEED = 38;
const OBSTACLES: Obstacle[] = [
  { x: 220, y: 220, w: 260, h: 28 },
  { x: 560, y: 220, w: 34, h: 300 },
  { x: 160, y: 460, w: 320, h: 36 },
  { x: 620, y: 520, w: 280, h: 30 },
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const randomBetween = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const circleRectCollision = (
  cx: number,
  cy: number,
  r: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
) => {
  const closestX = clamp(cx, rx, rx + rw);
  const closestY = clamp(cy, ry, ry + rh);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < r * r;
};

const circleCircleCollision = (x1: number, y1: number, r1: number, x2: number, y2: number, r2: number) => {
  return Math.hypot(x1 - x2, y1 - y2) < r1 + r2;
};

const randomPosition = (size: number) => {
  const x = randomBetween(ARENA_MARGIN, window.innerWidth - size - ARENA_MARGIN);
  const y = randomBetween(120, window.innerHeight - size - ARENA_MARGIN);
  return { x, y };
};

const placeItem = (size: number) => {
  let candidate = randomPosition(size);
  for (let i = 0; i < 20; i += 1) {
    const collide = OBSTACLES.some(obstacle => circleRectCollision(
      candidate.x + size / 2,
      candidate.y + size / 2,
      size / 2,
      obstacle.x,
      obstacle.y,
      obstacle.w,
      obstacle.h,
    ));
    if (!collide) return candidate;
    candidate = randomPosition(size);
  }
  return candidate;
};

function App() {
  const [player, setPlayer] = useState({ x: 120, y: 120 });
  const playerRef = useRef({ x: 120, y: 120 });
  const [snickers, setSnickers] = useState<Snicker[]>(() =>
    Array.from({ length: 5 }, (_, index) => ({
      id: index,
      ...placeItem(SNICKER_SIZE),
      value: 25 + index * 8,
    })),
  );
  const [bonusSnicker, setBonusSnicker] = useState({ x: -100, y: -100, active: false });
  const [powerUp, setPowerUp] = useState<PowerUp>({ x: -100, y: -100, type: "speed" });
  const [activePowerUp, setActivePowerUp] = useState<PowerUpType | "">("");
  const [powerUpTimer, setPowerUpTimer] = useState(0);
  const [enemies, setEnemies] = useState<Enemy[]>([
    { id: 1, x: 840, y: 150, vx: 0, vy: 0, type: "chaser", speed: 0.7 },
    { id: 2, x: 240, y: 520, vx: 1, vy: 0, type: "patrol", speed: 0.65 },
    { id: 3, x: 700, y: 380, vx: 0.7, vy: -0.4, type: "wander", speed: 0.6 },
  ]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [levelThreshold, setLevelThreshold] = useState(50);
  const [combo, setCombo] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const gameStartedRef = useRef(gameStarted);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const gameOverRef = useRef(gameOver);
  const [won, setWon] = useState(false);
  const [notification, setNotification] = useState("ശ്രീരാഗിന് സ്നിക്കേഴ്സ് നൽകൂ!");
  const keysRef = useRef<Record<string, boolean>>({});
  const lastEnemyHitRef = useRef(0);
  const [isMobile, setIsMobile] = useState(false);
  const touchDirRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);


  useEffect(() => {
    gameStartedRef.current = gameStarted;
  }, [gameStarted]);

  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  useEffect(() => {
    const saved = localStorage.getItem("snickerBestScore");
    if (saved) setBestScore(parseInt(saved, 10));
  }, []);

  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      localStorage.setItem("snickerBestScore", score.toString());
    }
  }, [score, bestScore]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchDirRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!gameStartedRef.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - touchDirRef.current.x;
      const dy = touch.clientY - touchDirRef.current.y;
      const threshold = 20;
      keysRef.current.arrowleft = dx < -threshold;
      keysRef.current.arrowright = dx > threshold;
      keysRef.current.arrowup = dy < -threshold;
      keysRef.current.arrowdown = dy > threshold;
    };

    const handleTouchEnd = () => {
      keysRef.current = {};
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "p" && gameStartedRef.current && !gameOverRef.current) {
        setPaused(prev => !prev);
        return;
      }
      keysRef.current[key] = true;
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      keysRef.current[key] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    if (!gameStarted || paused || gameOver || won) return;

    const interval = setInterval(() => {
      const currentKeys = keysRef.current;
      setPlayer(prev => {
        const horizontal = (currentKeys.a || currentKeys.arrowleft ? -1 : 0) + (currentKeys.d || currentKeys.arrowright ? 1 : 0);
        const vertical = (currentKeys.w || currentKeys.arrowup ? -1 : 0) + (currentKeys.s || currentKeys.arrowdown ? 1 : 0);
        const speedMultiplier = activePowerUp === "speed" ? 1.45 : 1;
        const nextX = clamp(prev.x + horizontal * BASE_SPEED * speedMultiplier, ARENA_MARGIN, window.innerWidth - PLAYER_SIZE - ARENA_MARGIN);
        const nextY = clamp(prev.y + vertical * BASE_SPEED * speedMultiplier, 120, window.innerHeight - PLAYER_SIZE - ARENA_MARGIN);

        const hitsWall = OBSTACLES.some(obstacle => circleRectCollision(
          nextX + PLAYER_SIZE / 2,
          nextY + PLAYER_SIZE / 2,
          PLAYER_SIZE / 2 - 8,
          obstacle.x,
          obstacle.y,
          obstacle.w,
          obstacle.h,
        ));

        return hitsWall ? prev : { x: nextX, y: nextY };
      });

      setEnemies(current => current.map(enemy => {
        const next = { ...enemy };
        const freezeFactor = activePowerUp === "freeze" ? 0.5 : 1;

        if (enemy.type === "chaser") {
          const dx = playerRef.current.x - enemy.x;
          const dy = playerRef.current.y - enemy.y;
          const distance = Math.max(Math.hypot(dx, dy), 0.1);
          next.x += (dx / distance) * enemy.speed * 1.4 * freezeFactor;
          next.y += (dy / distance) * enemy.speed * 1.4 * freezeFactor;
        }

        if (enemy.type === "patrol") {
          next.x += next.vx * next.speed * 3 * freezeFactor;
          if (next.x < ARENA_MARGIN || next.x > window.innerWidth - ENEMY_SIZE - ARENA_MARGIN) {
            next.vx *= -1;
          }
        }

        if (enemy.type === "wander") {
          next.x += next.vx * next.speed * 2 * freezeFactor;
          next.y += next.vy * next.speed * 2 * freezeFactor;
          if (next.x < ARENA_MARGIN || next.x > window.innerWidth - ENEMY_SIZE - ARENA_MARGIN) {
            next.vx *= -1;
          }
          if (next.y < 120 || next.y > window.innerHeight - ENEMY_SIZE - ARENA_MARGIN) {
            next.vy *= -1;
          }
        }

        next.x = clamp(next.x, ARENA_MARGIN, window.innerWidth - ENEMY_SIZE - ARENA_MARGIN);
        next.y = clamp(next.y, 120, window.innerHeight - ENEMY_SIZE - ARENA_MARGIN);
        return next;
      }));
    }, 33);

    return () => clearInterval(interval);
  }, [gameStarted, paused, gameOver, activePowerUp]);

  useEffect(() => {
    if (!gameStarted || paused || gameOver) return;

    const playerCenter = {
      x: player.x + PLAYER_SIZE / 2,
      y: player.y + PLAYER_SIZE / 2,
    };

    setSnickers(current => current.map(snicker => {
      const collision = circleCircleCollision(
        playerCenter.x,
        playerCenter.y,
        PLAYER_SIZE / 2 - 8,
        snicker.x + SNICKER_SIZE / 2,
        snicker.y + SNICKER_SIZE / 2,
        SNICKER_SIZE / 2,
      );

      if (!collision) return snicker;

      const bonusScore = combo * 2;
      const newScore = score + snicker.value + bonusScore;
      setScore(newScore);
      setCombo(prev => prev + 1);
      setNotification(`Snicker captured! +${snicker.value + bonusScore}`);
      setTimeout(() => setNotification(""), 2200);

      if (newScore >= levelThreshold) {
        const nextLevel = level + 1;
        setLevel(nextLevel);
        setLevelThreshold(levelThreshold + 50);
        if (nextLevel >= 5) {
          setWon(true);
          setNotification("സറ്ജോഅി സംരക്ഷിത! ശ്രീരാഗിനു സ്നിക്കേഴ്സ് നനായ!");
          return { ...snicker, ...placeItem(SNICKER_SIZE) };
        }
        setNotification("ലെവൽ ഉയർന്നു! കൂടുതൽ വെല്ലുവിളികൾ വരുന്നു!");
        setTimeout(() => setNotification(""), 2600);
      }

      if (!bonusSnicker.active && Math.random() > 0.78) {
        const nextBonus = placeItem(SNICKER_SIZE);
        setBonusSnicker({ x: nextBonus.x, y: nextBonus.y, active: true });
      }

      if (Math.random() > 0.55) {
        const nextPowerUp = placeItem(POWERUP_SIZE);
        setPowerUp({
          x: nextPowerUp.x,
          y: nextPowerUp.y,
          type: ["speed", "shield", "freeze"][Math.floor(Math.random() * 3)] as PowerUpType,
        });
      }

      return { ...snicker, ...placeItem(SNICKER_SIZE) };
    }));
  }, [player, score, combo, bonusSnicker.active, gameStarted, gameOver, won, levelThreshold]);

  useEffect(() => {
    if (!gameStarted || paused || gameOver || won) return;

    const playerCenter = {
      x: player.x + PLAYER_SIZE / 2,
      y: player.y + PLAYER_SIZE / 2,
    };

    if (bonusSnicker.active && circleCircleCollision(
      playerCenter.x,
      playerCenter.y,
      PLAYER_SIZE / 2 - 8,
      bonusSnicker.x + SNICKER_SIZE / 2,
      bonusSnicker.y + SNICKER_SIZE / 2,
      SNICKER_SIZE / 2,
    )) {
      setScore(prev => prev + 60 + level * 5);
      setCombo(prev => prev + 2);
      setNotification("ഗോൾഡൻ സ്നിക്കേഴ്സ്! വലിയ ജയം! 🥇");
      setTimeout(() => setNotification(""), 2600);
      setBonusSnicker({ x: -100, y: -100, active: false });
    }

    const powerUpHit = circleCircleCollision(
      playerCenter.x,
      playerCenter.y,
      PLAYER_SIZE / 2 - 8,
      powerUp.x + POWERUP_SIZE / 2,
      powerUp.y + POWERUP_SIZE / 2,
      POWERUP_SIZE / 2,
    );

    if (powerUpHit) {
      setActivePowerUp(powerUp.type);
      setPowerUpTimer(6);
      setNotification(powerUp.type === "speed"
        ? "വേഗം വർധിച്ചു! ⚡"
        : powerUp.type === "shield"
          ? "ഷീൽഡ് ഒരുങ്ങി! 🛡️"
          : "എൻമികൾ തണുത്തു! ❄️");
      setTimeout(() => setNotification(""), 2600);
      setPowerUp({ x: -100, y: -100, type: powerUp.type });
    }

    const enemyHit = enemies.some(enemy => circleCircleCollision(
      playerCenter.x,
      playerCenter.y,
      PLAYER_SIZE / 2 - 4,
      enemy.x + ENEMY_SIZE / 2,
      enemy.y + ENEMY_SIZE / 2,
      ENEMY_SIZE / 2 - 4,
    ));

    const now = Date.now();
    if (enemyHit && now - lastEnemyHitRef.current > 800) {
      lastEnemyHitRef.current = now;
      if (activePowerUp === "shield") {
        setActivePowerUp("");
        setPowerUpTimer(0);
        setNotification("ഷീൽഡ് വഴി രക്ഷപ്പെട്ടു! 🛡️");
        setTimeout(() => setNotification(""), 2400);
      } else {
        setLives(prev => {
          const next = prev - 1;
          if (next <= 0) {
            setGameOver(true);
            setNotification("ഗെയിം ഒവറായി! ശ്രീരാഗിന് സ്നിക്കേഴ്സ് നൽകാൻ വൈകി!");
            return 0;
          }
          return next;
        });
      }
    }
  }, [player, bonusSnicker, powerUp, enemies, activePowerUp, gameStarted, gameOver, level]);

  useEffect(() => {
    if (!activePowerUp) return;
    const interval = setInterval(() => {
      setPowerUpTimer(prev => {
        if (prev <= 1) {
          setActivePowerUp("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activePowerUp]);

  const resetGame = () => {
    setPlayer({ x: 120, y: 120 });
    setSnickers(Array.from({ length: 5 }, (_, index) => ({
      id: index,
      ...placeItem(SNICKER_SIZE),
      value: 25 + index * 8,
    })));
    setBonusSnicker({ x: -100, y: -100, active: false });
    setPowerUp({ x: -100, y: -100, type: "speed" });
    setActivePowerUp("");
    setPowerUpTimer(0);
    setEnemies([
      { id: 1, x: 840, y: 150, vx: 0, vy: 0, type: "chaser", speed: 0.7 },
      { id: 2, x: 240, y: 520, vx: 1, vy: 0, type: "patrol", speed: 0.65 },
      { id: 3, x: 700, y: 380, vx: 0.7, vy: -0.4, type: "wander", speed: 0.6 },
    ]);
    setScore(0);
    setLives(3);
    setLevel(1);
    setLevelThreshold(50);
    setCombo(0);
    setGameOver(false);
    setWon(false);
    setPaused(false);
    keysRef.current = {};
    setNotification("ശ്രീരാഗിന് സ്നിക്കേഴ്സ് നൽകൂ!");
  };

  const startGame = () => {
    resetGame();
    setGameStarted(true);
  };

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      overflow: "hidden",
      position: "relative",
      fontFamily: "system-ui, sans-serif",
      background: "radial-gradient(circle at 20% 20%, #2c0745 0%, #0a0014 60%)",
      color: "white",
    }}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 10% 10%, rgba(239, 68, 68, 0.08), transparent 24%), radial-gradient(circle at 90% 20%, rgba(59, 130, 246, 0.08), transparent 18%)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "52px 52px" }} />

      <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: isMobile ? "12px 16px" : "18px 38px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 100, background: "rgba(0,0,0,0.54)", backdropFilter: "blur(10px)", flexDirection: isMobile ? "column" : "row", gap: isMobile ? "12px" : "0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: isMobile ? "28px" : "38px" }}>🍫</span>
          <div>
            <div style={{ fontSize: isMobile ? "16px" : "22px", letterSpacing: "0.04em", fontWeight: "700" }}>SNICKER HEIST</div>
            <div style={{ fontSize: isMobile ? "11px" : "13px", opacity: 0.8 }}>Save Sreerag</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3, auto)" : "repeat(6, auto)", gap: isMobile ? "14px" : "26px", alignItems: "center", fontSize: isMobile ? "12px" : "17px" }}>
          <div>Score: <strong style={{ color: "#facc15" }}>{score}</strong></div>
          <div>Lvl: <strong style={{ color: "#c084fc" }}>{level}</strong></div>
          <div>Live: <strong style={{ color: "#ef4444" }}>{"❤️".repeat(Math.max(0, lives))}</strong></div>
        </div>
      </div>

      {notification && (
        <div style={{
          position: "absolute",
          top: "18%",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.88)",
          color: "#fef08a",
          padding: "16px 32px",
          borderRadius: "16px",
          fontSize: "20px",
          zIndex: 200,
          border: "1px solid rgba(255,255,255,0.14)",
          minWidth: "320px",
          textAlign: "center",
        }}>
          {notification}
        </div>
      )}

      {!gameStarted && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", zIndex: 150, gap: "20px" }}>
          <div style={{ fontSize: "92px" }}>🎮</div>
          <div style={{ fontSize: "48px", fontWeight: "700" }}>Snicker Heist</div>
          <div style={{ maxWidth: "540px", textAlign: "center", fontSize: "20px", opacity: 0.86 }}>
            A new top-down arena challenge: collect snickers, dodge deadly demons, and power up to save Sreerag.
          </div>
          <div style={{ fontSize: "20px", opacity: 0.9 }}>ശ്രീരാഗിന് സ്നിക്കേഴ്‌സ് നൽകണേ!</div>
          <button onClick={startGame} style={{ padding: "18px 56px", borderRadius: "999px", border: "none", cursor: "pointer", fontSize: "20px", background: "linear-gradient(90deg, #f97316, #facc15)", color: "#080808", fontWeight: "800" }}>
            START THE HEIST
          </button>
        </div>
      )}

      {gameOver && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", zIndex: 220, gap: "18px" }}>
          <div style={{ fontSize: "100px" }}>💥</div>
          <div style={{ fontSize: "56px", fontWeight: "800", color: "#f87171" }}>GAME OVER</div>
          <div style={{ fontSize: "24px", color: "#fde68a" }}>Final Score: {score}</div>
          <div style={{ fontSize: "20px", opacity: 0.9 }}>ശ്രീരാഗിന് ഒരു സ്നിക്കേഴ്സ് നൽകാൻ ഇപ്പോഴും സമയം നേടിയില്ല!</div>
          <button onClick={resetGame} style={{ padding: "16px 48px", borderRadius: "999px", border: "none", cursor: "pointer", fontSize: "20px", background: "#ffffff", color: "#000000", fontWeight: "700" }}>
            TRY AGAIN
          </button>
        </div>
      )}

      {won && (
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(34,197,94,0.95), rgba(16,185,129,0.95))", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", zIndex: 230, gap: "24px" }}>
          <div style={{ fontSize: "120px", animation: "spin 2s infinite" }}>🎉</div>
          <div style={{ fontSize: "64px", fontWeight: "900", color: "#ffffff" }}>YOU WON!</div>
          <div style={{ fontSize: "28px", color: "#fff", fontWeight: "700" }}>ശ്രീരാഗിനെ രക്ഷപ്പെടുത്തി!</div>
          <div style={{ fontSize: "24px", color: "#fef08a" }}>Final Score: {score}</div>
          <div style={{ fontSize: "20px", color: "#ffffff", opacity: 0.95 }}>നീ ഒരു സംരക്ഷകൻ! ശ്രീരാഗിനെ മുഴുവൻ സ്നിക്കേഴ്സ് കിട്ടി! 🍫🍫🍫</div>
          <button onClick={resetGame} style={{ padding: "18px 52px", borderRadius: "999px", border: "none", cursor: "pointer", fontSize: "20px", background: "#ffffff", color: "#059669", fontWeight: "900", marginTop: "12px" }}>
            PLAY AGAIN
          </button>
        </div>
      )}

      {paused && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 210, fontSize: "52px", fontWeight: "700" }}>
          PAUSED
        </div>
      )}

      <div style={{ position: "absolute", left: 0, top: 90, width: `calc(100vw - ${ARENA_MARGIN * 2}px)`, height: `calc(100vh - 180px)`, marginLeft: `${ARENA_MARGIN}px`, marginRight: `${ARENA_MARGIN}px`, borderRadius: "28px", overflow: "hidden", boxShadow: "0 0 70px rgba(0,0,0,0.3)", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ position: "absolute", inset: 0 }}>
          {OBSTACLES.map((obstacle, index) => (
            <div key={index} style={{ position: "absolute", left: obstacle.x, top: obstacle.y, width: obstacle.w, height: obstacle.h, borderRadius: "14px", background: "rgba(255,255,255,0.06)", boxShadow: "0 0 18px rgba(255,255,255,0.06) inset" }} />
          ))}

          {snickers.map(snicker => (
            <div key={snicker.id} style={{
              position: "absolute",
              left: snicker.x,
              top: snicker.y,
              width: SNICKER_SIZE,
              height: SNICKER_SIZE,
              background: "linear-gradient(135deg, #92400e, #c2410c)",
              borderRadius: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 36px rgba(252, 211, 77, 0.35)",
              fontSize: "42px",
              zIndex: 20,
            }}>
              🍫
            </div>
          ))}

          {bonusSnicker.active && (
            <div style={{
              position: "absolute",
              left: bonusSnicker.x,
              top: bonusSnicker.y,
              width: SNICKER_SIZE,
              height: SNICKER_SIZE,
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              borderRadius: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 48px rgba(245, 158, 11, 0.56)",
              fontSize: "42px",
              zIndex: 25,
            }}>
              🥇
            </div>
          )}

          <div style={{
            position: "absolute",
            left: powerUp.x,
            top: powerUp.y,
            width: POWERUP_SIZE,
            height: POWERUP_SIZE,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #fbbf24, #facc15)",
            display: powerUp.x > 0 ? "flex" : "none",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 42px rgba(254,232,77,0.5)",
            fontSize: "30px",
            zIndex: 24,
          }}>
            {powerUp.type === "speed" ? "⚡" : powerUp.type === "shield" ? "🛡️" : "❄️"}
          </div>

          <div style={{
            position: "absolute",
            left: player.x,
            top: player.y,
            width: PLAYER_SIZE,
            height: PLAYER_SIZE,
            borderRadius: "24px",
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "44px",
            boxShadow: "0 0 46px rgba(59,130,246,0.5)",
            zIndex: 30,
            transition: "left 0.05s, top 0.05s",
          }}>
            🧍‍♂️
          </div>

          {enemies.map(enemy => (
            <div key={enemy.id} style={{
              position: "absolute",
              left: enemy.x,
              top: enemy.y,
              width: ENEMY_SIZE,
              height: ENEMY_SIZE,
              borderRadius: "50%",
              background: enemy.type === "chaser"
                ? "linear-gradient(135deg, #dc2626, #991b1b)"
                : enemy.type === "patrol"
                  ? "linear-gradient(135deg, #8b5cf6, #7c3aed)"
                  : "linear-gradient(135deg, #22c55e, #15803d)",
              boxShadow: "0 0 50px rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "42px",
              zIndex: 28,
            }}>
              {enemy.type === "chaser" ? "👹" : enemy.type === "patrol" ? "👾" : "👻"}
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: "absolute", bottom: "18px", left: "50%", transform: "translateX(-50%)", fontSize: "15px", color: "rgba(255,255,255,0.74)" }}>
        WASD / Arrow keys to move • P to pause • collect all snickers and save Sreerag
      </div>
    </div>
  );
}

export default App;
