import About from './About';
import Services from './Services';

interface HomeProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export function Home({ onOpenAuth }: HomeProps) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* HERO SECTION WITH FULL-BACKGROUND VIDEO */}
      <section className="relative w-full h-[90vh] flex items-center justify-center overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-black/50 bg-linear-to-t from-slate-900 via-black/40 to-black/60 z-10" />

        <div className="relative z-20 max-w-5xl mx-auto px-6 text-center space-y-6">
          <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-medium text-xs tracking-wide backdrop-blur-md">
            ⚡ Direct Farmer-to-Consumer Ecosystem
          </span>

          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight drop-shadow-md">
            Connecting Farmers Directly <br />
            with Consumers & Bulk Buyers
          </h1>

          <p className="text-slate-200 max-w-2xl mx-auto text-base md:text-lg font-light leading-relaxed drop-shadow">
            Farm2Fork eliminates middleman commissions, provides AI-driven crop price recommendations, and optimizes smart logistics routes.
          </p>

          <div className="flex justify-center gap-4 pt-2">
            <button
              onClick={() => onOpenAuth('register')}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg transition-all"
            >
              Get Started →
            </button>
            <button
              onClick={() => onOpenAuth('login')}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 backdrop-blur-md transition-all"
            >
              Sign In to Shop
            </button>
          </div>
        </div>
      </section>

      {/* SCROLLING SECTIONS */}
      <section id="services">
        <Services />
      </section>

      <section id="about">
        <About />
      </section>
    </div>
  );
}