import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';

export default function NeuralBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Soft ambient orbs
    const orbs = 12;
    const created: HTMLDivElement[] = [];
    for (let i = 0; i < orbs; i++) {
      const orb = document.createElement('div');
      const size = Math.random() * 400 + 150;
      orb.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${Math.random() * 110 - 5}%;
        top: ${Math.random() * 110 - 5}%;
        border-radius: 50%;
        animation: neural-pulse ${4 + Math.random() * 6}s infinite ease-in-out;
        animation-delay: ${Math.random() * 5}s;
        filter: blur(${60 + Math.random() * 40}px);
        pointer-events: none;
        background: ${i % 3 === 0
          ? 'rgba(255,106,0,0.06)'
          : i % 3 === 1
            ? 'rgba(139,92,246,0.04)'
            : 'rgba(59,130,246,0.04)'};
      `;
      container.appendChild(orb);
      created.push(orb);
    }

    // Tiny floating dots (neural nodes)
    const dots = 18;
    for (let i = 0; i < dots; i++) {
      const dot = document.createElement('div');
      const size = Math.random() * 3 + 1;
      dot.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        border-radius: 50%;
        background: rgba(255,106,0,${0.15 + Math.random() * 0.25});
        animation: neural-dot-float ${6 + Math.random() * 8}s infinite ease-in-out alternate;
        animation-delay: ${Math.random() * 6}s;
        pointer-events: none;
      `;
      container.appendChild(dot);
      created.push(dot);
    }

    return () => created.forEach(el => el.remove());
  }, []);

  return (
    <div ref={containerRef} className="neural-network-bg">
      {/* Sweeping light trails */}
      <motion.div
        animate={{ x: ['-10%', '110%'], opacity: [0, 0.25, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', repeatDelay: 6 }}
        className="absolute top-1/3 left-0 w-[500px] h-px bg-gradient-to-r from-transparent via-orange-400 to-transparent"
        style={{ filter: 'blur(1px)' }}
      />
      <motion.div
        animate={{ x: ['110%', '-10%'], opacity: [0, 0.15, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', repeatDelay: 8, delay: 5 }}
        className="absolute top-2/3 left-0 w-[700px] h-px bg-gradient-to-r from-transparent via-violet-400 to-transparent"
        style={{ filter: 'blur(2px)' }}
      />
      <motion.div
        animate={{ y: ['-10%', '110%'], opacity: [0, 0.12, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', repeatDelay: 10, delay: 3 }}
        className="absolute top-0 left-1/3 w-px h-[600px] bg-gradient-to-b from-transparent via-orange-300 to-transparent"
        style={{ filter: 'blur(1px)' }}
      />

      {/* Corner glow accents */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-radial from-orange-200/20 to-transparent rounded-full -translate-y-1/4 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-radial from-violet-200/15 to-transparent rounded-full translate-y-1/4 -translate-x-1/4 pointer-events-none" />
    </div>
  );
}
