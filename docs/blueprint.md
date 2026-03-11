# **App Name**: TribeQuest

## Core Features:

- Path Visualization: Visually represents the user's progression through the Trading Tribe levels using an SVG path with nodes for each level.
- Level Progression: Allows users to advance through the Trading Tribe levels (Visitor, Guest, Candidate, Member, Chief, Mentor) by completing tasks.
- Abilities Panel: Presents a dynamic panel displaying tasks (abilities) relevant to the user's current level. Uses a tool that ensures that relevant actions and states of action are shown to the user.
- Task Completion & Feedback: Provides visual and auditory feedback (checkmark animation, radiating glow, 'ding' sound) upon completing a task.
- Progression Animation: Animates the user's 'Me' icon along the SVG path when moving between levels, accompanied by a confetti burst at the destination node.
- Data persistence: Uses the nextjs file system to record and track completed actions.

## Style Guidelines:

- Primary color: Deep indigo (#4B0082) to convey a sense of mystery, depth, and the potential for inner exploration and growth.
- Background color: Light lavender (#E6E6FA), offering a gentle contrast to the primary, evoking a sense of calm and progress.
- Accent color: Soft lavender (#D8BFD8) - this creates visual interest without overwhelming the user with boldness.
- Font pairing: 'Playfair' (serif) for headlines and 'PT Sans' (sans-serif) for body text. The headline font communicates elegance while the body font maintains readability.
- Use clear, minimalist icons to represent each level and task, ensuring intuitive understanding.
- Maintain a clean and spacious layout with a clear visual hierarchy to guide the user through the path and tasks.
- Implement smooth and subtle animations for task completion and level progression to enhance user engagement without being distracting.