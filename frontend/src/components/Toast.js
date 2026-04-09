import React, { useEffect } from 'react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => onClose && onClose(), toast.duration || 4000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const colors = {
    success: { bg: '#ecfdf5', border: '#10b981', text: '#065f46' },
    error: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
    info: { bg: '#eff6ff', border: '#2563eb', text: '#1e3a8a' },
  };

  const c = colors[toast.type] || colors.info;

  return (
    <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 9999 }}>
      <div style={{ minWidth: 300, maxWidth: 420, borderRadius: 12, background: c.bg, border: `1.5px solid ${c.border}`, boxShadow: '0 12px 40px rgba(2,6,23,0.12)', padding: '12px 14px', color: c.text, fontWeight: 700 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${c.border}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '⚠️' : 'ℹ️'}</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 14 }}>{toast.title}</div>
              {toast.message && <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, color: c.text }}>{toast.message}</div>}
            </div>
          </div>
          <button onClick={() => onClose && onClose()} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, color: c.text }}>✕</button>
        </div>
      </div>
    </div>
  );
}
