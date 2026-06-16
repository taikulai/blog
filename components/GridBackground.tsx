'use client';

import { useEffect, useRef } from 'react';

interface GridBackgroundOptions {
  direction: 'right' | 'left' | 'up' | 'down' | 'diagonal';
  speed: number;
  borderColor: string;
  squareSize: number;
  hoverFillColor: string;
  hoverShadowColor: string;
  transitionDuration: number;
  trailDuration: number;
  specialBlockColor: string;
  specialHoverColor: string;
  snakeHeadColor: string;
  snakeTailColor: string;
  snakeGradientStops: number;
  snakeColorDecay: number;
  touchSensitivity: number;
  vibrationEnabled: boolean;
}

interface GridBackgroundProps {
  active?: boolean;
}

interface SnakeSegment {
  x: number;
  y: number;
}

interface SpecialBlock {
  x: number;
  y: number;
  color: string;
  initialOffset: { x: number; y: number };
}

interface TrailSquare {
  x: number;
  y: number;
  opacity: number;
}

const DEFAULT_OPTIONS: GridBackgroundOptions = {
  direction: 'diagonal',
  speed: 0.05,
  borderColor: 'rgba(255, 255, 255, 0.1)',
  squareSize: 40,
  hoverFillColor: 'rgba(255, 255, 255, 0.8)',
  hoverShadowColor: 'rgba(255, 255, 255, 0.8)',
  transitionDuration: 200,
  trailDuration: 1500,
  specialBlockColor: 'rgba(100, 255, 152, 0.8)',
  specialHoverColor: 'rgba(29, 202, 29, 0.8)',
  snakeHeadColor: 'rgba(255, 255, 255, 0.95)',
  snakeTailColor: 'rgba(218, 231, 255, 0.25)',
  snakeGradientStops: 5,
  snakeColorDecay: 0.85,
  touchSensitivity: 1.0,
  vibrationEnabled: false,
};

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mobile|Android|iOS|iPhone|iPad|iPod|Windows Phone|KFAPWI/i.test(
    navigator.userAgent
  );
}

function parseRGBA(
  color: string
): { r: number; g: number; b: number; a: number } | null {
  const match = color.match(
    /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([.\d]+))?\)/
  );
  if (!match) return null;
  return {
    r: parseInt(match[1]),
    g: parseInt(match[2]),
    b: parseInt(match[3]),
    a: match[4] ? parseFloat(match[4]) : 1,
  };
}

