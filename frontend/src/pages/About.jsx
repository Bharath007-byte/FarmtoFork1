import farmTechImg from '../assets/farm-tech.png';

export default function About() {
  return (
    <div className="py-20 bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          
          {/* Left Side Info */}
          <div className="space-y-6">
            <span className="text-emerald-400 font-semibold text-xs tracking-widest uppercase bg-emerald-950/60 border border-emerald-800/40 px-3 py-1 rounded-md inline-block">
              ABOUT FARM2FORK
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
              Bridging the Gap Between Field & Fork
            </h2>
            <p className="text-slate-300 text-base leading-relaxed">
              Inspired by the rapid accessibility of modern quick-commerce and the authentic pricing of local Rythu Bazaars, Farm2Fork connects farmers directly with consumers and bulk commercial buyers.
            </p>
            <p className="text-slate-400 text-sm leading-relaxed">
              We leverage smart logistics routes, automated grading, and direct distribution to eliminate high commissions, ensure zero produce wasted, and get fresh crops delivered at peak quality.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <p className="text-2xl font-black text-emerald-400">100%</p>
                <p className="text-xs text-slate-400 mt-1 font-medium">Traceable Organic Quality</p>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <p className="text-2xl font-black text-teal-300">0%</p>
                <p className="text-xs text-slate-400 mt-1 font-medium">Middleman Commissions</p>
              </div>
            </div>
          </div>

          {/* Right Side Image Box */}
          <div className="w-full flex justify-center">
            <img
              src={farmTechImg}
              alt="Farm tech"
              className="rounded-2xl border border-slate-800 shadow-2xl max-h-96 w-full object-cover"
            />
          </div>

        </div>
      </div>
    </div>
  );
}