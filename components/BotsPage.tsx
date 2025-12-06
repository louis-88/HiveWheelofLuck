import React, { useState } from 'react';
import { BOT_BLACKLIST } from '../utils/hive';

export const BotsPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [search, setSearch] = useState('');

  const filteredBots = BOT_BLACKLIST.filter(bot => 
    bot.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">Known <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-600">Bots</span></h1>
        <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed">
           To ensure fair distribution of prizes, we maintain a list of known automated farming accounts and bots. 
           These accounts are automatically excluded from the draw when the "Exclude Bots" option is enabled.
        </p>
      </div>

      <div className="glass-panel p-8 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-xl mb-8">
          <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-1 space-y-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Report a Bot</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-6">
                      If you notice a suspicious account or a bot that isn't on this list, you can help us improve the fairness of the ecosystem.
                  </p>
                  
                  <div className="flex flex-col gap-3 mt-4">
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
                          <div className="w-10 h-10 rounded-full bg-[#5865F2]/10 flex items-center justify-center text-[#5865F2]">
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994.021-.041-.001-.09-.045-.106a12.15 12.15 0 01-1.711-.815.076.076 0 01-.003-.126 8.56 8.56 0 00.323-.25.076.076 0 01.08-.009c3.483 1.59 7.247 1.59 10.695 0a.077.077 0 01.08.01c.101.082.209.167.319.248a.075.075 0 01.002.124 12.176 12.176 0 01-1.712.816.075.075 0 00-.045.106c.352.699.764 1.364 1.226 1.994a.077.077 0 00.084.028 19.895 19.895 0 005.996-3.03.077.077 0 00.031-.057c.504-5.269-1.25-9.456-3.644-13.663a.071.071 0 00-.031-.03z"/></svg>
                          </div>
                          <div>
                              <div className="text-xs font-bold text-gray-400 uppercase">Discord</div>
                              <div className="font-semibold text-gray-900 dark:text-white">Message <span className="text-[#5865F2]">louis88</span></div>
                          </div>
                      </div>

                      <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
                           <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" /></svg>
                           </div>
                           <div>
                              <div className="text-xs font-bold text-gray-400 uppercase">Hive Blockchain</div>
                              <div className="font-semibold text-gray-900 dark:text-white">Tag <span className="text-red-500">@louis.witness</span> in a post</div>
                           </div>
                      </div>
                  </div>
              </div>

              <div className="w-full md:w-1/2">
                  <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Blacklist Database</h3>
                      <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-500">{BOT_BLACKLIST.length} Entries</span>
                  </div>
                  
                  <div className="relative mb-4">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                      <input 
                        type="text" 
                        placeholder="Search bot name..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-red-500 transition-colors"
                      />
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 h-[300px] overflow-y-auto p-2 scrollbar-thin">
                      <div className="flex flex-wrap gap-2 content-start">
                          {filteredBots.length > 0 ? filteredBots.map(bot => (
                              <span key={bot} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-mono">
                                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                                  @{bot}
                              </span>
                          )) : (
                              <div className="w-full text-center py-8 text-gray-400 text-sm">
                                  No bots found matching "{search}"
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
