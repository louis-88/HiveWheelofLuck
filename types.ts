export interface Participant {
  id: string;
  name: string;
  avatar: string;
  ticketCount: number; // For weighted probability if needed, default 1
  color: string;
}

export interface RollResult {
  winner: Participant;
  rollValue: number; // 0-1 normalized
  winningTicket: number;
  blockHash: string;
}

export enum GameStatus {
  IDLE = 'IDLE',
  ROLLING = 'ROLLING',
  COMPLETED = 'COMPLETED',
}

export interface HistoryItem {
  id: string;
  winnerName: string;
  winnerAvatar: string;
  blockHash: string;
  timestamp: number;
}