// IMPORTANT: This file is used to configure the Genkit API endpoints for Next.js.
// It is essential for handling CORS and ensuring that the deployed application can
// communicate with the Genkit backend. Do not modify this file unless you are
// familiar with Genkit's Next.js integration.

import {createApiHandler} from '@genkit-ai/next';
import '@/ai/dev'; // Make sure your flows are loaded.

export const {GET, POST, OPTIONS} = createApiHandler({
  // This is the crucial part for fixing the deployment error.
  // It allows requests from your deployed app's domain.
  cors: {
    origin: '*', // Allow all origins
  },
});
