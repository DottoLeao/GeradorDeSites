import Image from "next/image";
import type { UniversalContent } from "@/lib/schemas/templates";

interface UniversalTemplateProps {
  content: UniversalContent;
}

export function UniversalTemplate({ content }: UniversalTemplateProps) {
  const { theme, contact, hours } = content;

  return (
    <div
      className="min-h-screen bg-white text-slate-900"
      style={{ "--primary": theme.primaryColor } as React.CSSProperties}
    >
      {/* Hero */}
      <header className="relative min-h-[70vh] flex items-center">
        {content.heroImage && (
          <Image
            src={content.heroImage}
            alt={content.businessName}
            fill
            className="object-cover"
            priority
            unoptimized={content.heroImage.includes("googleapis.com")}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" />
        <div className="relative z-10 mx-auto max-w-6xl px-6 py-20 text-white">
          {content.logoUrl && (
            <Image
              src={content.logoUrl}
              alt="Logo"
              width={80}
              height={80}
              className="mb-6 rounded-xl"
              unoptimized
            />
          )}
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            {content.businessName}
          </h1>
          <p className="mt-4 max-w-xl text-xl text-white/90">{content.tagline}</p>
          <a
            href={`tel:${contact.phone}`}
            className="mt-8 inline-flex items-center rounded-full px-8 py-3 text-lg font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: theme.primaryColor }}
          >
            {content.cta.buttonText}
          </a>
        </div>
      </header>

      {/* About */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-3xl font-bold" style={{ color: theme.primaryColor }}>
              {content.about.title}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              {content.about.content}
            </p>
            <p className="mt-4 text-slate-600">{content.description}</p>
          </div>
          {content.about.image && (
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-xl">
              <Image
                src={content.about.image}
                alt={content.about.title}
                fill
                className="object-cover"
                unoptimized={content.about.image.includes("googleapis.com")}
              />
            </div>
          )}
        </div>
      </section>

      {/* Services */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold">Nossos Serviços</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {content.services.map((service, i) => (
              <div
                key={i}
                className="rounded-2xl bg-white p-8 shadow-sm transition-shadow hover:shadow-md"
              >
                <div
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  <span className="text-xl font-bold">{i + 1}</span>
                </div>
                <h3 className="text-xl font-semibold">{service.title}</h3>
                <p className="mt-2 text-slate-600">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      {content.gallery.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center text-3xl font-bold">Galeria</h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {content.gallery.map((img, i) => (
              <div
                key={i}
                className="relative aspect-square overflow-hidden rounded-2xl"
              >
                <Image
                  src={img}
                  alt={`Galeria ${i + 1}`}
                  fill
                  className="object-cover transition-transform hover:scale-105"
                  unoptimized={img.includes("googleapis.com")}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Hours & Contact */}
      <section className="bg-slate-900 py-20 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold">Horário de Funcionamento</h2>
              <dl className="mt-6 space-y-3">
                {Object.entries(hours).map(([day, time]) => (
                  <div key={day} className="flex justify-between border-b border-white/10 pb-2">
                    <dt className="capitalize text-white/70">
                      {dayLabels[day] ?? day}
                    </dt>
                    <dd>{time}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div>
              <h2 className="text-3xl font-bold">Contato</h2>
              <div className="mt-6 space-y-4">
                {contact.phone && (
                  <p>
                    <span className="text-white/70">Telefone: </span>
                    <a href={`tel:${contact.phone}`} className="hover:underline">
                      {contact.phone}
                    </a>
                  </p>
                )}
                {contact.email && (
                  <p>
                    <span className="text-white/70">Email: </span>
                    <a href={`mailto:${contact.email}`} className="hover:underline">
                      {contact.email}
                    </a>
                  </p>
                )}
                <p>
                  <span className="text-white/70">Endereço: </span>
                  {contact.address}
                </p>
                {contact.mapsUrl && (
                  <a
                    href={contact.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-lg px-6 py-3 font-medium text-white"
                    style={{ backgroundColor: theme.accentColor }}
                  >
                    Ver no Google Maps
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-16 text-center text-white"
        style={{ backgroundColor: theme.primaryColor }}
      >
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-3xl font-bold">{content.cta.title}</h2>
          <p className="mt-4 text-lg opacity-90">{content.cta.subtitle}</p>
          <a
            href={`tel:${contact.phone}`}
            className="mt-8 inline-flex rounded-full bg-white px-8 py-3 text-lg font-semibold transition-opacity hover:opacity-90"
            style={{ color: theme.primaryColor }}
          >
            {content.cta.buttonText}
          </a>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} {content.businessName}. Todos os direitos reservados.
      </footer>
    </div>
  );
}

const dayLabels: Record<string, string> = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo",
};
