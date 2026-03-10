# The Trading Tribe Path

A community-driven platform for personal growth and trading psychology, based on the Trading Tribe Process (TTP). This application guides users through a journey from Visitor to Mentor, emphasizing emotional honesty, accountability, and the SVOP-B (Subject-Verb-Object-Present, Action-based) communication style.

## 🚀 Deployment & Exporting Your Code

To move your code from this environment to your local machine and GitHub, follow these steps:

### 1. Download the Project
*   **Locate the Export Button:** Look in the top-right header area for a **Download icon** (usually a downward arrow icon). 
*   **Alternative Location:** If not in the header, check the **Project** or **Settings** menu in the left sidebar.
*   **Save:** This will download a `.zip` file containing all your project files.

### 2. Local Setup
1.  **Unzip:** Extract the downloaded files into a new folder on your computer.
2.  **Open Terminal:** Open your terminal (Command Prompt, PowerShell, or Terminal) in that folder.
3.  **Initialize Git:**
    ```bash
    git init
    git add .
    git commit -m "Initial commit from Studio"
    ```

### 3. Connect to GitHub (Force Token Method)
If you encounter authentication errors, use this method to link your new repository (`AskTheChief/ttpath.git`) using your **Personal Access Token (PAT)**:

1.  **Add the Remote:**
    ```bash
    git remote add origin https://<YOUR_GITHUB_USERNAME>:<YOUR_TOKEN>@github.com/AskTheChief/ttpath.git
    ```
    *(Replace `<YOUR_GITHUB_USERNAME>` with your username and `<YOUR_TOKEN>` with your GitHub PAT).*

2.  **Push to GitHub:**
    ```bash
    git push -u origin main
    ```

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Environment Variables:**
   Create a `.env.local` file in the root directory and add your required keys:
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

- **The Path Journey:** An interactive, guided progression with animated transitions.
- **Embraced Customs:** A commitment system where members choose principles they align with.
- **The Forum:** A community Q&A system for sharing wisdom.
- **Game Center:** Educational tools like SVOP Scramble and the Feelings Panel.
- **Mentor Dashboard:** Tools for high-level members to review applications and guide the community.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS & Shadcn UI
- **Database/Auth:** Firebase (Firestore, Auth, Storage)
- **AI Integration:** Genkit with Google Gemini 2.5
- **Audio:** Tone.js for interactive feedback
