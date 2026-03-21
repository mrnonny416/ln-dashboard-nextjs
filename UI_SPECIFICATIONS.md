# Dashboard UI Specifications for Google Stitch Design

## Overview

Dashboard system for a gaming platform with payment integration, tracking game sessions, user stats, and invoice management.

---

## 📊 Page 1: Game Log / Results Display

### Purpose

Display all game sessions with detailed statistics for each play.

### Table Columns

| Column                 | Data Type         | Description                            | Example                    |
| ---------------------- | ----------------- | -------------------------------------- | -------------------------- |
| **Session ID**         | Number            | Unique identifier for the game session | 1, 2, 3                    |
| **Player Name**        | String            | Name of the player                     | "John Doe", "Jane Smith"   |
| **Started At**         | DateTime          | When the game session started          | 2026-03-20 14:30:45        |
| **Ended At**           | DateTime          | When the game session ended            | 2026-03-20 14:35:20        |
| **Duration (seconds)** | Number            | Total time played                      | 275, 450, 320              |
| **Result**             | String (Win/Loss) | Whether player won or lost             | "Win", "Loss"              |
| **Fruits Collected**   | Number            | Number of fruits collected             | 12, 25, 8                  |
| **Status**             | Badge             | Current status                         | "Completed", "In Progress" |

### Sample Data

```json
{
    "sessionId": 1,
    "playerName": "John Doe",
    "startedAt": "2026-03-20 14:30:45",
    "endedAt": "2026-03-20 14:35:20",
    "duration": 275,
    "result": "Win",
    "fruitsCollected": 25,
    "status": "Completed"
}
```

### Additional Features

- **Sorting**: By date, player name, duration, results
- **Filtering**: By player, date range, result (win/loss)
- **Pagination**: Show 10/25/50 rows per page
- **Details View**: Click row to see SessionAttempt records (round-by-round breakdown)

### Expandable Row Details: Session Attempts

When expanding a game session, show:

| Column        | Data Type | Example                      |
| ------------- | --------- | ---------------------------- |
| **Round**     | Number    | 1, 2, 3, 4, 5                |
| **Time (ms)** | Number    | 1250, 1100, 1050, 1200, 1180 |
| **Timestamp** | DateTime  | 2026-03-20 14:30:50          |

---

## 👥 Page 2: Users / Players Management

### Purpose

View all players and their play statistics.

### Table Columns

| Column              | Data Type | Description                 | Example                |
| ------------------- | --------- | --------------------------- | ---------------------- |
| **Player ID**       | Number    | Unique player identifier    | 1, 2, 3                |
| **Player Name**     | String    | Full name of player         | "John Doe"             |
| **Created At**      | DateTime  | Account creation date       | 2026-01-15 10:20:30    |
| **Total Sessions**  | Number    | Total games played (count)  | 42, 156, 8             |
| **Total Wins**      | Number    | Number of wins              | 25, 89, 3              |
| **Win Rate (%)**    | Decimal   | Win percentage              | 59.5%, 56.9%, 37.5%    |
| **Best Score (ms)** | Number    | Fastest single round time   | 800, 950, 1100         |
| **Avg Score (ms)**  | Number    | Average round time          | 1050, 1200, 1350       |
| **Total Play Time** | String    | Total accumulated play time | "125h 30m", "340h 15m" |
| **Last Played**     | DateTime  | Last game session date      | 2026-03-20 14:35:20    |

### Sample Data

```json
{
    "playerId": 1,
    "playerName": "John Doe",
    "createdAt": "2026-01-15 10:20:30",
    "totalSessions": 42,
    "totalWins": 25,
    "winRate": 59.5,
    "bestScore": 800,
    "avgScore": 1050,
    "totalPlayTime": "125h 30m",
    "lastPlayed": "2026-03-20 14:35:20"
}
```

### Additional Features

- **Sorting**: By name, win rate, total sessions, last played
- **Filtering**: By date range created
- **View Player Details**: Click to see all sessions for this player
- **Search**: By player name

---

## 💳 Page 3: Invoice / Payment Management

### Purpose

Track all payment invoices and their statuses.

### Table Columns

