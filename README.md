# Turborepo starter

This Turborepo starter is maintained by the Turborepo core team.

# Expected File Structure

smartcare-pasum/
├── .github/
│   └── workflows/                # CI/CD pipelines (Vercel deployment, Docker builds)
├── apps/
│   ├── web/                      # React.js & Next.js 14+ Web Application[cite: 4]
│   │   ├── app/                  # Next.js App Router (Tailwind v4 Optimized)[cite: 4]
│   │   │   ├── dashboard/        
│   │   │   │   └── page.tsx      # Bento Box metrics dashboard[cite: 4]
│   │   │   ├── globals.css       # Tailwind `@import "tailwindcss";` layer[cite: 4]
│   │   │   ├── layout.tsx        # Persistent shell injection layout[cite: 4]
│   │   │   └── page.tsx          # Actionable landing/home view layout[cite: 4]
│   │   ├── components/           
│   │   │   └── sidebar.tsx       # Shared client side navigation layout[cite: 4]
│   │   ├── package.json          # React, Next, PostCSS dependencies[cite: 4]
│   │   └── postcss.config.mjs    # Tailwind v4 compiler link[cite: 4]
│   │
│   ├── mobile-android/           # Native Kotlin Mobile Sub-Workspace
│   │   ├── app/                  # Jetpack Compose UI architecture views
│   │   │   └── src/main/java/    # Attendance 3-factor location/camera services
│   │   └── build.gradle.kts      
│   │
│   └── mobile-ios/               # Native Swift Mobile Sub-Workspace
│       ├── SmartCarePASUM/       # SwiftUI presentation views & models
│       └── SmartCarePASUM.xcodeproj
│
├── packages/                     # Turborepo Shared Packages[cite: 4]
│   ├── ui/                       # Core shared cross-app design tokens[cite: 4]
│   ├── config/                   # Centralized ESLint & Prettier matrices[cite: 4]
│   └── types/                    # Shared TypeScript interfaces (Supabase mappings)[cite: 4]
│
├── services/                     
│   ├── ai-engine/                # Python FastAPI Microservice[cite: 4]
│   │   ├── api/                  # Core routes (risk clustering, anomaly triggers)[cite: 4]
│   │   ├── core/                 # Rule-based processing scripts & LLM modules[cite: 4]
│   │   ├── main.py               # FastAPI entrypoint initialization
│   │   ├── requirements.txt      # Python library dependencies[cite: 4]
│   │   └── Dockerfile            # Container definition script for Exabytes[cite: 4]
│   │
│   ├── automation/               # Workflow Automation Layer[cite: 4]
│   │   ├── workflows/            # Exported n8n alert routine JSON maps[cite: 4]
│   │   └── redis.conf            # Local configuration map cache mirror
│   │
│   └── cache/                    # Local Redis Environment Mirror
│       └── Dockerfile            # Configured cluster image for authentication caching
│
├── supabase/                     # Backend-as-a-Service layer[cite: 4]
│   ├── migrations/               # PostgreSQL schema structure files[cite: 4]
│   ├── seed.sql                  # Evaluation risk tracking mockup data[cite: 4]
│   └── config.toml               # Local DB engine configuration limits[cite: 4]
│
├── .env.example                  # Key structural templates (Upstash, Supabase, LLMs)[cite: 4]
├── docker-compose.yml            # Multi-container operational stack mapper
├── turbo.json                    # Turborepo caching execution model[cite: 4]
├── package.json                  # Workspace monorepo root settings[cite: 4]
└── README.md                     # Documentation for developers and UMSDC[cite: 4]

## Using this example

Run the following command:

```sh
npx create-turbo@latest
```

## What's inside?

This Turborepo includes the following packages/apps:

### Apps and Packages

- `docs`: a [Next.js](https://nextjs.org/) app
- `web`: another [Next.js](https://nextjs.org/) app
- `@repo/ui`: a stub React component library shared by both `web` and `docs` applications
- `@repo/eslint-config`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `@repo/typescript-config`: `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo build
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo build
npm dlx turbo build
npm exec turbo build
```

You can build a specific package by using a [filter](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters):

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo build --filter=docs
```

Without global `turbo`:

```sh
npx turbo build --filter=docs
npm exec turbo build --filter=docs
npm exec turbo build --filter=docs
```

### Develop

To develop all apps and packages, run the following command:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo dev
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo dev
npm exec turbo dev
npm exec turbo dev
```

You can develop a specific package by using a [filter](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters):

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo dev --filter=web
```

Without global `turbo`:

```sh
npx turbo dev --filter=web
npm exec turbo dev --filter=web
npm exec turbo dev --filter=web
```

### Remote Caching

> [!TIP]
> Vercel Remote Cache is free for all plans. Get started today at [vercel.com](https://vercel.com/signup?utm_source=remote-cache-sdk&utm_campaign=free_remote_cache).

Turborepo can use a technique known as [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup?utm_source=turborepo-examples), then enter the following commands:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo login
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo login
npm exec turbo login
npm exec turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo link
```

Without global `turbo`:

```sh
npx turbo link
npm exec turbo link
npm exec turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turborepo.dev/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.dev/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching)
- [Filtering](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters)
- [Configuration Options](https://turborepo.dev/docs/reference/configuration)
- [CLI Usage](https://turborepo.dev/docs/reference/command-line-reference)
