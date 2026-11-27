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

## Teacher portal

The MUC portal uses Supabase email magic links. Apply the migration in supabase/migrations, add the verified trainer email in lowercase to public.muc_trainers, and set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local or the build environment. Use the publishable key. Set the Supabase Auth site URL and redirect allowlist to the application address. Configure custom SMTP for teachers outside the Supabase organization before testing email delivery.

Trainer drafts and history are stored in the current browser. From Evaluation History, select Share with Teacher to publish a read-only copy for the specified email address. Evaluator notes are shared only when selected. Local changes take effect in the teacher portal when the trainer updates sharing. Remove access to revoke the shared copy. SQL checks for teacher isolation and revocation are in supabase/tests/teacher_access.sql.
