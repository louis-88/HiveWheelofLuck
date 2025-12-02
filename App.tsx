import React, { useState, useEffect, useCallback } from 'react';
import { Roller } from './components/Roller';
import { generateHash, getRollFromHash, getWinner, fetchHiveBlock } from './utils/provablyFair';
import { extractPostDetails, fetchPostParticipants } from './utils/hive';
import { Participant, GameStatus, HistoryItem } from './types';
import { MOCK_PARTICIPANTS } from './constants';

interface CalculationDetails {
  clientSeed: string;
  blockHash: string;
  resultHash: string;
  hexSlice: string;
  decimal: number;
  winnerIndex: number;
  totalParticipants: number;
}

const App: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>(MOCK_PARTICIPANTS);
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [winnerInfo, setWinnerInfo] = useState<{index: number, data: Participant} | null>(null);
  
  // Game State
  const [gameBlockData, setGameBlockData] = useState<{id: string, number: number} | null>(null);
  const [calculationDetails, setCalculationDetails] = useState<CalculationDetails | null>(null);
  
  // Live State
  const [latestBlock, setLatestBlock] = useState<{id: string, number: number} | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [seedInput, setSeedInput] = useState<string>('');
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  
  // Hive Post Input State
  const [postUrl, setPostUrl] = useState('');
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCustomList, setIsCustomList] = useState(false);
  const [excludeBots, setExcludeBots] = useState(true);

  // Initialize a random client seed
  useEffect(() => {
    setSeedInput(Math.random().toString(36).substring(2, 10).toUpperCase());
  }, []);

  // Poll for latest block to show liveness
  useEffect(() => {
    const fetchLatest = async () => {
        try {
            const block = await fetchHiveBlock();
            setLatestBlock(block);
        } catch (e) {
            // silent fail for poller
        }
    };
    fetchLatest();
    const interval = setInterval(fetchLatest, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleLoadParticipants = async () => {
    setErrorMsg('');
    const details = extractPostDetails(postUrl);
    
    if (!details) {
      setErrorMsg('Invalid Hive URL. Format: @author/permlink');
      return;
    }

    setLoadingParticipants(true);
    try {
      const users = await fetchPostParticipants(details.author, details.permlink, excludeBots);
      if (users.length === 0) {
        setErrorMsg('No eligible participants found (check bot filter?).');
      } else {
        setParticipants(users);
        setIsCustomList(true);
        // Reset game state
        setStatus(GameStatus.IDLE);
        setWinnerInfo(null);
        setGameBlockData(null);
      }
    } catch (err) {
      setErrorMsg('Failed to load comments from Hive API.');
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleRoll = async () => {
    if (status === GameStatus.ROLLING || isFetching) return;
    if (participants.length === 0) {
      setErrorMsg("No participants available to roll.");
      return;
    }

    setIsFetching(true);
    setErrorMsg('');
    
    try {
      // 1. Fetch real Hive Block Data explicitly for this roll
      const hiveBlock = await fetchHiveBlock();
      setGameBlockData(hiveBlock);

      // 2. Generate Hash (Client Seed + Hive Block Hash)
      const inputForHash = `${seedInput}-${hiveBlock.id}`;
      const hash = await generateHash(inputForHash);
      
      // 3. Determine Winner
      const rollValue = getRollFromHash(hash);
      const result = getWinner(participants, rollValue);
      
      if (result) {
        const hashSub = hash.substring(0, 8);
        setCalculationDetails({
            clientSeed: seedInput,
            blockHash: hiveBlock.id,
            resultHash: hash,
            hexSlice: hashSub,
            decimal: rollValue,
            winnerIndex: result.index,
            totalParticipants: participants.length
        });
        
        setWinnerInfo({ index: result.index, data: result.winner });
        setStatus(GameStatus.ROLLING);
        setShowWinnerModal(false);
      }
    } catch (e) {
      console.error("Roll failed", e);
      setErrorMsg("Failed to initiate roll. Hive nodes might be unreachable.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleAnimationComplete = useCallback(() => {
    setStatus(GameStatus.COMPLETED);
    setShowWinnerModal(true);
    
    if (winnerInfo && gameBlockData) {
      setHistory(prev => [{
        id: Date.now().toString(),
        winnerName: winnerInfo.data.name,
        blockHash: gameBlockData.id,
        timestamp: Date.now()
      }, ...prev].slice(0, 10)); 
    }
  }, [winnerInfo, gameBlockData]);

  const shareResult = () => {
    if (!winnerInfo || !gameBlockData) return;
    const text = `🏆 Winner: ${winnerInfo.data.name}!\n📍 Post: ${postUrl ? postUrl : 'Custom Roll'}\n🧱 Block: #${gameBlockData.number}\n🎲 Hash: ${gameBlockData.id.substring(0, 8)}...\n\nGenerated by Hive Fortune`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCloseModal = () => {
      setShowWinnerModal(false);
      setStatus(GameStatus.IDLE); // Reset status to remove blur/overlay
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-gray-200 flex flex-col font-sans">
      {/* Header */}
      <header className="p-4 border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.reload()}>
            <div className="w-10 h-10 bg-gradient-to-br from-brand-gold to-yellow-600 rounded-lg flex items-center justify-center shadow-gold">
               <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white leading-none">Hive<span className="text-brand-gold">Fortune</span></h1>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Provably Fair</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-start gap-8 py-8 px-4 relative">
        
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-brand-accent/5 blur-[100px] rounded-full pointer-events-none z-0"></div>

        {/* Action Controls */}
        <section className="w-full max-w-5xl z-10 grid grid-cols-1 md:grid-cols-2 gap-6 order-2 md:order-1">
           
           {/* Left: Data Source */}
           <div className="bg-gray-900/80 backdrop-blur p-1 rounded-2xl border border-gray-800 shadow-2xl h-full">
             <div className="bg-gray-950 rounded-xl p-6 border border-gray-800/50 h-full flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-brand-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    Load From Hive
                  </h3>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="https://hive.blog/@user/post-link"
                      value={postUrl}
                      onChange={(e) => setPostUrl(e.target.value)}
                      disabled={loadingParticipants || status === GameStatus.ROLLING}
                      className="w-full bg-gray-900 border border-gray-700 text-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent text-sm mb-2"
                    />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <input 
                        type="checkbox" 
                        id="excludeBots" 
                        checked={excludeBots} 
                        onChange={(e) => setExcludeBots(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-700 text-brand-accent focus:ring-brand-accent bg-gray-800"
                    />
                    <label htmlFor="excludeBots" className="text-xs text-gray-400 select-none cursor-pointer">
                        Exclude Bots (e.g. {excludeBots ? 'hivebuzz, tipu...' : ''})
                    </label>
                  </div>
                  {errorMsg && <p className="text-red-500 text-xs mb-2">{errorMsg}</p>}
                </div>
                
                <button
                  onClick={handleLoadParticipants}
                  disabled={loadingParticipants || status === GameStatus.ROLLING || !postUrl}
                  className="w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wider bg-gray-800 hover:bg-gray-700 text-white transition-colors border border-gray-700 flex items-center justify-center gap-2"
                >
                  {loadingParticipants ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Loading...
                    </>
                  ) : 'Fetch Participants'}
                </button>
             </div>
           </div>

           {/* Right: Roller Controls */}
           <div className="bg-gray-900/80 backdrop-blur p-1 rounded-2xl border border-gray-800 shadow-2xl h-full">
              <div className="bg-gray-950 rounded-xl p-6 border border-gray-800/50 h-full flex flex-col justify-between">
                <div>
                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    Provably Fair Roll
                  </h3>
                  <div className="mb-2">
                    <div className="flex justify-between items-center mb-1">
                       <label className="text-[10px] text-gray-500 uppercase font-bold">Client Seed</label>
                       <span className="text-[10px] text-brand-gold cursor-pointer hover:underline" onClick={() => setSeedInput(Math.random().toString(36).substring(2, 10).toUpperCase())}>Refresh</span>
                    </div>
                    <input 
                      type="text" 
                      value={seedInput}
                      onChange={(e) => setSeedInput(e.target.value)}
                      disabled={status === GameStatus.ROLLING}
                      className="w-full bg-gray-900 border border-gray-700 text-brand-gold px-3 py-2 rounded-lg focus:outline-none focus:border-brand-gold font-mono text-sm text-center"
                    />
                  </div>
                </div>
                  
                <button
                  onClick={handleRoll}
                  disabled={status === GameStatus.ROLLING || isFetching || participants.length === 0}
                  className={`
                    w-full py-4 rounded-lg font-black text-lg uppercase tracking-widest transition-all transform active:scale-95 shadow-lg mt-2
                    ${status === GameStatus.ROLLING || isFetching || participants.length === 0
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700' 
                      : 'bg-brand-neon text-black hover:bg-[#33ff66] hover:shadow-[0_0_20px_rgba(0,255,65,0.4)] border border-transparent'
                    }
                  `}
                >
                  {isFetching ? 'Verifying Block...' : status === GameStatus.ROLLING ? 'Rolling...' : 'Roll to Win'}
                </button>
              </div>
           </div>
        </section>

        {/* Roller Section (Grid) */}
        <section className="w-full z-10 order-1 md:order-2">
           <div className="flex justify-between items-center max-w-6xl mx-auto px-4 mb-2">
             <span className="text-xs font-mono text-gray-500">
               {participants.length} Participant{participants.length !== 1 && 's'}
               {isCustomList && <span className="ml-2 text-brand-neon">• Live Data</span>}
               {excludeBots && <span className="ml-2 text-gray-600">(Bots Excluded)</span>}
             </span>
             {gameBlockData && status === GameStatus.ROLLING && (
                <span className="text-xs font-mono text-brand-gold animate-pulse">
                  Locking to Block #{gameBlockData.number}
                </span>
             )}
           </div>
           
           <Roller 
             participants={participants}
             status={status}
             winnerIndex={winnerInfo?.index ?? null}
             onAnimationComplete={handleAnimationComplete}
             latestBlock={latestBlock}
           />
        </section>

        {/* Winner Modal / Overlay */}
        {showWinnerModal && winnerInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
             <div className="bg-gray-900 border border-gray-700 rounded-2xl p-1 w-full max-w-md shadow-2xl transform scale-100 animate-bounce-in max-h-[90vh] overflow-y-auto">
                <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl p-8 flex flex-col items-center text-center relative overflow-hidden">
                   {/* Confetti / Glow effect bg */}
                   <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-brand-gold/20 blur-3xl rounded-full"></div>

                   <h2 className="text-3xl font-black text-white italic uppercase mb-6 z-10 relative drop-shadow-md">
                     Winner!
                   </h2>
                   
                   <div className="relative mb-6 z-10">
                     <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-brand-gold to-white shadow-gold animate-pulse-fast">
                       <img src={winnerInfo.data.avatar} alt="Winner" className="w-full h-full rounded-full bg-gray-900 object-cover" />
                     </div>
                   </div>

                   <h3 className="text-2xl font-bold text-brand-gold mb-1 z-10">{winnerInfo.data.name}</h3>
                   <div className="text-gray-400 text-xs font-mono mb-4 z-10 bg-black/50 px-2 py-1 rounded border border-gray-700">
                      Block ID: <span className="text-brand-neon">{gameBlockData?.id.substring(0,16)}...</span>
                   </div>

                   {/* Visual Fairness Breakdown */}
                   {calculationDetails && (
                    <div className="w-full bg-gray-950/80 rounded-lg p-4 border border-gray-800 mb-6 flex flex-col gap-3 relative overflow-hidden z-20">
                        {/* Label */}
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold text-center mb-1">Fairness Verification</div>
                        
                        {/* Step 1: Inputs */}
                        <div className="flex justify-between items-end text-xs">
                            <div className="flex flex-col gap-1 w-5/12 text-left">
                                <span className="text-[9px] text-gray-500 uppercase">Client Seed</span>
                                <span className="bg-gray-900 px-2 py-1 rounded border border-gray-700 truncate font-mono text-gray-300 w-full block" title={calculationDetails.clientSeed}>
                                    {calculationDetails.clientSeed}
                                </span>
                            </div>
                            <span className="text-gray-500 mb-2">+</span>
                            <div className="flex flex-col gap-1 w-5/12 text-right">
                                <span className="text-[9px] text-gray-500 uppercase">Block Hash</span>
                                <span className="bg-gray-900 px-2 py-1 rounded border border-gray-700 truncate font-mono text-blue-400 w-full block" title={calculationDetails.blockHash}>
                                    {calculationDetails.blockHash.substring(0, 10)}...
                                </span>
                            </div>
                        </div>

                        {/* Step 2: Hashed */}
                        <div className="flex flex-col items-center gap-1">
                            <div className="h-4 w-px bg-gray-700"></div>
                            <div className="text-[9px] bg-gray-800 text-gray-400 px-2 rounded-full border border-gray-700">SHA-256</div>
                            <div className="h-4 w-px bg-gray-700"></div>
                        </div>

                        {/* Step 3: Result */}
                        <div className="bg-black/50 p-2 rounded border border-gray-700/50 text-center">
                            <div className="text-[9px] text-gray-500 uppercase mb-1">Resulting Hash</div>
                            <div className="font-mono text-[10px] text-brand-neon break-all leading-tight">
                                {calculationDetails.resultHash}
                            </div>
                        </div>

                        {/* Step 4: Final Math */}
                        <div className="flex items-center justify-between text-xs bg-gray-800/50 p-2 rounded border border-gray-700/50 mt-1">
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] text-gray-500">Hex Value</span>
                                <span className="font-mono text-gray-300">.{calculationDetails.hexSlice}</span>
                            </div>
                            <span className="text-gray-500">×</span>
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] text-gray-500">Users</span>
                                <span className="font-mono text-gray-300">{calculationDetails.totalParticipants}</span>
                            </div>
                            <span className="text-gray-500">=</span>
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] text-gray-500">Index</span>
                                <span className="font-bold text-brand-gold text-sm">{calculationDetails.winnerIndex}</span>
                            </div>
                        </div>
                    </div>
                   )}

                   <div className="grid grid-cols-2 gap-3 w-full z-10">
                      <button 
                        onClick={shareResult}
                        className="flex items-center justify-center gap-2 bg-[#1DA1F2] hover:bg-[#1a91da] text-white py-3 rounded-lg font-bold text-sm transition-colors shadow-lg"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                        Share Win
                      </button>
                      <button 
                        onClick={handleCloseModal}
                        className="bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-bold text-sm transition-colors shadow-lg"
                      >
                        Close
                      </button>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* History / Recent Wins */}
        {history.length > 0 && (
           <div className="w-full max-w-4xl mt-4 order-3">
              <h4 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-4 ml-2">Recent Drops</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {history.map((item) => (
                  <div key={item.id} className="bg-gray-900 border border-gray-800 p-3 rounded flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500">
                          {item.winnerName.substring(0,2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                           <span className="text-sm font-bold text-gray-300">{item.winnerName}</span>
                           <span className="text-[10px] text-gray-600 font-mono">{item.blockHash.substring(0,12)}...</span>
                        </div>
                     </div>
                     <span className="text-xs text-brand-gold font-mono">
                        {(Date.now() - item.timestamp) < 60000 ? 'Just now' : '1m ago'}
                     </span>
                  </div>
                ))}
              </div>
           </div>
        )}

      </main>
    </div>
  );
};

export default App;