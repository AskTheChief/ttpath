
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string; // This will be an HTML string
}

const logoUrl = 'https://ttpath.net/logo/logo.png';

export const emailTemplates: EmailTemplate[] = [
  {
    id: 'south-austin-invitation',
    name: 'South Austin Invitation',
    subject: 'Invitation to South Austin Trading Tribe Meetings',
    body: `
<div style="font-family: Georgia, 'Times New Roman', Times, serif; line-height: 1.6; color: #333333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
  <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eeeeee;">
    <img src="${logoUrl}" alt="Trading Tribe Logo" style="width: 90px; height: 90px; margin: 0 auto;"/>
  </div>
  <div style="padding: 25px 10px;">
    <p style="margin-bottom: 20px; color: #555555;">January 21, 2026</p>
    <p style="margin-bottom: 25px;">Dear [Name],</p>
    <p style="margin-bottom: 18px;">I plan to host another Trading Tribe series of ten meetings over a span of about 6 months. I’d like you to let me know if you’d like to attend.</p>
    <p style="margin-bottom: 18px;">We generally meet on Thursday evenings, from 5:00 PM until 11:00 PM, every two or three weeks at my home in South Austin, TX. We support each other in locating issues and dissolving judgments that stand in the way of us leading more successful lives and serving others.</p>
    <p style="margin-bottom: 18px;">Issues may appear in various areas ranging from trading to personal relationships to aligning with graceful livelihood, and to any thing else that you might like to consider.</p>
    <p style="margin-bottom: 25px;">You might like to visit the new Tribe website at <a href="https://ttpath.net" style="color: #4B0082; text-decoration: none; font-weight: bold;">TTPath.net</a> for more orientation and to apply to join the Tribe.</p>
    <p style="margin-bottom: 10px;">Yours truly,</p>
    <p style="margin-bottom: 30px; font-family: 'Brush Script MT', cursive; font-size: 24px; color: #222;">Ed</p>
  </div>
  <div style="border-top: 1px solid #eeeeee; padding-top: 20px; font-size: 12px; color: #888888; text-align: left;">
    <p style="margin: 0; font-weight: bold; color: #555;">Ed Seykota</p>
    <p style="margin: 0;"><a href="mailto:tt_95@yahoo.com" style="color: #4B0082; text-decoration: none;">tt_95@yahoo.com</a></p>
    <p style="margin: 0;">775-813-8895</p>
  </div>
</div>
    `.trim(),
  },
  {
    id: 'local-invitation',
    name: 'Local Area Invitation',
    subject: 'Invitation to Join a Local Trading Tribe',
    body: `
<div style="font-family: sans-serif; line-height: 1.6;">
  <div style="text-align: center; padding-bottom: 20px;">
    <img src="${logoUrl}" alt="Trading Tribe Logo" style="width: 100px; height: 100px; margin: 0 auto;"/>
  </div>
  <p>Hello [Name],</p>
  <p>I hope this message finds you well.</p>
  <p>We are reaching out to individuals in the [Area] area who have shown an interest in the Trading Tribe. We are forming a new local tribe and would like to invite you to connect with us.</p>
  <p>The Trading Tribe provides a supportive environment for personal growth and for developing skills in trading and life. Joining a local tribe is a powerful step on this journey.</p>
  <p>If you are interested in learning more or participating, please reply to this email.</p>
  <br>
  <p>Sincerely,</p>
  <p>The Trading Tribe Team</p>
</div>
    `.trim(),
  },
  {
    id: 'letter-head',
    name: 'Letter Head',
    subject: '',
    body: `
<div style="font-family: sans-serif; line-height: 1.6;">
  <div style="text-align: center; padding-bottom: 20px;">
    <img src="${logoUrl}" alt="Trading Tribe Logo" style="width: 100px; height: 100px; margin: 0 auto;"/>
  </div>
  <p>Hello [Name],</p>
  <br>
  <p>[Your message here]</p>
  <br>
  <p>Sincerely,</p>
  <p>The Trading Tribe Team</p>
</div>
    `.trim(),
  },
];
