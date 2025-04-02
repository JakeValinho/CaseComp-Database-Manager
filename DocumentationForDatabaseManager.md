# **CaseComp Admin Tool Documentation**

## **Chapter 1: Overview**

### **Project Description**

The CaseComp Admin Tool is a web-based interface designed to streamline the manual entry of case competition data into a structured PostgreSQL database hosted on Supabase. The interface supports rapid entry, foreign key resolution, inline validation, and smart AI-assisted field generation. It is intended for internal use only by administrators responsible for maintaining the competition database.

This tool replaces manual CSV uploads and inconsistent data entry with a controlled, reactive interface optimized for speed, data consistency, and extensibility.

### **Core Goals**

1. Enable manual entry and bulk pasting of structured competition data.  
2. Automate resolution of foreign key references (e.g., organizerId, universityId).  
3. Automatically populate trivial fields (e.g., createdAt, isConfirmed).  
4. Provide an inline spreadsheet-like interface for editing and reviewing parsed rows.  
5. Surface data validation errors clearly and allow one-by-one correction.  
6. Support OpenAI integration for smart field generation (e.g., summarizing descriptions).  
7. Upload and link images via Supabase storage (used for gallery and resources).  
8. Handle all data interactions client-side using Supabase SDK.

### **Feature Summary**

The tool includes the following primary features:

* Bulk pasting textarea that parses TSV/CSV into rows.  
* Editable preview table with inline validation.  
* Foreign key name matching logic (with warning surface).  
* Auto-fill for optional fields (createdAt, isConfirmed, etc.).  
* Error tab showing broken rows and field-level issues.  
* OpenAI-powered utility for shortening long descriptions.  
* Log of all submission attempts (inserted, skipped, failed).  
* Support for image uploads to Supabase storage.

### **Key Tables and Entities**

The admin tool focuses on managing the following tables:

* `competition`  
* `university`  
* `organizer`  
* `timelineevent`  
* `historyentry`  
* `competitionGalleryImage`  
* `resources`

Each of these tables is accessible via a separate admin page or interface route.

### **User Role Assumptions**

The application assumes the user is an authenticated administrator or maintainer with full insert/update/delete privileges on all tables. No user-facing access is expected. Supabase RLS (Row Level Security) should be disabled for admin data entry workflows, or bypassed using a service role key. No role or permission system is implemented on the client.

This tool should never be exposed to public users.

---

## **Chapter 2: Architecture & Setup**

### **Tech Stack**

* React with TypeScript (UI framework)  
* Tailwind CSS or ShadCN (UI styling components)  
* Supabase client (`@supabase/supabase-js`) for all database interactions  
* OpenAI API (via `openai` npm package) for smart field generation  
* Next.js routing for organizing page views

### **Folder and File Structure (npm project)**

casecomp-admin/  
├── pages/  
│   ├── index.tsx                    // Dashboard or landing view  
│   ├── competitions/bulk.tsx       // Competition bulk entry  
│   ├── universities/manage.tsx     // Manual university entry  
│   ├── timeline/manage.tsx         // Timeline event input  
│   ├── history/manage.tsx          // History entry management  
│   ├── gallery/manage.tsx          // Gallery image upload  
│   └── resources/manage.tsx        // Resource manager  
│  
├── components/  
│   ├── Navbar.tsx                  // Navigation bar  
│   ├── PasteTable.tsx              // Editable table UI  
│   └── ErrorList.tsx               // Row-level error feedback  
│  
├── lib/  
│   ├── supabase.ts                 // Supabase client initialization  
│   └── gpt.ts                      // GPT utility for OpenAI requests  
│  
├── public/  
├── styles/  
├── .env.local                      // Optional environment file  
├── package.json  
└── tsconfig.json

### **Supabase Configuration**

* Database: PostgreSQL via Supabase  
* All inserts/updates/deletes handled via the Supabase JavaScript client  
* Storage: Supabase Storage used for file uploads (e.g., gallery images)  
* Service Role Key: used securely only in admin-facing functions (not client-exposed)  
* Row Level Security: disabled during internal admin editing

### **Environment Configuration**

The tool expects a `.env.local` file containing:

NEXT\_PUBLIC\_SUPABASE\_URL=...  
NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY=...  
OPENAI\_API\_KEY=...

If `.env` is unavailable (such as on limited platforms), fallback modes are supported:

* OpenAI features will be disabled or mocked  
* Supabase will use hardcoded dev keys if enabled

### **Navigation Bar**

A persistent header navigation component should be rendered across all pages. Example links:

