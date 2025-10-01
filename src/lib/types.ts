
import { z } from 'zod';

// src/ai/flows/create-tribe.ts
export const CreateTribeInputSchema = z.object({
  name: z.string().describe("The desired name for the new Tribe."),
  location: z.string().describe("The city and state of the tribe (e.g., 'New York, NY')."),
  lat: z.number().describe("The latitude of the tribe location."),
  lng: z.number().describe("The longitude of the tribe location."),
});
export type CreateTribeInput = z.infer<typeof CreateTribeInputSchema>;

export const CreateTribeOutputSchema = z.object({
  success: z.boolean(),
  tribeId: z.string().optional(),
});
export type CreateTribeOutput = z.infer<typeof CreateTribeOutputSchema>;


// src/ai/flows/join-tribe.ts
export const JoinTribeInputSchema = z.object({
  tribeId: z.string(),
});
export type JoinTribeInput = z.infer<typeof JoinTribeInputSchema>;

export const JoinTribeOutputSchema = z.object({
  success: z.boolean(),
});
export type JoinTribeOutput = z.infer<typeof JoinTribeOutputSchema>;

// src/ai/flows/get-tribes.ts
export const GetTribesInputSchema = z.object({});
export type GetTribesInput = z.infer<typeof GetTribesInputSchema>;

export const GetTribesOutputSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    location: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  })
);
export type GetTribesOutput = z.infer<typeof GetTribesOutputSchema>;

// src/lib/tribes.ts
export interface Tribe {
  id: string;
  name: string;
  location?: string;
  lat?: number;
  lng?: number;
  members: string[];
}
