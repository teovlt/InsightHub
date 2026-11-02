// Configuration CORS
export const corsOptions = {
  origin: (process.env.CORS_ORIGIN || "").split(",").map((o) => o.trim()), // Origines autorisées
  credentials: true, // Autoriser les cookies
  methods: "GET, POST, PUT, PATCH, DELETE", // Méthodes autorisées
};
