import React, { useState, useEffect, useCallback } from 'react';
import { Roller } from './components/Roller';
import { Fairness } from './components/Fairness';
import { BotsPage } from './components/BotsPage';
import { generateHash, getRollFromHash, getWinner, fetchHiveBlock } from './utils/provablyFair';
import { extractPostDetails, fetchPostParticipants, stringToColor, BOT_BLACKLIST } from './utils/hive';
import { Participant, GameStatus, HistoryItem } from './types';

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
  // Navigation View State
  const [view, setView] = useState<'game' | 'fairness' | 'bots'>('game');

  // State
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [winnerInfo, setWinnerInfo] = useState<{index: number, data: Participant} | null>(null);
  
  const [gameBlockData, setGameBlockData] = useState<{id: string, number: number} | null>(null);
  const [calculationDetails, setCalculationDetails] = useState<CalculationDetails | null>(null);
  const [latestBlock, setLatestBlock] = useState<{id: string, number: number} | null>(null);
  
  // History with Local Storage Init
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('hiveFortuneHistory');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [seedInput, setSeedInput] = useState<string>('');
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  
  // Inputs
  const [inputMode, setInputMode] = useState<'hive' | 'manual'>('hive');
  const [postUrl, setPostUrl] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCustomList, setIsCustomList] = useState(false);
  const [excludeBots, setExcludeBots] = useState(true);

  // Theme
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('hiveFortuneTheme');
    return (saved === 'light') ? 'light' : 'dark';
  });

  useEffect(() => {
    localStorage.setItem('hiveFortuneTheme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#020617';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f8fafc';
    }
  }, [theme]);

  // Persist History
  useEffect(() => {
    if (history.length > 0) {
        localStorage.setItem('hiveFortuneHistory', JSON.stringify(history));
    }
  }, [history]);

  // Init Seed
  useEffect(() => {
    setSeedInput(Math.random().toString(36).substring(2, 10).toUpperCase());
  }, []);

  // Poll Block
  useEffect(() => {
    const fetchLatest = async () => {
        try {
            const block = await fetchHiveBlock();
            setLatestBlock(block);
        } catch (e) { }
    };
    fetchLatest();
    const interval = setInterval(fetchLatest, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleLoadParticipants = async () => {
    setErrorMsg('');
    if (inputMode === 'hive') {
        const details = extractPostDetails(postUrl);
        if (!details) {
          setErrorMsg('Invalid Hive URL.');
          return;
        }
        setLoadingParticipants(true);
        try {
          const users = await fetchPostParticipants(details.author, details.permlink, excludeBots);
          if (users.length === 0) setErrorMsg('No eligible participants found.');
          else {
            setParticipants(users);
            setIsCustomList(true);
            resetGameState();
          }
        } catch (err) {
          setErrorMsg('Failed to fetch from Hive.');
        } finally {
          setLoadingParticipants(false);
        }
    } else {
        const lines = manualInput.split('\n').map(l => l.trim()).filter(l => l !== '');
        if (lines.length === 0) {
            setErrorMsg('Enter at least one name.');
            return;
        }
        setParticipants(lines.map(name => ({
            id: name,
            name: name,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`, 
            ticketCount: 1,
            color: stringToColor(name)
        })));
        setIsCustomList(false);
        resetGameState();
    }
  };

  const resetGameState = () => {
    setStatus(GameStatus.IDLE);
    setWinnerInfo(null);
    setGameBlockData(null);
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
  };

  const handleRoll = async () => {
    if (status === GameStatus.ROLLING || isFetching || participants.length === 0) return;

    setIsFetching(true);
    setErrorMsg('');
    
    try {
      const hiveBlock = await fetchHiveBlock();
      setGameBlockData(hiveBlock);

      const inputForHash = `${seedInput}-${hiveBlock.id}`;
      const hash = await generateHash(inputForHash);
      const rollValue = getRollFromHash(hash);
      const result = getWinner(participants, rollValue);
      
      if (result) {
        setCalculationDetails({
            clientSeed: seedInput,
            blockHash: hiveBlock.id,
            resultHash: hash,
            hexSlice: hash.substring(0, 8),
            decimal: rollValue,
            winnerIndex: result.index,
            totalParticipants: participants.length
        });
        setWinnerInfo({ index: result.index, data: result.winner });
        setStatus(GameStatus.ROLLING);
        setShowWinnerModal(false);
      }
    } catch (e) {
      setErrorMsg("Connection error. Check Hive nodes.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleAnimationComplete = useCallback(() => {
    setStatus(GameStatus.COMPLETED);
    setShowWinnerModal(true);
    if (winnerInfo && gameBlockData) {
      setHistory(prev => {
        const newHistory = [{
            id: Date.now().toString(),
            winnerName: winnerInfo.data.name,
            winnerAvatar: winnerInfo.data.avatar,
            blockHash: gameBlockData.id,
            timestamp: Date.now()
        }, ...prev].slice(0, 10);
        
        // Save immediately to ensure persistence
        localStorage.setItem('hiveFortuneHistory', JSON.stringify(newHistory));
        return newHistory;
      });
    }
  }, [winnerInfo, gameBlockData]);

  const handleShare = () => {
      if(!winnerInfo || !gameBlockData) return;
      const text = `🏆 I just saw ${winnerInfo.data.name} win on Hive Fortune! \n\n🎲 Block Hash: ${gameBlockData.id.substring(0,10)}...\n\nVerify it here:`;
      const url = window.location.href;
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const clearHistory = () => {
    if(window.confirm('Are you sure you want to clear the winner history?')) {
      setHistory([]);
      localStorage.removeItem('hiveFortuneHistory');
    }
  };

  return (
    <div className="min-h-screen text-gray-800 dark:text-gray-200 font-sans transition-colors duration-500 overflow-x-hidden flex flex-col">
      
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
          <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary-100/40 to-transparent dark:from-primary-900/10"></div>
          <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-accent-500/10 rounded-full blur-[120px] animate-pulse-slow"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-[100px]"></div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-4 z-50 px-4 mb-8">
        <div className="max-w-6xl mx-auto bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-lg rounded-full px-6 py-3 flex justify-between items-center transition-all duration-300">
             <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('game')}>
                 <div className="w-8 h-8 rounded-lg bg-gradient-harmonic flex items-center justify-center shadow-lg shadow-primary-500/20">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                 </div>
                 <span className="font-bold text-lg tracking-tight text-gray-900 dark:text-white">Hive<span className="text-primary-600 dark:text-primary-400">Fortune</span></span>
             </div>

             <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-full">
                <button 
                  onClick={() => setView('game')}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${view === 'game' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
                >
                    Game
                </button>
                <button 
                  onClick={() => setView('fairness')}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${view === 'fairness' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
                >
                    Fairness
                </button>
             </div>

             <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
             >
                {theme === 'dark' ? 
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> :
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                }
             </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 pb-20 flex-grow w-full">
        
        {view === 'fairness' && <Fairness onBack={() => setView('game')} />}
        
        {view === 'bots' && <BotsPage onBack={() => setView('game')} />}

        {view === 'game' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* --- Left Column: Controls --- */}
                <div className="lg:col-span-4 space-y-6 sticky top-24">
                    
                    {/* Input Card */}
                    <div className="glass-card rounded-3xl p-6 shadow-xl shadow-gray-200/50 dark:shadow-none">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Setup</h2>
                            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                                <button onClick={() => setInputMode('hive')} className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${inputMode === 'hive' ? 'bg-white dark:bg-gray-700 shadow text-primary-600 dark:text-primary-400' : 'text-gray-400'}`}>Hive</button>
                                <button onClick={() => setInputMode('manual')} className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${inputMode === 'manual' ? 'bg-white dark:bg-gray-700 shadow text-primary-600 dark:text-primary-400' : 'text-gray-400'}`}>Manual</button>
                            </div>
                        </div>

                        {inputMode === 'hive' ? (
                            <div className="space-y-4 animate-fade-in-up">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Hive Post URL</label>
                                    <input 
                                        type="text"
                                        placeholder="@author/permlink"
                                        value={postUrl}
                                        onChange={(e) => setPostUrl(e.target.value)}
                                        disabled={loadingParticipants || status === GameStatus.ROLLING}
                                        className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                                    />
                                </div>
                                <label className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <span className="text-sm font-medium">Exclude Bots</span>
                                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${excludeBots ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-700'}`} onClick={(e) => { e.preventDefault(); setExcludeBots(!excludeBots); }}>
                                        <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${excludeBots ? 'translate-x-4' : ''}`} />
                                    </div>
                                </label>
                            </div>
                        ) : (
                            <div className="space-y-1 animate-fade-in-up">
                                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Participants List</label>
                                <textarea
                                    value={manualInput}
                                    onChange={(e) => setManualInput(e.target.value)}
                                    placeholder="One name per line..."
                                    className="w-full h-32 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all resize-none"
                                />
                            </div>
                        )}

                        <button
                            onClick={handleLoadParticipants}
                            disabled={loadingParticipants || status === GameStatus.ROLLING}
                            className="mt-6 w-full py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-black font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {loadingParticipants && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                            {loadingParticipants ? 'Loading...' : 'Load Data'}
                        </button>
                        
                        {errorMsg && <p className="mt-3 text-xs text-red-500 text-center font-medium">{errorMsg}</p>}
                    </div>

                    {/* Seed Card */}
                    <div className="glass-card rounded-3xl p-6 shadow-lg shadow-gray-200/50 dark:shadow-none">
                         <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Fairness Seed</h2>
                         <div className="flex gap-2">
                             <input 
                                value={seedInput} 
                                onChange={(e) => setSeedInput(e.target.value)} 
                                className="flex-1 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-mono focus:border-primary-500 outline-none transition-all"
                             />
                             <button 
                                onClick={() => setSeedInput(Math.random().toString(36).substring(2, 10).toUpperCase())}
                                className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-primary-500 transition-colors"
                             >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                             </button>
                         </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleRoll}
                        disabled={status === GameStatus.ROLLING || isFetching || participants.length === 0}
                        className={`
                            w-full py-5 rounded-2xl font-bold text-lg tracking-wide shadow-xl transform transition-all duration-300
                            ${status === GameStatus.ROLLING || isFetching || participants.length === 0
                                ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                : 'bg-gradient-harmonic text-white hover:shadow-primary-500/40 hover:-translate-y-1 active:scale-95'
                            }
                        `}
                    >
                        {isFetching ? 'Verifying...' : status === GameStatus.ROLLING ? 'Rolling...' : 'Roll Dice'}
                    </button>
                </div>

                {/* --- Right Column: Visualization --- */}
                <div className="lg:col-span-8 space-y-8">
                     
                     {/* Stats Bar */}
                     <div className="flex items-center justify-between px-2 pt-1">
                         <div className="flex items-baseline gap-2">
                             <span className="text-3xl font-bold text-gray-900 dark:text-white">{participants.length}</span>
                             <span className="text-sm text-gray-500 font-medium">Entries</span>
                         </div>
                         {latestBlock && (
                             <div className="flex items-center gap-2 px-3 py-1 bg-white/50 dark:bg-gray-800/50 rounded-full border border-gray-200 dark:border-gray-700">
                                 <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse"></span>
                                 <span className="text-xs font-mono text-gray-600 dark:text-gray-400">#{latestBlock.number}</span>
                             </div>
                         )}
                     </div>

                     <Roller 
                        participants={participants}
                        status={status}
                        winnerIndex={winnerInfo?.index ?? null}
                        onAnimationComplete={handleAnimationComplete}
                        latestBlock={latestBlock}
                        onRemoveParticipant={handleRemoveParticipant}
                     />

                    {/* History */}
                    {history.length > 0 && (
                        <div className="glass-card rounded-3xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Recent Wins</h3>
                                <button 
                                    onClick={clearHistory}
                                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                    title="Clear History"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {history.map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700 group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs font-bold overflow-hidden p-0.5 ring-2 ring-transparent group-hover:ring-primary-500/30 transition-all">
                                                {item.winnerAvatar ? (
                                                    <img src={item.winnerAvatar} alt={item.winnerName} className="w-full h-full object-cover rounded-full" />
                                                ) : (
                                                    item.winnerName.substring(0,1)
                                                )}
                                            </div>
                                            <span className="font-semibold text-sm">{item.winnerName}</span>
                                        </div>
                                        <span className="text-[10px] font-mono text-gray-400">#{item.blockHash.substring(0,6)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-sm text-gray-400 border-t border-gray-100 dark:border-gray-800/50 bg-white/50 dark:bg-[#020617]/50 backdrop-blur-md">
         <div className="flex flex-col gap-2 items-center">
             <p>Created by <a href="#" className="text-primary-500 hover:underline">louis88</a> • Vote Witness <a href="#" className="text-primary-500 hover:underline">@louis.witness</a></p>
             <button 
                onClick={() => setView('bots')}
                className={`text-xs font-medium px-4 py-1.5 rounded-full border transition-all ${view === 'bots' ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-900/20 dark:border-primary-800 dark:text-primary-400' : 'border-gray-200 dark:border-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
             >
                View Known Bots
             </button>
         </div>
      </footer>

      {/* Winner Modal - Snippet Style */}
      {showWinnerModal && winnerInfo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 dark:bg-black/80 backdrop-blur-lg animate-fade-in-up">
              <div className="relative w-full max-w-sm">
                  
                  {/* The Card */}
                  <div className="bg-white dark:bg-[#0f172a] rounded-[2rem] shadow-2xl overflow-hidden relative border border-white/20 dark:border-white/10 ring-1 ring-black/5">
                      
                      {/* Decoration */}
                      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-harmonic opacity-90"></div>
                      <div className="absolute top-0 right-0 p-8 opacity-10">
                           <svg className="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      </div>

                      <div className="pt-12 px-8 pb-8 flex flex-col items-center relative z-10">
                          {/* Avatar with Verified Badge */}
                          <div className="relative">
                              <div className="w-28 h-28 rounded-full p-1.5 bg-white dark:bg-[#0f172a] shadow-xl mb-4 ring-4 ring-primary-500/20">
                                  <img src={winnerInfo.data.avatar} className="w-full h-full rounded-full bg-gray-100 object-cover" />
                              </div>
                              <div className="absolute bottom-4 right-0 bg-blue-500 text-white p-1.5 rounded-full border-4 border-white dark:border-[#0f172a] shadow-sm" title="Verified Winner">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                              </div>
                          </div>
                          
                          <div className="text-center mb-6">
                              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-1 tracking-tight">{winnerInfo.data.name}</h2>
                              <p className="text-sm font-medium text-primary-600 dark:text-primary-400 uppercase tracking-widest">Hive Fortune Winner</p>
                          </div>

                          {/* Data Snippet */}
                          {calculationDetails && (
                              <div className="w-full bg-gray-50/80 dark:bg-gray-900/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 mb-6 backdrop-blur-sm">
                                  <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-700 mb-3">
                                      <span className="text-xs text-gray-400 font-bold uppercase">Proof of Win</span>
                                      <span className="text-[10px] font-mono text-gray-400">{new Date().toLocaleDateString()}</span>
                                  </div>
                                  <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                              <span className="text-xs font-medium text-gray-500 uppercase">Block Hash</span>
                                          </div>
                                          <span className="font-mono text-xs text-gray-700 dark:text-gray-300 font-bold">{calculationDetails.blockHash.substring(0, 8)}...</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                               <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                               <span className="text-xs font-medium text-gray-500 uppercase">Ticket</span>
                                          </div>
                                          <span className="font-mono text-sm text-primary-600 font-bold">#{calculationDetails.winnerIndex}</span>
                                      </div>
                                  </div>
                              </div>
                          )}

                          <div className="grid grid-cols-2 gap-3 w-full">
                              <button onClick={handleShare} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-black font-bold text-sm hover:opacity-90 transition-opacity shadow-lg">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                                  Share
                              </button>
                              <button onClick={() => { setShowWinnerModal(false); setStatus(GameStatus.IDLE); }} className="py-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm transition-colors">
                                  Close
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;