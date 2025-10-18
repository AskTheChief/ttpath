
import { z } from 'zod';

// Base Meeting Schema
export const MeetingSchema = z.object({
  id: z.string(),
  date: z.union([z.date(), z.string()]), // Accept both Date objects and ISO strings
});
export type Meeting = z.infer<typeof MeetingSchema>;


// src/ai/flows/create-tribe.ts
export const CreateTribeInputSchema = z.object({
  name: z.string().describe("The desired name for the new Tribe."),
  location: z.string().describe("The city and state of the tribe (e.g., 'New York, NY')."),
  lat: z.number().describe("The latitude of the tribe location."),
  lng: z.number().describe("The longitude of the tribe location."),
  idToken: z.string().optional().describe("The user's Firebase ID token for authentication."),
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
  idToken: z.string().optional(),
  answers: z.record(z.string()).optional().describe("The user's answers to the Comprehension Test questions."),
});
export type JoinTribeInput = z.infer<typeof JoinTribeInputSchema>;

export const JoinTribeOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type JoinTribeOutput = z.infer<typeof JoinTribeOutputSchema>;


// src/ai/flows/get-tribes.ts
export const GetTribesInputSchema = z.object({});
export type GetTribesInput = z.infer<typeof GetTribesInputSchema>;

export const TribeSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  chief: z.string().optional(),
  members: z.array(z.string()).optional(),
  meetings: z.array(MeetingSchema).optional(),
});

export const GetTribesOutputSchema = z.array(TribeSchema);
export type GetTribesOutput = z.infer<typeof GetTribesOutputSchema>;

// This is the primary Tribe interface used in the client-side application.
export interface Tribe extends z.infer<typeof TribeSchema> {
  members: string[];
  meetings: Meeting[];
}


// src/ai/flows/delete-tribe.ts
export const DeleteTribeInputSchema = z.object({
  tribeId: z.string().describe("The ID of the tribe to delete."),
  idToken: z.string().describe("The user's Firebase ID token for authentication."),
});
export type DeleteTribeInput = z.infer<typeof DeleteTribeInputSchema>;

export const DeleteTribeOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type DeleteTribeOutput = z.infer<typeof DeleteTribeOutputSchema>;

// src/ai/flows/update-tribe-meetings.ts
export const UpdateTribeMeetingsInputSchema = z.object({
  tribeId: z.string().describe("The ID of the tribe to update."),
  meetings: z.array(z.object({
      id: z.string(),
      date: z.string(), // Pass dates as ISO strings
  })).describe("The full list of meetings for the tribe."),
  idToken: z.string().describe("The user's Firebase ID token for authentication."),
});
export type UpdateTribeMeetingsInput = z.infer<typeof UpdateTribeMeetingsInputSchema>;

export const UpdateTribeMeetingsOutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional(),
});
export type UpdateTribeMeetingsOutput = z.infer<typeof UpdateTribeMeetingsOutputSchema>;


// src/ai/flows/manage-applications.ts
export const ApplicationSchema = z.object({
    id: z.string(),
    tribeId: z.string(),
    applicantId: z.string(),
    answers: z.record(z.string()).optional(),
    status: z.string(),
    createdAt: z.union([z.date(), z.string()]),
});
export type Application = z.infer<typeof ApplicationSchema>;

export const ManageApplicationInputSchema = z.object({
  action: z.enum(['get', 'approve', 'deny']),
  idToken: z.string(),
  applicationId: z.string().optional(),
  tribeId: z.string().optional(),
  applicantId: z.string().optional(),
});
export type ManageApplicationInput = z.infer<typeof ManageApplicationInputSchema>;

export const ManageApplicationOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  applications: z.array(ApplicationSchema).optional(),
});
export type ManageApplicationOutput = z.infer<typeof ManageApplicationOutputSchema>;

// src/ai/flows/user-profile.ts
export const UserProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const GetUserProfileInputSchema = z.object({
  idToken: z.string(),
});
export type GetUserProfileInput = z.infer<typeof GetUserProfileInputSchema>;

export const GetUserProfileOutputSchema = UserProfileSchema;
export type GetUserProfileOutput = z.infer<typeof GetUserProfileOutputSchema>;

export const UpdateUserProfileInputSchema = z.object({
  idToken: z.string(),
  profile: UserProfileSchema,
});
export type UpdateUserProfileInput = z.infer<typeof UpdateUserProfileInputSchema>;

export const UpdateUserProfileOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type UpdateUserProfileOutput = z.infer<typeof UpdateUserProfileOutputSchema>;

// src/ai/flows/get-tutorial-answers.ts
const LatestFeedbackSchema = z.object({
    feedback: z.string(),
    createdAt: z.string(),
});

export const GetTutorialAnswersOutputSchema = z.object({
    answers: z.record(z.string()),
    latestFeedback: LatestFeedbackSchema.optional(),
});
export type GetTutorialAnswersOutput = z.infer<typeof GetTutorialAnswersOutputSchema>;
