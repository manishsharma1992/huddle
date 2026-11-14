import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { t } from '../lib/i18n';
import { Button, Sheet } from './ui';

export default function InviteSheet({ open, onClose, code, name, onCopied }: { open: boolean; onClose: () => void; code: string; name: string; onCopied: () => void }) {
  const [base, setBase] = useState(window.location.origin);

  useEffect(() => {
    if (!open) return;
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
    if (!local) return;
    api.serverInfo().then((info) => info.lanUrls[0] && setBase(info.lanUrls[0])).catch(() => undefined);
  }, [open]);

  const link = `${base}/t/${code}`;

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    onCopied();
  }

  return (
    <Sheet open={open} onClose={onClose} title={t.inviteTeam}>
      <div className="invite">
        <div className="invite-code" aria-label={t.tableCode}>
          {code.split('').map((ch, i) => (
            <span key={i}>{ch}</span>
          ))}
        </div>
        <p className="muted center">{t.inviteHelp}</p>
        <div className="invite-link">
          <code>{link}</code>
        </div>
        <div className="row gap">
          <Button variant="primary" onClick={() => copy(link)}>
            {t.copyLink}
          </Button>
          <Button onClick={() => copy(t.chatMessage(name, link))}>{t.copyMessage}</Button>
        </div>
      </div>
    </Sheet>
  );
}
