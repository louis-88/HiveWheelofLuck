import React, { useState, useEffect } from 'react';
import { generateHash, getRollFromHash } from '../utils/provablyFair';

export const Fairness: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [vClientSeed, setVClientSeed] = useState('');
  const [vBlockHash, setVBlockHash] = useState('');
  const [vCount, setVCount] = useState<number>(10);
  const [vResult, setVResult] = useState<{hash: string, roll: number, index: number} | null>(null);

  useEffect(() => {
    const runVerify = async () => {
        if(!vClientSeed || !vBlockHash || !vCount) { setVResult(null); return; }
        try {
            const input = `${vClientSeed}-${vBlockHash}`;
            const hash = await generateHash(input);
            const roll = getRollFromHash(hash);
            const index = Math.floor(roll * vCount);
            setVResult({ hash, roll, index });
        } catch(e) { console.error(e); }
    }
    runVerify();
  }, [vClientSeed, vBlockHash, vCount]);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">Provably <span className="text-transparent bg-clip-text bg-gradient-harmonic">Fair</span></h1>
        <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed">
            The heart of Hive Fortune is trust. We use a transparent, verifiable algorithm combining your input with immutable blockchain data.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {['Client Seed', 'Block Hash', 'Algorithm'].map((title, i) => (
             <div key={title} className="glass-card p-6 rounded-3xl text-center hover:-translate-y-1 transition-transform duration-300">
                <div className="w-12 h-12 mx-auto rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-4 text-lg font-bold">
                    {i+1}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
                <p className="text-xs text-gray-500 leading-5">
                    {i===0 && "You provide a random string. We can't predict it."}
                    {i===1 && "We fetch the latest Hive Block ID. It's immutable."}
                    {i===2 && "SHA-256 hash combines both seeds to pick a winner."}
                </p>
             </div>
          ))}
      </div>

      <div className="glass-panel p-8 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Verify Result</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Client Seed</label>
                    <input type="text" value={vClientSeed} onChange={e => setVClientSeed(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm outline-none focus:border-primary-500" />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Block Hash</label>
                    <input type="text" value={vBlockHash} onChange={e => setVBlockHash(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm outline-none focus:border-primary-500" />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Count</label>
                    <input type="number" value={vCount} onChange={e => setVCount(parseInt(e.target.value) || 0)} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm outline-none focus:border-primary-500" />
                </div>
            </div>

            <div className="bg-gray-100 dark:bg-black/30 rounded-xl p-6 font-mono text-sm">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-500">Resulting Hash</span>
                    <span className="text-xs text-gray-800 dark:text-gray-300 break-all max-w-[200px] text-right">{vResult?.hash || '---'}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-500">Roll (0-1)</span>
                    <span className="text-primary-500">{vResult?.roll.toFixed(8) || '---'}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-800">
                    <span className="font-bold text-gray-900 dark:text-white">Winner Index</span>
                    <span className="font-bold text-xl text-accent-500">{vResult !== null ? vResult.index : '---'}</span>
                </div>
            </div>
      </div>
    </div>
  );
};