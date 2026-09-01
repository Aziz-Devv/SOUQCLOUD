'use client';

import * as React from 'react';
import { DesignTokens, SectionConfig } from '@/lib/types';
import { generateCssVariables } from '@/lib/theme-engine/tokens';

interface LivePreviewCanvasProps {
  sections: SectionConfig[];
  tokens: DesignTokens;
  selectedSectionId: string | null;
  onSelectSection: (id: string) => void;
  viewport: 'desktop' | 'tablet' | 'mobile';
  storeName: string;
}

export function LivePreviewCanvas({
  sections,
  tokens,
  selectedSectionId,
  onSelectSection,
  viewport,
  storeName,
}: LivePreviewCanvasProps) {
  const cssVariables = generateCssVariables(tokens);

  const getContainerWidth = () => {
    switch (viewport) {
      case 'mobile':
        return 'max-w-[375px]';
      case 'tablet':
        return 'max-w-[768px]';
      default:
        return 'w-full';
    }
  };

  return (
    <div className="flex-1 bg-slate-100 p-4 md:p-6 overflow-y-auto flex justify-center">
      <div
        className={`${getContainerWidth()} bg-white min-h-[600px] shadow-lg rounded-sm overflow-hidden transition-all duration-300 border border-slate-200 flex flex-col`}
        style={
          {
            backgroundColor: tokens.colors.bgCanvas,
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.bodyFont,
          } as React.CSSProperties
        }
      >
        <style>{`:root { ${cssVariables} }`}</style>

        {sections.map((sec) => {
          const isSelected = selectedSectionId === sec.id;
          const settings = sec.settings || {};

          return (
            <div
              key={sec.id}
              onClick={() => onSelectSection(sec.id)}
              className={`relative cursor-pointer transition-all ${
                isSelected
                  ? 'ring-2 ring-brand-primary ring-inset'
                  : 'hover:outline hover:outline-1 hover:outline-dashed hover:outline-sky-400'
              }`}
            >
              {isSelected && (
                <span className="absolute top-1 left-1 z-10 bg-brand-primary text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                  {sec.type}
                </span>
              )}

              {/* Section Type Renderers */}
              {sec.type === 'header' && (
                <header className="p-4 border-b border-border-subtle bg-surface flex items-center justify-between">
                  <div className="font-bold text-lg" style={{ color: tokens.colors.brandPrimary }}>
                    {storeName}
                  </div>
                  {Boolean(settings['show_announcement']) && Boolean(settings['announcement']) ? (
                    <div className="text-xs text-text-secondary bg-brand-subtle px-3 py-1 rounded-full">
                      {String(settings['announcement'])}
                    </div>
                  ) : null}
                  <nav className="flex items-center gap-4 text-xs font-medium text-text-secondary">
                    <span>الرئيسية</span>
                    <span>المنتجات</span>
                    <span>تواصل معنا</span>
                  </nav>
                </header>
              )}

              {sec.type === 'hero' && (
                <section className="py-16 px-6 text-center bg-brand-subtle/30 space-y-4">
                  <h1
                    className="text-2xl md:text-3xl font-extrabold tracking-tight"
                    style={{
                      fontFamily: tokens.typography.headingFont,
                      color: tokens.colors.textPrimary,
                    }}
                  >
                    {String(settings['heading'] || 'مرحباً بك في متجرنا')}
                  </h1>
                  <p className="text-sm max-w-lg mx-auto text-text-secondary">
                    {String(settings['subheading'] || '')}
                  </p>
                  <div>
                    <button
                      type="button"
                      className="px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition-all"
                      style={{
                        backgroundColor: tokens.colors.brandPrimary,
                        borderRadius: tokens.radii.button,
                      }}
                    >
                      {String(settings['cta_text'] || 'تسوق الآن')}
                    </button>
                  </div>
                </section>
              )}

              {sec.type === 'featured_products' && (
                <section className="py-12 px-6 space-y-6">
                  <div className="text-center">
                    <h2
                      className="text-xl font-bold"
                      style={{ fontFamily: tokens.typography.headingFont }}
                    >
                      {String(settings['title'] || 'منتجاتنا المميزة')}
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="p-3 border border-border-subtle bg-surface space-y-2 text-right"
                        style={{ borderRadius: tokens.radii.card }}
                      >
                        <div className="aspect-square bg-slate-100 rounded flex items-center justify-center text-slate-400 text-xs font-mono">
                          صورة منتج #{i}
                        </div>
                        <div className="font-semibold text-xs text-text-primary truncate">
                          منتج مميز عالي الجودة #{i}
                        </div>
                        <div className="font-mono text-xs font-bold text-brand-primary">
                          {(150 * i).toFixed(2)} ر.س
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {sec.type === 'banner' && (
                <section
                  className="p-6 text-center space-y-2 text-white"
                  style={{ backgroundColor: tokens.colors.brandPrimary }}
                >
                  <h3 className="font-bold text-base">{String(settings['title'] || '')}</h3>
                  <p className="text-xs opacity-90">{String(settings['description'] || '')}</p>
                </section>
              )}

              {sec.type === 'rich_text' && (
                <section className="py-10 px-6 max-w-2xl mx-auto text-center space-y-3">
                  <h3
                    className="font-bold text-lg"
                    style={{ fontFamily: tokens.typography.headingFont }}
                  >
                    {String(settings['heading'] || '')}
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {String(settings['content'] || '')}
                  </p>
                </section>
              )}

              {sec.type === 'footer' && (
                <footer className="p-6 border-t border-border-subtle bg-surface text-center space-y-2 text-xs text-text-muted">
                  <div>{String(settings['description'] || '')}</div>
                  <div>{String(settings['copyright'] || 'جميع الحقوق محفوظة.')}</div>
                </footer>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
