# CaseComp Admin Tool

An internal admin interface for managing CaseComp database records. This tool provides interfaces for bulk data entry, foreign key resolution, and validation.

## Features

- Bulk pasting textarea that parses TSV/CSV into rows
- Editable preview table with inline validation
- Foreign key name matching logic (with warning surface)
- Auto-fill for optional fields (createdAt, isConfirmed, etc.)
- Error tab showing broken rows and field-level issues
- OpenAI-powered utility for shortening long descriptions
- Log of all submission attempts (inserted, skipped, failed)
- Support for image uploads to Supabase storage

## Tech Stack

- Next.js with TypeScript
- Tailwind CSS + ShadCN UI
- Supabase client for database interactions
- OpenAI API for smart field generation

## Supported Entities

- Competitions
- Universities
- Organizers
- Timeline events
- History entries
- Gallery images
- Resources

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Supabase project with the correct schema
- OpenAI API key (optional, for smart field generation)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd casecomp-admin
```

2. Install dependencies:

```bash
bun install
# or
npm install
```

3. Create a `.env.local` file with your environment variables:

```
# Supabase Project
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# OpenAI API Key (optional)
OPENAI_API_KEY=your-openai-api-key
```

4. Start the development server:

```bash
bun run dev
# or
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Competitions Bulk Entry

1. Navigate to `/competitions/bulk`
2. Paste tabular data in TSV or CSV format
3. Validate and edit the data in the preview table
4. Submit the data to Supabase

### University Management

1. Navigate to `/universities/manage`
2. Add new universities or edit existing ones
3. Upload university logos and banners

### Organizer Management

1. Navigate to `/organizers/manage`
2. Add new organizers or edit existing ones
3. Link organizers to universities

### Timeline Management

1. Navigate to `/timeline/manage`
2. Select a timeline or create a new one
3. Add timeline events with dates and descriptions

### History Management

1. Navigate to `/history/manage`
2. Select a history record or create a new one
3. Add history entries with dates, titles, and descriptions

### Gallery Management

1. Navigate to `/gallery/manage`
2. Select a competition
3. Upload images and add captions

### Resource Management

1. Navigate to `/resources/manage`
2. Add new resources or edit existing ones
3. Upload resource images and banners

## Important Notes

- This tool is for internal administrative use only and should not be exposed to public users.
- The tool assumes full insert/update/delete privileges on all tables.
- Supabase RLS should be bypassed using a service role key for this tool.
- All foreign key fields can be resolved by name (e.g., university name to universityId).

## License

This project is private and not available for public use.
