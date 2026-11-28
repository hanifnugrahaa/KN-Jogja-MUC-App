# Koding Next MUC Evaluation

An internal academic workspace for evaluating coding teacher candidates. Drafts and recommendation settings are stored in the browser. Saved trainer evaluations sync to Supabase. The default center is Yogyakarta.

## Run locally

Use Node.js 24 and npm.

    npm ci
    npm run dev

Run the scoring and validation checks with **npm test**. Build the production app with **npm run build** and serve the output locally with **npm run preview**.

## Evaluation workflow

Rate all eight criteria and complete the candidate and evaluator fields to save an evaluation or preview its report. The recommendation follows the final score unless the evaluator selects an override. Settings apply to future saves. Each saved evaluation retains the thresholds used when it was saved.

Open Evaluation History to edit, duplicate, delete, or re-export saved evaluations. The report preview can download a PDF or an editable Word document. Both formats use A4.

Browser storage is specific to the browser profile and site address. Clearing site data removes local drafts and settings. Use **Analytics** to review scores, rubric averages, and recommendations by teacher and month.

## Gemini note polishing

Copy .env.example to .env.local, set GEMINI_API_KEY to a key from Google AI Studio, then restart Vite. Polish Notes sends the notes field to Google Gemini and lets the evaluator edit the reply before applying it.

The endpoint runs with npm run dev and npm run preview. Static hosting of dist alone does not provide the endpoint. Shared production hosting requires a protected server on the same origin.

## Public evaluations and trainer access

The home page lists explicitly published evaluations without sign-in. Go to /trainer and sign in with the authorized account?s email and Supabase Auth password. Use Set or reset password to create a password for an existing account. Apply the migrations in supabase/migrations, register the trainer email in public.muc_trainers, and set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in the environment. Add the /trainer URL to the Supabase Auth redirect allowlist for each deployed or local origin.

Saved evaluations are private to the trainer account in Supabase. Existing evaluations saved in this browser are imported when the trainer opens the dashboard. Evaluation History and Analytics also include earlier shared and published copies, using the private version when both copies exist. Use Publish Evaluation to make a public copy. Supervisor Notes are included only when selected. Update publication to refresh the public copy or Unpublish to remove it while keeping the saved private version. Existing private shares remain private until published. SQL checks for isolation, publication, and revocation are in supabase/tests.

To sign Mr Hanif's local reports, set MUC_SIGNATURE_PATH to the path of his PNG signature in .env.local. The development server serves it only to an authenticated trainer on loopback. PNG signatures stay outside the source repository. In production, the authorized signature is stored in Supabase and exposed only for published Mr Hanif reports or authenticated trainer previews.