export default function GridBackground({ active = true }: GridBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isPhone = isMobileDevice();

    // Merge default options with mobile adjustments
    const options: GridBackgroundOptions = {
      ...DEFAULT_OPTIONS,
      ...(isPhone
        ? {
            speed: 0.03,
            borderColor: 'rgba(255, 255, 255, 0.2)',
            squareSize: 50,
            transitionDuration: 150,
            trailDuration: 2000,
            touchSensitivity: 1.2,
            vibrationEnabled: true,
          }
        : {}),
    };

    // Mutable state
    const state = {
      gridOffset: { x: 0, y: 0 },
      hoveredSquare: null as SnakeSegment | null,
      animationFrame: null as number | null,
      currentOpacity: 0,
      targetOpacity: 0,
      lastTimestamp: 0,
      hoverRadius: 3,
      trailSquares: new Map<string, TrailSquare>(),
      specialBlock: null as SpecialBlock | null,
      specialBlockTimer: null as ReturnType<typeof setTimeout> | null,
      isSpecialBlockHovered: false,
      snakeBody: [] as SnakeSegment[],
      shouldGrow: false,
      isDestroyed: false,
    };

    // --- Mobile performance optimization ---
    function optimizeForMobile() {
      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        ctx.fillRect(0, 0, 1, 1);
      }
      const performanceScore = performance.now() - startTime;

      if (performanceScore > 10) {
        options.squareSize = Math.max(options.squareSize * 1.5, 60);
        options.speed *= 0.7;
        options.trailDuration *= 0.5;
      } else if (performanceScore > 5) {
        options.squareSize = Math.max(options.squareSize * 1.2, 50);
        options.speed *= 0.8;
      }
    }

    // --- Canvas resize ---
    function resizeCanvas() {
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = canvas.offsetWidth;
      const displayHeight = canvas.offsetHeight;

      canvas.width = Math.floor(displayWidth * dpr);
      canvas.height = Math.floor(displayHeight * dpr);

      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }

    // --- Create special block (food) ---
    function createSpecialBlock() {
      if (state.specialBlockTimer) {
        clearTimeout(state.specialBlockTimer);
      }

      const dpr = window.devicePixelRatio || 1;
      const numSquaresX = Math.ceil(
        canvas.width / dpr / options.squareSize
      );
      const numSquaresY = Math.ceil(
        canvas.height / dpr / options.squareSize
      );

      let newX: number, newY: number;
      let attempts = 0;
      do {
        newX = 1 + Math.floor(Math.random() * (numSquaresX - 2));
        newY = 1 + Math.floor(Math.random() * (numSquaresY - 2));
        attempts++;
      } while (
        state.snakeBody.some(
          (segment) => segment.x === newX && segment.y === newY
        ) &&
        attempts < 100
      );

      state.specialBlock = {
        x: newX,
        y: newY,
        color: options.specialBlockColor,
        initialOffset: { ...state.gridOffset },
      };
    }

    // --- Update hovered square and snake body ---
    function updateHoveredSquare(hoveredSquareX: number, hoveredSquareY: number) {
      if (
        state.hoveredSquare?.x !== hoveredSquareX ||
        state.hoveredSquare?.y !== hoveredSquareY
      ) {
        if (state.hoveredSquare) {
          state.snakeBody.unshift({
            x: state.hoveredSquare.x,
            y: state.hoveredSquare.y,
          });

          if (!state.shouldGrow && state.snakeBody.length > 0) {
            state.snakeBody.pop();
          }
          state.shouldGrow = false;
        }

        state.hoveredSquare = { x: hoveredSquareX, y: hoveredSquareY };

        // Check if food is eaten
        if (
          state.specialBlock &&
          hoveredSquareX === state.specialBlock.x &&
          hoveredSquareY === state.specialBlock.y
        ) {
          state.shouldGrow = true;
          createSpecialBlock();

          if (options.vibrationEnabled && navigator.vibrate) {
            navigator.vibrate(100);
          }
        }
      }
    }

    // --- Mouse event handlers ---
    function handleMouseMove(event: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const startX =
        Math.floor(state.gridOffset.x / options.squareSize) *
        options.squareSize;
      const startY =
        Math.floor(state.gridOffset.y / options.squareSize) *
        options.squareSize;

      const hoveredSquareX = Math.floor(
        (mouseX + state.gridOffset.x - startX) / options.squareSize
      );
      const hoveredSquareY = Math.floor(
        (mouseY + state.gridOffset.y - startY) / options.squareSize
      );

      updateHoveredSquare(hoveredSquareX, hoveredSquareY);
      state.targetOpacity = 0.6;
    }

    function handleMouseLeave() {
      if (state.hoveredSquare) {
        const startX =
          Math.floor(state.gridOffset.x / options.squareSize) *
          options.squareSize;
        const startY =
          Math.floor(state.gridOffset.y / options.squareSize) *
          options.squareSize;
        const key = `${state.hoveredSquare.x},${state.hoveredSquare.y}`;
        state.trailSquares.set(key, {
          x: state.hoveredSquare.x * options.squareSize + startX,
          y: state.hoveredSquare.y * options.squareSize + startY,
          opacity: 0.6,
        });
      }
      state.hoveredSquare = null;
      state.targetOpacity = 0;
    }

    // --- Touch event handlers ---
    let touchStartPos: { x: number; y: number; time: number } | null = null;
    let isTouching = false;
    let lastTouchTime = 0;
    let touchCount = 0;

    function handleTouchMove(x: number, y: number) {
      const startX =
        Math.floor(state.gridOffset.x / options.squareSize) *
        options.squareSize;
      const startY =
        Math.floor(state.gridOffset.y / options.squareSize) *
        options.squareSize;

      const hoveredSquareX = Math.floor(
        (x + state.gridOffset.x - startX) / options.squareSize
      );
      const hoveredSquareY = Math.floor(
        (y + state.gridOffset.y - startY) / options.squareSize
      );

      updateHoveredSquare(hoveredSquareX, hoveredSquareY);
      state.targetOpacity = 0.8 * options.touchSensitivity;
    }

    function onTouchStart(e: TouchEvent) {
      e.preventDefault();
      const now = Date.now();

      if (now - lastTouchTime < 16) return;
      lastTouchTime = now;

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        touchStartPos = {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
          time: now,
        };
        isTouching = true;
        touchCount++;

        handleTouchMove(touchStartPos.x, touchStartPos.y);

        if (!state.hoveredSquare) {
          state.targetOpacity = 0.8 * options.touchSensitivity;
        }

        if (options.vibrationEnabled && navigator.vibrate) {
          navigator.vibrate(10);
        }
      }
    }

    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      if (isTouching && e.touches.length === 1) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const touchMovePos = {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        };
        handleTouchMove(touchMovePos.x, touchMovePos.y);
      }
    }

    function onTouchEnd(e: TouchEvent) {
      e.preventDefault();
      const now = Date.now();

      if (touchStartPos && now - touchStartPos.time < 300) {
        touchCount++;
        if (touchCount === 2) {
          resetSnake();
          touchCount = 0;
          if (options.vibrationEnabled && navigator.vibrate) {
            navigator.vibrate([50, 50, 50]);
          }
          return;
        }
      } else {
        touchCount = 0;
      }

      isTouching = false;
      touchStartPos = null;

      if (state.hoveredSquare) {
        state.snakeBody.unshift({
          x: state.hoveredSquare.x,
          y: state.hoveredSquare.y,
        });

        if (!state.shouldGrow && state.snakeBody.length > 0) {
          state.snakeBody.pop();
        }
        state.shouldGrow = false;

        const startX =
          Math.floor(state.gridOffset.x / options.squareSize) *
          options.squareSize;
        const startY =
          Math.floor(state.gridOffset.y / options.squareSize) *
          options.squareSize;
        const key = `${state.hoveredSquare.x},${state.hoveredSquare.y}`;
        state.trailSquares.set(key, {
          x: state.hoveredSquare.x * options.squareSize + startX,
          y: state.hoveredSquare.y * options.squareSize + startY,
          opacity: 0.8,
        });
      }

      if (state.hoveredSquare) {
        state.targetOpacity = 0.4;
      }
    }

    function onTouchCancel(e: TouchEvent) {
      e.preventDefault();
      isTouching = false;
      touchStartPos = null;
    }

    function resetSnake() {
      state.snakeBody = [];
      state.hoveredSquare = null;
      state.targetOpacity = 0;
      state.trailSquares.clear();
      createSpecialBlock();

      if (options.vibrationEnabled && navigator.vibrate) {
        navigator.vibrate(200);
      }
    }

    // --- Draw grid ---
    function drawGrid() {
      const dpr = window.devicePixelRatio || 1;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const startX =
        Math.floor(state.gridOffset.x / options.squareSize) *
        options.squareSize;
      const startY =
        Math.floor(state.gridOffset.y / options.squareSize) *
        options.squareSize;

      ctx.lineWidth = isPhone ? 1.0 : 0.5;

      if (isPhone) {
        ctx.translate(0.5, 0.5);
      }

      // Draw trail squares
      for (const [, square] of state.trailSquares) {
        ctx.fillStyle = `rgba(255, 255, 255, ${square.opacity})`;
        ctx.fillRect(square.x, square.y, options.squareSize, options.squareSize);
      }

      // Draw snake body
      for (let i = 0; i < state.snakeBody.length; i++) {
        const segment = state.snakeBody[i];
        const squareX = Math.round(
          segment.x * options.squareSize +
            startX -
            (state.gridOffset.x % options.squareSize)
        );
        const squareY = Math.round(
          segment.y * options.squareSize +
            startY -
            (state.gridOffset.y % options.squareSize)
        );

        ctx.shadowColor = options.hoverShadowColor;
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        if (i === 0) {
          ctx.fillStyle = options.snakeHeadColor;
        } else {
          const gradientFactor = Math.pow(options.snakeColorDecay, i);
          const headColor = parseRGBA(options.snakeHeadColor);
          const tailColor = parseRGBA(options.snakeTailColor);

          if (headColor && tailColor) {
            const r = Math.round(
              headColor.r + (tailColor.r - headColor.r) * (1 - gradientFactor)
            );
            const g = Math.round(
              headColor.g + (tailColor.g - headColor.g) * (1 - gradientFactor)
            );
            const b = Math.round(
              headColor.b + (tailColor.b - headColor.b) * (1 - gradientFactor)
            );
            const a =
              headColor.a + (tailColor.a - headColor.a) * (1 - gradientFactor);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
          } else {
            const opacity = Math.max(0.2, gradientFactor);
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
          }
        }

        ctx.fillRect(squareX, squareY, options.squareSize, options.squareSize);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      // Draw grid, hovered square, and food
      for (
        let x = startX;
        x < canvas.width / dpr + options.squareSize;
        x += options.squareSize
      ) {
        for (
          let y = startY;
          y < canvas.height / dpr + options.squareSize;
          y += options.squareSize
        ) {
          const squareX = Math.round(
            x - (state.gridOffset.x % options.squareSize)
          );
          const squareY = Math.round(
            y - (state.gridOffset.y % options.squareSize)
          );
          const gridX = Math.floor((x - startX) / options.squareSize);
          const gridY = Math.floor((y - startY) / options.squareSize);

          // Draw food
          if (
            state.specialBlock &&
            gridX === state.specialBlock.x &&
            gridY === state.specialBlock.y
          ) {
            ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
            ctx.shadowBlur = 20;
            ctx.fillStyle = state.specialBlock.color;
            ctx.fillRect(
              squareX,
              squareY,
              options.squareSize,
              options.squareSize
            );
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
          }

          // Draw hovered square (snake head)
          if (
            state.hoveredSquare &&
            gridX === state.hoveredSquare.x &&
            gridY === state.hoveredSquare.y
          ) {
            ctx.shadowColor = options.hoverShadowColor;
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            const color = options.hoverFillColor.replace(
              '0.8',
              state.currentOpacity.toString()
            );
            ctx.fillStyle = color;
            ctx.fillRect(
              squareX,
              squareY,
              options.squareSize,
              options.squareSize
            );

            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
          }

          ctx.strokeStyle = options.borderColor;
          ctx.strokeRect(
            squareX,
            squareY,
            options.squareSize,
            options.squareSize
          );
        }
      }

      if (isPhone) {
        ctx.translate(-0.5, -0.5);
      }

      // Radial gradient vignette
      const centerX = canvas.width / dpr / 2;
      const centerY = canvas.height / dpr / 2;
      const radius =
        Math.sqrt(
          Math.pow(canvas.width / dpr, 2) +
            Math.pow(canvas.height / dpr, 2)
        ) / 2;

      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        radius
      );
      gradient.addColorStop(0, 'rgba(6, 6, 6, 0)');
      gradient.addColorStop(1, '#060606');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    }

    // --- Animation loop ---
    function updateAnimation(timestamp: number) {
      if (state.isDestroyed) return;

      if (!state.lastTimestamp) {
        state.lastTimestamp = timestamp;
      }

      const deltaTime = timestamp - state.lastTimestamp;
      state.lastTimestamp = timestamp;

      // Update opacity transition
      if (state.currentOpacity !== state.targetOpacity) {
        const progress = Math.min(
          deltaTime / options.transitionDuration,
          1
        );
        state.currentOpacity =
          state.currentOpacity +
          (state.targetOpacity - state.currentOpacity) * progress;
      }

      // Update trail squares opacity
      for (const [key, square] of state.trailSquares) {
        square.opacity -= deltaTime / options.trailDuration;
        if (square.opacity <= 0) {
          state.trailSquares.delete(key);
        }
      }

      // Update grid position
      const dpr = window.devicePixelRatio || 1;
      const effectiveSpeed = Math.max(
        isPhone ? options.speed * 0.8 : options.speed,
        0
      );
      const moveAmount = isPhone
        ? Math.round(effectiveSpeed * 100) / 100
        : effectiveSpeed;

      switch (options.direction) {
        case 'right':
          state.gridOffset.x =
            (state.gridOffset.x - moveAmount + options.squareSize) %
            options.squareSize;
          break;
        case 'left':
          state.gridOffset.x =
            (state.gridOffset.x + moveAmount + options.squareSize) %
            options.squareSize;
          break;
        case 'up':
          state.gridOffset.y =
            (state.gridOffset.y + moveAmount + options.squareSize) %
            options.squareSize;
          break;
        case 'down':
          state.gridOffset.y =
            (state.gridOffset.y - moveAmount + options.squareSize) %
            options.squareSize;
          break;
        case 'diagonal':
          state.gridOffset.x =
            (state.gridOffset.x - moveAmount + options.squareSize) %
            options.squareSize;
          state.gridOffset.y =
            (state.gridOffset.y - moveAmount + options.squareSize) %
            options.squareSize;
          break;
      }

      // Check if food has moved off screen
      if (state.specialBlock) {
        const startX =
          Math.floor(state.gridOffset.x / options.squareSize) *
          options.squareSize;
        const startY =
          Math.floor(state.gridOffset.y / options.squareSize) *
          options.squareSize;
        const foodX = Math.round(
          state.specialBlock.x * options.squareSize +
            startX -
            (state.gridOffset.x % options.squareSize)
        );
        const foodY = Math.round(
          state.specialBlock.y * options.squareSize +
            startY -
            (state.gridOffset.y % options.squareSize)
        );

        if (
          foodX < -options.squareSize ||
          foodX > canvas.width / dpr ||
          foodY < -options.squareSize ||
          foodY > canvas.height / dpr
        ) {
          createSpecialBlock();
        }
      }

      drawGrid();
      state.animationFrame = requestAnimationFrame(updateAnimation);
    }

    // --- Visibility change handler ---
    function handleVisibilityChange() {
      if (document.hidden) {
        if (state.animationFrame) {
          cancelAnimationFrame(state.animationFrame);
          state.animationFrame = null;
        }
      } else {
        if (!state.animationFrame && !state.isDestroyed) {
          state.lastTimestamp = 0;
          state.animationFrame = requestAnimationFrame(updateAnimation);
        }
      }
    }

    // --- Orientation change handler ---
    function handleOrientationChange() {
      setTimeout(() => {
        resizeCanvas();
        createSpecialBlock();
      }, 300);
    }

    // --- Initialize ---
    resizeCanvas();

    if (isPhone) {
      optimizeForMobile();
    }

    // Mouse events
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Touch events
    if (isPhone) {
      canvas.addEventListener('touchstart', onTouchStart, { passive: false });
      canvas.addEventListener('touchmove', onTouchMove, { passive: false });
      canvas.addEventListener('touchend', onTouchEnd, { passive: false });
      canvas.addEventListener('touchcancel', onTouchCancel, { passive: false });
    }

    // Resize
    window.addEventListener('resize', resizeCanvas);

    // Visibility
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Orientation
    if (isPhone && window.orientation !== undefined) {
      window.addEventListener('orientationchange', handleOrientationChange);
    }

    // Start animation
    state.animationFrame = requestAnimationFrame(updateAnimation);

    // Create food (delayed on mobile)
    if (isPhone) {
      setTimeout(() => {
        if (!state.isDestroyed) createSpecialBlock();
      }, 500);
    } else {
      createSpecialBlock();
    }

    // --- Cleanup ---
    return () => {
      state.isDestroyed = true;

      if (state.animationFrame) {
        cancelAnimationFrame(state.animationFrame);
        state.animationFrame = null;
      }

      if (state.specialBlockTimer) {
        clearTimeout(state.specialBlockTimer);
      }

      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);

      if (isPhone) {
        canvas.removeEventListener('touchstart', onTouchStart);
        canvas.removeEventListener('touchmove', onTouchMove);
        canvas.removeEventListener('touchend', onTouchEnd);
        canvas.removeEventListener('touchcancel', onTouchCancel);
      }

      window.removeEventListener('resize', resizeCanvas);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (isPhone && window.orientation !== undefined) {
        window.removeEventListener('orientationchange', handleOrientationChange);
      }
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}
    />
  );
}
