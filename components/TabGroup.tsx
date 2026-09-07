'use client';

export type TabItem = { key: string; label: string; href?: string; onClick?: () => void };

export default function TabGroup({ items, activeKey }: { items: TabItem[]; activeKey: string }) {
  if (items.length <= 1) return null; // a single option isn't a filter — don't render it

  return (
    <div className="inline-flex flex-wrap gap-1 bg-[#1f2937] rounded-xl p-1 border border-white/10">
      {items.map((item) => {
        const isActive = item.key === activeKey;
        const className = `px-5 py-2.5 rounded-lg text-[10px] font-mono font-medium uppercase tracking-widest transition-all duration-200 ${
          isActive ? 'bg-flag-red text-white' : 'text-white/50 hover:text-white hover:bg-white/5'
        }`;
        return item.href ? (
          <a key={item.key} href={item.href} className={className}>{item.label}</a>
        ) : (
          <button key={item.key} onClick={item.onClick} className={className}>{item.label}</button>
        );
      })}
    </div>
  );
}
