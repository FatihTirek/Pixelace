# 🎨 Pixelace - Real-Time Collaborative Pixel Art & Social Canvas

[![.NET 10](https://img.shields.io/badge/.NET-10.0-512BD4?logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![SignalR](https://img.shields.io/badge/SignalR-Real--Time-blue?logo=signalr&logoColor=white)](https://dotnet.microsoft.com/apps/aspnet/signalr)
[![Redis](https://img.shields.io/badge/Redis-StackExchange-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Webpack](https://img.shields.io/badge/Webpack-5.0-8DD6F9?logo=webpack&logoColor=black)](https://webpack.js.org/)

Inspired by Reddit's viral **r/place**, **Pixelace** is a high-performance, real-time social experiment platform where users across the globe place colored pixels on a shared 1000×1000 canvas. Every single pixel placed is instantly broadcast to all connected clients. It also includes an integrated, multi-room live chat with country badge flags and dynamic, on-the-fly cooldown configuration.

---

## ✨ Features

- **Massive 1000×1000 Canvas**: 1,000,000 pixels rendered via HTML5 2D Canvas with crisp sub-pixel nearest-neighbor smoothing.
- **Instant Real-Time Sync**: Powered by ASP.NET Core SignalR and Redis Backplane for horizontal scaling across instances.
- **Snappy r/place Navigation**:
  - Smooth pan, pinch-to-zoom (mobile & trackpad), mouse-wheel zoom, and click-to-focus.
  - Quick, tactile **350ms `ease-out-cubic`** camera approach and palette slide-up transitions matching the feel of Reddit r/place.
- **Full 32-Color r/place Palette**: The complete official 32-color spectrum from Reddit r/place, organized with a natural spectral gradient and interactive pixel previews.
- **Multi-Language Live Chat**:
  - 12 international chat rooms (EN/US, TR, ES, DE, FR, PT, IT, RU, JA, KO, ZH, AR) with 24×24 shiny country flag badges.
  - History persisted in Redis (capped at 250 messages per room) with auto-scroll and nickname customization.
- **Dynamic Cooldown Engine**: Real-time tile placement cooldowns managed in Redis. Administrators can update the global cooldown duration on-the-fly without restarting the backend!

---

## 🏗️ Architecture Overview

```
[ Web Browsers / Mobile Clients ]
         │               ▲
         │ HTTP / WS     │ SignalR Broadcasts
         ▼               │
[ ASP.NET Core 10 Backend API & Hubs ]
    ├── CanvasHub (/hub/canvas)  ──► Delta Updates ("ReceivePixel")
    ├── ChatHub   (/hub/chat)    ──► Room Broadcasting ("ReceiveChatMessage")
    ├── AdminController          ──► Dynamic Cooldown Management
    └── CanvasController         ──► 1MB Initial Canvas Binary Snapshot
         │               ▲
         ▼               │
[ Redis In-Memory Store & Backplane ]
    ├── canvas:board             (1,000,000 bytes raw pixel palette indices)
    ├── chat:room:{ROOM}         (Trimmed list of recent chat JSON messages)
    ├── cooldown:pixel:{userId}  (Individual user cooldown TTL keys)
    └── config:cooldown          (Dynamic global cooldown seconds)
```

---

## ⚡ Admin Cooldown API (Get & Set Cooldown)

Pixelace allows administrators to inspect and dynamically update the pixel placement cooldown period (in seconds) via an authenticated REST API. Changes take effect **immediately** for all connected users without dropping connections or restarting the service.

### Authentication
All admin requests require the **`X-Admin-Secret`** header.
- **Configured via Environment Variable**: `ADMIN_SECRET` (or `AdminSecret` in `appsettings.json`)
- **Default Local Development Secret**: `pixelace-admin-secret-dev`

---

### 1. Get Current Cooldown
Retrieves the active global cooldown duration in seconds.

- **Endpoint**: `GET /api/admin/cooldown`
- **Headers**:
  - `X-Admin-Secret: <YOUR_ADMIN_SECRET>`

#### cURL Example:
```bash
curl -X GET "http://localhost:5000/api/admin/cooldown" \
     -H "X-Admin-Secret: pixelace-admin-secret-dev"
```

#### Successful Response (`200 OK`):
```json
{
  "cooldownSeconds": 3
}
```

#### Unauthorized Response (`401 Unauthorized`):
```json
{
  "error": "Unauthorized. Invalid or missing X-Admin-Secret."
}
```

---

### 2. Set / Update Cooldown
Sets a new cooldown duration between `0` and `3600` seconds.

- **Endpoint**: `POST /api/admin/cooldown`
- **Headers**:
  - `Content-Type: application/json`
  - `X-Admin-Secret: <YOUR_ADMIN_SECRET>`
- **Body Options**:

#### Option A: JSON Body (Recommended)
```json
{
  "seconds": 10
}
```

#### cURL Example (JSON Body):
```bash
curl -X POST "http://localhost:5000/api/admin/cooldown" \
     -H "Content-Type: application/json" \
     -H "X-Admin-Secret: pixelace-admin-secret-dev" \
     -d '{"seconds": 10}'
```

#### Option B: Query Parameter
```bash
curl -X POST "http://localhost:5000/api/admin/cooldown?seconds=10" \
     -H "X-Admin-Secret: pixelace-admin-secret-dev"
```

#### Successful Response (`200 OK`):
```json
{
  "success": true,
  "cooldownSeconds": 10,
  "message": "Cooldown successfully updated to 10 seconds."
}
```

#### Invalid Value Response (`400 Bad Request`):
```json
{
  "error": "Cooldown must be between 0 and 3600 seconds."
}
```

---

### 3. Reset Canvas to Blank White
Resets the entire 1000×1000 canvas in Redis (`canvas:state`) to default white pixels (color index 31).

- **Endpoint**: `POST /api/admin/reset-canvas`
- **Headers**:
  - `X-Admin-Secret: <YOUR_ADMIN_SECRET>`

#### cURL Example:
```bash
curl -X POST "http://localhost:5000/api/admin/reset-canvas" \
     -H "X-Admin-Secret: pixelace-admin-secret-dev"
```

#### Successful Response (`200 OK`):
```json
{
  "success": true,
  "message": "Canvas successfully reset to blank white."
}
```

---

### JavaScript / Fetch Example
```javascript
// Change cooldown to 5 seconds
async function updateCooldown(newSeconds, adminSecret) {
  const response = await fetch('/api/admin/cooldown', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Secret': adminSecret
    },
    body: JSON.stringify({ seconds: newSeconds })
  });

  const result = await response.json();
  console.log(result);
}

// Reset canvas to white
async function resetCanvas(adminSecret) {
  const response = await fetch('/api/admin/reset-canvas', {
    method: 'POST',
    headers: {
      'X-Admin-Secret': adminSecret
    }
  });

  const result = await response.json();
  console.log(result);
}
```

---

## 📡 REST & SignalR Endpoints

### REST APIs

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/canvas` | Public | Returns the complete 1000×1000 canvas state as a raw `application/octet-stream` (1 MB binary). |
| `GET` | `/api/chat/messages?room={ROOM}` | Public | Fetches the recent 250 messages for a given room (e.g. `EN`, `TR`). |
| `GET` | `/api/admin/cooldown` | Admin | Retrieves current cooldown duration in seconds. |
| `POST` | `/api/admin/cooldown` | Admin | Updates global cooldown duration (0 to 3600 seconds). |
| `POST` | `/api/admin/reset-canvas` | Admin | Resets all 1,000,000 canvas pixels to default white (index 31). |

### SignalR Hubs

#### 1. Canvas Hub (`/hub/canvas?userId={guestId}`)
- **Client Invokes**:
  - `SendPixel({ canvasIndex, colorIndex })`: Validates bounds, cooldown, and updates canvas. Returns `{ success, remainingCooldownSeconds, errorMessage }`.
  - `GetRemainingCooldown()`: Returns remaining cooldown time for the caller in seconds.
- **Server Broadcasts**:
  - `ReceivePixel(pixel)`: Broadcasts `{ canvasIndex, colorIndex }` to all connected clients.

#### 2. Chat Hub (`/hub/chat?userId={guestId}`)
- **Client Invokes**:
  - `JoinRoom(room)`: Adds connection to SignalR room group and returns recent room message history.
  - `LeaveRoom(room)`: Removes connection from room group.
  - `SendRoomMessage({ room, username, text, color })`: Sends message to room group.
- **Server Broadcasts**:
  - `ReceiveChatMessage(message)`: Broadcasts `{ room, username, text, color, timestamp }` to members of that room.

---

## 🛠️ Tech Stack

### Backend
- **Framework**: [.NET 10](https://dotnet.microsoft.com/) / ASP.NET Core Web API
- **Real-Time Engine**: ASP.NET Core SignalR with Redis Backplane
- **Cache & Storage**: [StackExchange.Redis](https://github.com/StackExchange/StackExchange.Redis) (Compatible with local Redis & Upstash Redis)

### Frontend
- **Core**: Vanilla JavaScript (ES6 Modules), HTML5 Canvas 2D
- **Styling**: [Tailwind CSS v3](https://tailwindcss.com/)
- **Bundling**: [Webpack 5](https://webpack.js.org/)
- **Icons & Assets**: Ionicons, Shiny 24×24 Country Flags (FlagsAPI)

---

## 🚀 Getting Started

### Prerequisites
- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Node.js](https://nodejs.org/) (v18 or higher) & `npm`
- [Redis Server](https://redis.io/download/) (Local instance or [Upstash Redis](https://upstash.com/))

---

### 1. Clone the Repository
```bash
git clone https://github.com/FatihTirek/Pixelace.git
cd Pixelace
```

---

### 2. Backend Setup
1. Navigate to the `Backend` directory:
   ```bash
   cd Backend
   ```
2. Configure Redis connection and admin secret in `appsettings.json` or via environment variables:
   ```json
   {
     "ConnectionStrings": {
       "Redis": "localhost:6379"
     },
     "AdminSecret": "pixelace-admin-secret-dev"
   }
   ```
3. Run the backend:
   ```bash
   dotnet restore
   dotnet run
   ```
   The backend API will launch (by default on `http://localhost:5000` or `https://localhost:7296`).

---

### 3. Frontend Setup
1. Navigate to the `Frontend` directory:
   ```bash
   cd ../Frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Build assets or start development watch mode:
   ```bash
   # Development watch mode (CSS and JS concurrently):
   npm run dev

   # Or build for production:
   npm run bundle-css
   npm run bundle-js
   ```
4. Open `Frontend/dist/index.html` in your browser (or serve it with Live Server / Nginx).

---

## 📁 Project Structure

```
Pixelace/
├── Backend/
│   ├── Program.cs                  # ASP.NET Core setup, SignalR & Redis initialization
│   ├── appsettings.json            # Configuration file
│   └── src/
│       ├── Constants.cs            # Redis keys, board size, chat limits
│       ├── Controllers/            # AdminController, CanvasController, ChatController
│       ├── DTOs/                   # Request / Response models
│       ├── Helpers/                # ChatHelper, Room normalization
│       ├── Hubs/                   # CanvasHub, ChatHub, SignalR Filters & Providers
│       └── Services/               # CanvasService, ChatService, GameConfigService
│
├── Frontend/
│   ├── package.json                # NPM scripts and dependencies
│   ├── tailwind.config.js          # Custom durations, 350ms out-cubic timing functions
│   ├── src/
│   │   ├── main.js                 # Frontend application entrypoint
│   │   ├── main.css                # Base Tailwind & custom canvas/palette styles
│   │   ├── constants/              # Canvas sizes, 32-color palette, 12 room definitions
│   │   ├── modules/                # Camera, Canvas, Chat, Palette, Error handling
│   │   └── utils/                  # Cubic easing curves, HTTP fetch wrappers
│   └── dist/
│       ├── index.html              # Main HTML markup
│       ├── output.css              # Minified Tailwind CSS output
│       ├── output.js               # Minified Webpack bundle
│       └── assets/                 # SVGs, flags (24x24 shiny PNGs), audio/spinners
│
└── README.md                       # Documentation
```

---

## 📄 License
This project is open-source under the MIT License. Contributions and feedback are welcome!