* `/competitions/bulk` → Bulk competition input  
* `/universities/manage` → University manager  
* `/organizers/manage` → Organizer list editor  
* `/timeline/manage` → Timeline events  
* `/history/manage` → History entries  
* `/gallery/manage` → Upload images  
* `/resources/manage` → Resource tools

Each page will read and write directly from the associated Supabase table using client SDK calls.

---

## **Chapter 3: Data Entry Flow**

### **Paste & Parse**

1. Admin pastes tab-separated or comma-separated data into a textarea input.  
2. Text is split into rows and cells using custom parsing logic.  
3. Parsed data is stored in local state and rendered in a table preview.  
4. Each row includes editable fields to allow corrections before saving.

### **Table Editing**

* A spreadsheet-like table (using `react-data-grid` or similar) is used for preview and editing.  
* Fields are validated client-side before submission.  
* FK fields like `universityId` and `organizerId` are editable by name and auto-resolved to IDs.

### **Field Auto-Fill**

The following fields are automatically populated if not provided:

* `createdAt`: set to current timestamp  
* `updatedAt`: set to current timestamp  
* `isConfirmed`: default to true  
* `isHostedByCaseComp`: default to false  
* `isFeatured`: default to false  
* `tags`: default to empty array

### **Validation and Logging**

* Each row is validated for required fields and correct types.  
* Type mismatches, missing fields, and failed FK lookups are logged.  
* Successful and failed rows are separated.  
* A `log[]` object tracks success/failure status and messages.

### **Error Tab**

* Rows with validation or submission errors are shown on a separate tab.  
* Each error shows the row and a list of field-specific issues.  
* Inline editing is enabled for fixing errors.  
* Once fixed, rows can be re-submitted using a "Retry Insert" button.

### **OpenAI Utilities**

* When a row’s `shortDescription` exceeds 50 characters, a “Fix” button calls GPT to summarize it.  
* Uses `/api/gpt-shorten` API route.  
* If OpenAI is disabled, this feature is hidden.

### **Submission Logic**

* Submits one row at a time to Supabase using the `insert()` function.  
* Foreign key fields are matched against cached Supabase lookups.  
* Missing FKs are reported in the error tab.  
* Image URLs (if required) must be uploaded first and then referenced.

## **Chapter 4: API Interactions & Automation**

### **1\. Supabase Client Integration**

All database operations (read, insert, update, delete) are performed using the `@supabase/supabase-js` client library from the browser.

Initialization is done in a shared client module, typically located in `lib/supabase.ts`.

ts  
CopyEdit  
`import { createClient } from '@supabase/supabase-js';`

`export const supabase = createClient(`  
  `process.env.NEXT_PUBLIC_SUPABASE_URL!,`  
  `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!`  
`);`

This client is imported into all admin pages and utility functions. Since Row-Level Security (RLS) is disabled for internal data entry, the anon key can be used during development and testing.

---

### **2\. Insert and Update Logic**

Each row is submitted independently using a call to `supabase.from(table).insert([row])`.

ts  
CopyEdit  
`const { data, error } = await supabase`  
  `.from('competition')`  
  `.insert([payload]);`

`if (error) {`  
  `logError(rowIndex, error.message);`  
`} else {`  
  `markAsInserted(rowIndex);`  
`}`

Bulk inserts (`insert([...])`) can be used, but to maximize error granularity and make correction easier, this system uses single-row inserts and tracks which rows failed.

All defaultable fields such as `createdAt`, `updatedAt`, `isConfirmed` should be appended in the payload client-side if they are not provided in the pasted data.

---

### **3\. Foreign Key Resolution**

The following fields require foreign key resolution before insertion:

* `competition.universityId`

* `competition.organizerId`

* `organizer.universityId`

* `organizationMember.userId`

* `competitionGalleryImage.competitionId`

* `resources.createdBy`

Foreign key values are resolved via helper functions that query Supabase using the name field (e.g., university name) and return the matching ID.

Example:

ts  
CopyEdit  
`async function resolveUniversityId(name: string) {`  
  `const { data } = await supabase`  
    `.from('university')`  
    `.select('id')`  
    `.ilike('name', name)`  
    `.single();`

  `return data?.id ?? null;`  
`}`

If a foreign key cannot be resolved, the row is flagged as an error and added to the correction tab.

---

### **4\. Logging**

A local `log[]` array stores insert attempts with metadata:

* Row index

* Status: `success`, `error`, or `skipped`

* Timestamp

* Error message (if applicable)

* Cleaned payload (for re-use)

This log is used to render:

* A success/failure summary

