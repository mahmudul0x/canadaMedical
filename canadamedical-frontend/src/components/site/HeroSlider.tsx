import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import heroNiagara from "@/assets/hero-canada.jpg";
import heroToronto from "@/assets/hero-toronto.jpg";
import heroRockies from "@/assets/hero-rockies.jpg";
import heroHospital from "@/assets/hero-hospital.jpg";

const slides = [
  { src: heroNiagara, label: "Niagara Falls, ON", caption: "Practice in iconic Canadian cities" },
  { src: heroToronto, label: "Toronto, ON", caption: "Lead at world-class urban hospitals" },
  { src: heroRockies, label: "Banff, AB", caption: "Find balance in breathtaking landscapes" },
  { src: heroHospital, label: "Modern facilities", caption: "Work alongside Canada's top clinical teams" },
];

export function HeroSlider() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, []);

  const go = (dir: number) => setI((p) => (p + dir + slides.length) % slides.length);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {slides.map((s, idx) => (
        <img
          key={s.src}
          src={s.src}
          alt={s.label}
          width={1920}
          height={1080}
          loading={idx === 0 ? "eager" : "lazy"}
          className={`absolute inset-0 h-full w-full object-cover transition-all duration-[1400ms] ease-out ${
            idx === i ? "scale-100 opacity-100" : "scale-105 opacity-0"
          }`}
        />
      ))}
      {/* Cinematic overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/85 via-primary/65 to-primary/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-transparent to-transparent" />

      {/* Slide caption */}
      <div className="pointer-events-none absolute bottom-6 right-6 z-10 hidden text-right text-primary-foreground/80 md:block">
        <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">{slides[i].label}</div>
        <div className="mt-1 text-sm">{slides[i].caption}</div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 left-6 z-10 flex items-center gap-3">
        <button
          aria-label="Previous slide"
          onClick={() => go(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground backdrop-blur transition hover:bg-primary-foreground/20"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          aria-label="Next slide"
          onClick={() => go(1)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground backdrop-blur transition hover:bg-primary-foreground/20"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <div className="ml-2 flex gap-1.5">
          {slides.map((_, idx) => (
            <button
              key={idx}
              aria-label={`Go to slide ${idx + 1}`}
              onClick={() => setI(idx)}
              className={`h-1.5 rounded-full transition-all ${idx === i ? "w-8 bg-accent" : "w-4 bg-primary-foreground/40 hover:bg-primary-foreground/60"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}