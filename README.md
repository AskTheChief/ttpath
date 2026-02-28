# The Trading Tribe Path

A community-driven platform for personal growth and trading psychology, based on the Trading Tribe Process (TTP). This application guides users through a journey from Visitor to Mentor, emphasizing emotional honesty, accountability, and the SVOP-B (Subject-Verb-Object-Present, Action-based) communication style.

## 🚀 Deployment to Your New Repository

If you are having trouble pushing your code because of authentication errors (GitHub rejecting your password), follow these steps to use your **Personal Access Token (PAT)**.

**Note: Removing the old remote will NOT delete your code.** Your local changes are safe.

### Step 1: Open your terminal
Navigate to your project root folder in your terminal or command prompt.

### Step 2: Remove the old connection
```bash
git remote remove origin
```

### Step 3: Connect to your new repository (Force Token Method)
This method embeds your token into the URL so you don't have to wait for a prompt that might not appear.
```bash
git remote add origin https://AskTheChief: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@github.com/AskTheChief/ttpath.git
```

### Step 4: Stage and commit your current files
```bash
git add .
git commit -m "Initial commit to new repository"
```

### Step 5: Push the code
```bash
git push -u origin main
```

**⚠️ IMPORTANT SECURITY STEP:** Once the push is successful, delete the Personal Access Token (the `ghp_...` part) from this README file and commit/push again to keep your account secure.

---

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
