import React, { useEffect, useState } from 'react';
import { Participant, GameStatus } from '../types';

interface RollerProps {
  participants: Participant[];
  status: GameStatus;
  winnerIndex: number | null;
  onAnimationComplete: () => void;
  latestBlock: { id: string; number: number } | null;
  onRemoveParticipant?: (id: string) => void;
}

export const Roller: React.FC<RollerProps> = ({ 
  participants, 
  status, 
  winnerIndex, 
  onAnimationComplete,
  latestBlock,
  onRemoveParticipant
}) => {
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  
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
            do { nextIndex = Math.floor(Math.random() * participants.length); } 
            while (nextIndex === highlightedIndex);
        } else { nextIndex = 0; }

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
    <div className="relative w-full">
      
      {/* Container */}
      <div className="glass-panel rounded-[2rem] border border-white/50 dark:border-white/5 p-6 md:p-8 min-h-[400px] shadow-sm relative overflow-hidden">
        
        {/* Placeholder */}
        {participants.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 z-10">
                <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800/50 flex items-center justify-center mb-4 transform rotate-3">
                   <svg className="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                </div>
                <span className="text-sm font-medium opacity-60">Add participants to start</span>
            </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 relative z-20">
            {participants.map((p, i) => {
                const isActive = i === highlightedIndex;
                const isWinner = status === GameStatus.COMPLETED && i === winnerIndex;
                const isDimmed = (status === GameStatus.ROLLING || status === GameStatus.COMPLETED) && !isActive;

                return (
                    <div 
                        key={`${p.id}-${i}`}
                        className={`
                            relative transition-all duration-300 ease-out rounded-2xl p-4 flex flex-col items-center justify-center gap-3 border group
                            ${isActive 
                                ? 'bg-white dark:bg-gray-800 border-primary-500 shadow-lg shadow-primary-500/20 scale-105 z-10' 
                                : 'bg-white/40 dark:bg-gray-800/20 border-transparent hover:border-white/50 dark:hover:border-white/10'
                            }
                            ${isDimmed ? 'opacity-30 blur-[0.5px] scale-95' : 'opacity-100'}
                            ${isWinner ? 'ring-2 ring-accent-500 shadow-2xl shadow-accent-500/40 !scale-110 z-20 bg-white dark:bg-gray-800' : ''}
                        `}
                    >
                        {status === GameStatus.IDLE && onRemoveParticipant && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onRemoveParticipant(p.id); }}
                                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white dark:bg-gray-700 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-gray-600 shadow-sm border border-gray-100 dark:border-gray-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100 z-30"
                                title="Remove Participant"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        )}

                        <div className={`
                            relative w-14 h-14 rounded-full p-0.5 
                            ${isActive ? 'bg-gradient-harmonic' : 'bg-transparent'}
                        `}>
                            <img 
                                src={p.avatar} 
                                alt={p.name}
                                className="w-full h-full rounded-full bg-gray-50 dark:bg-gray-900 object-cover"
                            />
                        </div>
                        <span className={`
                            text-xs font-semibold truncate w-full text-center
                            ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400'}
                        `}>
                            {p.name}
                        </span>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};