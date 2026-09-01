import Link from 'next/link';
import { SectionConfig } from '@/lib/types';
import { PublicStore, StorefrontProductDetail } from '@/lib/services/storefront-service';
import { CartTriggerButton } from './cart-trigger-button';

interface ThemeSectionRendererProps {
  section: SectionConfig;
  store: PublicStore;
  products?: StorefrontProductDetail[];
}

export function ThemeSectionRenderer({
  section,
  store,
  products = [],
}: ThemeSectionRendererProps) {
  const settings = section.settings || {};

  switch (section.type) {
    case 'header': {
      const showAnnouncement = Boolean(settings['show_announcement']);
      const announcement = String(settings['announcement'] || '');

      return (
        <header className="border-b border-border-subtle bg-surface sticky top-0 z-30 shadow-xs">
          {showAnnouncement && announcement && (
            <div className="bg-brand-primary text-white text-xs py-1.5 px-4 text-center font-medium">
              {announcement}
            </div>
          )}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="font-extrabold text-xl tracking-tight text-brand-primary">
              {store.name}
            </Link>

            <nav className="hidden md:flex items-center space-x-6 space-x-reverse text-sm font-medium text-text-secondary">
              <Link href="/" className="hover:text-brand-primary transition-colors">
                الرئيسية
              </Link>
              <Link href="/#products" className="hover:text-brand-primary transition-colors">
                المنتجات
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold px-2 py-1 bg-surface border border-border-subtle rounded text-text-secondary">
                {store.currency}
              </span>
              <CartTriggerButton />
            </div>
          </div>
        </header>
      );
    }

    case 'hero': {
      const heading = String(settings['heading'] || `مرحباً بك في متجر ${store.name}`);
      const subheading = String(settings['subheading'] || '');
      const ctaText = String(settings['cta_text'] || 'تسوق الآن');

      return (
        <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 text-center bg-brand-subtle/20 border-b border-border-subtle">
          <div className="max-w-3xl mx-auto space-y-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-text-primary tracking-tight">
              {heading}
            </h1>
            {subheading && (
              <p className="text-sm sm:text-base text-text-secondary max-w-xl mx-auto leading-relaxed">
                {subheading}
              </p>
            )}
            <div className="pt-2">
              <Link
                href="/#products"
                className="inline-block px-8 py-3 bg-brand-primary text-white font-semibold text-sm rounded-btn shadow-md hover:bg-brand-hover transition-all"
              >
                {ctaText}
              </Link>
            </div>
          </div>
        </section>
      );
    }

    case 'featured_products': {
      const title = String(settings['title'] || 'منتجاتنا المميزة');
      const displayProducts = products.slice(0, 8);

      return (
        <section id="products" className="py-12 md:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-text-primary tracking-tight">{title}</h2>
            <div className="w-12 h-1 bg-brand-primary mx-auto rounded-full" />
          </div>

          {displayProducts.length === 0 ? (
            <div className="p-8 text-center bg-surface border border-dashed border-border-subtle rounded-card text-text-secondary text-sm">
              لا توجد منتجات معروضة حالياً في هذا القسم.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {displayProducts.map((product) => {
                const primaryVariant = product.variants[0];
                const price = primaryVariant
                  ? (primaryVariant.priceCents / 100).toFixed(2)
                  : '0.00';
                const comparePrice = primaryVariant?.compareAtPriceCents
                  ? (primaryVariant.compareAtPriceCents / 100).toFixed(2)
                  : null;

                return (
                  <Link
                    key={product.id}
                    href={`/products/${product.handle}`}
                    className="group bg-surface border border-border-subtle rounded-card overflow-hidden hover:shadow-card transition-all flex flex-col"
                  >
                    <div className="aspect-square bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-mono group-hover:scale-105 transition-transform duration-300">
                      {product.images && product.images.length > 0 ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>لا توجد صورة</span>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                      <h3 className="font-semibold text-xs sm:text-sm text-text-primary line-clamp-2">
                        {product.title}
                      </h3>
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-sm sm:text-base font-bold text-brand-primary">
                          {price} {store.currency}
                        </span>
                        {comparePrice && (
                          <span className="font-mono text-xs text-text-muted line-through">
                            {comparePrice} {store.currency}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      );
    }

    case 'banner': {
      const bannerTitle = String(settings['title'] || '');
      const description = String(settings['description'] || '');

      return (
        <section className="bg-brand-primary text-white py-10 px-4 sm:px-6 lg:px-8 text-center my-8">
          <div className="max-w-2xl mx-auto space-y-2">
            {bannerTitle && <h3 className="text-xl font-bold">{bannerTitle}</h3>}
            {description && <p className="text-xs sm:text-sm opacity-90">{description}</p>}
          </div>
        </section>
      );
    }

    case 'rich_text': {
      const heading = String(settings['heading'] || '');
      const content = String(settings['content'] || '');

      return (
        <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto text-center space-y-4">
          {heading && <h3 className="text-2xl font-bold text-text-primary">{heading}</h3>}
          {content && (
            <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
              {content}
            </div>
          )}
        </section>
      );
    }

    case 'footer': {
      const description = String(settings['description'] || `متجر ${store.name} الإلكتروني`);
      const copyright = String(
        settings['copyright'] || `© ${new Date().getFullYear()} ${store.name}. جميع الحقوق محفوظة.`
      );

      return (
        <footer className="border-t border-border-subtle bg-surface py-10 px-4 sm:px-6 lg:px-8 text-center space-y-4 text-xs text-text-muted">
          <div className="max-w-md mx-auto">{description}</div>
          <div>{copyright}</div>
          <div className="pt-2 text-[11px] text-text-muted">
            مشغل بواسطة منصة <span className="font-bold text-text-primary">SOUQCLOUD</span>
          </div>
        </footer>
      );
    }

    default:
      return null;
  }
}
