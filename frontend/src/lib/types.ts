export type Card = { label: string; value: number | null };
export type Deck = { type: string; name: string; cards: Card[] };

export type Participant = {
  id: string;
  name: string;
  avatar: string;
  role: 'VOTER' | 'OBSERVER';
  facilitator: boolean;
  online: boolean;
  joinedAt: number;
};

export type Vote = { participantId: string; card: string | null; castAt: number };

export type RoundResult = {
  voteCount: number;
  distribution: Record<string, number>;
  average: number | null;
  median: number | null;
  consensus: boolean;
  agreementPercent: number;
  suggestedEstimate: string | null;
  outliers: string[];
  fastestVoterId: string | null;
  fastestVoteMillis: number | null;
};

export type StoryStatus = 'PENDING' | 'VOTING' | 'REVEALED' | 'ESTIMATED';

export type Story = {
  id: string;
  title: string;
  status: StoryStatus;
  round: number;
  roundStartedAt: number | null;
  votes: Vote[];
  finalEstimate: string | null;
  unanimous: boolean;
  result: RoundResult | null;
};

export type Table = {
  id: string;
  code: string;
  name: string;
  deckType: string;
  deckName: string;
  deck: Card[];
  createdAt: number;
  facilitatorId: string | null;
  timerEndsAt: number | null;
  activeStoryId: string | null;
  participants: Participant[];
  stories: Story[];
  stats: { storyCount: number; estimatedCount: number; totalPoints: number; unanimousCount: number };
  serverTime: number;
};

export type TableEvent = { type: string; at: number; [key: string]: unknown };

export type Effect = { kind: 'cheer' | 'throw'; fromId: string; targetId: string | null; emoji: string; at: number };

export type ChannelMessage =
  | { kind: 'table'; table: Table; events: TableEvent[] }
  | { kind: 'presence'; online: string[] }
  | { kind: 'effect'; effect: Effect };

export type Seat = { code: string; participantId: string; accessKey: string };
export type TableSummary = { code: string; name: string; team: string | null; participantCount: number; updatedAt: number };
