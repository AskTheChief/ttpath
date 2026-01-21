
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string; // This will be an HTML string
}

const logoUrl = 'https://ttpath.net/logo/logo.png';

export const emailTemplates: EmailTemplate[] = [
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
