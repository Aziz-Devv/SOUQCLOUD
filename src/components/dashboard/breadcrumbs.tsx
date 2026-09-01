import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="مسار التنقل" className={`flex items-center text-xs text-text-secondary ${className}`}>
      <ol className="flex items-center space-x-1.5 space-x-reverse flex-wrap">
        <li>
          <Link href="/app/home" className="hover:text-text-primary transition-colors">
            الرئيسية
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center space-x-1.5 space-x-reverse">
              <span className="text-border-strong select-none">/</span>
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-text-primary transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className="font-semibold text-text-primary" aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
