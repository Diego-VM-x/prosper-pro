import os

base = os.getcwd()
path = os.path.join(base, 'web', 'app', 'finanzas', 'page.tsx')
with open(path, 'r', encoding='utf-8') as f:
    original = f.read()
lines = original.split('\n')
start_content_idx = None
modal_tx_idx = None
style_idx = None
for i, line in enumerate(lines):
    if '<div className="finanzas-page">' in line:
        start_content_idx = i
    if '{/* Modal Transacción */}' in line:
        modal_tx_idx = i
    if "<style>{`" in line:
        style_idx = i
print(f"start={start_content_idx} modal={modal_tx_idx} style={style_idx}")
if start_content_idx is None or modal_tx_idx is None or style_idx is None:
    raise ValueError("Markers not found")
head = '\n'.join(lines[:start_content_idx+1])
modals = '\n'.join(lines[modal_tx_idx:style_idx])
style_block = '\n'.join(lines[style_idx:])
with open(os.path.join(base, 'web', 'app', 'finanzas', 'page_head.txt'), 'w', encoding='utf-8') as f:
    f.write(head)
with open(os.path.join(base, 'web', 'app', 'finanzas', 'page_modals.txt'), 'w', encoding='utf-8') as f:
    f.write(modals)
with open(os.path.join(base, 'web', 'app', 'finanzas', 'page_style.txt'), 'w', encoding='utf-8') as f:
    f.write(style_block)
print("Split done")
