import { Router } from "./router/routes.js";
import { useAuthContext } from "./contexts/authContext.js";
import { Loading } from "./components/customs/loading.js";
import { AchievementListener } from "./components/customs/achievementListener.js";
import "./styles/index.css";

function App() {
  const { loading } = useAuthContext();

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      <Router />
      <AchievementListener />
    </>
  );
}

export default App;
