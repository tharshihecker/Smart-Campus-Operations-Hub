import re

path = r'c:\Destop\it3030-paf-2026-smart-campus-group15(NU)\IT3030-PAF-2026-smart-campus-NUSLIIT_JFN3\frontend\src\user\Incidents.js'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

replacements = [
    ("'#ffffff'", "'var(--bg-card)'"),
    ("'#f9fafb'", "'transparent'"),
    ("'#f8faff'", "'var(--bg-surface)'"),
    ("'#f0f4ff'", "'var(--bg-glass-hover)'"),
    ("'#f3f4f6'", "'var(--bg-card-hover)'"),
    ("'#111827'", "'var(--text-primary)'"),
    ("'#374151'", "'var(--text-secondary)'"),
    ("'#6b7280'", "'var(--text-muted)'"),
    ("'#9ca3af'", "'var(--text-muted)'"),
    ("'#2563eb'", "'var(--brand-teal)'"),
    ("'#1e40af'", "'var(--text-primary)'"),
    ("'#1d4ed8'", "'var(--brand-teal)'"),
    ("'#059669'", "'var(--brand-accent)'"),
    ("'#065f46'", "'var(--brand-accent)'"),
    ("'#dc2626'", "'var(--brand-danger)'"),
    ("'#991b1b'", "'var(--brand-danger)'"),
    ("'#d97706'", "'var(--brand-warning)'"),
    ("'#e5e7eb'", "'var(--border-subtle)'"),
    ("'#d1d5db'", "'var(--border-medium)'"),
    ("'#dbeafe'", "'rgba(14, 165, 233, 0.1)'"),
    ("'#eff6ff'", "'rgba(14, 165, 233, 0.05)'"),
    ("'#ecfdf5'", "'rgba(16, 185, 129, 0.1)'"),
    ("'#fef2f2'", "'rgba(239, 68, 68, 0.1)'"),
    ("'#fffbeb'", "'rgba(245, 158, 11, 0.1)'"),
    ("'rgba(0,0,0,0.05)'", "'var(--shadow-sm)'"),
    ("'rgba(0,0,0,0.06)'", "'var(--shadow-sm)'"),
    ("'0 1px 6px rgba(0,0,0,0.05)'", "'var(--shadow-sm)'"),
    ("'0 2px 10px rgba(0,0,0,0.06)'", "'var(--shadow-sm)'"),
    ("backgroundColor: '#ffffff'", "backgroundColor: 'var(--bg-card)'"),
    ("color: '#111827'", "color: 'var(--text-primary)'"),
    ("background: 'linear-gradient(135deg, #2563eb, #1d4ed8)'", "background: 'var(--gradient-brand)'"),
]

for old, new in replacements:
    code = code.replace(old, new)

# Also fix the global STYLE injected
code = code.replace('.inc-root select { background-color: #ffffff !important; color: #111827 !important; }', '.inc-root select { background-color: var(--bg-card) !important; color: var(--text-primary) !important; border: 1px solid var(--border-medium); }')
code = code.replace('.inc-root select option { background-color: #ffffff !important; color: #111827 !important; }', '.inc-root select option { background-color: var(--bg-card) !important; color: var(--text-primary) !important; }')
code = code.replace('#2563eb', 'var(--brand-teal)')
code = code.replace('#f0f4ff', 'var(--bg-glass-hover)')

# Remove root hardcoded background and max-width if needed
code = code.replace("style={{ maxWidth: 920, margin: '0 auto', padding: '32px 16px', background: 'transparent', minHeight: '100vh' }}", "className=\"profile-shell\"")

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print('Replaced inline colors successfully!')
