
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
    id: 'fancy-south-austin-invitation',
    name: 'Fancy South Austin Invitation',
    subject: 'An Invitation to Join the South Austin Trading Tribe',
    body: `
<div style="background-color: #f9f9f9; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';">
  <div style="max-width: 680px; margin: auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
    <div style="text-align: center; padding: 40px 20px 20px 20px; border-bottom: 1px solid #eeeeee;">
      <img src="https://ttpath.net/logo/logo.png" alt="Trading Tribe Logo" style="width: 120px; height: 120px; margin: 0 auto;"/>
    </div>
    <div style="padding: 30px 40px;">
      <p style="margin-bottom: 25px; color: #555555; font-size: 16px;">Dear [Name],</p>
      <p style="margin-bottom: 20px; font-size: 16px; line-height: 1.7;">I am hosting a new series of ten Trading Tribe meetings over the next six months, and I would like to invite you to attend.</p>
      <p style="margin-bottom: 20px; font-size: 16px; line-height: 1.7;">We meet on Thursday evenings from 5:00 PM to 11:00 PM, every two or three weeks, at my home in South Austin, TX. In our meetings, we support each other in locating personal issues and dissolving judgments that stand in the way of leading more successful lives and serving others.</p>
      <p style="margin-bottom: 20px; font-size: 16px; line-height: 1.7;">These issues can appear in any area of life—from trading and professional challenges to personal relationships and finding a graceful livelihood.</p>
      <p style="margin-bottom: 30px; font-size: 16px; line-height: 1.7;">To learn more and to apply to join the Tribe, you might like to visit the new website.</p>
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="https://ttpath.net" style="background-color: #38985C; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Visit TTPath.net</a>
      </div>
      <p style="margin-bottom: 10px; font-size: 16px;">Yours truly,</p>
      <p style="font-family: 'Georgia', serif; font-size: 28px; color: #222; margin-top: 0; margin-bottom: 30px;">Ed</p>
    </div>
    <div style="border-top: 1px solid #eeeeee; padding: 25px 40px; font-size: 12px; color: #888888; text-align: left;">
      <p style="margin: 0; font-weight: bold; color: #444;">Ed Seykota</p>
      <p style="margin: 0;"><a href="mailto:tt_95@yahoo.com" style="color: #38985C; text-decoration: none;">tt_95@yahoo.com</a> | 775-813-8895</p>
    </div>
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
  {
    id: 'general-announcement',
    name: 'General Announcement',
    subject: 'A Message from The Trading Tribe',
    body: `
<div style="background-color: #f9f9f9; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';">
  <div style="max-width: 680px; margin: auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
    <div style="text-align: center; padding: 40px 20px 20px 20px; border-bottom: 1px solid #eeeeee;">
      <img src="${logoUrl}" alt="Trading Tribe Logo" style="width: 120px; height: 120px; margin: 0 auto;"/>
    </div>
    <div style="padding: 30px 40px;">
      <h2 style="color: #222; font-size: 24px; margin-bottom: 20px;">[Your Title Here]</h2>
      <p style="margin-bottom: 20px; font-size: 16px; line-height: 1.7;">Hello [Name],</p>
      <p style="margin-bottom: 20px; font-size: 16px; line-height: 1.7;">[Your main message content here. You can write a few paragraphs.]</p>
      <p style="margin-bottom: 30px; font-size: 16px; line-height: 1.7;">[Optional: Add a closing sentence or call to action.]</p>
    </div>
    <div style="border-top: 1px solid #eeeeee; padding: 25px 40px; font-size: 12px; color: #888888; text-align: left;">
      <p style="margin: 0; font-weight: bold; color: #444;">The Trading Tribe Team</p>
    </div>
  </div>
</div>
    `.trim(),
  },
  {
    id: 'gentle-reminder',
    name: 'Gentle Reminder / Follow-Up',
    subject: 'Following Up on Your Journey',
    body: `
<div style="background-color: #f9f9f9; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';">
  <div style="max-width: 680px; margin: auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
    <div style="text-align: center; padding: 40px 20px 20px 20px;">
      <img src="${logoUrl}" alt="Trading Tribe Logo" style="width: 90px; height: 90px; margin: 0 auto;"/>
    </div>
    <div style="padding: 30px 40px;">
      <h2 style="color: #222; font-size: 24px; margin-bottom: 20px;">Following Up on Your Journey</h2>
      <p style="margin-bottom: 20px; font-size: 16px; line-height: 1.7;">Hello [Name],</p>
      <p style="margin-bottom: 20px; font-size: 16px; line-height: 1.7;">We notice you've taken the first steps on the Trading Tribe Path. The journey of self-discovery and community is a powerful one, and we are here to support you.</p>
      <p style="margin-bottom: 30px; font-size: 16px; line-height: 1.7;">If you have any questions or wish to continue, you might like to visit the site to pick up where you left off.</p>
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="https://ttpath.net" style="background-color: #38985C; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Continue Your Path</a>
      </div>
    </div>
    <div style="border-top: 1px solid #eeeeee; padding: 25px 40px; font-size: 12px; color: #888888; text-align: left;">
      <p style="margin: 0; font-weight: bold; color: #444;">The Trading Tribe Team</p>
    </div>
  </div>
</div>
    `.trim(),
  },
  {
    id: 'event-invitation',
    name: 'Event Invitation',
    subject: `You're Invited: [Event Name]`,
    body: `
<div style="background-color: #f9f9f9; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';">
  <div style="max-width: 680px; margin: auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
    <div style="text-align: center; padding: 40px 20px 20px 20px; background-color: #2a433a; border-top-left-radius: 12px; border-top-right-radius: 12px;">
      <img src="${logoUrl}" alt="Trading Tribe Logo" style="width: 100px; height: 100px; margin: 0 auto;"/>
      <h1 style="color: #ffffff; font-size: 28px; margin-top: 20px;">You're Invited!</h1>
    </div>
    <div style="padding: 30px 40px;">
      <h2 style="color: #222; font-size: 24px; margin-bottom: 20px; text-align: center;">[Event Name]</h2>
      <p style="margin-bottom: 20px; font-size: 16px; line-height: 1.7;">Hello [Name],</p>
      <p style="margin-bottom: 20px; font-size: 16px; line-height: 1.7;">We would be delighted if you would join us for [Event Name]. [Add a brief description of the event here, what it's about, and why they should attend.]</p>
      <div style="background-color: #f2f2f2; border-left: 4px solid #38985C; padding: 20px; margin: 30px 0; font-size: 16px;">
        <p style="margin: 0 0 10px 0;"><strong>Date:</strong> [Event Date, e.g., Saturday, October 26, 2024]</p>
        <p style="margin: 0 0 10px 0;"><strong>Time:</strong> [Event Time, e.g., 7:00 PM - 9:00 PM EST]</p>
        <p style="margin: 0;"><strong>Location:</strong> [Event Location or "Online via Zoom"]</p>
      </div>
      <p style="margin-bottom: 30px; font-size: 16px; line-height: 1.7;">[Add any additional details, like how to prepare or what to bring.]</p>
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="[Link to RSVP or More Info]" style="background-color: #38985C; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">RSVP Here</a>
      </div>
    </div>
    <div style="border-top: 1px solid #eeeeee; padding: 25px 40px; font-size: 12px; color: #888888; text-align: left;">
      <p style="margin: 0; font-weight: bold; color: #444;">The Trading Tribe Team</p>
    </div>
  </div>
</div>
    `.trim(),
  },
];
