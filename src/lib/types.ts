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
  message: z.string().optional(),
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
    type: z.enum(['join_tribe', 'new_tribe', 'new_mentor']),
    tribeId: z.string().optional(), // Optional for new_tribe applications
    tribeName: z.string().optional(), // For new_tribe applications
    location: z.string().optional(), // For new_tribe applications
    lat: z.number().optional(),
    lng: z.number().optional(),
    applicantId: z.string(),
    applicantName: z.string().optional(),
    applicantEmail: z.string().optional(),
    applicantPhone: z.string().optional(),
    answers: z.record(z.string()).optional(),
    issue: z.string().optional(),
    serviceProject: z.string().optional(),
    status: z.string(),
    createdAt: z.union([z.date(), z.string()]),
});
export type Application = z.infer<typeof ApplicationSchema>;

export const ManageApplicationInputSchema = z.object({
  action: z.enum(['get', 'approve', 'deny', 'withdraw']),
  type: z.enum(['join_tribe', 'new_tribe', 'new_mentor', 'my_pending']),
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

// src/ai/flows/apply-for-mentor.ts
export const ApplyForMentorInputSchema = z.object({
  idToken: z.string(),
});
export type ApplyForMentorInput = z.infer<typeof ApplyForMentorInputSchema>;

export const ApplyForMentorOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type ApplyForMentorOutput = z.infer<typeof ApplyForMentorOutputSchema>;


// src/ai/flows/user-profile.ts
export const UserProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  issue: z.string().optional(),
  serviceProject: z.string().optional(),
  myAccountVisits: z.number().optional(),
  emailsSent: z.number().optional(),
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

// src/ai/flows/get-comprehension-test.ts
const LatestFeedbackSchema = z.object({
    feedback: z.string(),
    createdAt: z.string(),
});

export const GetComprehensionTestOutputSchema = z.object({
    answers: z.record(z.string()),
    latestFeedback: LatestFeedbackSchema.optional(),
});
export type GetComprehensionTestOutput = z.infer<typeof GetComprehensionTestOutputSchema>;


// src/ai/flows/get-tribe-members.ts
export const TribeMemberSchema = z.object({
    uid: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    phone: z.string(),
    answers: z.record(z.string()).optional(),
    issue: z.string().optional(),
    serviceProject: z.string().optional(),
});
export type TribeMember = z.infer<typeof TribeMemberSchema>;

export const GetTribeMembersInputSchema = z.object({
    tribeId: z.string(),
    idToken: z.string(),
});
export type GetTribeMembersInput = z.infer<typeof GetTribeMembersInputSchema>;

export const GetTribeMembersOutputSchema = z.array(TribeMemberSchema);
export type GetTribeMembersOutput = z.infer<typeof GetTribeMembersOutputSchema>;

// src/ai/flows/submit-meeting-report.ts
export const SubmitMeetingReportInputSchema = z.object({
  tribeId: z.string(),
  meetingId: z.string(),
  reportContent: z.string(),
  idToken: z.string(),
});
export type SubmitMeetingReportInput = z.infer<typeof SubmitMeetingReportInputSchema>;

export const SubmitMeetingReportOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type SubmitMeetingReportOutput = z.infer<typeof SubmitMeetingReportOutputSchema>;

// src/ai/flows/get-meeting-reports.ts
export const MeetingReportSchema = z.object({
  id: z.string(),
  meetingId: z.string(),
  tribeId: z.string(),
  userId: z.string(),
  userName: z.string().optional(),
  reportContent: z.string(),
  submittedAt: z.string(),
});
export type MeetingReport = z.infer<typeof MeetingReportSchema>;

export const GetMeetingReportsInputSchema = z.object({
  tribeId: z.string(),
  idToken: z.string(),
});
export type GetMeetingReportsInput = z.infer<typeof GetMeetingReportsInputSchema>;

export const GetMeetingReportsOutputSchema = z.array(MeetingReportSchema);
export type GetMeetingReportsOutput = z.infer<typeof GetMeetingReportsOutputSchema>;

// src/ai/flows/update-user-level.ts
export const UpdateUserLevelInputSchema = z.object({
  idToken: z.string().describe("The admin's Firebase ID token for authentication."),
  targetUserId: z.string().describe("The UID of the user to update."),
  newLevel: z.number().int().min(1).max(6).describe("The new level to assign to the user."),
});
export type UpdateUserLevelInput = z.infer<typeof UpdateUserLevelInputSchema>;

export const UpdateUserLevelOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type UpdateUserLevelOutput = z.infer<typeof UpdateUserLevelOutputSchema>;


// src/ai/flows/delete-user.ts
export const DeleteUserInputSchema = z.object({
  idToken: z.string().describe("The admin's Firebase ID token for authentication."),
  targetUserId: z.string().describe("The UID of the user to delete."),
});
export type DeleteUserInput = z.infer<typeof DeleteUserInputSchema>;

export const DeleteUserOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type DeleteUserOutput = z.infer<typeof DeleteUserOutputSchema>;


// src/ai/flows/send-direct-email.ts
export const SendDirectEmailInputSchema = z.object({
  recipientEmail: z.string().email().describe("The email address of the recipient."),
  recipientName: z.string().optional().describe("The name of the recipient (for logging)."),
  subject: z.string().describe("The subject of the email."),
  body: z.string().describe("The HTML content of the email body."),
});
export type SendDirectEmailInput = z.infer<typeof SendDirectEmailInputSchema>;

export const SendDirectEmailOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type SendDirectEmailOutput = z.infer<typeof SendDirectEmailOutputSchema>;


// src/ai/flows/get-outbox-emails.ts
export const OutboundEmailSchema = z.object({
  id: z.string(),
  recipientEmail: z.string(),
  recipientName: z.string().optional(),
  subject: z.string(),
  body: z.string(),
  sentAt: z.string(),
});
export type OutboundEmail = z.infer<typeof OutboundEmailSchema>;
export const GetOutboxEmailsOutputSchema = z.array(OutboundEmailSchema);
export type GetOutboxEmailsOutput = z.infer<typeof GetOutboxEmailsOutputSchema>;

// src/ai/flows/journal.ts
export const JournalFeedbackSchema = z.object({
    id: z.string(),
    mentorId: z.string(),
    mentorName: z.string(),
    mentorLevel: z.number().optional(),
    feedbackContent: z.string(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
    imageUrl: z.string().url().optional(),
    imageCredit: z.string().optional(),
});
export type JournalFeedback = z.infer<typeof JournalFeedbackSchema>;

export const JournalEntrySchema = z.object({
    id: z.string(),
    userId: z.string(),
    userName: z.string(),
    userLevel: z.number().optional(),
    entryContent: z.string(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
    feedback: z.array(JournalFeedbackSchema).optional(),
    imageUrl: z.string().url().optional(),
    isManualEntry: z.boolean().optional(),
});
export type JournalEntry = z.infer<typeof JournalEntrySchema>;

// src/ai/flows/add-journal-feedback.ts
export const AddJournalFeedbackInputSchema = z.object({
  idToken: z.string(),
  entryId: z.string(),
  feedbackContent: z.string(),
});
export type AddJournalFeedbackInput = z.infer<typeof AddJournalFeedbackInputSchema>;

export const AddJournalFeedbackOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type AddJournalFeedbackOutput = z.infer<typeof AddJournalFeedbackOutputSchema>;

// src/ai/flows/edit-journal-feedback.ts
export const EditJournalFeedbackInputSchema = z.object({
  idToken: z.string(),
  entryId: z.string(),
  feedbackId: z.string(),
  newFeedbackContent: z.string(),
  imageUrl: z.string().optional(),
  imageCredit: z.string().optional(),
});
export type EditJournalFeedbackInput = z.infer<typeof EditJournalFeedbackInputSchema>;

export const EditJournalFeedbackOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type EditJournalFeedbackOutput = z.infer<typeof EditJournalFeedbackOutputSchema>;

// src/ai/flows/delete-journal-feedback.ts
export const DeleteJournalFeedbackInputSchema = z.object({
  idToken: z.string(),
  entryId: z.string(),
  feedbackId: z.string(),
});
export type DeleteJournalFeedbackInput = z.infer<typeof DeleteJournalFeedbackInputSchema>;

export const DeleteJournalFeedbackOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type DeleteJournalFeedbackOutput = z.infer<typeof DeleteJournalFeedbackOutputSchema>;


// src/ai/flows/get-all-journal-entries.ts
export const GetAllJournalEntriesOutputSchema = z.array(JournalEntrySchema);
export type GetAllJournalEntriesOutput = z.infer<typeof GetAllJournalEntriesOutputSchema>;

// src/ai/flows/email-templates.ts
export const EmailTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  subject: z.string(),
  body: z.string(),
});
export type EmailTemplate = z.infer<typeof EmailTemplateSchema>;

export const SaveEmailTemplateInputSchema = z.object({
  name: z.string(),
  subject: z.string(),
  body: z.string(),
});
export type SaveEmailTemplateInput = z.infer<typeof SaveEmailTemplateInputSchema>;

export const SaveEmailTemplateOutputSchema = z.object({
  success: z.boolean(),
  templateId: z.string().optional(),
  message: z.string().optional(),
});
export type SaveEmailTemplateOutput = z.infer<typeof SaveEmailTemplateOutputSchema>;

export const GetEmailTemplatesOutputSchema = z.array(EmailTemplateSchema);
export type GetEmailTemplatesOutput = z.infer<typeof GetEmailTemplatesOutputSchema>;

// src/ai/flows/add-user.ts
export const AddUserInputSchema = z.object({
  idToken: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  currentUserLevel: z.number().optional().default(1),
});
export type AddUserInput = z.infer<typeof AddUserInputSchema>;

export const AddUserOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  userId: z.string().optional(),
});
export type AddUserOutput = z.infer<typeof AddUserOutputSchema>;

