export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-canvas">
      <div className="max-w-md w-full p-8 rounded-md bg-surface border border-border-subtle shadow-card space-y-4">
        <h1 className="text-2xl font-bold text-text-primary">
          SOUQCLOUD
        </h1>
        <p className="text-sm text-text-secondary">
          منصة التجارة الإلكترونية السحابية — منصة المتاجر المتعددة المستأجرين
        </p>
        <div className="pt-4 border-t border-border-subtle text-xs text-text-muted">
          Foundation Phase — System Ready
        </div>
      </div>
    </main>
  );
}
