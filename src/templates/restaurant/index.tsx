import Image from "next/image";
import type { RestaurantContent } from "@/lib/schemas/templates";

interface RestaurantTemplateProps {
  content: RestaurantContent;
}

export function RestaurantTemplate({ content }: RestaurantTemplateProps) {
  const { theme, contact, hours, menu } = content;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      {/* Hero */}
      <header className="relative min-h-[80vh] flex items-end">
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="relative z-10 w-full px-6 pb-16 pt-32">
          <div className="mx-auto max-w-6xl">
            {content.cuisine && (
              <span
                className="inline-block rounded-full px-4 py-1 text-sm font-medium text-white"
                style={{ backgroundColor: theme.accentColor }}
              >
                {content.cuisine}
              </span>
            )}
            <h1 className="mt-4 text-5xl font-bold tracking-tight text-white sm:text-7xl">
              {content.businessName}
            </h1>
            <p className="mt-4 max-w-2xl text-xl text-white/90">{content.tagline}</p>
          </div>
        </div>
      </header>

      {/* About */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <h2
            className="text-3xl font-bold"
            style={{ color: theme.primaryColor }}
          >
            {content.about.title}
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-stone-600">
            {content.about.content}
          </p>
        </div>
      </section>

      {/* Menu */}
      {menu && menu.length > 0 && (
        <section className="bg-white py-20">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-center text-4xl font-bold">Cardápio</h2>
            <div className="mt-12 space-y-12">
              {menu.map((category, ci) => (
                <div key={ci}>
                  <h3
                    className="border-b-2 pb-2 text-2xl font-semibold"
                    style={{ borderColor: theme.primaryColor, color: theme.primaryColor }}
                  >
                    {category.category}
                  </h3>
                  <div className="mt-6 space-y-6">
                    {category.items.map((item, ii) => (
                      <div
                        key={ii}
                        className="flex items-start justify-between gap-4"
                      >
                        <div>
                          <h4 className="text-lg font-semibold">{item.name}</h4>
                          <p className="mt-1 text-stone-500">{item.description}</p>
                        </div>
                        <span
                          className="shrink-0 font-bold"
                          style={{ color: theme.accentColor }}
                        >
                          {item.price}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Services / Highlights */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold">Destaques</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {content.services.map((service, i) => (
              <div
                key={i}
                className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm"
              >
                <h3 className="text-xl font-semibold">{service.title}</h3>
                <p className="mt-2 text-stone-600">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      {content.gallery.length > 0 && (
        <section className="bg-stone-900 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-3xl font-bold text-white">
              Nossa Cozinha
            </h2>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {content.gallery.map((img, i) => (
                <div
                  key={i}
                  className="relative aspect-[4/3] overflow-hidden rounded-2xl"
                >
                  <Image
                    src={img}
                    alt={`Prato ${i + 1}`}
                    fill
                    className="object-cover"
                    unoptimized={img.includes("googleapis.com")}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Hours & Contact */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 md:grid-cols-2">
          <div
            className="rounded-2xl p-8 text-white"
            style={{ backgroundColor: theme.primaryColor }}
          >
            <h2 className="text-2xl font-bold">Horários</h2>
            <dl className="mt-6 space-y-2">
              {Object.entries(hours).map(([day, time]) => (
                <div key={day} className="flex justify-between">
                  <dt className="capitalize opacity-80">{dayLabels[day] ?? day}</dt>
                  <dd>{time}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold">Reservas & Contato</h2>
            <div className="mt-6 space-y-4">
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="block text-lg font-semibold hover:underline"
                  style={{ color: theme.primaryColor }}
                >
                  {contact.phone}
                </a>
              )}
              <p className="text-stone-600">{contact.address}</p>
              {contact.mapsUrl && (
                <a
                  href={contact.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex rounded-lg px-6 py-3 font-medium text-white"
                  style={{ backgroundColor: theme.accentColor }}
                >
                  Como Chegar
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-stone-500">
        © {new Date().getFullYear()} {content.businessName}
      </footer>
    </div>
  );
}

const dayLabels: Record<string, string> = {
  monday: "Segunda",
  tuesday: "Terça",
  wednesday: "Quarta",
  thursday: "Quinta",
  friday: "Sexta",
  saturday: "Sábado",
  sunday: "Domingo",
};