// src/ai/flows/send-meeting-report-reminder.ts
export const SendMeetingReportReminderInputSchema = z.object({
  recipientEmail: z.string().email(),
  recipientName: z.string(),
  tribeName: z.string(),
  meetingDate: z.string(),
  nagLevel: z.enum(['gentle', 'medium', 'nagging']),
});
export type SendMeetingReportReminderInput = z.infer<typeof SendMeetingReportReminderInputSchema>;

export const SendMeetingReportReminderOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type SendMeetingReportReminderOutput = z.infer<typeof SendMeetingReportReminderOutputSchema>;

// src/ai/flows/add-manual-faq.ts
export const AddManualFaqInputSchema = z.object({
  idToken: z.string(),
  contributorName: z.string(),
  question: z.string(),
  answer: z.string(),
  imageUrl: z.string().url().optional(),
  answerImageUrl: z.string().url().optional(),
  answerImageCredit: z.string().optional(),
});
export type AddManualFaqInput = z.infer<typeof AddManualFaqInputSchema>;

export const AddManualFaqOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type AddManualFaqOutput = z.infer<typeof AddManualFaqOutputSchema>;

// src/ai/flows/notify-faq-author.ts
export const NotifyFaqAuthorInputSchema = z.object({
  idToken: z.string(),
  entryId: z.string(),
});
export type NotifyFaqAuthorInput = z.infer<typeof NotifyFaqAuthorInputSchema>;

export const NotifyFaqAuthorOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type NotifyFaqAuthorOutput = z.infer<typeof NotifyFaqAuthorOutputSchema>;
