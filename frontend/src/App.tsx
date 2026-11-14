import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Lobby from './components/Lobby';
import Login from './components/Login';
import TableRoute from './components/TableRoute';
import { type Account, accounts, displayName } from './lib/account';
import { identity } from './lib/identity';
import { sound } from './lib/sound';

export type Prefs = ReturnType<typeof identity.prefs>;

function parseRoute(): { page: 'lobby' } | { page: 'table'; code: string } {
  const match = window.location.pathname.match(/^\/t\/([A-Za-z0-9]{6})\/?$/);
  return match ? { page: 'table', code: match[1].toUpperCase() } : { page: 'lobby' };
}

export default function App() {
  const [route, setRoute] = useState(parseRoute);
  const [prefs, setPrefs] = useState<Prefs>(identity.prefs);
  const [account, setAccount] = useState<Account | null>(accounts.current);
  const [editingAccount, setEditingAccount] = useState(false);

  useEffect(() => {
    const onPop = () => setRoute(parseRoute());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    sound.setEnabled(prefs.sound);
    identity.savePrefs(prefs);
    const root = document.documentElement;
    if (prefs.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', prefs.theme);
  }, [prefs]);

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setRoute(parseRoute());
  }, []);

  // The sign-in gate: nothing (not even an invite link) works until we know who you are.
  // The route is kept, so signing in from /t/CODE lands you at that table.
  if (!account || editingAccount) {
    return (
      <div key="login" className="page">
        <Login
          initial={account}
          onSignedIn={(next) => {
            accounts.save(next);
            identity.saveProfile({ name: displayName(next), avatar: identity.profile().avatar });
            setAccount(next);
            setEditingAccount(false);
          }}
        />
      </div>
    );
  }

  // No exit-gated AnimatePresence here: the lobby's shared-layout pickers (deck pill, avatar ring) keep a
  // layout animation pending while exiting, which stalled mode="wait" and left the screen blank.
  if (route.page === 'lobby') {
    return (
      <div key="lobby" className="page">
        <Lobby
          account={account}
          onEnter={(code) => navigate(`/t/${code}`)}
          onEditAccount={() => setEditingAccount(true)}
          onSignOut={() => {
            accounts.signOut();
            setAccount(null);
          }}
        />
      </div>
    );
  }
  return (
    <motion.div
      key={`table-${route.code}`}
      className="page"
      initial={{ opacity: 0, scale: 1.02 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.45 }}
    >
      <TableRoute code={route.code} account={account} prefs={prefs} setPrefs={setPrefs} onExit={() => navigate('/')} />
    </motion.div>
  );
}
