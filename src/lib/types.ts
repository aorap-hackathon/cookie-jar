export type Jar = {
  name: string;
  description: string;
  contractAddress: string;
  balance: number;
};

export type Vote = {
  user: string;
  isUpvote: boolean;
};

export type Operation = {
  id: number;
  user: string;
  isDeposit: boolean;
  amount: number;
  note: string;
  score: number;
  votes: Vote[];
};
