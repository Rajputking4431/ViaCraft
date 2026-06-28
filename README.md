# ViaCraft — Premium Resin Art & Keepsakes Marketplace

ViaCraft is a professional, multi-vendor marketplace built with **React**, **TypeScript**, **TanStack Start**, **Supabase**, and **Cloudinary**. The application supports vendor dashboards, admin control centers, customer shopping experiences, customized preservation order tracking, review systems, and automated email notifications.

---

## 📂 Project Structure

The project follows a clean, decoupled architecture to ensure readability, scalability, and security:

```text
├── public/                 # Static assets (favicons, manifest, robots.txt)
├── src/
│   ├── api/                # Database queries and Server Functions (TanStack createServerFn)
│   ├── assets/             # Bundled application images and logos
│   ├── components/         # Reusable React components
│   │   ├── home/           # Landing page elements
│   │   ├── shipping/       # Shipping vendor panels
│   │   └── ui/             # Radix primitives and shared buttons/modals
│   ├── config/             # Environment and server-only configurations
│   ├── contexts/           # Shared React Contexts (AuthContext, NotificationsContext)
│   ├── hooks/              # Custom React hooks (useAuth, useNotifications, useMobile, useAdmin)
│   ├── layouts/            # Reusable page layouts and wrappers (PageShell)
│   ├── services/           # Third-party integrations (Cloudinary, Resend, Google Analytics, Microsoft Clarity)
│   ├── utils/              # Utility formatting, error handling, and Tailwind helpers
│   ├── routes/             # TanStack Start File-based routing pages
│   ├── integrations/       # Database client initialization (Supabase)
│   ├── router.tsx          # TanStack Router instance creation
│   └── start.ts            # Client entrypoint
└── tsconfig.json           # TypeScript compilation configurations
```

---

## 🔐 Environment Variables Configuration

Copy `.env.example` to `.env` and fill in the parameters:

```bash
cp .env.example .env
```

| Variable | Description | Scope |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | The public endpoint of your Supabase project. | Client & Server |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anonymous public API key. | Client & Server |
| `VITE_SUPABASE_PROJECT_ID` | Your Supabase project unique identifier. | Client & Server |
| `SUPABASE_URL` | Server-side private URL for SupabaseAdmin connection. | Server-only |
| `SUPABASE_SERVICE_ROLE_KEY` | Private Supabase key bypassing RLS (Bypasses Row Level Security). Keep secret! | Server-only |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary storage space Cloud name. | Client & Server |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Cloudinary unsigned upload preset name. | Client & Server |
| `RESEND_API_KEY` | Resend API key for automated emails (e.g. order confirmation, vendor status). | Server-only |
| `VITE_CLARITY_ID` | Microsoft Clarity analytics tracker key (Optional). | Client & Server |

---

## 🛠️ Scripts & Local Development

Install dependencies:
```bash
npm install
```

### Run Local Development Server
Starts the Vite dev server with Hot Module Replacement (HMR):
```bash
npm run dev
```

### Build for Production
Compiles the client bundle, runs TypeScript diagnostic checks, and compiles the Nitro SSR server bundle into `dist/`:
```bash
npm run build
```

### Preview Production Build locally
Runs a local server to preview the built application:
```bash
npm run preview
```

### Linting & Formatting
Lints files and formats code styles using ESLint and Prettier:
```bash
npm run lint
npm run format
```

---

## 🚀 Production Deployment Guide

ViaCraft uses TanStack Start, which builds a universal SSR application compiled on top of the **Nitro** server engine. Nitro supports multiple target presets (Vercel, Netlify, Cloudflare Workers, Node.js, etc.) and auto-detects them at build time based on environment flags.

### 🔺 Deploying to Vercel
1. Connect your repository to Vercel.
2. The deployment framework will auto-detect **Vite / TanStack Start**.
3. In **Project Settings**:
   - **Framework Preset**: TanStack Start (or Nitro)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/client`
4. Add all environment variables listed in `.env.example` in Vercel's **Environment Variables** tab.
5. Trigger a deployment. Vercel will launch your app using Vercel Serverless Functions.

### 🛜 Deploying to Netlify
1. Connect your repository to Netlify.
2. In **Build Settings**:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist/client`
3. Add environment variables in Netlify's **Site Configuration > Environment Variables** menu.
4. Nitro will automatically compile the server endpoints into Netlify Edge Functions.

### 🌐 Custom Domain & SPA Routing Fallbacks
If you choose to deploy ViaCraft as a purely static Single Page Application (SPA), ensure you configure routing redirects so deep links resolve correctly:
- **Netlify**: Create a `public/_redirects` file with:
  ```text
  /*    /index.html   200
  ```
- **Vercel**: In `vercel.json` add rewrite configurations:
  ```json
  {
    "rewrites": [
      { "source": "/(.*)", "destination": "/" }
    ]
  }
  ```
*(Note: TanStack Start SSR manages dynamic route resolutions natively at server-time under standard Nitro configurations).*
