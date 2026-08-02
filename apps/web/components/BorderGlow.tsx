import React, { useRef, useCallback, useState, useEffect, useMemo, type ReactNode } from 'react';

interface BorderGlowProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  className?: string;
  edgeSensitivity?: number;
  glowColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
  coneSpread?: number;
  animated?: boolean;
  colors?: string[];
  fillOpacity?: number;
}

function parseHSL(hslStr: string): { h: number; s: number; l: number } {
  const parts = hslStr.trim().split(/\s+/);
  const h = parseFloat(parts[0] || "") || 40;
  const s = parseFloat(parts[1] || "") || 80;
  const l = parseFloat(parts[2] || "") || 80;
  return { h, s, l };
}

function buildBoxShadow(glowColor: string, intensity: number): string {
  const { h, s, l } = parseHSL(glowColor);
  const base = `${h}deg ${s}% ${l}%`;
  const layers: [number, number, number, number, number, boolean][] = [
    [0, 0, 1, 0, 60, true], [0, 0, 3, 0, 50, true],
    [0, 0, 6, 0, 40, true], [0, 0, 15, 0, 30, true], [0, 0, 25, 0, 20, true],
    [0, 0, 50, 0, 10, true],
    [0, 0, 1, 0, 60, false], [0, 0, 3, 0, 50, false], [0, 0, 6, 0, 40, false],
    [0, 0, 15, 0, 30, false], [0, 0, 25, 0, 20, false], [0, 0, 50, 0, 10, false],
  ];
  return layers.map(([x, y, blur, spread, alpha, inset]) => {
    const a = Math.min(alpha * intensity, 100);
    return `${inset ? 'inset ' : ''}${x}px ${y}px ${blur}px ${spread}px hsl(${base} / ${a}%)`;
  }).join(', ');
}

function easeOutCubic(x: number) { return 1 - Math.pow(1 - x, 3); }
function easeInCubic(x: number) { return x * x * x; }

interface AnimateOpts {
  start?: number; end?: number; duration?: number; delay?: number;
  ease?: (t: number) => number; onUpdate: (v: number) => void; onEnd?: () => void;
}

function animateValue({ start = 0, end = 100, duration = 1000, delay = 0, ease = easeOutCubic, onUpdate, onEnd }: AnimateOpts) {
  let frameId: number;
  let timeoutId: any;
  const t0 = performance.now() + delay;
  
  function tick() {
    const elapsed = performance.now() - t0;
    const t = Math.min(elapsed / duration, 1);
    onUpdate(start + (end - start) * ease(t));
    if (t < 1) {
      frameId = requestAnimationFrame(tick);
    } else if (onEnd) {
      onEnd();
    }
  }
  
  timeoutId = setTimeout(() => {
    frameId = requestAnimationFrame(tick);
  }, delay);

  return () => {
    clearTimeout(timeoutId);
    if (frameId) cancelAnimationFrame(frameId);
  };
}

const GRADIENT_POSITIONS = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%'];
const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1];

function buildMeshGradients(colors: string[]): string[] {
  const gradients: string[] = [];
  for (let i = 0; i < 7; i++) {
    const mapIdx = COLOR_MAP[i] ?? 0;
    const c = colors[Math.min(mapIdx, colors.length - 1)] ?? colors[0] ?? "#ffffff";
    gradients.push(`radial-gradient(at ${GRADIENT_POSITIONS[i]}, ${c} 0px, transparent 50%)`);
  }
  gradients.push(`linear-gradient(${colors[0] ?? "#ffffff"} 0 100%)`);
  return gradients;
}

