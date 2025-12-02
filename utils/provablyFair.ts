const HIVE_NODES = [
  'https://api.hive.blog',
  'https://api.deathwing.me',
  'https://anyx.io',
  'https://api.openhive.network'
];

/**
 * Fetches the current head block from the Hive Blockchain.
 * Tries multiple nodes in case of failure.
 */
export const fetchHiveBlock = async (): Promise<{ id: string; number: number }> => {
  for (const node of HIVE_NODES) {
    try {
      const response = await fetch(node, {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'condenser_api.get_dynamic_global_properties',
          params: [],
          id: 1,
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (data.result) {
        return {
          id: data.result.head_block_id,
          number: data.result.head_block_number
        };
      }
    } catch (error) {
      console.warn(`Node ${node} failed, trying next...`);
    }
  }
  
  // Fallback: Use browser crypto if ALL Hive nodes are unreachable
  console.warn("All Hive nodes unreachable. Falling back to local entropy.");
  const array = new Uint8Array(20);
  crypto.getRandomValues(array);
  const hex = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  return { id: hex, number: 999999 };
};

/**
 * Simulates a cryptographic hash function (SHA-256).
 */
export const generateHash = async (message: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

/**
 * Calculates a deterministic float (0.0 - 1.0) from a hash.
 * This ensures that if the input (Block Hash) is the same, the winner is always the same.
 */
export const getRollFromHash = (hash: string): number => {
  // Take the first 8 characters (32 bits)
  const sub = hash.substring(0, 8);
  const val = parseInt(sub, 16);
  // Max value of 8 hex chars is 0xFFFFFFFF = 4294967295
  return val / 4294967295;
};

/**
 * Determines the winner from a list of participants based on the roll value.
 */
export const getWinner = (participants: any[], rollValue: number) => {
  if (participants.length === 0) return null;
  const winnerIndex = Math.floor(rollValue * participants.length);
  return {
    winner: participants[winnerIndex],
    index: winnerIndex
  };
};