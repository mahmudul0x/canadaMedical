export function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
      <div className="absolute inset-0 bg-gradient-mesh opacity-70" />
      <div className="absolute inset-0 bg-grid opacity-[0.06]" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
      <div className="relative mx-auto max-w-7xl px-4 pt-20 pb-28 lg:px-8 lg:pt-24 lg:pb-36">
        {eyebrow && (
          <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-accent backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-glow" /> {eyebrow}
          </span>
        )}
        <h1 className="animate-fade-up mt-5 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl" style={{ animationDelay: "60ms" }}>
          {title}
        </h1>
        {subtitle && (
          <p className="animate-fade-up mt-5 max-w-2xl text-lg leading-relaxed text-primary-foreground/75" style={{ animationDelay: "120ms" }}>
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
