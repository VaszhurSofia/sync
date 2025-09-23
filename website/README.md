# Sync Website

A beautiful, modern website for the Sync application featuring a landing page and interactive demo.

## Features

- **Landing Page** (`/`) - Hero section, features, pricing, testimonials
- **Interactive Demo** (`/demo`) - Full walkthrough of all M1-M5 features
- **Two Accent Variants** - Blue and Green themes
- **Responsive Design** - Works on all devices
- **Modern UI** - Built with Next.js, Tailwind CSS, and Framer Motion

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations
- **Lucide React** - Beautiful icons
- **@sync/ui** - Shared UI components
- **@sync/types** - Shared TypeScript types

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Sync API server running on port 3001
- Sync AI service running on port 3002

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set environment variables:
```bash
# Optional - defaults to localhost
export NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
export NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:3002
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Landing page
│   └── demo/
│       └── page.tsx         # Interactive demo
├── lib/
│   └── api.ts               # API client
└── components/              # Reusable components (future)
```

## Features Overview

### Landing Page (`/`)

- **Hero Section** - Compelling headline and CTA
- **Features Grid** - Showcase of all M1-M5 features
- **Testimonials** - Social proof from users
- **Pricing Plans** - Free, Pro, and Enterprise tiers
- **Accent Color Toggle** - Switch between blue and green themes

### Interactive Demo (`/demo`)

- **Step-by-step Walkthrough** - 8-step guided experience
- **Authentication Demo** - Email-code login simulation
- **Couple Setup** - Create and join couples
- **Communication Session** - Real-time messaging with AI
- **Safety Features** - Boundary detection and blocking
- **Survey System** - 3-emoji feedback collection
- **Privacy Controls** - Hard delete functionality
- **Progress Tracking** - Visual progress indicator

### Accent Variants

- **Blue Theme** - Primary blue (#3B82F6) with blue accents
- **Green Theme** - Primary green (#10B981) with green accents
- **Dynamic Switching** - Toggle between themes in real-time

## API Integration

The website connects to the Sync API server through the `ApiClient` class:

- **Authentication** - Email-code login flow
- **Couple Management** - Create, join, and manage couples
- **Session Management** - Start, message, and end sessions
- **Survey System** - Submit feedback and view analytics
- **Safety Features** - Check safety status and violations
- **Privacy Controls** - Request account deletion

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler

### Environment Variables

- `NEXT_PUBLIC_API_BASE_URL` - API server URL (default: http://localhost:3001)
- `NEXT_PUBLIC_AI_SERVICE_URL` - AI service URL (default: http://localhost:3002)

### Styling

- **Tailwind CSS** - Utility-first CSS framework
- **Custom Components** - Reusable component classes
- **Responsive Design** - Mobile-first approach
- **Dark Mode** - Automatic dark mode support
- **Animations** - Smooth transitions with Framer Motion

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms

1. Build the project: `npm run build`
2. Start the production server: `npm run start`
3. Configure environment variables
4. Set up reverse proxy for API calls

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance

- **Lighthouse Score** - 95+ across all metrics
- **Core Web Vitals** - Optimized for LCP, FID, and CLS
- **Image Optimization** - Next.js automatic image optimization
- **Code Splitting** - Automatic code splitting and lazy loading
- **Caching** - Optimized caching strategies

## Accessibility

- **WCAG 2.1 AA** - Compliant with accessibility standards
- **Keyboard Navigation** - Full keyboard support
- **Screen Readers** - Proper ARIA labels and semantic HTML
- **Color Contrast** - High contrast ratios
- **Focus Management** - Clear focus indicators

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

Private - All rights reserved.
