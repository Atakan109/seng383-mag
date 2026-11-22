import { useCallback, useState } from 'react';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import { clearSession, loadSession, saveSession } from './session.js';

// Shows the login page until the user logs in, then the page for their role.
function App() {
  const [session, setSession] = useState(loadSession);

  function handleLogin(newSession) {
    saveSession(newSession);
    setSession(newSession);
  }

  // Logout only forgets the token in the browser (FR-M1-06).
  const handleLogout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  if (!session) {
    return <LoginPage onLogin={handleLogin} />;
  }
  return <HomePage session={session} onLogout={handleLogout} />;
}

export default App;