const BorderGlow: React.FC<BorderGlowProps> = ({
  children,
  className = '',
  edgeSensitivity = 30,
  glowColor = '40 80 80',
  backgroundColor = '#120F17',
  borderRadius = 28,
  glowRadius = 40,
  glowIntensity = 1.0,
  coneSpread = 25,
  animated = false,
  colors = ['#c084fc', '#f472b6', '#38bdf8'],
  fillOpacity = 0.5,
  ...rest
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [cursorAngle, setCursorAngle] = useState(45);
  const [edgeProximity, setEdgeProximity] = useState(0);
  const [sweepActive, setSweepActive] = useState(false);

  const handlePointerEnter = useCallback(() => {
    setIsHovered(true);
    if (cardRef.current) {
      rectRef.current = cardRef.current.getBoundingClientRect();
    }
  }, []);

  const handlePointerLeave = useCallback(() => {
    setIsHovered(false);
    rectRef.current = null;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    let rect = rectRef.current;
    if (!rect) {
      const card = cardRef.current;
      if (!card) return;
      rect = card.getBoundingClientRect();
      rectRef.current = rect;
    }
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    
    let kx = Infinity;
    let ky = Infinity;
    if (dx !== 0) kx = cx / Math.abs(dx);
    if (dy !== 0) ky = cy / Math.abs(dy);
    const proximity = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
    setEdgeProximity(proximity);
    
    if (dx === 0 && dy === 0) {
      setCursorAngle(0);
    } else {
      const radians = Math.atan2(dy, dx);
      let degrees = radians * (180 / Math.PI) + 90;
      if (degrees < 0) degrees += 360;
      setCursorAngle(degrees);
    }
  }, []);

  useEffect(() => {
    if (!animated) return;
    const angleStart = 110;
    const angleEnd = 465;
    setSweepActive(true);
    setCursorAngle(angleStart);

    const cleanups = [
      animateValue({ duration: 500, onUpdate: v => setEdgeProximity(v / 100) }),
      animateValue({ ease: easeInCubic, duration: 1500, end: 50, onUpdate: v => {
        setCursorAngle((angleEnd - angleStart) * (v / 100) + angleStart);
      }}),
      animateValue({ ease: easeOutCubic, delay: 1500, duration: 2250, start: 50, end: 100, onUpdate: v => {
        setCursorAngle((angleEnd - angleStart) * (v / 100) + angleStart);
      }}),
      animateValue({ ease: easeInCubic, delay: 2500, duration: 1500, start: 100, end: 0,
        onUpdate: v => setEdgeProximity(v / 100),
        onEnd: () => setSweepActive(false),
      })
    ];

    return () => {
      cleanups.forEach(cleanup => cleanup());
    };
  }, [animated]);

  const colorSensitivity = edgeSensitivity + 20;
  const isVisible = isHovered || sweepActive;
  const borderOpacity = isVisible
    ? Math.max(0, (edgeProximity * 100 - colorSensitivity) / (100 - colorSensitivity))
    : 0;
  const glowOpacity = isVisible
    ? Math.max(0, (edgeProximity * 100 - edgeSensitivity) / (100 - edgeSensitivity))
    : 0;

  const { borderBg, fillBg } = useMemo(() => {
    const meshGradients = buildMeshGradients(colors);
    return {
      borderBg: meshGradients.map(g => `${g} border-box`),
      fillBg: meshGradients.map(g => `${g} padding-box`),
    };
  }, [colors]);

  const boxShadow = useMemo(() => {
    return buildBoxShadow(glowColor, glowIntensity);
  }, [glowColor, glowIntensity]);

  const glowMargin = glowRadius + 60;
  const angleDeg = `${cursorAngle.toFixed(3)}deg`;
  const borderRadiusStyle = `${borderRadius}px`;

  // Prevent default 'relative' positioning from clashing with custom 'absolute' layouts (e.g. carousel cards)
  const hasPosition = /\b(absolute|fixed|relative|sticky|static)\b/.test(className);
  const outerClassName = [
    !hasPosition ? 'relative' : '',
    'isolate',
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className={outerClassName}
      style={{
        borderRadius: borderRadiusStyle,
        transform: 'translate3d(0, 0, 0.01px)',
        ...rest.style
      }}
      {...rest}
    >
      {/* card solid background color layer (bottom-most) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: backgroundColor,
          borderRadius: borderRadiusStyle,
          zIndex: -20,
        }}
      />

      {/* mesh gradient border */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          border: '1.5px solid transparent',
          borderRadius: borderRadiusStyle,
          background: [
            `linear-gradient(${backgroundColor}, ${backgroundColor}) padding-box`,
            ...borderBg,
          ].join(', '),
          opacity: borderOpacity,
          maskImage: `conic-gradient(from ${angleDeg} at center, black ${coneSpread}%, transparent ${coneSpread + 15}%, transparent ${100 - coneSpread - 15}%, black ${100 - coneSpread}%)`,
          WebkitMaskImage: `conic-gradient(from ${angleDeg} at center, black ${coneSpread}%, transparent ${coneSpread + 15}%, transparent ${100 - coneSpread - 15}%, black ${100 - coneSpread}%)`,
          transition: isVisible ? 'opacity 0.25s ease-out' : 'opacity 0.75s ease-in-out',
          zIndex: -15,
        }}
      />

      {/* mesh gradient fill near edges */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: borderRadiusStyle,
          background: fillBg.join(', '),
          maskImage: `radial-gradient(ellipse at center, transparent 30%, black 80%)`,
          WebkitMaskImage: `radial-gradient(ellipse at center, transparent 30%, black 80%)`,
          opacity: borderOpacity * fillOpacity,
          mixBlendMode: 'soft-light',
          transition: isVisible ? 'opacity 0.25s ease-out' : 'opacity 0.75s ease-in-out',
          zIndex: -10,
        }}
      />

      {/* outer glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: `${-glowMargin}px`,
          borderRadius: borderRadiusStyle,
          maskImage: `conic-gradient(from ${angleDeg} at center, black 2.5%, transparent 10%, transparent 90%, black 97.5%)`,
          WebkitMaskImage: `conic-gradient(from ${angleDeg} at center, black 2.5%, transparent 10%, transparent 90%, black 97.5%)`,
          opacity: glowOpacity,
          mixBlendMode: 'plus-lighter',
          transition: isVisible ? 'opacity 0.25s ease-out' : 'opacity 0.75s ease-in-out',
          zIndex: -5,
        } as React.CSSProperties}
      >
        <div
          className="absolute"
          style={{
            inset: `${glowMargin}px`,
            boxShadow: boxShadow,
            borderRadius: borderRadiusStyle,
          }}
        />
      </div>

      {children}
    </div>
  );
};

export default BorderGlow;
