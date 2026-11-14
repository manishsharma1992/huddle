import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { type Account, displayName } from '../lib/account';
import { t } from '../lib/i18n';
import { identity } from '../lib/identity';
import type { Participant, Seat } from '../lib/types';
import { AvatarPicker, Button, Field, RoleToggle, Sheet } from './ui';

export default function ProfileSheet({ open, onClose, me, seat, account, onError, onLeave }: {
  account: Account;
  open: boolean;
  onClose: () => void;
  me: Participant;
  seat: Seat;
  onError: (e: unknown) => void;
  onLeave: () => void;
}) {
  // Your name follows your sign-in ("Manish SHARMA"); change it from the lobby's "Change" link.
  const name = displayName(account);
  const [avatar, setAvatar] = useState(me.avatar);
  const [role, setRole] = useState(me.role);

  useEffect(() => {
    if (open) {
      setAvatar(me.avatar);
      setRole(me.role);
    }
  }, [open, me]);

  async function save() {
    try {
      await api.updateProfile(seat, { name, avatar, role });
      identity.saveProfile({ name, avatar });
      onClose();
    } catch (e) {
      onError(e);
    }
  }

  async function leave() {
    try {
      await api.leave(seat);
    } catch {
      /* leaving anyway */
    }
    onLeave();
  }

  return (
    <Sheet open={open} onClose={onClose} title={t.youAtTable}>
      <div className="profile">
        <div className="field">
          <span className="field-label">{t.name}</span>
          <p className="profile-name">
            <strong>{name}</strong> · <span className="muted">{account.team}</span>
          </p>
        </div>
        <Field label={t.character} group>
          <AvatarPicker value={avatar} onChange={setAvatar} />
        </Field>
        <Field label={t.role} group>
          <RoleToggle value={role} onChange={setRole} label={t.role} labels={{ VOTER: t.voter, OBSERVER: t.observer }} pillId="profile-role-pill" />
        </Field>
        <div className="row gap between">
          <Button variant="danger" onClick={leave}>
            {t.leaveTable}
          </Button>
          <Button variant="primary" onClick={save} >
            {t.save}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
