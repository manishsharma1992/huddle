import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { t } from '../lib/i18n';
import { identity } from '../lib/identity';
import type { Participant, Seat } from '../lib/types';
import { AvatarPicker, Button, Field, RoleToggle, Sheet } from './ui';

export default function ProfileSheet({ open, onClose, me, seat, onError, onLeave }: {
  open: boolean;
  onClose: () => void;
  me: Participant;
  seat: Seat;
  onError: (e: unknown) => void;
  onLeave: () => void;
}) {
  const [name, setName] = useState(me.name);
  const [avatar, setAvatar] = useState(me.avatar);
  const [role, setRole] = useState(me.role);

  useEffect(() => {
    if (open) {
      setName(me.name);
      setAvatar(me.avatar);
      setRole(me.role);
    }
  }, [open, me]);

  async function save() {
    try {
      await api.updateProfile(seat, { name: name.trim(), avatar, role });
      identity.saveProfile({ name: name.trim(), avatar });
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
        <Field label={t.name}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
        </Field>
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
          <Button variant="primary" onClick={save} disabled={!name.trim()}>
            {t.save}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
