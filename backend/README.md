# KitaTolongKita Backend

.NET Core 8 API for the Malaysian community group-buying marketplace.

## Tech Stack

| Component | Technology |
|---|---|
| API Framework | ASP.NET Core 8 |
| Database | PostgreSQL 16 |
| Search | ElasticSearch 8.11 |
| Auth | JWT + Google OAuth + Email OTP |
| Cache | Redis 7 |
| Container | Docker + Docker Compose |

## Quick Start

### 1. Start infrastructure (PostgreSQL, ElasticSearch, Redis)

```bash
docker compose up -d postgres elasticsearch redis
```

### 2. Build & run the API

```bash
dotnet run --project src/KitaTolongKita.Api
```

Or with Docker:

```bash
docker compose up -d api
```

API runs at **http://localhost:5000**
Swagger UI: **http://localhost:5000/swagger**

## Auth Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/email/signup` | Register with email + password |
| POST | `/api/auth/email/login` | Login with email + password |
| POST | `/api/auth/google` | Login/Register with Google ID token |
| POST | `/api/auth/otp/send` | Send OTP to email |
| POST | `/api/auth/otp/verify` | Verify OTP code |
| GET | `/api/auth/me` | Get current user (Bearer token) |

## Deals Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/deals` | Search deals (filter, sort, paginate) |
| GET | `/api/deals/{id}` | Get single deal |
| POST | `/api/deals` | Create deal (auth required) |
| POST | `/api/deals/{id}/join` | Join a deal (auth required) |
| GET | `/api/deals/orders` | Get user's orders (auth required) |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ConnectionStrings__Default` | `Host=localhost;...` | PostgreSQL connection string |
| `ElasticSearch__Url` | `http://localhost:9200` | ElasticSearch URL |
| `Jwt__Secret` | `KitaTolongKita_SuperSecretKey...` | JWT signing key (change in prod!) |
| `Jwt__Issuer` | `KitaTolongKita` | JWT issuer |
| `Jwt__Audience` | `KitaTolongKitaApp` | JWT audience |
| `Jwt__AccessTokenExpiryMinutes` | `60` | Access token TTL |

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → APIs & Services → Credentials
3. Create an OAuth 2.0 Client ID (Web application type)
4. Add your domain to Authorized JavaScript origins
5. Copy the Client ID and use it in the React Native app with `expo-auth-session`

## Email OTP Setup

The OTP service currently logs codes to the console. To enable real email delivery:

1. Sign up at [Resend](https://resend.com) or [SendGrid](https://sendgrid.com)
2. Add the API key to environment: `RESEND_API_KEY=re_xxx`
3. Update `OtpService.GenerateOtpAsync()` to call the email API

## Project Structure

```
backend/
├── src/
│   ├── KitaTolongKita.Api/         # Controllers, middleware, DI
│   ├── KitaTolongKita.Core/        # Entities, DTOs, interfaces
│   └── KitaTolongKita.Infrastructure/ # Data access, external services
├── docker-compose.yml
├── Dockerfile
└── KitaTolongKita.sln
```
