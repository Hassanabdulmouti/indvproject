# MoveOut Application

A modern Next.js web application designed to help users organize and label moving boxes with QR codes, built with Next.js and Firebase.

## Getting Started

### Prerequisites

- Node.js (latest LTS version)
- npm, yarn, pnpm, or bun
- Firebase CLI
```bash
npm install -g firebase-tools
```

### Installation

1. Clone the repository
```bash
git clone [repository-url]
cd indvproj
```

2. Install dependencies
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. Set up environment variables by creating a `.env.local` file:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### Development Server

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Development

- Pages can be edited by modifying files in the `app` directory
- The application will auto-update as you save files
- This project uses `next/font` to automatically optimize and load Geist, a custom font family

## Tech Stack

- **Framework**: Next.js 14+ with TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Storage**: Firebase Storage
- **Hosting**: Firebase Hosting
- **Functions**: Firebase Cloud Functions

## Project Structure

```
indvproj/
├── app/
│   ├── (authenticated)/       # Protected routes
│   │   ├── admin/            # Admin dashboard
│   │   ├── dashboard/        # Main user dashboard
│   │   └── profile/          # User profile
│   ├── auth/                 # Authentication routes
│   ├── box/                  # Box management
│   └── label/               # Label management
├── components/
│   ├── ui/                  # shadcn/ui components
│   └── dashboard/           # Dashboard specific components
├── firebase/                # Firebase configuration
├── functions/              # Firebase Cloud Functions
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions
└── public/               # Static assets
```

## Features

### Core Functionality
- User authentication with email verification
- Box management with QR code generation
- Content recording in multiple formats (text, audio, images)
- Real-time updates and sharing
- Insurance label management

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs) - Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - Interactive Next.js tutorial
- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

Moveout project is released under [Commons Clause License Condition v1.0](https://commonsclause.com/), which allows for modification and distribution only for personal purposes.
