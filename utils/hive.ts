import { Participant } from '../types';

export const BOT_BLACKLIST = [
  "sbi5",
  "sbi6",
  "tinowhale",
  "steemitboard",
  "steem-plus",
  "steem-ua",
  "steemium",
  "threespeak",
  "tipu",
  "tts",
  "botcoin",
  "upvoteturtle",
  "steem-bounty",
  "beerlover",
  "hivebuzz",
  "dein-problem",
  "holybread",
  "germanbot",
  "pizzaboy77",
  "voinvote2",
  "voinvote3",
  "pizzabot",
  "ecency"
];

/**
 * Extracts author and permlink from a standard Hive URL.
 * Supports formats like:
 * https://hive.blog/@author/permlink
 * https://peakd.com/hive-12345/@author/permlink
 */
export const extractPostDetails = (url: string): { author: string; permlink: string } | null => {
  try {
    // Look for @author/permlink pattern
    const match = url.match(/@([\w.-]+)\/([\w-]+)/);
    if (match && match.length >= 3) {
      return { author: match[1], permlink: match[2] };
    }
    return null;
  } catch (e) {
    return null;
  }
};

/**
 * Generates a consistent color from a string (username).
 */
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

/**
 * Fetches comments from a Hive post and converts them to Participants.
 * De-duplicates users (one entry per user).
 * Optionally filters out known bots.
 */
export const fetchPostParticipants = async (author: string, permlink: string, excludeBots: boolean = true): Promise<Participant[]> => {
  try {
    const response = await fetch('https://api.hive.blog', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'condenser_api.get_content_replies',
        params: [author, permlink],
        id: 1,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    
    if (data.result) {
      // Filter unique users
      const uniqueUsers = new Set<string>();
      const participants: Participant[] = [];

      for (const comment of data.result) {
        const username = comment.author;
        
        // Skip duplicates
        if (uniqueUsers.has(username)) continue;
        
        // Skip bots if enabled
        if (excludeBots && BOT_BLACKLIST.includes(username)) continue;

        uniqueUsers.add(username);
        participants.push({
          id: username,
          name: username,
          avatar: `https://images.hive.blog/u/${username}/avatar`,
          ticketCount: 1,
          color: stringToColor(username)
        });
      }
      return participants;
    }
    throw new Error("Failed to fetch comments");
  } catch (error) {
    console.error("Hive API Error:", error);
    throw error;
  }
};