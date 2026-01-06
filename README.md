# SBA Underwriting AI Portal

A production-ready AI-powered underwriting portal for SBA loan applications. Upload documents, run analysis, and get comprehensive underwriting recommendations.

![SBA Portal](https://img.shields.io/badge/SBA-Underwriting%20AI-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)
![Prisma](https://img.shields.io/badge/Prisma-5-2d3748)

## Features

- 📋 **Deal Management** - Create and manage loan applications
- 📁 **Document Center** - Upload and organize underwriting documents with drag & drop
- 🤖 **AI Analysis** - Get comprehensive underwriting recommendations powered by OpenAI
- 📊 **Smart Insights** - View extracted metrics, strengths, risks, and conditions
- 📝 **Activity Timeline** - Track all changes and analysis runs
- 🎨 **Modern UI** - Beautiful dark theme with smooth animations

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS + Framer Motion
- **Backend**: Vercel Serverless Functions
- **Database**: PostgreSQL (Neon.tech) + Prisma ORM
- **AI**: OpenAI GPT-4o (with mock fallback)
- **Storage**: Local filesystem / Vercel Blob

## Prerequisites

- Node.js 18+
- npm or pnpm
- PostgreSQL database (we recommend [Neon.tech](https://neon.tech))
- OpenAI API key (optional - mock responses available)

## Quick Start

### 1. Clone and Install

```bash
git clone <repo-url>
cd sba-underwriting-portal
npm install
```

### 2. Configure Environment

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Required: Neon Postgres connection string
DATABASE_URL="postgresql://user:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Optional: OpenAI API key (mock responses if not set)
OPENAI_API_KEY="sk-..."

# Storage: "local" for dev, "vercel-blob" for production
STORAGE_DRIVER="local"
```

### 3. Set Up Database

Generate Prisma client and push schema:

```bash
npm run db:generate
npm run db:push
```

Optionally seed with demo data:

```bash
npm run db:seed
```

### 4. Run Development Server

```bash
npm run dev
```

This starts:
- Frontend: http://localhost:5173
- API: http://localhost:3001

### 5. Open the App

Navigate to http://localhost:5173 and start creating deals!

## Project Structure

```
sba-underwriting-portal/
├── api/                    # Vercel Serverless Functions
│   ├── _lib/              # Shared utilities
│   │   ├── db.ts          # Prisma client
│   │   ├── storage.ts     # File storage abstraction
│   │   ├── pdf-parser.ts  # PDF text extraction
│   │   ├── openai-service.ts  # AI analysis
│   │   └── validation.ts  # Zod schemas
│   ├── deals/             # Deal endpoints
│   │   ├── index.ts       # GET/POST /api/deals
│   │   └── [id]/
│   │       ├── index.ts   # GET/PUT/DELETE /api/deals/:id
│   │       ├── documents.ts   # Document uploads
│   │       └── analyze.ts     # Run analysis
│   └── documents/
│       └── [id]/
│           ├── index.ts   # GET/DELETE document
│           └── parse.ts   # Parse PDF to text
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Demo data seeder
├── src/
│   ├── components/        # React components
│   ├── pages/             # Page components
│   ├── lib/               # Utilities
│   └── types/             # TypeScript types
├── public/                # Static assets
└── package.json
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/deals` | List all deals |
| POST | `/api/deals` | Create new deal |
| GET | `/api/deals/:id` | Get deal details |
| PUT | `/api/deals/:id` | Update deal |
| DELETE | `/api/deals/:id` | Delete deal |
| GET | `/api/deals/:id/documents` | List documents |
| POST | `/api/deals/:id/documents` | Upload document |
| POST | `/api/deals/:id/analyze` | Run AI analysis |
| GET | `/api/documents/:id` | Get document details |
| DELETE | `/api/documents/:id` | Delete document |
| POST | `/api/documents/:id/parse` | Parse PDF to text |

## Document Types

The system expects these document types for SBA underwriting:

| Required | Document Type |
|----------|--------------|
| ✅ | Borrower Intake Summary |
| ✅ | Personal Financial Statement |
| ✅ | Business Financial Statements |
| ✅ | Business Tax Returns |
| ✅ | Personal Tax Returns |
| ✅ | Business Debt Schedule |
| ✅ | Bank Statements |
| ❌ | AR/AP Aging Reports |
| ❌ | Business Plan / Executive Summary |
| ❌ | Collateral / UCC / Insurance |
| ❌ | Entity & Legal Documents |
| ❌ | Project Costs & Quotes |

## AI Analysis

The AI analysis provides:

- **Recommendation**: Proceed / Proceed with conditions / Hold / Decline
- **Confidence Score**: 0-100%
- **Key Highlights**: Extracted financial metrics
- **Strengths**: Positive indicators with evidence
- **Risks**: Concerns with severity levels
- **Open Questions**: Items needing clarification
- **Missing Documents**: Required docs not uploaded
- **Conditions**: Requirements for approval

### Mock Mode

If `OPENAI_API_KEY` is not set, the system generates realistic mock responses for testing. This allows you to develop and test the full flow without API costs.

## Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com) and import your repo
2. Add environment variables:
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
   - `STORAGE_DRIVER=vercel-blob`
   - `BLOB_READ_WRITE_TOKEN`

3. Deploy!

### 3. Run Migrations

After deployment, run migrations:

```bash
npx vercel env pull .env.production
DATABASE_URL=<production-url> npx prisma db push
```

## Development

### Available Scripts

```bash
npm run dev          # Start dev server (frontend + API)
npm run dev:client   # Start frontend only
npm run dev:api      # Start API only
npm run build        # Build for production
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run migrations
npm run db:seed      # Seed demo data
npm run db:studio    # Open Prisma Studio
```

### Database Management

View and edit data with Prisma Studio:

```bash
npm run db:studio
```

## Security Notes

- Only PDF uploads are accepted (validated by MIME type)
- Maximum file size: 20MB
- Filenames are sanitized before storage
- No authentication yet (single-user mode)

## Roadmap

- [ ] User authentication
- [ ] Multi-tenant support
- [ ] PDF export of analysis
- [ ] Email notifications
- [ ] Document OCR for scanned PDFs
- [ ] Batch document upload
- [ ] Analysis comparison

## License

MIT

---

Built with ❤️ for SBA lenders

