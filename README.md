# ICAR DSRE Project Information Portal

A responsive GitHub Pages form for collecting project information from scientists of the **Division of System Research and Engineering, ICAR Research Complex for NEH Region, Umiam, Meghalaya**.

## What the portal does

- Collects scientist name, designation and optional contact details.
- Allows users to add **unlimited projects**.
- Allows users to add **unlimited Co-Principal Investigators** for every project.
- Provides PI/Co-PI role selection and requests the PI name when the respondent is a Co-PI.
- Captures funding agency, project category, status, dates and remarks.
- Saves all submissions in a central Supabase database.
- Lets each respondent download an individual `.docx` copy.
- Provides a password-protected administrator dashboard.
- Lets the administrator search records and download an updated consolidated Word file at any time.

## Important architecture note

GitHub Pages hosts static HTML, CSS and JavaScript. It cannot safely modify a central Word file inside your GitHub repository whenever a visitor submits the form. This project therefore uses:

1. **GitHub Pages** for the public interface and administrator page.
2. **Supabase** for centralized data storage and administrator authentication.
3. **docx.js** in the browser to generate the Microsoft Word file on demand.

The Word file is generated from the latest stored submissions whenever the administrator clicks **Download Word File**.

## Files

```text
index.html              Public project submission form
admin.html              Administrator login and dashboard
styles.css              Responsive interface design
app.js                  Public form logic and submission
admin.js                Administrator dashboard logic
word-export.js          Individual and consolidated Word generation
config.js               Supabase browser configuration
supabase-setup.sql      Database table and security policies
.nojekyll               Prevents GitHub Pages from applying Jekyll processing
```

## Step 1: Create a Supabase project

1. Create a free Supabase account and a new project.
2. Open **SQL Editor** in the project dashboard.
3. Open `supabase-setup.sql` from this repository.
4. Replace:

```sql
YOUR_ADMIN_EMAIL@EXAMPLE.COM
```

with your actual administrator email address.

5. Run the complete SQL script.

The script enables Row Level Security so the public form can only insert records. Public visitors cannot read existing submissions. Only the authorized authenticated administrator email can read them.

## Step 2: Create the administrator login

1. In Supabase, open **Authentication → Users**.
2. Add a user with the same email used in `supabase-setup.sql`.
3. Set a strong password and mark the email as confirmed when creating the user.
4. Do not create public sign-up controls in this website.

## Step 3: Connect the website to Supabase

1. In Supabase, open the project API settings.
2. Copy the **Project URL**.
3. Copy the **Publishable key** or legacy **anon key**.
4. Open `config.js` and replace the two placeholder values:

```js
export const APP_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_PUBLISHABLE_OR_ANON_KEY",
  TABLE_NAME: "project_submissions",
};
```

### Security warning

The browser configuration must contain only the Supabase publishable/anon key. **Never put a secret key or service_role key in GitHub, HTML or JavaScript.** The public key is protected by the Row Level Security policies created by `supabase-setup.sql`.

## Step 4: Upload to GitHub

1. Create a new GitHub repository, for example:

```text
icar-project-information-portal
```

2. Upload all files from this folder to the root of the repository.
3. Commit the files to the `main` branch.
4. Open **Repository Settings → Pages**.
5. Under **Build and deployment**, choose:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/(root)**
6. Save and wait for GitHub Pages deployment to complete.
7. Enable **Enforce HTTPS** when available.

The public link will normally be:

```text
https://YOUR-GITHUB-USERNAME.github.io/icar-project-information-portal/
```

The administrator page will be:

```text
https://YOUR-GITHUB-USERNAME.github.io/icar-project-information-portal/admin.html
```

## Daily use

### For scientists

1. Open the public GitHub Pages link.
2. Enter scientist details.
3. Add one or more projects.
4. Add any number of Co-PIs under each project.
5. Click **Submit Project Information**.
6. Optionally click **Download My Word Copy** for personal records.

### For the administrator

1. Open `admin.html` through the GitHub Pages URL.
2. Sign in using the Supabase administrator email and password.
3. Review or search the submitted records.
4. Click **Download Word File**.
5. A current consolidated `.docx` file will be generated using all visible records. When a search filter is active, the Word file contains the filtered records only.

## Testing before circulation

- Submit one test response from the public form.
- Confirm that the success message appears.
- Sign in on the administrator page.
- Confirm that the test record appears.
- Download the consolidated Word file and open it in Microsoft Word.
- After successful testing, remove the test row directly from the Supabase Table Editor if required.

## Optional future improvements

- Add Cloudflare Turnstile or another CAPTCHA to reduce automated spam.
- Add an official ICAR logo file after confirming permitted usage.
- Add an administrator-only delete or correction workflow.
- Add Excel export and summary charts.
- Restrict submissions to a specified closing date.