* The error correction tab

* Optionally exportable JSON for audit/debugging

---

### **5\. OpenAI Integration**

#### **Endpoint**

A custom API route is used for GPT-based text shortening:

css  
CopyEdit  
`POST /api/gpt-shorten`  
`Body: { longDescription: string }`  
`Response: { shortDescription: string }`

#### **Server Logic**

In `lib/gpt.ts`:

ts  
CopyEdit  
`import OpenAI from 'openai';`  
`const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });`

`export async function generateShortDescription(longDescription: string) {`  
  `const res = await openai.chat.completions.create({`  
    `model: 'gpt-3.5-turbo',`  
    `messages: [`  
      `{ role: 'system', content: 'Shorten this to under 50 words:' },`  
      `{ role: 'user', content: longDescription }`  
    `],`  
    `temperature: 0.5`  
  `});`

  `return res.choices[0].message.content.trim();`  
`}`

If `OPENAI_API_KEY` is not available, this route should return a 503 or mock result.

---

### **6\. Image Uploads**

Supabase Storage is used to handle image uploads for the following tables:

* `competitionGalleryImage`

* `resources` (optional: `imageUrl`, `bannerUrl`)

* `profile` (optional: `profilePictureUrl`)

#### **Upload Flow:**

1. File is selected in the client UI.

2. File is uploaded to Supabase Storage using `supabase.storage.from(bucket).upload(path, file)`.

3. A public URL is constructed and inserted as the field value.

ts  
CopyEdit  
`const { data, error } = await supabase`  
  `.storage`  
  `.from('gallery')`  
  ``.upload(`images/${uuidv4()}`, file);``

`const publicUrl = supabase.storage`  
  `.from('gallery')`  
  `.getPublicUrl(data.path).publicUrl;`

---

### **7\. Automation & Defaults**

When rows are submitted, the client app automatically fills these fields if not provided:

* `createdAt` \= `new Date()`

* `updatedAt` \= `new Date()`

* `isConfirmed` \= `true`

* `isHostedByCaseComp` \= `false`

* `isFeatured` \= `false`

* `tags` \= `[]` (empty array)

These defaults are set in the data mapping function before sending to Supabase.

---

### **8\. Error Correction Tab**

If any insert fails (e.g., due to invalid types or missing FK), the row is pushed into an `errorRows[]` array along with:

* The raw input

* Field-level validation results

* Original error message

The UI allows:

* Inline editing of error rows

* Retry submission of selected rows

* Real-time validation of changes

---

### **9\. Optional Enhancements**

* Retry all fixed rows in one click

* Export failed rows to JSON or CSV

* Re-run GPT summarization on edited long descriptions

* Add logging to Supabase `log` table (optional feature)

## **Chapter 5: Dataset Management Pages**

### **Competition Bulk Entry (`/competitions/bulk`)**

* Bulk paste area parses TSV or CSV data.  
* Grid view for review and editing.  
* Foreign key resolution for organizer and university.  
* OpenAI button to generate short descriptions.  
* Inline row errors and retry submission.  
* Logging of successful and failed inserts.

### **University Manager (`/universities/manage`)**

* View list of universities in tabular form.  
* Add or edit name, domain, logo URL, banner image.  
* Insert single or multiple universities at once.  
* Flag duplicates based on domain or short name.  
* Fields: `name`, `shortName`, `cities`, `country`, `emailDomain`, `logoUrl`, `websiteUrl`, `createdAt`.

### **Organizer Admin (`/organizers/manage`)**

* View and edit existing organizations.  
* Create new organizers tied to university IDs.  
* Select type from enum (`OrgType`).  
* Assign and manage organization members.  
* Upload logos and banners to storage and set URLs.

### **Timeline Event Manager (`/timeline/manage`)**

* Add, edit, and delete timeline events.  
* Events are tied to a specific `timelineId` from `competition`.  
* Preview full timeline on a per-competition basis.  
* Support for sorting events chronologically.

### **History Entry Manager (`/history/manage`)**

* Add entries for a given `historyId`.  
* Fields include: `date`, `title`, `description`, `sourceUrl`.  
* Sortable by date, grouped by competition.  
* Useful for tracking previous rounds, winners, or event changes.

### **Gallery Image Upload (`/gallery/manage`)**

* Drag-and-drop file uploader.  
* Preview uploaded images with timestamp and caption input.  
* On success, a Supabase Storage URL is generated and stored in `competitionGalleryImage`.  
* Images are tied to a single `competitionId`.

### **Resource Manager (`/resources/manage`)**

