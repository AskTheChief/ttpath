# The Trading Tribe Path

A community-driven platform for personal growth and trading psychology, based on the Trading Tribe Process (TTP).

## Getting Started

To run this project locally after downloading:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Environment Variables:**
   Create a `.env.local` file in the root directory and add your required keys (Firebase, Google Maps, Mailgun, and Gemini API). Refer to `apphosting.yaml` for the required secret names.

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Access the app:**
   Open [http://localhost:9002](http://localhost:9002) in your browser.

## Key Features

- **The Path Journey:** An interactive, guided progression from Visitor to Mentor.
- **Trading Tribe Customs:** A mandatory commitment gate for new members.
- **The Forum:** A centralized Q&A system for community knowledge.
- **Game Center:** Educational games like SVOP Scramble and the Feelings Panel.
- **Mentor Dashboard:** Specialized tools for managing tribe applications and providing feedback.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS & Shadcn UI
- **Database/Auth:** Firebase (Firestore, Auth, Storage)
- **AI Integration:** Genkit with Google Gemini Pro/Flash