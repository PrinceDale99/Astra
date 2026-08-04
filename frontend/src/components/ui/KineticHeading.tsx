'use client';

import React, { useEffect, useRef, useState } from 'react';

interface KineticHeadingProps {
  text: string;
  className?: string;
  speedMultiplier?: number;
}

export default function KineticHeading({ text, className = '', speedMultiplier = 1 }: KineticHeadingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [fontSettings, setFontSettings] = useState<string>("'wght' 400, 'wdth' 100, 'slnt' 0");

  useEffect(() => {
    let mouseX = 0;
    let mouseY = 0;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let velocity = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      const dx = mouseX - lastMouseX;
      const dy = mouseY - lastMouseY;
      velocity = Math.min(Math.sqrt(dx * dx + dy * dy) * speedMultiplier, 300);

      lastMouseX = mouseX;
      lastMouseY = mouseY;

      updateVariation();
    };

    const handleScroll = () => {
      updateVariation();
    };

    const updateVariation = () => {
      if (!headingRef.current) return;
      const rect = headingRef.current.getBoundingClientRect();
      const headingCenterX = rect.left + rect.width / 2;
      const headingCenterY = rect.top + rect.height / 2;

      // Distance from mouse to heading center
      const dist = Math.sqrt(
        Math.pow(mouseX - headingCenterX, 2) + Math.pow(mouseY - headingCenterY, 2)
      );

      // Scroll progress
      const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
      const maxScroll = typeof window !== 'undefined' ? document.body.scrollHeight - window.innerHeight : 1;
      const scrollProgress = scrollY / (maxScroll || 1);

      // Map values to Font Variation Settings:
      // Weight ('wght'): 100 (thin) to 900 (black)
      const weight = Math.max(100, Math.min(900, 800 - dist * 0.5 + velocity * 0.8));
      
      // Width ('wdth'): 50 (condensed) to 150 (expanded)
      const width = Math.max(50, Math.min(150, 80 + scrollProgress * 70 + velocity * 0.2));
      
      // Slant ('slnt'): -10 (tilted) to 0 (upright)
      const slant = Math.max(-10, Math.min(0, -(velocity * 0.03)));

      setFontSettings(`'wght' ${Math.round(weight)}, 'wdth' ${Math.round(width)}, 'slnt' ${Math.round(slant)}`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);

    // Initial update
    updateVariation();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [speedMultiplier]);

  return (
    <div ref={containerRef} className="w-full overflow-hidden select-none border-y border-[#1A2035]/80 py-4 bg-black/40 backdrop-blur-md">
      <div className="flex whitespace-nowrap animate-marquee">
        <h1
          ref={headingRef}
          className={`text-6xl md:text-8xl tracking-tight text-white uppercase inline-block mx-4 font-extrabold ${className}`}
          style={{
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontVariationSettings: fontSettings,
            transition: 'font-variation-settings 0.15s ease-out',
          }}
        >
          {text} &nbsp; // &nbsp; ZK TRI-PARTY REPO &nbsp; // &nbsp; {text}
        </h1>
        <h1
          className={`text-6xl md:text-8xl tracking-tight text-white uppercase inline-block mx-4 font-extrabold ${className}`}
          style={{
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontVariationSettings: fontSettings,
            transition: 'font-variation-settings 0.15s ease-out',
          }}
        >
          {text} &nbsp; // &nbsp; ZK TRI-PARTY REPO &nbsp; // &nbsp; {text}
        </h1>
      </div>
    </div>
  );
}
