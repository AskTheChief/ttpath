# The Trading Tribe Path

A community-driven platform for personal growth and trading psychology, based on the Trading Tribe Process (TTP). This application guides users through a journey from Visitor to Mentor, emphasizing emotional honesty, accountability, and the SVOP-B (Subject-Verb-Object-Present, Action-based) communication style.

## Deployment to the New Repository

To move this codebase to your new repository, follow these steps in your terminal:

1. **Navigate to your project root.**
2. **Remove the old remote origin:**
   ```bash
   git remote remove origin
   ```
3. **Add the new repository as the origin:**
   ```bash
   git remote add origin https://github.com/AskTheChief/ttpath.git
   ```
4. **Stage and commit your files:**
   ```bash
   git add .
   git commit -m "Initial commit to new repository"
   ```
5. **Push the code to the main branch:**
   ```bash
   git push -u origin main
   ```
   *Note: When GitHub prompts for your password, paste your **Personal Access Token (PAT)**:*
   `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`

**Important Security Warning:** Once you have successfully pushed your code, please remove this token from the README file before making any further commits.

## Getting Started Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Environment Variables:**
   Create a `.env.local` file in the root directory and add your required keys. You will need:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
   - `GEMINI_API_KEY`
   - `MAILGUN_API_KEY`
   - `MAILGUN_DOMAIN`

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
- **Game Center:** Educational tools like SVOP Scramble, Feelings Slicer, and the Feelings Panel.
- **Mentor Dashboard:** Specialized tools for high-level members to guide the community and review applications.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS & Shadcn UI
- **Database/Auth:** Firebase (Firestore, Auth, Storage)
- **AI Integration:** Genkit with Google Gemini 2.5
- **Audio:** Tone.js for interactive feedback
