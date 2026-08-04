'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';

interface VaultCoreProps {
  isVerified: boolean;
  scrollProgress: number;
  showWireframe: boolean;
}

function VaultCore({ isVerified, scrollProgress, showWireframe }: VaultCoreProps) {
  const outerMesh = useRef<THREE.Mesh>(null);
  const innerMesh = useRef<THREE.Mesh>(null);
  const ringMesh = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  // Parallax / cursor tracking
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouse({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Animate components inside R3F loop
  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Lerp rotation towards mouse
    if (outerMesh.current) {
      outerMesh.current.rotation.x = THREE.MathUtils.lerp(outerMesh.current.rotation.x, mouse.y * 0.5 + t * 0.1, 0.05);
      outerMesh.current.rotation.y = THREE.MathUtils.lerp(outerMesh.current.rotation.y, mouse.x * 0.5 + t * 0.15, 0.05);
      
      // Scale dynamic unfolding based on scroll progress
      const scaleFactor = 1 + scrollProgress * 0.4;
      outerMesh.current.scale.set(scaleFactor, scaleFactor, scaleFactor);
    }

    if (innerMesh.current) {
      innerMesh.current.rotation.x = -t * 0.2;
      innerMesh.current.rotation.y = t * 0.3;
    }

    if (ringMesh.current) {
      ringMesh.current.rotation.z = t * 0.5;
      // Oscillating animation for the liquidity ring
      ringMesh.current.position.y = Math.sin(t * 1.5) * 0.1;
    }

    if (particlesRef.current) {
      particlesRef.current.rotation.y = t * 0.05;
    }
  });

  // Emissive glow intensifies when ZK proof is verified
  const glowColor = isVerified ? new THREE.Color('#00ffcc') : new THREE.Color('#3b82f6');
  const glowIntensity = isVerified ? 2.5 : 0.8;

  return (
    <group>
      {/* Outer Hyper-Cube (Metallic & Translucent) */}
      <mesh ref={outerMesh}>
        <octahedronGeometry args={[2, 0]} />
        <meshPhysicalMaterial
          color={isVerified ? '#00ffd0' : '#1e3a8a'}
          emissive={glowColor}
          emissiveIntensity={glowIntensity}
          roughness={0.1}
          metalness={0.9}
          transparent
          opacity={0.65}
          transmission={0.6}
          side={THREE.DoubleSide}
          wireframe={showWireframe}
        />
      </mesh>

      {/* Inner Treasury Bond Tokenized Core */}
      <mesh ref={innerMesh}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial
          color="#ffd700"
          roughness={0.2}
          metalness={1.0}
          emissive="#ffd700"
          emissiveIntensity={isVerified ? 1.0 : 0.2}
        />
      </mesh>

      {/* XLM Liquidity Ring surrounding the core */}
      <mesh ref={ringMesh} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.2, 0.08, 16, 100]} />
        <meshPhysicalMaterial
          color="#00e5ff"
          emissive="#00e5ff"
          emissiveIntensity={1.5}
          roughness={0.1}
          metalness={0.9}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Mathematical ZK Layer representation via particle points */}
      <points ref={particlesRef}>
        <sphereGeometry args={[4, 32, 32]} />
        <pointsMaterial
          color={isVerified ? '#00ffcc' : '#3b82f6'}
          size={0.03}
          transparent
          opacity={0.4}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

interface VaultSceneProps {
  isVerified: boolean;
  scrollProgress: number;
}

export default function VaultScene({ isVerified, scrollProgress }: VaultSceneProps) {
  const [showWireframe, setShowWireframe] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    const handleContextLoss = () => setHasError(true);
    window.addEventListener('webglcontextlost', handleContextLoss);
    return () => window.removeEventListener('webglcontextlost', handleContextLoss);
  }, []);

  if (hasError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black border border-red-900/50 p-6 rounded-lg text-red-400 font-mono">
        WebGL context lost. Please reload the page.
      </div>
    );
  }

  return (
    <div className="relative h-full w-full select-none">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        gl={{ antialias: true }}
        className="h-full w-full"
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#3b82f6" />
        <spotLight position={[0, 15, 0]} angle={0.3} penumbra={1} intensity={2} color="#00ffcc" />

        <VaultCore
          isVerified={isVerified}
          scrollProgress={scrollProgress}
          showWireframe={showWireframe}
        />

        <OrbitControls enableZoom={false} enablePan={false} autoRotate={!showWireframe} autoRotateSpeed={0.5} />
      </Canvas>

      {/* Custom Floating UI Controls inside the WebGL container */}
      <div className="absolute bottom-6 left-6 z-10 flex gap-4">
        <button
          onClick={() => setShowWireframe(!showWireframe)}
          className="border border-[#1A2035]/80 bg-black/60 px-4 py-2 text-xs font-mono tracking-widest text-[#00ffcc] uppercase backdrop-blur-md transition-all hover:bg-[#00ffcc]/10"
        >
          {showWireframe ? 'Hide ZK Proof Matrix' : 'Inspect ZK Proof Matrix'}
        </button>
      </div>

      <div className="absolute top-6 right-6 z-10">
        <span className="flex items-center gap-2 border border-[#1A2035]/80 bg-black/60 px-3 py-1 text-[10px] font-mono tracking-widest uppercase text-white backdrop-blur-md">
          <span className={`h-1.5 w-1.5 rounded-full ${isVerified ? 'bg-[#00ffcc] animate-ping' : 'bg-blue-500'}`} />
          {isVerified ? 'ZK Shield Verified' : 'ZK Shield Inactive'}
        </span>
      </div>
    </div>
  );
}
