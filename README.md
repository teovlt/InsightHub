# InsightHub

**Your habits, your progress, all in one place.**

InsightHub is a personal dashboard for your habits and everyday life (sport, reading, studies, side projects, music…).
Connect the apps you already use, add what they don't cover, and watch yourself move forward, with progress you can
easily show off.

## 🚀 Why InsightHub?

- **Built for you, not your team**: one account, one person. No manager dashboards.
- **Data that comes to you**: integrations pull your activity automatically; manual entries fill the gaps.
- **Progress first**: every screen answers one question, "am I moving forward?"
- **Web first**: works great on any screen, no app to install.

Brand, audience and tone of voice are documented in [BRAND.md](BRAND.md).

---

## ⚙️ Key Features

✅ **Dynamic Dashboard**: Get a real-time overview of your categories, goals, and results.

✅ **App Integrations**: Easily connect services like **GitHub** to fetch your commits, pull requests, and more.

✅ **Automated Statistics** _(in progress)_: Automatically generate precise metrics updated in real-time through webhooks and third-party APIs.

✅ **Custom Tracking**: Create your own categories to track what truly matters to you.

✅ **Smart Notifications** _(in progress)_: Get notified of your progress and celebrate milestones.

---

## 🧩 Current Integrations

- **GitHub**: Sync your public/private contributions.
- **Google Auth**: Simple sign-in.
- **(Coming soon)**: Strava, Spotify, Goodreads...

---

## 🛠️ Tech Stack

- **Frontend**: React + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express + MongoDB
- **Auth**: JWT + OAuth
- **Tests**: Jest
- **CI/CD**: Husky, Lint-staged

---

## 🚢 Deployment

The app ships as a Docker Compose stack (nginx client, Node API, MongoDB with daily backups) deployed with Dokploy
on `insighthub.teovillet.fr` and `api.insighthub.teovillet.fr`.
See [DEPLOY.md](DEPLOY.md).

---

## 🧑‍💻 Developed by

👋 I'm **Téo Villet**, a passionate fullstack web developer and the creator of InsightHub.  
📫 [My portfolio](https://teovillet.fr)  
🐙 [My GitHub](https://github.com/teovlt)

---

## 📜 License

This project is open-source under the [MIT](LICENSE) license.

---

**Measure what matters. Act with purpose.**
