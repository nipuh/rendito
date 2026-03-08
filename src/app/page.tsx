import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-dark relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-coral/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-berry/10 rounded-full blur-[100px]" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <FlameIcon />
          <span className="text-2xl font-bold text-cream">Rendito</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-secondary text-sm py-2 px-4">
            Login
          </Link>
          <Link href="/register" className="btn-primary text-sm py-2 px-4">
            Registrieren
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-16 pb-20 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-coral/10 border border-coral/20 mb-8">
          <span className="text-coral text-sm font-medium">Dein Immobilien-Dating startet hier</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold text-cream leading-tight mb-6">
          Swipe dich zu deiner{' '}
          <span className="bg-gradient-to-r from-coral to-berry bg-clip-text text-transparent">
            Traumrendite
          </span>
        </h1>

        <p className="text-lg md:text-xl text-cream/60 max-w-2xl mb-10">
          Rendito findet Immobilien, die zu dir passen. Swipe durch Inserate,
          entdecke dein Match und check den Cashflow – alles in einer App.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/register" className="btn-primary text-lg px-8 py-4">
            Kostenlos starten
          </Link>
          <a href="#features" className="btn-secondary text-lg px-8 py-4">
            So funktioniert&apos;s
          </a>
        </div>

        {/* Mock phone preview */}
        <div className="mt-16 w-72 h-[500px] rounded-[40px] bg-dark-light border-2 border-cream/10 shadow-2xl shadow-coral/10 relative overflow-hidden">
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
            <div className="w-full h-64 rounded-card bg-gradient-to-br from-coral/20 to-berry/20 mb-4 flex items-center justify-center">
              <span className="text-6xl">🏠</span>
            </div>
            <div className="w-full space-y-2 text-left">
              <div className="h-3 w-3/4 bg-cream/10 rounded-full" />
              <div className="h-3 w-1/2 bg-cream/10 rounded-full" />
              <div className="flex gap-2 mt-4">
                <div className="h-8 w-8 rounded-full bg-cream/10" />
                <div className="h-8 w-8 rounded-full bg-coral/30" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-6 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-cream mb-16">
          So funktioniert Rendito
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon="🔥"
            title="Swipe & Entdecke"
            description="Wische durch Immobilien wie bei Tinder. Rechts für Like, links für Weiter. So einfach war Immobiliensuche noch nie."
          />
          <FeatureCard
            icon="💰"
            title="Renditocheck"
            description="Für jedes Match berechnet Rendito sofort den Cashflow. Du siehst auf einen Blick, ob sich der Deal lohnt."
          />
          <FeatureCard
            icon="✨"
            title="AI-Exposés"
            description="Jedes Inserat wird von unserer AI neu aufbereitet – klar, sachlich und mit allen wichtigen Fakten."
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-20 text-center">
        <div className="max-w-2xl mx-auto card-glass p-12">
          <h2 className="text-3xl font-bold text-cream mb-4">
            Bereit für dein erstes Match?
          </h2>
          <p className="text-cream/60 mb-8">
            Melde dich kostenlos an und starte mit 10 Swipes pro Tag.
          </p>
          <Link href="/register" className="btn-primary text-lg px-8 py-4">
            Jetzt loslegen
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-cream/5 px-6 py-8 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FlameIcon size={20} />
            <span className="text-cream font-semibold">Rendito</span>
          </div>
          <div className="flex gap-6 text-cream/40 text-sm">
            <a href="#" className="hover:text-cream transition-colors">Impressum</a>
            <a href="#" className="hover:text-cream transition-colors">Datenschutz</a>
            <a href="#" className="hover:text-cream transition-colors">Kontakt</a>
          </div>
          <p className="text-cream/30 text-sm">© 2026 Rendito. Alle Rechte vorbehalten.</p>
        </div>
      </footer>
    </main>
  );
}

function FlameIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C12 2 4 10 4 14.5C4 18.09 7.58 21 12 21C16.42 21 20 18.09 20 14.5C20 10 12 2 12 2Z"
        fill="url(#flame-gradient)"
      />
      <path
        d="M12 21C14.21 21 16 19.21 16 17C16 14 12 9 12 9C12 9 8 14 8 17C8 19.21 9.79 21 12 21Z"
        fill="#F5C842"
        opacity="0.8"
      />
      <defs>
        <linearGradient id="flame-gradient" x1="4" y1="2" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E8627C" />
          <stop offset="1" stopColor="#8B1E3F" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="card-glass p-8 text-center hover:border-coral/20 transition-colors">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-cream mb-3">{title}</h3>
      <p className="text-cream/50 leading-relaxed">{description}</p>
    </div>
  );
}
