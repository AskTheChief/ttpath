# The Trading Tribe Path

A community-driven platform for personal growth and trading psychology, based on the Trading Tribe Process (TTP). This application guides users through a journey from Visitor to Mentor, emphasizing emotional honesty, accountability, and the SVOP-B (Subject-Verb-Object-Present, Action-based) communication style.

## Deployment to a New Repository

If you wish to move this codebase to a new GitHub repository, follow these steps:

1. **Create a new empty repository on GitHub.** (Do not initialize it with a README or License).
2. **Open your terminal in the project root directory.**
3. **Remove the old remote origin:**
   ```bash
   git remote remove origin
   ```
4. **Add your new repository as the origin:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_NEW_REPO_NAME.git
   ```
5. **Stage and commit your current files:**
   ```bash
   git add .
   git commit -m "Initial commit to new repository"
   ```
6. **Push the code to the main branch:**
   ```bash
   git push -u origin main
   ```
   *Note: If GitHub prompts for a password, you must use a **Personal Access Token (PAT)** created in your GitHub Developer Settings.*

## Getting Started Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Environment Variables:**
   Create a `.env.local` file in the root directory and add your required keys. You will need:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
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
