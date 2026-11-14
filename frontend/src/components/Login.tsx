import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { type Account, displayName, formatFirstName, formatLastName, formatTeam, isCompanyEmail } from '../lib/account';
import { t } from '../lib/i18n';
import { Logo } from './Lobby';
import { Button, spring } from './ui';

type FieldKey = 'email' | 'firstName' | 'lastName' | 'team';

/**
 * The sign-in gate: who you are and which team you're on. No password (Huddle runs on the office LAN),
 * but every field is required, and the email must be a BNP Paribas address.
 */
export default function Login({ initial, onSignedIn }: { initial: Account | null; onSignedIn: (account: Account) => void }) {
  const [email, setEmail] = useState(initial?.email ?? '');
  const [firstName, setFirstName] = useState(initial?.firstName ?? '');
  const [lastName, setLastName] = useState(initial?.lastName ?? '');
  const [team, setTeam] = useState(initial?.team ?? '');
  const [touched, setTouched] = useState<Record<FieldKey, boolean>>({ email: false, firstName: false, lastName: false, team: false });
  const [submitted, setSubmitted] = useState(false);

  const errors: Partial<Record<FieldKey, string>> = {};
  if (!email.trim()) errors.email = t.required(t.emailLabel);
  else if (!isCompanyEmail(email)) errors.email = t.emailInvalid;
  if (!formatFirstName(firstName)) errors.firstName = t.required(t.firstNameLabel);
  if (!formatLastName(lastName)) errors.lastName = t.required(t.lastNameLabel);
  if (!formatTeam(team)) errors.team = t.required(t.teamLabel);
  const show = (key: FieldKey) => (submitted || touched[key] ? errors[key] : undefined);

  const preview = formatFirstName(firstName) && formatLastName(lastName) ? displayName({ firstName: formatFirstName(firstName), lastName: formatLastName(lastName) }) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) {
      // Take the person straight to the first thing that needs fixing.
      const first = (['email', 'firstName', 'lastName', 'team'] as FieldKey[]).find((k) => errors[k]);
      document.getElementById(`login-${first}`)?.focus();
      return;
    }
    onSignedIn({
      email: email.trim().toLowerCase(),
      firstName: formatFirstName(firstName),
      lastName: formatLastName(lastName),
      team: formatTeam(team),
    });
  }

  const blur = (key: FieldKey) => () => setTouched((s) => ({ ...s, [key]: true }));

  return (
    <div className="center-screen login-screen">
      <div className="lobby-glow" aria-hidden />
      <div className="login-brand">
        <Logo />
      </div>
      <motion.form className="panel login-panel" onSubmit={submit} noValidate initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
        <h1 className="login-title">{t.loginTitle}</h1>
        <p className="muted">{t.loginLede}</p>

        <LoginField id="login-email" label={t.emailLabel} error={show('email')}>
          <input
            id="login-email"
            aria-describedby="login-email-msg"
            aria-invalid={!!show('email')}
            className="input"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={blur('email')}
            placeholder={t.emailPlaceholder}
            maxLength={120}
            required
          />
        </LoginField>

        <div className="login-names">
          <LoginField id="login-firstName" label={t.firstNameLabel} error={show('firstName')}>
            <input
              id="login-firstName"
              aria-describedby="login-firstName-msg"
              aria-invalid={!!show('firstName')}
              className="input"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onBlur={() => {
                setFirstName(formatFirstName(firstName));
                blur('firstName')();
              }}
              placeholder="Manish"
              maxLength={30}
              required
            />
          </LoginField>
          <LoginField id="login-lastName" label={t.lastNameLabel} error={show('lastName')} hint={t.lastNameHint}>
            <input
              id="login-lastName"
              aria-describedby="login-lastName-msg"
              aria-invalid={!!show('lastName')}
              className="input input-caps"
              autoComplete="family-name"
              autoCapitalize="characters"
              value={lastName}
              onChange={(e) => setLastName(e.target.value.toLocaleUpperCase())}
              onBlur={() => {
                setLastName(formatLastName(lastName));
                blur('lastName')();
              }}
              placeholder="SHARMA"
              maxLength={30}
              required
            />
          </LoginField>
        </div>

        <LoginField id="login-team" label={t.teamLabel} error={show('team')} hint={t.teamHint}>
          <input
            id="login-team"
            aria-describedby="login-team-msg"
            aria-invalid={!!show('team')}
            className="input"
            autoComplete="organization-title"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            onBlur={() => {
              setTeam(formatTeam(team));
              blur('team')();
            }}
            placeholder={t.teamPlaceholder}
            maxLength={80}
            required
          />
        </LoginField>

        <AnimatePresence initial={false}>
          {preview && (
            <motion.p className="login-preview" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              {t.appearAs(preview)}
            </motion.p>
          )}
        </AnimatePresence>

        <Button variant="primary" size="lg" type="submit">
          {t.continueCta}
        </Button>
      </motion.form>
    </div>
  );
}

/** Inputs link to their message with aria-describedby={`${id}-msg`}. */
function LoginField({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  const msgId = `${id}-msg`;
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label className="field-label" htmlFor={id}>
        {label} <span aria-hidden className="field-required">*</span>
      </label>
      {children}
      {error ? (
        <span id={msgId} className="field-error" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span id={msgId} className="field-hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
