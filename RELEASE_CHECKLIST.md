# Production Release Checklist

This checklist provides a set of steps to ensure the CRM application is ready for a stable, secure, and successful production launch.

## Phase 1: Pre-Deployment

### 1. Code & Feature Freeze
- [ ] Announce a code freeze to all contributors. No new features will be merged until the release is complete. Only critical bug fixes are allowed.
- [ ] Create a release branch from the main development branch (e.g., `release/v1.0.0`). All further changes for this release will be merged into this branch.

### 2. Final Testing & QA
- [ ] **Automated Tests**: Run all unit and integration tests to ensure they pass.
  ```bash
  npm test
  ```
- [ ] **Static Analysis**: Run the type checker and linter to catch any static errors.
  ```bash
  npm run typecheck
  npm run lint
  ```
- [ ] **E2E Testing**: Run end-to-end tests (e.g., using Playwright or Cypress) on a staging environment that mirrors production.
    - [ ] User signup and login flow.
    - [ ] Create, Read, Update, Delete (CRUD) for Leads, Services, Categories, Packages, Actions, and Invoices.
    - [ ] Filter functionality on all data tables.
    - [ ] AI Planner: Generate a plan and save the actions.
    - [ ] Discount Calculator: Apply discounts to packages and invoices and verify totals.
    - [ ] **Data Table Controls**:
        - [ ] Verify page-size selector changes the number of items per page.
        - [ ] Test pagination controls (next, previous) work correctly.
        - [ ] Test "select all" on the current page.
        - [ ] Test bulk delete for selected items and verify they are removed.
    - [ ] **Exporting**:
        - [ ] Export selected leads to CSV and verify the CSV content, including social media URLs.
        - [ ] Export an invoice to PDF using a template and verify the output. Check that social links render with icons.
- [ ] **Manual QA**: Perform manual testing on critical user flows.
    - [ ] Test on major browsers (Chrome, Firefox, Safari).
    - [ ] Test on mobile devices to check for responsiveness.
    - [ ] Verify that all UI elements are aligned and styled correctly.
    - [ ] Check that all forms handle validation and errors gracefully.
    - [ ] **Template Admin**:
        - [ ] Create a new PDF template and save it.
        - [ ] Preview the template with sample data.
        - [ ] Apply the new template during a PDF export and confirm it is used.

### 3. Security & Configuration
- [ ] **Environment Variables**:
    - [ ] Create a `.env.production` file or configure secrets in your hosting provider's dashboard (e.g., Firebase App Hosting, Vercel).
    - [ ] Ensure all required variables from `.env.example` are set with their production values. **Do not commit this file to version control.**
- [ ] **Firestore Security Rules**:
    - [ ] Review and test all Firestore security rules in the emulator to ensure users can only access their own data.
    - [ ] Pay special attention to rules for creating, updating, and deleting documents. Ensure admin/manager roles are respected.
- [ ] **Firebase API Key Security**:
    - [ ] In the Google Cloud Console, restrict your Firebase API key to your application's domain to prevent unauthorized use.
- [ ] **Firebase Storage Security**:
    - [ ] Review and test Storage security rules to ensure that exported PDFs are only accessible to authorized users.
    - [ ] Consider setting up lifecycle rules to automatically delete old exports if necessary.


### 4. Database & Backups
- [ ] **Seed Data**: Ensure any production seed scripts are ready but disabled by default.
- [ ] **Backups**: Enable Point-in-Time Recovery (PITR) for your production Firestore database in the Google Cloud Console. This allows you to restore your database to any point in the last 7 days.

## Phase 2: Deployment

### 1. Production Build
- [ ] Create a production build of the application.
  ```bash
  npm run build
  ```
- [ ] Verify that the build completes without errors.

### 2. Deploy to Production
- [ ] Deploy the application to your hosting provider. For Firebase App Hosting:
  ```bash
  firebase deploy --only hosting
  ```
- [ ] Deploy Firestore security rules, indexes, and any Cloud Functions.
  ```bash
  firebase deploy --only firestore:rules,firestore:indexes
  ```
- [ ] Deploy Storage rules.
  ```bash
  firebase deploy --only storage
  ```

## Phase 3: Post-Deployment

### 1. Smoke Testing
- [ ] Immediately after deployment, perform a quick round of manual smoke tests on the live production site.
    - [ ] Can users sign up and log in?
    - [ ] Is the main dashboard loading correctly?
    - [ ] Can a new lead be created?
    - [ ] Does the AI insight generation work?
- [ ] Run automated smoke tests if they are available.

### 2. Monitoring
- [ ] **Error Tracking**: Monitor your error tracking service (e.g., Sentry, Firebase Crashlytics) for any new or unusual spikes in errors.
- [ ] **Logs**: Check the application logs in your hosting provider's dashboard for any server-side errors.
- [ ] **Performance**: Monitor key performance metrics like load time and responsiveness.

### 3. Communication
- [ ] Announce the successful deployment to the team and stakeholders.
- [ ] Lift the code freeze on the main development branch.

## Rollback Plan
In case of a critical issue in production, follow these steps to roll back to the previous stable version:
1.  **Identify the Issue**: Quickly diagnose the problem using logs and error monitoring.
2.  **Communicate**: Inform the team that a rollback is in progress.
3.  **Re-deploy Previous Version**: Re-deploy the last known good commit/build from your hosting provider's dashboard or CLI. Most modern providers like Vercel and Firebase App Hosting keep previous deployments.
4.  **Verify**: Perform smoke tests on the rolled-back version to ensure it is stable.
5.  **Post-Mortem**: Once the situation is stable, conduct a post-mortem to understand the cause of the failure and prevent it from happening again.
