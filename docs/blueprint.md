# **App Name**: Yaksen CRM

## Core Features:

- Firebase Authentication: Implement secure user authentication with signup, login, logout, and session persistence using Firebase Authentication.
- Real-time Firestore Sync: Enable real-time data synchronization across all CRUD operations for leads, services, categories, and packages using Firestore.
- Leads Management: Create, read, update, and delete leads with fields for name, phone numbers, emails, socials, state (enum: new, contacted, interested, lost, converted), and notes.
- Services Management: Manage services with fields for name, category (reference to Categories), finishing time, price range (LKR and USD), and notes.
- Categories Management: Administer service categories with fields for name and notes.
- Packages Management: Handle service packages with fields for name, description, included services (array of service references), price (LKR and USD), and duration.
- Dashboard Summaries: Tool: Present summary counts of leads, services, categories and packages, where a generative AI LLM will decide whether there are actionable conclusions that could be drawn from the counts.

## Style Guidelines:

- Background color: Dark grey (`#222222`) for a sleek and modern feel.
- Primary color: Orange (`#FF9800`) for bold energy and high visibility on main actions.
- Accent color: Light Orange (`#FFC107`) to highlight key interactive elements and hover states.
- Body and headline font: 'Inter', a grotesque-style sans-serif with a modern, machined, objective, neutral look that is suitable for both headlines and body text
- Use minimalist icons from a set like Feather or Line Awesome for a clean, consistent look.
- Design a clean, card-based layout with intuitive modals for adding and editing data.
- Implement subtle transitions and animations for a smooth, engaging user experience.