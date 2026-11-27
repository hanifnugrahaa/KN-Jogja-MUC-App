# Koding Next MUC Evaluation

An internal academic workspace for evaluating coding teacher candidates. The evaluation form, draft, history, and recommendation thresholds are stored in the current browser. The default center is Yogyakarta.

## Run locally

Use Node.js 24 and npm.

    npm ci
    npm run dev

Run the scoring and validation checks with **npm test**. Build the production app with **npm run build** and serve the output locally with **npm run preview**.

## Evaluation workflow

Rate all eight criteria and complete the candidate and evaluator fields to save an evaluation or preview its report. The recommendation follows the final score unless the evaluator selects an override. Settings apply to future saves. Each saved evaluation retains the thresholds used when it was saved.

Open Evaluation History to edit, duplicate, delete, or re-export saved evaluations. The report preview can download a PDF or an editable Word document. Both formats use A4.

Browser storage is specific to the browser profile and site address. Clearing site data removes local drafts and history.

## Gemini note polishing

Copy .env.example to .env.local, set GEMINI_API_KEY to a key from Google AI Studio, then restart Vite. Polish Notes sends the notes field to Google Gemini and lets the evaluator edit the reply before applying it.

The endpoint runs with npm run dev and npm run preview. Static hosting of dist alone does not provide the endpoint. Shared production hosting requires a protected server on the same origin.

## Public evaluations and trainer access

The home page lists explicitly published evaluations without sign-in. Go to /trainer and sign in with the authorized account?s email and Supabase Auth password. Use Set or reset password to create a password for an existing account. Apply the migrations in supabase/migrations, register the trainer email in public.muc_trainers, and set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in the environment. Add the /trainer URL to the Supabase Auth redirect allowlist for each deployed or local origin.

Trainer drafts and saved history are stored in the current browser. Use Publish Evaluation from Evaluation History to make a public copy. Evaluator notes are included only when selected. Update publication to refresh the public copy or Unpublish to remove it. Existing private shares remain private until published. SQL checks for isolation, publication, and revocation are in supabase/tests.
