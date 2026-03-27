import { z } from 'zod';

// --- Shared Base Schemas ---

export const MeetingSchema = z.object({
  id: z.string(),
  date: z.union([z.date(), z.string()]),
});
export type Meeting = z.infer<typeof MeetingSchema>;

// --- User & Profile Schemas ---

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
  embracedCustoms: z.array(z.string()).optional(),
  lastActiveAt: z.string().optional(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const SystemUserSchema = z.object({
  uid: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  currentUserLevel: z.number().optional(),
  myAccountVisits: z.number().optional(),
  issue: z.string().optional(),
  serviceProject: z.string().optional(),
  emailsSent: z.number().optional(),
  createdAt: z.string().optional(),
  lastActiveAt: z.string().optional(),
});
export type SystemUser = z.infer<typeof SystemUserSchema>;

export const LegacyUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  location: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  id: z.string().optional(),
  reachouts: z.string().optional(),
});
export type LegacyUser = z.infer<typeof LegacyUserSchema>;

// --- Tribe & Application Schemas ---

export const TribeSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  chief: z.string().optional(),
  chiefName: z.string().optional(),
  members: z.array(z.string()).optional(),
  meetings: z.array(MeetingSchema).optional(),
  memberNames: z.array(z.string()).optional(),
  isChiefValid: z.boolean().optional(),
});
export type Tribe = z.infer<typeof TribeSchema> & {
  members: string[];
  meetings: Meeting[];
};

export const ApplicationSchema = z.object({
    id: z.string(),
    type: z.enum(['join_tribe', 'new_tribe', 'new_mentor']),
    tribeId: z.string().optional(),
    tribeName: z.string().optional(),
    location: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    applicantId: z.string(),
    applicantName: z.string().optional(),
    applicantEmail: z.string().optional(),
    applicantPhone: z.string().optional(),
    answers: z.record(z.string()).optional(),
    embracedCustoms: z.array(z.string()).optional(),
    issue: z.string().optional(),
    serviceProject: z.string().optional(),
    status: z.string(),
    createdAt: z.union([z.date(), z.string()]),
});
export type Application = z.infer<typeof ApplicationSchema>;

// --- Communication Schemas ---

export const InboundEmailSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  subject: z.string(),
  body: z.string(),
  receivedAt: z.string(),
});
export type InboundEmail = z.infer<typeof InboundEmailSchema>;

export const OutboundEmailSchema = z.object({
  id: z.string(),
  recipientEmail: z.string(),
  recipientName: z.string().optional(),
  subject: z.string(),
  body: z.string(),
  sentAt: z.string(),
});
export type OutboundEmail = z.infer<typeof OutboundEmailSchema>;

export const EmailTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  subject: z.string(),
  body: z.string(),
});
export type EmailTemplate = z.infer<typeof EmailTemplateSchema>;

// --- Forum & Journal Schemas ---

export const JournalFeedbackSchema = z.object({
    id: z.string(),
    mentorId: z.string(),
    mentorName: z.string(),
    mentorLevel: z.number().optional(),
    feedbackContent: z.string(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
    imageUrl: z.string().url().or(z.literal('')).optional(),
    imageCredit: z.string().optional(),
    caption: z.string().optional(),
});
export type JournalFeedback = z.infer<typeof JournalFeedbackSchema>;

export const JournalEntrySchema = z.object({
    id: z.string(),
    userId: z.string(),
    userName: z.string(),
    userLevel: z.number().optional(),
    subject: z.string().optional(),
    entryContent: z.string(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
    feedback: z.array(JournalFeedbackSchema).optional(),
    imageUrl: z.string().url().or(z.literal('')).optional(),
    isManualEntry: z.boolean().optional(),
    isAnonymizedReport: z.boolean().optional(),
    caption: z.string().optional(),
    recipient: z.string().optional(),
});
export type JournalEntry = z.infer<typeof JournalEntrySchema>;

// --- Meeting Report Schemas ---

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

export const AdminMeetingReportSchema = z.object({
  id: z.string(),
  reportContent: z.string(),
  submittedAt: z.string(),
  userId: z.string(),
  userName: z.string(),
  tribeId: z.string(),
  tribeName: z.string(),
});
export type AdminMeetingReport = z.infer<typeof AdminMeetingReportSchema>;

// --- Feedback & Q&A Schemas ---

export const ChatSessionSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  createdAt: z.string(),
  userName: z.string().optional(),
  userId: z.string().optional(),
});
export type ChatSession = z.infer<typeof ChatSessionSchema>;

export const FeedbackSchema = z.object({
  id: z.string(),
  feedback: z.string(),
  email: z.string().optional(),
  userName: z.string().optional(),
  userId: z.string().optional(),
  createdAt: z.string(),
});
export type Feedback = z.infer<typeof FeedbackSchema>;

// --- Game Schemas ---

export const FeelingSchema = z.object({
  id: z.number(),
  feelingName: z.string(),
  sensation: z.string(),
  rating: z.number().min(-10).max(10),
  x: z.number(),
  y: z.number(),
});
export type Feeling = z.infer<typeof FeelingSchema>;

