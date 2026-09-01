import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import {
  resolveStorefrontByHandle,
  getStorefrontProductByHandle,
} from '@/lib/services/storefront-service';
import { PdpActions } from '@/components/storefront/pdp-actions';

export async function generateMetadata(props: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle: productHandle } = await props.params;
  const headerList = await headers();
  const tenantHandle = headerList.get('x-tenant-handle');

  if (!tenantHandle) {
    return { title: 'المنتج | SOUQCLOUD' };
  }

  const store = await resolveStorefrontByHandle(tenantHandle);
  if (!store) {
    return { title: 'المنتج غير متاح' };
  }

  const product = await getStorefrontProductByHandle(store.id, productHandle);
  if (!product) {
    return { title: 'المنتج غير موجود' };
  }

  const firstImage = product.images && product.images.length > 0 ? product.images[0] : null;

  return {
    title: `${product.title} | ${store.name}`,
    description: product.description || `شراء ${product.title} من متجر ${store.name}`,
    openGraph: {
      title: `${product.title} | ${store.name}`,
      description: product.description || undefined,
      images: firstImage ? [{ url: firstImage }] : undefined,
    },
  };
}

export default async function ProductDetailPage(props: {
  params: Promise<{ handle: string }>;
}) {
  const { handle: productHandle } = await props.params;
  const headerList = await headers();
  const tenantHandle = headerList.get('x-tenant-handle');

  if (!tenantHandle) {
    notFound();
  }

  const store = await resolveStorefrontByHandle(tenantHandle);
  if (!store) {
    notFound();
  }

  const product = await getStorefrontProductByHandle(store.id, productHandle);
  if (!product) {
    notFound();
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Breadcrumb Navigation */}
      <nav className="text-xs text-text-muted mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-brand-primary">
          الرئيسية
        </Link>
        <span>/</span>
        <Link href="/#products" className="hover:text-brand-primary">
          المنتجات
        </Link>
        <span>/</span>
        <span className="text-text-primary font-medium">{product.title}</span>
      </nav>

      {/* Two-Column PDP Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Left Column: Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-square bg-slate-100 rounded-card border border-border-subtle overflow-hidden flex items-center justify-center">
            {product.images && product.images.length > 0 && product.images[0] ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={product.images[0]}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-slate-400 text-sm font-medium">لا توجد صورة للمنتج</div>
            )}
          </div>

          {product.images && product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((imgUrl: string, i: number) => (
                <div
                  key={i}
                  className="aspect-square rounded-sm border border-border-subtle overflow-hidden cursor-pointer hover:border-brand-primary"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgUrl} alt={`${product.title} ${i}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Sticky Product Purchase Details */}
        <div className="space-y-6 md:sticky md:top-24 h-fit">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            {product.title}
          </h1>

          {/* Interactive Variant Selection & Add to Cart */}
          <PdpActions variants={product.variants} currency={store.currency} />

          {/* Product Description */}
          {product.description && (
            <div className="pt-4 border-t border-border-subtle space-y-2">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                تفاصيل المنتج
              </h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