| Column            | Data Type          | Description                  | Example                            |
| ----------------- | ------------------ | ---------------------------- | ---------------------------------- |
| **Invoice ID**    | Number             | Unique invoice identifier    | 1, 2, 3                            |
| **User ID**       | String             | Associated user/player ID    | "user@email.com", "wallet_address" |
| **Amount (sats)** | Number             | Amount in satoshis (Bitcoin) | 10000, 50000, 25000                |
| **Status**        | Badge              | Payment status               | "Pending", "Paid", "Failed"        |
| **Memo**          | String             | Payment description/notes    | "Game Access", "Season Pass"       |
| **Created At**    | DateTime           | Invoice creation date        | 2026-03-20 10:15:30                |
| **Paid At**       | DateTime           | When payment was completed   | 2026-03-20 10:18:45                |
| **Payment Hash**  | String (truncated) | Unique payment identifier    | "a3f5e2..."                        |
| **BOLT11**        | String (truncated) | Lightning invoice            | "lnbc100u1p..."                    |

### Sample Data

```json
{
    "invoiceId": 1,
    "userId": "user_001",
    "amount": 25000,
    "status": "Paid",
    "memo": "Game Access",
    "createdAt": "2026-03-20 10:15:30",
    "paidAt": "2026-03-20 10:18:45",
    "paymentHash": "a3f5e2b8c1d4f9e3...",
    "bolt11": "lnbc250u1p3xk2z..."
}
```

### Status Colors

- **Pending**: Yellow/Orange badge
- **Paid**: Green badge
- **Failed**: Red badge

### Additional Features

- **Sorting**: By date, status, amount
- **Filtering**: By status (pending/paid/failed), date range
- **Search**: By user ID or payment hash
- **Export**: Export to CSV for accounting
- **Pagination**: Show 10/25/50 rows per page

---

## 🎨 Design Recommendations for Google Stitch

### Color Scheme

- **Primary**: Gaming theme (Dark blue/Purple with accent colors)
- **Success (Wins/Paid)**: Green (#10B981)
- **Pending (In Progress)**: Amber (#F59E0B)
- **Failure (Loss/Failed)**: Red (#EF4444)
- **Neutral**: Gray shades for secondary info

### Key UI Elements

1. **Table Headers**: Sortable with up/down arrows
2. **Status Badges**: Rounded pills with color coding
3. **Expandable Rows**: For session details
4. **Date Formatting**: Include both date and time
5. **Numbers**: Format large numbers with commas/separators
6. **Timestamps**: Use relative time where applicable ("2 hours ago")

### Navigation

- Main header/navigation with links to:
    - Dashboard (Summary)
    - Game Log
    - Players
    - Invoices
    - Settings

### Filter/Search Panel

- Location: Left sidebar or top collapsible panel
- Should persist selections across page refresh
- Quick filters (Last 7 days, This month, etc.)

---

## 📈 Summary Statistics Cards (Dashboard Homepage)

Consider adding a summary page with overview cards:

| Metric                    | Display                 | Example              |
| ------------------------- | ----------------------- | -------------------- |
| **Total Players**         | Large Number            | 1,234                |
| **Total Games Played**    | Large Number            | 45,678               |
| **Today's Revenue**       | Large Number + Currency | ฿ 2.5 BTC            |
| **Pending Invoices**      | Large Number            | 12                   |
| **Win Rate (Global Avg)** | Percentage              | 52.3%                |
| **Most Active Player**    | Name + Session Count    | John Doe (156 games) |

---

## 📝 Prompt for AI/Design Reference

> "Design a gaming dashboard with three main data tables: (1) Game Log showing session details with expandable round-by-round breakdown, (2) Players list with performance statistics and win rates, (3) Invoice management for Bitcoin Lightning payments. Each table should support sorting, filtering, and pagination. Use a modern dark gaming aesthetic with status indicators (badges), implement responsive design for mobile/tablet, and include summary statistics at the top. Key features: expandable rows, color-coded status badges, date/time formatting, search functionality, and data export capabilities."

---

## 🔄 Data Relationships

```
Player (accounts)
  ├── GameSession (game plays)
  │   └── SessionAttempt (individual rounds)
  └── Score (high scores)

UserPlayLog (play tracking)
  └── Invoice (payments)
```

---

## 📱 Responsive Design Considerations

- **Desktop**: Full table view with all columns
- **Tablet**: Hide non-critical columns, keep core info
- **Mobile**: Card-based layout, swipeable columns, or collapsible details

---

## Future Enhancements

- Real-time updates with WebSocket
- Export to PDF reports
- Advanced analytics with charts
- Player leaderboards
- Achievement badges
- Email notifications for pending invoices