* Add articles, videos, decks, or external links.  
* Upload images or banners to storage.  
* Select type from enum (`ResourceType`).  
* Supports paid resources with price tracking.  
* Links saved resources to users via `savedResources` table.

---

Each section uses the same architecture pattern:

* Grid input → editable fields → Supabase SDK insert/update  
* Optional file upload with public URL assignment  
* Error tracking and retry option  
* GPT integration where applicable

This concludes the initial system documentation. Future chapters may be added for testing, deployment, or moderation systems as needed.

## **Appendix: Complete Database Schema**

// \================================  
// ENUMS  
// \================================

Enum OrgType {  
  UNIVERSITY  
  STUDENT\_CLUB  
  STUDENT\_ASSOCIATION  
  COMPANY  
  NON\_PROFIT  
  IN\_HOUSE  
}

Enum OrgRole {  
  FOUNDER  
  ADMIN  
  MANAGER  
  MEMBER  
}

Enum CompetitionFormat {  
  IN\_PERSON  
  VIRTUAL  
  HYBRID  
}

Enum NotificationType {  
  FRIENDS  
  COMPETITIONS  
  CLUBS  
}

Enum ResourceType {  
  VIDEO  
  ARTICLE  
  DECK  
  EXTERNAL\_LINK  
  OTHER  
}

Enum FriendStatus {  
  PENDING  
  ACCEPTED  
  REJECTED  
}

// \================================  
// USER & PROFILE  
// \================================

Table profile {  
  userId bigint \[pk\]  
  firstName varchar(200)  
  lastName varchar(200)  
  personalEmail text  
  phoneNumber int  
  dateOfBirth date  
  schoolRank text  
  universityId text  
  schoolEmail text  
  graduationYear int  
  major varchar(200)  
  city text  
  state text  
  country text  
  profilePictureUrl text  
  bannerPictureUrl text  
  bio varchar(10000)  
  friendCode text  
  isPrivate boolean  
  createdAt timestamp  
  updatedAt timestamp  
  hasCompletedOnboarding boolean  
}

Table notification {  
  id text \[pk\]  
  userId text  
  type NotificationType  
  title text  
  body text  
  link text  
  read boolean  
  createdAt timestamp  
  expiresAt timestamp  
}

// \================================  
// UNIVERSITY  
// \================================

Table university {  
  id text \[pk\]  
  name text  
  shortName text  
  cities text  
  state text  
  country text  
  description text  
  emailDomain text  
  logoUrl text  
  bannerImageUrl text  
  websiteUrl text  
  createdAt timestamp  
  updatedAt timestamp  
}

// \================================  
// ORGANIZATIONS & MEMBERS  
// \================================

Table organizer {  
  orgId text \[pk\]  
  orgName text  
  orgType OrgType  
  orgShortDescription text  
  orgLongDescription text  
  licenseId text  
  isUniversity boolean  
  universityId text  
  orgWebsiteUrl text  
  orgLogoUrl text  
  orgBannerUrl text  
  city text  
  state text  
  country text  
  createdAt timestamp  
  updatedAt timestamp  
}

Table organizationMember {  
  entryId text \[pk\]  
  userId text  
  orgId text  
  role OrgRole  
  createdAt timestamp  
  updatedAt timestamp  
}

Table license {  
  licenseId text  
  licensedTo text  
  activatedAt timestamp  
  expiresAt timestamp  
}

// \================================  
// COMPETITIONS  
// \================================

Table competition {  
  id text \[pk\]  
  title text  
  shortDescription varchar(50)  
  longDescription text  
  format CompetitionFormat  
  category text  
  tags text  
  prizeAmount float  
  shortPrizeInfo varchar(20)  
  longPrizeInfo text  
  registrationFee float  
  registrationInfo text  
  eligibilityInfo text  
  isInternal boolean  
  isFeatured boolean  
  isHostedByCaseComp boolean  
  isConfirmed boolean  
  lastDayToRegister text  
  city text  
  state text  
  country text  
  websiteUrl text  
  competitionImageUrl text  
  teamSizeMin int  
  teamSizeMax int  
  universityId text  
  organizerId text  
  timelineId text  
  historyId text  
  createdAt timestamp  
  updatedAt timestamp  
}

Table multipleOrganizers {  
  id text \[pk\]  
  competitionId text  
  organizerId text  
}

Table competitionGalleryImage {  
  id text \[pk\]  
  competitionId text  
  imageUrl text  
  caption text  
  dateTaken timestamp  
  createdAt timestamp  
}

