# GymMate

GymMate is a fitness companion app designed to help users track workouts, monitor progress, and stay consistent with their gym goals.

## Features

- **Workout Tracking** – Log exercises, sets, reps, and weights for every session
- **Progress Monitoring** – Visualize strength gains and body measurements over time
- **Exercise Library** – Browse a curated library of exercises with instructions
- **Custom Routines** – Create and save personalized workout plans
- **Session History** – Review past workouts and identify trends
- **Goal Setting** – Set fitness goals and track milestones

## Tech Stack

| Layer    | Technology          |
|----------|---------------------|
| Frontend | React Native        |
| Backend  | Node.js / Express   |
| Database | PostgreSQL          |
| Auth     | JWT                 |

## Getting Started

### Prerequisites

- Node.js >= 18
- npm or yarn
- PostgreSQL

### Installation

```bash
# Clone the repository
git clone https://github.com/MilapSuthar/GymMate.git
cd GymMate

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials and secret keys

# Run database migrations
npm run db:migrate

# Start the development server
npm run dev
```

## Project Structure

```
GymMate/
├── src/
│   ├── components/     # Reusable UI components
│   ├── screens/        # App screens
│   ├── api/            # API integration layer
│   ├── store/          # State management
│   └── utils/          # Helper functions
├── server/
│   ├── routes/         # API routes
│   ├── controllers/    # Request handlers
│   ├── models/         # Database models
│   └── middleware/     # Auth and validation
└── docs/               # Additional documentation
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a pull request

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
