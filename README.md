# Job Search Assistant

A secure, local-first desktop application that assists with job searching in real-time without scraping or violating platform Terms of Service.

## Features

- **Real-time Job Detection**: Monitor clipboard and active windows to detect job postings
- **Smart Matching**: AI-powered resume-to-job matching with detailed scoring
- **Resume Optimization**: Automatically tailor resumes for each job with ATS keyword insertion
- **Cover Letter Generation**: AI-powered, fully customized cover letters
- **Application Tracking**: Complete pipeline management with follow-up reminders
- **Privacy-First**: All data stored locally with encryption

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Package for distribution
npm run package
```

## Tech Stack

- **Desktop**: Electron 28+
- **Frontend**: React 18+ with TypeScript, Tailwind CSS
- **Backend**: Node.js 20+ with TypeScript
- **Database**: SQLite3
- **AI/ML**: Local embeddings (@xenova/transformers), optional OpenAI/Anthropic

## Documentation

- [Architecture](./ARCHITECTURE.md) - System design and components
- [Database Schema](./DATABASE_SCHEMA.md) - Data models and relationships
- [Matching Algorithm](./MATCHING_ALGORITHM.md) - Resume scoring system
- [Cover Letter Generator](./COVER_LETTER_GENERATOR.md) - AI prompt templates
- [Development Roadmap](./ROADMAP.md) - MVP milestones
- [Legal Compliance](./COMPLIANCE.md) - Privacy and TOS guidelines

## Project Structure

```
job-search-tool/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts
│   │   ├── database/
│   │   ├── services/
│   │   └── utils/
│   ├── renderer/          # React frontend
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── styles/
│   └── shared/            # Shared types and constants
├── docs/                  # Documentation
├── migrations/            # Database migrations
└── resources/             # Icons, assets
```

## Security & Privacy

- ✅ All data stored locally
- ✅ AES-256 encryption for sensitive data
- ✅ No cloud sync or telemetry
- ✅ No platform credentials required
- ✅ Explicit consent for all features

## License

MIT

## Contributing

This is a local-first tool respecting job platform Terms of Service. Contributions that maintain these principles are welcome.
