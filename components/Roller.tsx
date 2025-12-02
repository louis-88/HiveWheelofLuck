import React, { useEffect, useState, useRef } from 'react';
import { Participant, GameStatus } from '../types';

interface RollerProps {
  participants: Participant[];
  status: GameStatus;
  winnerIndex: number | null;
  onAnimationComplete: () => void;
  latestBlock: { id: string; number: number } | null;
}

export const Roller: React.FC<RollerProps> = ({ 
  participants, 
  status, 
  winnerIndex, 
  onAnimationComplete,
  latestBlock
}) => {
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [scrambleHash, setScrambleHash] = useState<string>("WAITING FOR BLOCK...");
  
  // Scramble effect for the hash during rolling
  useEffect(() => {
    if (status === GameStatus.ROLLING) {
      const chars = '0123456789ABCDEF';
      const interval = setInterval(() => {
        let result = '';
        for (let i = 0; i < 40; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setScrambleHash(result);
      }, 50);
      return () => clearInterval(interval);
    } else if (status === GameStatus.IDLE && latestBlock) {
        setScrambleHash(latestBlock.id);
    } else if (status === GameStatus.COMPLETED && latestBlock) {
         // Keep the winning block hash or the last one
         // In a real app we might pass the specific game block hash here
    }
  }, [status, latestBlock]);

  // Rolling Animation Logic
  useEffect(() => {
    if (status === GameStatus.ROLLING && winnerIndex !== null) {
      let currentStep = 0;
      let speed = 50; 
      const minSteps = 30; 
      const totalSteps = minSteps + Math.floor(Math.random() * 20); 

      const animate = () => {
        if (currentStep >= totalSteps) {
             setHighlightedIndex(winnerIndex);
             setTimeout(onAnimationComplete, 1200); 
             return;
        }

        let nextIndex;
        if (participants.length > 1) {
            do {
                nextIndex = Math.floor(Math.random() * participants.length);
            } while (nextIndex === highlightedIndex);
        } else {
            nextIndex = 0;
        }

        setHighlightedIndex(nextIndex);
        currentStep++;
        
        const t = currentStep / totalSteps;
        speed = 50 + (t * t * 450); 

        setTimeout(animate, speed);
      };

      animate();
    } else if (status === GameStatus.IDLE) {
      setHighlightedIndex(null);
    } else if (status === GameStatus.COMPLETED && winnerIndex !== null) {
      setHighlightedIndex(winnerIndex);
    }
  }, [status, winnerIndex, participants, onAnimationComplete]);

  return (
    <div className="w-full max-w-7xl mx-auto">
      
      {/* Live Block Ticker */}
      <div className="mb-6 bg-gray-900 rounded-xl border border-gray-800 p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
         {/* Animated Background Line */}
         <div className={`absolute bottom-0 left-0 h-1 bg-brand-neon transition-all duration-300 ${status === GameStatus.ROLLING ? 'w-full animate-pulse' : 'w-0'}`}></div>
         
         <div className="flex items-center gap-3 z-10">
            <div className={`w-3 h-3 rounded-full ${latestBlock ? 'bg-brand-neon shadow-[0_0_10px_#00ff41]' : 'bg-red-500'} animate-pulse`}></div>
            <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Live Hive Block</span>
                <span className="text-xl font-mono text-white font-bold leading-none">
                    #{latestBlock ? latestBlock.number.toLocaleString() : 'CONNECTING...'}
                </span>
            </div>
         </div>

         <div className="font-mono text-xs md:text-sm text-brand-gold bg-black/30 px-4 py-2 rounded-lg border border-gray-700/50 w-full md:w-auto text-center md:text-right overflow-hidden tracking-wider">
             <span className="opacity-50 mr-2">HASH:</span>
             {status === GameStatus.ROLLING ? scrambleHash.substring(0, 32) : (latestBlock?.id || '...')}
         </div>
      </div>

      {/* Main Grid Container */}
      <div className="bg-gray-950/50 rounded-3xl border border-gray-800 p-8 shadow-2xl backdrop-blur-md relative min-h-[500px] flex flex-col">
        
        {/* Empty State */}
        {participants.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 z-0">
                <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <span className="text-lg font-medium">Waiting for participants...</span>
            </div>
        )}

        {/* The Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 relative z-10 pb-4">
            {participants.map((p, i) => {
                const isActive = i === highlightedIndex;
                const isWinner = status === GameStatus.COMPLETED && i === winnerIndex;
                const isRolling = status === GameStatus.ROLLING;
                
                // Opacity Logic: If rolling/completed, dim everyone except the active one
                const isDimmed = (isRolling || status === GameStatus.COMPLETED) && !isActive;

                return (
                    <div 
                        key={`${p.id}-${i}`}
                        className={`
                            relative group perspective-1000
                            transition-all duration-300
                            ${isDimmed ? 'opacity-20 blur-[1px] scale-95' : 'opacity-100 scale-100'}
                            ${isWinner ? 'z-50' : 'z-auto'}
                        `}
                    >
                        {/* Card Inner */}
                        <div className={`
                            relative flex flex-col items-center justify-center p-4 rounded-xl 
                            border transition-all duration-200 h-full min-h-[160px]
                            ${isActive 
                                ? 'bg-gray-800 border-brand-neon shadow-[0_0_30px_rgba(0,255,65,0.15)] transform -translate-y-2' 
                                : 'bg-gray-900/40 border-gray-800 hover:border-gray-700 hover:bg-gray-900/80'
                            }
                            ${isWinner ? 'ring-4 ring-brand-neon bg-gray-800 !scale-110 shadow-[0_0_50px_rgba(0,255,65,0.4)]' : ''}
                        `}>
                            {/* Avatar */}
                            <div className="relative mb-3">
                                <div className={`
                                    w-16 h-16 md:w-20 md:h-20 rounded-full p-1 bg-gradient-to-br from-gray-700 to-black 
                                    ${isActive ? 'from-brand-neon to-black' : ''}
                                `}>
                                    <img 
                                        src={p.avatar} 
                                        alt={p.name}
                                        className="w-full h-full rounded-full object-cover bg-gray-900"
                                    />
                                </div>
                                
                                {isActive && !isWinner && (
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-neon opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-neon"></span>
                                    </span>
                                )}
                            </div>
                            
                            {/* Name */}
                            <span className={`
                                text-sm font-bold tracking-wide truncate w-full text-center
                                ${isActive ? 'text-white' : 'text-gray-400'}
                                ${isWinner ? 'text-brand-neon' : ''}
                            `}>
                                {p.name}
                            </span>

                            {/* Color Bar */}
                            <div 
                                className="mt-3 w-12 h-1 rounded-full opacity-60" 
                                style={{ backgroundColor: p.color, boxShadow: isActive ? `0 0 10px ${p.color}` : 'none' }}
                            ></div>
                        </div>

                        {/* Winner "God Ray" Background Effect (Only visible on winner) */}
                        {isWinner && (
                            <div className="absolute inset-0 bg-brand-neon/20 blur-2xl -z-10 rounded-full transform scale-150 animate-pulse"></div>
                        )}
                    </div>
                );
            })}
        </div>

        {/* Global Winner Overlay (Darkens everything else properly) */}
        {status === GameStatus.COMPLETED && (
            <div className="absolute inset-0 bg-black/60 z-40 rounded-3xl backdrop-blur-sm pointer-events-none transition-opacity duration-500"></div>
        )}
      </div>
    </div>
  );
};
