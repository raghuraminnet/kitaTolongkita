# KitaTolongKita 🇲🇾

Malaysian community group-buying marketplace — "Gotong Royong" for deals.

## Quick Start

### 1. Clone & Deploy Backend

```bash
# On your VPS
git clone https://github.com/raghuraminnet/kitaTolongKita.git
cd kitaTolongKita

# Start all containers
docker-compose up -d

# Check logs
docker-compose logs -f api
```

The API will be live at `http://YOUR_VPS_IP:5000/api`

### 2. Build Mobile App

```bash
# On your local machine
git clone https://github.com/raghuraminnet/kitaTolongKita.git
cd kitaTolongKita/kitaTolongkita

# Install deps
npx expo install expo-location expo-image-picker expo-slider \
  i18next react-i18next expo-localization @react-native-async-storage/async-storage

# Build debug APK
npx expo run:android
```

### 3. Update App API URL

Edit `kitaTolongkita/src/api/client.ts` and set your VPS IP:
```ts
export const API_BASE = 'http://YOUR_VPS_IP:5000/api';
```

## Docker Services

| Service | Port | Description |
|---------|------|-------------|
| API | 5000 | .NET Core 8 REST API |
| PostgreSQL | 5432 | Primary database |
| Elasticsearch | 9200 | Geo search engine |
| Redis | 6379 | Token/session cache |

## Environment Variables (optional)

For AI moderation, set in `docker-compose.yml` or `.env`:

```env
AI__Provider=anthropic          # azure-openai | openai | anthropic
AI__ApiKey=sk-ant-...
JWT_SECRET=your-32-char-secret
POSTGRES_PASSWORD=your-db-pass
```

Without AI keys, moderation falls back to "manual review" mode — deals are held for review but the app works fully.

## API Endpoints

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/forgot-password
POST /api/auth/reset-password

GET  /api/deals?query=&category=&maxPrice=&radiusKm=&lat=&lon=
GET  /api/deals/{id}
POST /api/deals
GET  /api/deals/suggest-nearby?lat=&lon=
GET  /api/deals/nearby-pending-verification?lat=&lon=
POST /api/deals/{id}/upvote
POST /api/deals/{id}/like
GET  /api/deals/{id}/reactions
POST /api/deals/{id}/verify
POST /api/deals/{id}/join

GET  /api/chat/conversations
GET  /api/chat/{id}/messages
POST /api/chat/messages

GET  /api/notifications
PATCH /api/notifications/{id}/read
POST /api/notifications/read-all
GET  /api/notifications/unread-count

GET  /api/admin/moderation/pending
POST /api/admin/moderation/{id}/approve
POST /api/admin/moderation/{id}/reject
```

## Tech Stack

- **App**: Expo React Native (TypeScript)
- **API**: .NET Core 8 (C#)
- **Database**: PostgreSQL 16
- **Search**: Elasticsearch 8.11 (geo-point queries)
- **Cache**: Redis 7
- **AI**: Azure OpenAI / OpenAI / Anthropic Claude (optional)
