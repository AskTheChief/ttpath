# The Trading Tribe Path

A community-driven platform for personal growth and trading psychology, based on the Trading Tribe Process (TTP). This application guides users through a journey from Visitor to Mentor, emphasizing emotional honesty, accountability, and the SVOP-B (Subject-Verb-Object-Present, Action-based) communication style.

## Getting Started Locally

If you have downloaded the codebase, follow these steps to run it on your machine:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Environment Variables:**
   Create a `.env.local` file in the root directory and add your required keys. You will need:
   - `NEXT_PUBLIC_FIREBASE_API_KEY` (and other Firebase config vars)
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (for the tribe and feelings maps)
   - `GEMINI_API_KEY` (for the AI Chief)
   - `MAILGUN_API_KEY` and `MAILGUN_DOMAIN` (for automated diplomas and notifications)

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Access the app:**
   Open [http://localhost:9002](http://localhost:9002) in your browser.

## Key Features

- **The Path Journey:** An interactive, guided progression with animated transitions and visual feedback.
- **Trading Tribe Customs:** A mandatory commitment gate where members acknowledge core principles with audio chimes.
- **The Forum:** A community Q&A system for sharing wisdom and resolving issues.
- **Game Center:** Educational tools like SVOP Scramble, Feelings Slicer, and the Body Feelings Map.
- **Mentor Dashboard:** Specialized tools for high-level members to guide the community and review applications.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS & Shadcn UI
- **Database/Auth:** Firebase (Firestore, Auth, Storage)
- **AI Integration:** Genkit with Google Gemini 2.5
- **Audio:** Tone.js for interactive feedback
