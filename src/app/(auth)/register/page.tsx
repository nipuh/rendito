'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Die Passwoerter stimmen nicht ueberein. Schau nochmal genau hin!');
      return;
    }

    if (password.length < 6) {
      setError('Dein Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(
        error.message === 'User already registered'
          ? 'Diese E-Mail ist schon vergeben. Vielleicht willst du dich einloggen?'
          : 'Etwas ist schiefgelaufen. Bitte versuche es erneut.'
      );
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center">
      <Link href="/" className="flex items-center gap-2 mb-8 group">
        <FlameIcon />
        <span className="text-2xl font-bold text-cream group-hover:text-coral transition-colors">
          Rendito
        </span>
      </Link>

      <div className="card-glass w-full p-8">
        {success ? (
          <div className="text-center py-4">
            <div className="text-5xl mb-4">💌</div>
            <h1 className="text-2xl font-bold text-cream mb-3">
              Fast geschafft!
            </h1>
            <p className="text-cream/60 mb-6">
              Wir haben dir eine Bestaetigungsmail geschickt. Klick auf den Link
              in der Mail und dein Rendito-Abenteuer kann beginnen!
            </p>
            <Link
              href="/login"
              className="btn-secondary inline-block"
            >
              Zum Login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-cream text-center mb-2">
              Werde Teil von Rendito
            </h1>
            <p className="text-cream/50 text-center mb-8">
              Erstelle dein Konto und starte mit dem Swipen.
            </p>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-cream/70 mb-1.5">
                  E-Mail
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deine@email.de"
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-cream/70 mb-1.5">
                  Passwort
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mindestens 6 Zeichen"
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-cream/70 mb-1.5">
                  Passwort bestaetigen
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nochmal eingeben"
                  required
                  className="input-field"
                />
              </div>

              {error && (
                <div className="text-sm text-coral bg-coral/10 border border-coral/20 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Einen Moment...' : 'Registrieren'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-cream/40">
              Schon ein Konto?{' '}
              <Link href="/login" className="text-coral hover:text-coral-light transition-colors font-medium">
                Einloggen
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function FlameIcon() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C12 2 4 10 4 14.5C4 18.09 7.58 21 12 21C16.42 21 20 18.09 20 14.5C20 10 12 2 12 2Z"
        fill="url(#flame-gradient-register)"
      />
      <path
        d="M12 21C14.21 21 16 19.21 16 17C16 14 12 9 12 9C12 9 8 14 8 17C8 19.21 9.79 21 12 21Z"
        fill="#F5C842"
        opacity="0.8"
      />
      <defs>
        <linearGradient id="flame-gradient-register" x1="4" y1="2" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E8627C" />
          <stop offset="1" stopColor="#8B1E3F" />
        </linearGradient>
      </defs>
    </svg>
  );
}
