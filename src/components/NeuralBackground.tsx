import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';

export default function NeuralBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create particles
    const particleCount = 20;
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'neural-node';
      const size = Math.random() * 300 + 100;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.animationDelay = `${Math.random() * 5}s`;
      particle.style.filter = 'blur(80px)';
      particle.style.background = i % 2 === 0 ? 'rgba(255, 106, 0, 0.08)' : 'rgba(139, 92, 246, 0.05)';
      container.appendChild(particle);
    }
  }, []);

  return (
    <div ref={containerRef} className="neural-network-bg">
      {/* Animated Light Trails */}
      <motion.div
        animate={{
          x: [0, 400, 0],
          y: [0, 200, 0],
          opacity: [0.1, 0.3, 0.1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/4 left-1/4 w-[600px] h-1 bg-gradient-to-r from-transparent via-orange-400/20 to-transparent blur-2xl rotate-45"
      />
      <motion.div
        animate={{
          x: [0, -300, 0],
          y: [0, 400, 0],
          opacity: [0.1, 0.3, 0.1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-1/4 right-1/4 w-[800px] h-1 bg-gradient-to-r from-transparent via-purple-400/20 to-transparent blur-3xl -rotate-12"
      />
    </div>
  );
}
