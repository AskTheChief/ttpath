# The Trading Tribe Path

A community-driven platform for personal growth and trading psychology, based on the Trading Tribe Process (TTP). This application guides users through a journey from Visitor to Mentor, emphasizing emotional honesty, accountability, and the SVOP-B (Subject-Verb-Object-Present, Action-based) communication style.

## 🚀 Deployment to Your New Repository

**Don't worry: Removing the old remote will NOT delete your code.** Your local changes are safe. We are simply changing where your code is sent when you "push."

Follow these steps exactly to move your code to `https://github.com/AskTheChief/ttpath.git`:

1.  **Open your terminal** in the project root folder.
2.  **Remove the old connection:**
    ```bash
    git remote remove origin
    ```
3.  **Connect to your new repository:**
    ```bash
    git remote add origin https://github.com/AskTheChief/ttpath.git
    ```
4.  **Stage and commit your current files:**
    ```bash
    git add .
    git commit -m "Initial commit to new repository"
    ```
5.  **Push the code to GitHub:**
    ```bash
    git push -u origin main
    ```

### 🔑 How to Authenticate during Push:
When prompted for credentials:
- **Username:** `AskTheChief`
- **Password:** Paste this token (GitHub no longer accepts your regular password here):
  `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`

---

### 🛠️ Troubleshooting: What to do if you aren't prompted for a password
If Git fails with an authentication error and DOES NOT ask you for a password, it is using old cached credentials. You can "force" the token by running these commands:

1.  **Remove the current remote:**
    ```bash
    git remote remove origin
    ```
2.  **Add the remote with your token built-in (Force Token Method):**
    ```bash
    git remote add origin https://AskTheChief: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@github.com/AskTheChief/ttpath.git
    ```
3.  **Push your code:**
    ```bash
    git push -u origin main
    ```

**⚠️ Important:** Once the push is successful, delete the token from this README file and commit/push again to keep your account secure.

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
