export interface OTv1 {
  insert?: string;
  delete?: number;
  skip?: number;
}

export interface OTv2 {
  op: 'insert' | 'delete' | 'skip';
  value?: string;
  count?: number;
}

export type OT = OTv1 | OTv2;

export interface Diff {
  added?: boolean;
  value?: string;
  removed?: boolean;
  count?: number;
}