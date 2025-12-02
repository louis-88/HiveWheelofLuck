import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Participant } from '../types';

interface OracleProps {
  lastWinner: Participant | null;
  lastBlockHash: string;
}

export const Oracle: React.FC<OracleProps> = ({ lastWinner, lastBlockHash }) => {
  const [fortune, setFortune] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const askOracle = async () => {
    if (!lastWinner || !process.env.API_KEY) return;
    
    setLoading(true);
    setFortune("");

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `
        You are a mystical cyberpunk fortune teller on the Hive blockchain.
        The winner of the last round was "${lastWinner.name}" with the block hash "${lastBlockHash}".
        
        Generate a short, cryptic, but cool congratulatory message or prediction for them (max 2 sentences). 
        Mention the "Block Spirit" or "Hash Destiny".
        Use a mystical, slightly tech-noir tone.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      setFortune(response.text || "The blocks are silent...");
    } catch (error) {
      console.error("Oracle error:", error);
      setFortune("Communication with the Oracle severed.");
    } finally {
      setLoading(false);
    }
  };

  if (!lastWinner) return null;

  return (
    <div className="mt-8 p-6 bg-gray-800 rounded-xl border border-brand-accent/30 max-w-2xl mx-auto text-center relative overflow-hidden group">
      <div className="absolute inset-0 bg-brand-accent/5 opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
      
      <h3 className="text-brand-accent font-mono text-sm uppercase tracking-widest mb-4">
        AI Oracle Insight
      </h3>
      
      {fortune ? (
        <div className="animate-fade-in">
          <p className="text-xl text-white font-serif italic leading-relaxed">
            "{fortune}"
          </p>
          <button 
            onClick={() => setFortune("")}
            className="mt-4 text-xs text-gray-500 hover:text-gray-300 underline"
          >
            Clear Vision
          </button>
        </div>
      ) : (
        <button
          onClick={askOracle}
          disabled={loading}
          className="relative inline-flex items-center justify-center px-6 py-2 overflow-hidden font-bold text-white transition-all duration-300 bg-brand-accent rounded-full group focus:outline-none focus:ring "
        >
           <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
           <span className="relative flex items-center gap-2">
             {loading ? 'Consulting the blocks...' : 'Ask the Oracle for a Reading'}
             {!loading && (
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
               </svg>
             )}
           </span>
        </button>
      )}
    </div>
  );
};