Table competitionTestimonial {  
  id text \[pk\]  
  competitionId text  
  userId text  
  body text  
  testimonialImageUrl text  
  isApproved boolean  
  createdAt timestamp  
  updatedAt timestamp  
}

// \================================  
// REGISTRATIONS & SUBMISSIONS  
// \================================

Table competitionRegistration {  
  id text \[pk\]  
  userId text  
  competitionId text  
  paid boolean  
  registeredAt timestamp  
}

Table competitionSubmission {  
  id text \[pk\]  
  userId text  
  competitionId text  
  notes text  
  submissionUrl text  
  submittedAt timestamp  
}

Table savedcompetition {  
  id text \[pk\]  
  userId text  
  competitionId text  
  createdAt timestamp  
}

// \================================  
// TIMELINE & HISTORY  
// \================================

Table timeline {  
  id text \[pk\]  
  createdAt timestamp  
  updatedAt timestamp  
}

Table timelineevent {  
  id text \[pk\]  
  timelineId text  
  name text  
  date timestamp  
  description text  
  createdAt timestamp  
  updatedAt timestamp  
}

Table history {  
  id text \[pk\]  
  createdAt timestamp  
  updatedAt timestamp  
}

Table historyentry {  
  id text \[pk\]  
  historyId text  
  date timestamp  
  title text  
  description text  
  sourceUrl text  
  createdAt timestamp  
  updatedAt timestamp  
}

// \================================  
// AUTHENTICATION (NextAuth)  
// \================================

Table account {  
  id text \[pk\]  
  userId text  
  type text  
  provider text  
  providerAccountId text  
  refresh\_token text  
  access\_token text  
  expires\_at int  
  token\_type text  
  scope text  
  id\_token text  
  session\_state text  
}

Table session {  
  id text \[pk\]  
  sessionToken text  
  userId text  
  expires timestamp  
}

Table verificationtoken {  
  identifier text \[pk\]  
  token text  
  expires timestamp  
}

Table \_prisma\_migrations {  
  id varchar \[pk\]  
  checksum varchar  
  finished\_at timestamp  
  migration\_name varchar  
  logs text  
  rolled\_back\_at timestamp  
  started\_at timestamp  
  applied\_steps\_count int  
}

// \================================  
// RESOURCES  
// \================================

Table resources {  
  resourceId bigint \[pk\]  
  title text  
  shortDescription text  
  longDescription text  
  imageUrl text  
  bannerUrl text  
  websiteUrl text  
  type ResourceType  
  isPaid boolean  
  price float  
  createdBy text  
  createdAt timestamp  
  updatedAt timestamp  
}

Table savedResources {  
  savedResourcesId bigint \[pk\]  
  userId bigint  
  resourceId bigint  
  createdAt timestamp  
}

// \================================  
// FRIENDSHIP  
// \================================

Table friendship {  
  id text \[pk\]  
  requesterId text  
  addresseeId text  
  status FriendStatus  
  createdAt timestamp  
}

// \================================  
// RELATIONSHIPS  
// \================================

Ref: profile.universityId \> university.id  
Ref: competition.organizerId \> organizer.orgId  
Ref: competition.timelineId \> timeline.id  
Ref: competition.historyId \> history.id  
Ref: multipleOrganizers.competitionId \> competition.id  
Ref: multipleOrganizers.organizerId \> organizer.orgId  
Ref: competitionRegistration.userId \> profile.userId  
Ref: competitionRegistration.competitionId \> competition.id  
Ref: competitionSubmission.userId \> profile.userId  
Ref: competitionSubmission.competitionId \> competition.id  
Ref: savedcompetition.userId \> profile.userId  
Ref: savedcompetition.competitionId \> competition.id  
Ref: timelineevent.timelineId \> timeline.id  
Ref: historyentry.historyId \> history.id  
Ref: account.userId \> profile.userId  
Ref: session.userId \> profile.userId  
Ref: savedResources.userId \> profile.userId  
Ref: savedResources.resourceId \> resources.resourceId  
Ref: organizationMember.orgId \> organizer.orgId  
Ref: organizationMember.userId \> profile.userId  
Ref: friendship.requesterId \> profile.userId  
Ref: friendship.addresseeId \> profile.userId  
Ref: competition.universityId \> university.id  
Ref: organizer.universityId \> university.id  
Ref: notification.userId \> profile.userId  
Ref: competitionGalleryImage.competitionId \> competition.id  
Ref: competitionTestimonial.competitionId \> competition.id  
Ref: competitionTestimonial.userId \> profile.userId  
Ref: license.licenseId \> organizer.licenseId  
