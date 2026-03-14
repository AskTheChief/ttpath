import { sendDirectEmail } from './src/ai/flows/send-direct-email';

async function testEmail() {
  console.log('Sending test email...');
  const result = await sendDirectEmail({
    recipientEmail: 'test@example.com',
    recipientName: 'Test User',
    subject: 'Test Email',
    body: 'This is a test email.'
  });
  console.log('Result:', result);
}

testEmail().catch(console.error);
