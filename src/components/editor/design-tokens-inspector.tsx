'use client';

import { DesignTokens } from '@/lib/types';
import { Input } from '@/components/ui/input';

interface DesignTokensInspectorProps {
  tokens: DesignTokens;
  onUpdateTokens: (tokens: DesignTokens) => void;
}

export function DesignTokensInspector({
  tokens,
  onUpdateTokens,
}: DesignTokensInspectorProps) {
  const handleColorChange = (key: keyof DesignTokens['colors'], val: string) => {
    onUpdateTokens({
      ...tokens,
      colors: {
        ...tokens.colors,
        [key]: val,
      },
    });
  };

  const handleFontChange = (key: keyof DesignTokens['typography'], val: string) => {
    onUpdateTokens({
      ...tokens,
      typography: {
        ...tokens.typography,
        [key]: val,
      },
    });
  };

  return (
    <div className="space-y-5">
      <div className="border-b border-border-subtle pb-3">
        <h3 className="text-sm font-bold text-text-primary">ألوان وهوية المتجر (Colors)</h3>
        <p className="text-xs text-text-secondary mt-0.5">تخصيص الألوان الأساسية للقالب</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="token-primary" className="text-xs font-semibold text-text-primary">
            اللون الرئيسي (Brand Primary)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={tokens.colors.brandPrimary}
              onChange={(e) => handleColorChange('brandPrimary', e.target.value)}
              className="w-7 h-7 rounded border border-border-strong cursor-pointer"
            />
            <input
              id="token-primary"
              type="text"
              value={tokens.colors.brandPrimary}
              onChange={(e) => handleColorChange('brandPrimary', e.target.value)}
              className="w-20 p-1 font-mono text-xs border border-border-strong rounded text-left"
              dir="ltr"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <label htmlFor="token-canvas" className="text-xs font-semibold text-text-primary">
            لون خلفية الصفحة (Background Canvas)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={tokens.colors.bgCanvas}
              onChange={(e) => handleColorChange('bgCanvas', e.target.value)}
              className="w-7 h-7 rounded border border-border-strong cursor-pointer"
            />
            <input
              id="token-canvas"
              type="text"
              value={tokens.colors.bgCanvas}
              onChange={(e) => handleColorChange('bgCanvas', e.target.value)}
              className="w-20 p-1 font-mono text-xs border border-border-strong rounded text-left"
              dir="ltr"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <label htmlFor="token-text" className="text-xs font-semibold text-text-primary">
            لون النصوص الأساسي (Text Primary)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={tokens.colors.textPrimary}
              onChange={(e) => handleColorChange('textPrimary', e.target.value)}
              className="w-7 h-7 rounded border border-border-strong cursor-pointer"
            />
            <input
              id="token-text"
              type="text"
              value={tokens.colors.textPrimary}
              onChange={(e) => handleColorChange('textPrimary', e.target.value)}
              className="w-20 p-1 font-mono text-xs border border-border-strong rounded text-left"
              dir="ltr"
            />
          </div>
        </div>
      </div>

      <div className="border-b border-border-subtle pb-3 pt-2">
        <h3 className="text-sm font-bold text-text-primary">الخطوط والطباعة (Typography)</h3>
      </div>

      <div className="space-y-3">
        <Input
          id="token-font-heading"
          label="خط العناوين (Heading Font)"
          value={tokens.typography.headingFont}
          onChange={(e) => handleFontChange('headingFont', e.target.value)}
        />

        <Input
          id="token-font-body"
          label="خط النصوص (Body Font)"
          value={tokens.typography.bodyFont}
          onChange={(e) => handleFontChange('bodyFont', e.target.value)}
        />
      </div>
    </div>
  );
}
