
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

export const CreateTribeOutputSchema = z.object({
  success: z.boolean(),
  tribeId: z.string().optional(),
  message: z.string().optional(),
});

export const JoinTribeInputSchema = z.object({
  tribeId: z.string(),
  idToken: z.string().optional(),
  answers: z.record(z.string()).optional(),
  embracedCustoms: z.array(z.string()).optional(),
});

export const JoinTribeOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export const DeleteTribeInputSchema = z.object({
  tribeId: z.string(),
  idToken: z.string(),
});

export const DeleteTribeOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export const UpdateTribeMeetingsInputSchema = z.object({
  tribeId: z.string(),
  meetings: z.array(z.object({
      id: z.string(),
      date: z.string(),
  })),
  idToken: z.string(),
});

export const UpdateTribeMeetingsOutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional(),
});

export const ManageApplicationInputSchema = z.object({
  action: z.enum(['get', 'approve', 'deny', 'withdraw']),
  type: z.enum(['join_tribe', 'new_tribe', 'new_mentor', 'my_pending']),
  idToken: z.string(),
  applicationId: z.string().optional(),
  tribeId: z.string().optional(),
  applicantId: z.string().optional(),
});

export const ManageApplicationOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  applications: z.array(ApplicationSchema).optional(),
});

export const AddJournalFeedbackInputSchema = z.object({
  idToken: z.string(),
  entryId: z.string(),
  feedbackContent: z.string(),
  imageUrl: z.string().url().or(z.literal('')).optional(),
  imageCredit: z.string().optional(),
  caption: z.string().optional(),
});

export const AddJournalFeedbackOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

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

export const EditJournalFeedbackOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export const DeleteJournalFeedbackInputSchema = z.object({
  idToken: z.string(),
  entryId: z.string(),
  feedbackId: z.string(),
});

export const DeleteJournalFeedbackOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export const SendDirectEmailInputSchema = z.object({
  recipientEmail: z.string().email(),
  recipientName: z.string().optional(),
  subject: z.string(),
  body: z.string(),
});

export const SendDirectEmailOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const SaveEmailTemplateInputSchema = z.object({
  name: z.string(),
  subject: z.string(),
  body: z.string(),
});

export const SaveEmailTemplateOutputSchema = z.object({
  success: z.boolean(),
  templateId: z.string().optional(),
  message: z.string().optional(),
});

export const AddUserInputSchema = z.object({
  idToken: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  currentUserLevel: z.number().optional().default(1),
});

export const AddUserOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  userId: z.string().optional(),
});

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

export const AddManualFaqOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const NotifyFaqAuthorInputSchema = z.object({
  idToken: z.string(),
  entryId: z.string(),
  recipientEmail: z.string().email().optional(),
});

export const NotifyFaqAuthorOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const UpdatePrinciplesInputSchema = z.object({
  idToken: z.string(),
  principles: z.array(PrincipleSchema),
});

export const UpdatePrinciplesOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export const AdminTribeActionInputSchema = z.object({
  idToken: z.string(),
  action: z.enum(['set_chief', 'add_member', 'remove_member']),
  tribeId: z.string(),
  targetUserId: z.string(),
});

export const AdminTribeActionOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const UpdateUserLevelInputSchema = z.object({
  idToken: z.string(),
  targetUserId: z.string(),
  newLevel: z.number().int().min(1).max(6),
});

export const UpdateUserLevelOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export const DeleteUserInputSchema = z.object({
  idToken: z.string(),
  targetUserId: z.string(),
});

export const DeleteUserOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