export const PrincipleSchema = z.object({
  title: z.string(),
  content: z.string(),
  img: z.string(),
});
export type Principle = z.infer<typeof PrincipleSchema>;

// --- Input/Output Schemas for Flows ---

export const GetUserProfileInputSchema = z.object({
  idToken: z.string(),
});
export type GetUserProfileInput = z.infer<typeof GetUserProfileInputSchema>;

export const GetUserProfileOutputSchema = z.lazy(() => UserProfileSchema);
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

export const ApplyForMentorInputSchema = z.object({
  idToken: z.string(),
});
export type ApplyForMentorInput = z.infer<typeof ApplyForMentorInputSchema>;

export const ApplyForMentorOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type ApplyForMentorOutput = z.infer<typeof ApplyForMentorOutputSchema>;

export const CreateTribeInputSchema = z.object({
  name: z.string(),
  location: z.string(),
  lat: z.number(),
  lng: z.number(),
  idToken: z.string().optional(),
});
export type CreateTribeInput = z.infer<typeof CreateTribeInputSchema>;

export const CreateTribeOutputSchema = z.object({
  success: z.boolean(),
  tribeId: z.string().optional(),
  message: z.string().optional(),
});
export type CreateTribeOutput = z.infer<typeof CreateTribeOutputSchema>;

export const JoinTribeInputSchema = z.object({
  tribeId: z.string(),
  idToken: z.string().optional(),
  answers: z.record(z.string()).optional(),
  embracedCustoms: z.array(z.string()).optional(),
});
export type JoinTribeInput = z.infer<typeof JoinTribeInputSchema>;

export const JoinTribeOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type JoinTribeOutput = z.infer<typeof JoinTribeOutputSchema>;

export const DeleteTribeInputSchema = z.object({
  tribeId: z.string(),
  idToken: z.string(),
});
export type DeleteTribeInput = z.infer<typeof DeleteTribeInputSchema>;

export const DeleteTribeOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type DeleteTribeOutput = z.infer<typeof DeleteTribeOutputSchema>;

export const UpdateTribeMeetingsInputSchema = z.object({
  tribeId: z.string(),
  meetings: z.array(z.object({
      id: z.string(),
      date: z.string(),
  })),
  idToken: z.string(),
});
export type UpdateTribeMeetingsInput = z.infer<typeof UpdateTribeMeetingsInputSchema>;

export const UpdateTribeMeetingsOutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional(),
});
export type UpdateTribeMeetingsOutput = z.infer<typeof UpdateTribeMeetingsOutputSchema>;

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

export const AddJournalFeedbackInputSchema = z.object({
  idToken: z.string(),
  entryId: z.string(),
  feedbackContent: z.string(),
  imageUrl: z.string().url().or(z.literal('')).optional(),
  imageCredit: z.string().optional(),
  caption: z.string().optional(),
});
export type AddJournalFeedbackInput = z.infer<typeof AddJournalFeedbackInputSchema>;

export const AddJournalFeedbackOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type AddJournalFeedbackOutput = z.infer<typeof AddJournalFeedbackOutputSchema>;

export const EditJournalFeedbackInputSchema = z.object({
  idToken: z.string(),
  entryId: z.string(),
  feedbackId: z.string(),
  newFeedbackContent: z.string(),
  imageUrl: z.string().url().or(z.literal('')).optional(),
  imageCredit: z.string().optional(),
  caption: z.string().optional(),
  subject: z.string().optional(),
});
export type EditJournalFeedbackInput = z.infer<typeof EditJournalFeedbackInputSchema>;

export const EditJournalFeedbackOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type EditJournalFeedbackOutput = z.infer<typeof EditJournalFeedbackOutputSchema>;

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

export const SendDirectEmailInputSchema = z.object({
  recipientEmail: z.string().email(),
  recipientName: z.string().optional(),
  subject: z.string(),
  body: z.string(),
});
export type SendDirectEmailInput = z.infer<typeof SendDirectEmailInputSchema>;

export const SendDirectEmailOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type SendDirectEmailOutput = z.infer<typeof SendDirectEmailOutputSchema>;

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

export const AddManualFaqInputSchema = z.object({
  idToken: z.string(),
  contributorName: z.string(),
  question: z.string(),
  answer: z.string(),
  imageUrl: z.string().url().or(z.literal('')).optional(),
  answerImageUrl: z.string().url().or(z.literal('')).optional(),
  answerImageCredit: z.string().optional(),
  subject: z.string().optional(),
  questionCaption: z.string().optional(),
  answerCaption: z.string().optional(),
});
export type AddManualFaqInput = z.infer<typeof AddManualFaqInputSchema>;

export const AddManualFaqOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type AddManualFaqOutput = z.infer<typeof AddManualFaqOutputSchema>;

export const NotifyFaqAuthorInputSchema = z.object({
  idToken: z.string(),
  entryId: z.string(),
  recipientEmail: z.string().email().optional(),
});
export type NotifyFaqAuthorInput = z.infer<typeof NotifyFaqAuthorInputSchema>;

export const NotifyFaqAuthorOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type NotifyFaqAuthorOutput = z.infer<typeof NotifyFaqAuthorOutputSchema>;

