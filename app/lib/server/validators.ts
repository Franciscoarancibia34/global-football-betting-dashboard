import { z } from "zod";

export const createBetSchema = z.object({
  matchId: z.string().min(1),
  marketId: z.string().min(1),
  bookmakerId: z.string().min(1),
  selection: z.string().min(1),
  decimalOdds: z.coerce.number().gt(1),
  stake: z.coerce.number().positive().max(100000),
  strategy: z.string().max(80).optional(),
  notes: z.string().max(500).optional()
});

export const simulateRiskSchema = z.object({
  bankroll: z.coerce.number().positive(),
  decimalOdds: z.coerce.number().gt(1),
  probability: z.coerce.number().gt(0).lt(1),
  stake: z.coerce.number().positive(),
  kellyFraction: z.coerce.number().refine((value) => [0.25, 0.5, 1].includes(value))
});
