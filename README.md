# Gemzyne 💎
### Online Gem Selling Web Platform

Gemzyne is a full-stack web application developed to facilitate online gem selling. The platform provides users with an intuitive interface to browse gem products while leveraging a structured backend to manage application data and workflows.

This project was developed as an academic group project to gain hands-on experience with full-stack development using the MERN stack.

---

## Features

- Browse and view gem products with a responsive, user-friendly interface
- 3D gem model viewer
- User authentication with OTP email verification
- Inventory management for sellers
- Order management and order tracking
- Gem customization / custom order requests
- Auction management with live bidding (auto-closes ended auctions)
- Payment processing with history for buyers and sellers
- Feedback and review system
- Admin panel — user management, platform metrics, complaints handling

---

## Tech Stack

| Layer | Technology |
|---|---|---|
| Frontend | React 19, React Router v7, Three.js |
| Backend | Node.js, Express 5 |
| Database | MongoDB (Mongoose) |
| Auth | JWT + HTTP-only refresh cookies |
| File Uploads | Multer |
| Email | Nodemailer (Gmail SMTP) |
| Tools | Git, GitHub |

---

## Project Structure

```
Gemzyne/
├── backend/
│   ├── app.js                     # Express server entry point
│   ├── Controllers/               # Route handlers (auth, gems, auctions, payments, etc.)
│   ├── Models/                    # Mongoose schemas
│   ├── Middleware/                # Auth, file upload, error handling
│   ├── Routes/                    # Express routers
│   └── jobs/
│       └── closeEndedAuctions.js  # Scheduled job to close expired auctions
└── frontend/
    ├── public/                    # Static assets + 3D .glb gem models
    └── src/
        ├── App.js                 # All client-side routes
        ├── pages/                 # One folder per feature page
        ├── Components/            # Shared UI (Header, Footer, Sidebars, Notifications)
        ├── context/               # UserContext
        └── Assets/                # Images and gem cut reference photos
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- npm
- A MongoDB Atlas cluster (or local MongoDB)
- A Gmail account for SMTP (or any SMTP provider)

---

### Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string

JWT_ACCESS_SECRET=your_jwt_secret

REFRESH_COOKIE_NAME=gid
REFRESH_COOKIE_DOMAIN=localhost
REFRESH_COOKIE_SECURE=false
REFRESH_COOKIE_SAMESITE=Lax

USE_ETHEREAL=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

SMTP_FROM="GemZyne <your_email@gmail.com>"
EMAIL_FROM_NAME=GemZyne
EMAIL_FROM_ADDRESS=your_email@gmail.com
REPLY_TO=your_email@gmail.com

CLIENT_ORIGIN=http://localhost:3000,http://localhost:3001
```

> **Note:** For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833) rather than your account password.

Start the backend:

```bash
npm start
```

The server runs on `http://localhost:5000`.

---

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

The app runs on `http://localhost:3000`.

---

## User Roles

| Role | Access |
|---|---|---|
| **Buyer** | Browse inventory, place & track orders, bid in auctions, make payments, submit feedback |
| **Seller** | Manage gem listings, fulfil orders, run auctions, view payments and feedback |
| **Admin** | Manage all users, view platform metrics, handle complaints and feedback |

---

## API Overview

| Prefix | Description |
|---|---|---|
| `/auth` | Register, login, logout, OTP verification |
| `/users` | Current user profile |
| `/api/gems` | Gem inventory CRUD |
| `/api/auctions` | Auction management |
| `/api/bids` | Bidding |
| `/api/wins` | Auction winners |
| `/api/orders` | Orders and custom order requests |
| `/api/payments` | Payment processing |
| `/api/feedback` | Feedback submission and management |
| `/api/metrics` | Seller metrics |
| `/api/dashboard` | User dashboard data |
| `/admin/users` | Admin user management |
| `/admin/metrics` | Admin platform metrics |
| `/admin/complaints` | Admin complaints |

---

## Purpose of the Project

The main objective of this project is to apply full-stack development concepts learned during academic studies and gain practical experience in building scalable web applications using the MERN stack.

---

## Contributors

| Name | GitHub |
|---|---|
| Tharushi Karunarathne | [@TharushiKarunarathne](https://github.com/TharushiKarunarathne) |
| Hirusha Hapuarachchi | [@Kofun24](https://github.com/Kofun24) |
| Wenura Nimsara | [@NimsaraWickramarathna](https://github.com/NimsaraWickramarathna) |
| Hirun Rajapaksha | [@Hirun-Rajapaksha](https://github.com/Hirun-Rajapaksha) |
| Shashini Wedage | [@phoenix-0206](https://github.com/phoenix-0206) |