export const UpdatePrinciplesInputSchema = z.object({
  idToken: z.string(),
  principles: z.array(PrincipleSchema),
});
export type UpdatePrinciplesInput = z.infer<typeof UpdatePrinciplesInputSchema>;

export const UpdatePrinciplesOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type UpdatePrinciplesOutput = z.infer<typeof UpdatePrinciplesOutputSchema>;

export const GetPrinciplesOutputSchema = z.array(PrincipleSchema);
export type GetPrinciplesOutput = z.infer<typeof GetPrinciplesOutputSchema>;

export const AdminTribeActionInputSchema = z.object({
  idToken: z.string(),
  action: z.enum(['set_chief', 'add_member', 'remove_member']),
  tribeId: z.string(),
  targetUserId: z.string(),
});
export type AdminTribeActionInput = z.infer<typeof AdminTribeActionInputSchema>;

export const AdminTribeActionOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type AdminTribeActionOutput = z.infer<typeof AdminTribeActionOutputSchema>;

export const UpdateUserLevelInputSchema = z.object({
  idToken: z.string(),
  targetUserId: z.string(),
  newLevel: z.number().int().min(1).max(6),
});
export type UpdateUserLevelInput = z.infer<typeof UpdateUserLevelInputSchema>;

export const UpdateUserLevelOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type UpdateUserLevelOutput = z.infer<typeof UpdateUserLevelOutputSchema>;

export const DeleteUserInputSchema = z.object({
  idToken: z.string(),
  targetUserId: z.string(),
});
export type DeleteUserInput = z.infer<typeof DeleteUserInputSchema>;

export const DeleteUserOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type DeleteUserOutput = z.infer<typeof DeleteUserOutputSchema>;

export const GetMeetingReportsInputSchema = z.object({
  tribeId: z.string(),
  idToken: z.string(),
});
export type GetMeetingReportsInput = z.infer<typeof GetMeetingReportsInputSchema>;

export const GetMeetingReportsOutputSchema = z.array(MeetingReportSchema);
export type GetMeetingReportsOutput = z.infer<typeof GetMeetingReportsOutputSchema>;

export const GetTribesInputSchema = z.object({
  idToken: z.string().optional(),
});
export type GetTribesInput = z.infer<typeof GetTribesInputSchema>;

export const GetTribesOutputSchema = z.array(TribeSchema);
export type GetTribesOutput = z.infer<typeof GetTribesOutputSchema>;

export const GetTribeMembersInputSchema = z.object({
  tribeId: z.string(),
  idToken: z.string(),
});
export type GetTribeMembersInput = z.infer<typeof GetTribeMembersInputSchema>;

const TribeMemberSchema = z.object({
  uid: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string(),
  address: z.string(),
  answers: z.record(z.string()),
  embracedCustoms: z.array(z.string()),
  issue: z.string(),
  serviceProject: z.string(),
});
export type TribeMember = z.infer<typeof TribeMemberSchema>;

export const GetTribeMembersOutputSchema = z.array(TribeMemberSchema);
export type GetTribeMembersOutput = z.infer<typeof GetTribeMembersOutputSchema>;

export const SaveJournalEntryInputSchema = z.object({
  idToken: z.string(),
  entryContent: z.string(),
  entryId: z.string().optional(),
  imageUrl: z.string().optional(),
  subject: z.string().optional(),
  caption: z.string().optional(),
  recipient: z.enum(['Ed', 'Mentor', 'Chief', 'Suggestion']).optional(),
});
export type SaveJournalEntryInput = z.infer<typeof SaveJournalEntryInputSchema>;

export const SaveJournalEntryOutputSchema = z.object({
  success: z.boolean(),
  entryId: z.string().optional(),
});
export type SaveJournalEntryOutput = z.infer<typeof SaveJournalEntryOutputSchema>;

export const GetRelationshipAgreementsInputSchema = z.object({
  idToken: z.string(),
});
export type GetRelationshipAgreementsInput = z.infer<typeof GetRelationshipAgreementsInputSchema>;

export const GetRelationshipAgreementsOutputSchema = z.object({
  agreedTitles: z.array(z.string()),
});
export type GetRelationshipAgreementsOutput = z.infer<typeof GetRelationshipAgreementsOutputSchema>;

export const ToggleRelationshipAgreementInputSchema = z.object({
  idToken: z.string(),
  title: z.string(),
  agreed: z.boolean(),
});
export type ToggleRelationshipAgreementInput = z.infer<typeof ToggleRelationshipAgreementInputSchema>;

export const ToggleRelationshipAgreementOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type ToggleRelationshipAgreementOutput = z.infer<typeof ToggleRelationshipAgreementOutputSchema>;

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

export const GetAllJournalEntriesOutputSchema = z.array(JournalEntrySchema);
export type GetAllJournalEntriesOutput = z.infer<typeof GetAllJournalEntriesOutputSchema>;

export const GetOutboxEmailsOutputSchema = z.array(OutboundEmailSchema);
export type GetOutboxEmailsOutput = z.infer<typeof GetOutboxEmailsOutputSchema>;
