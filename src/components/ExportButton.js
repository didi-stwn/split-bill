import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';

export default function ExportButton({ itemsSectionRef, summarySectionRef }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:absolute;left:-9999px;top:0;background:#fff;padding:24px;font-family:system-ui,-apple-system,sans-serif;color:#1e293b;width:700px';

      // Title
      const title = document.createElement('div');
      title.style.cssText = 'font-size:22px;font-weight:700;margin-bottom:16px;color:#1e293b';
      title.textContent = 'SplitBill';
      wrapper.appendChild(title);

      if (itemsSectionRef?.current) {
        const clone = itemsSectionRef.current.cloneNode(true);

        // 1. Replace PersonSelect with plain text name (BEFORE removing buttons,
        //    because .person-select-trigger is a <button> element)
        clone.querySelectorAll('.person-select').forEach((sel) => {
          const trigger = sel.querySelector('.person-select-trigger span');
          const name = trigger?.textContent || '—';
          const textSpan = document.createElement('span');
          textSpan.textContent = name;
          textSpan.style.cssText = 'font-size:0.85rem;font-weight:500;color:#475569';
          sel.parentNode?.replaceChild(textSpan, sel);
        });

        // 2. Remove disabled Override Bill Tax rows (checkbox unchecked)
        clone.querySelectorAll('.bill-meta-row').forEach((row) => {
          const label = row.querySelector('.bill-paidby-label');
          if (label && label.textContent?.trim() === 'Override Bill Tax') {
            const checkbox = row.querySelector('input[type="checkbox"]');
            if (!checkbox || !checkbox.checked) {
              row.remove();
            }
          }
        });

        // 3. Remove interactive elements (checkboxes already removed, but keep
        //    the rows that contain Override Bill Tax if enabled)
        clone.querySelectorAll('button, details, .quick-person-row, [type="submit"], [type="checkbox"]').forEach((el) => el.remove());

        // 4. Replace remaining inputs with text spans (only bill name inputs remain)
        clone.querySelectorAll('input').forEach((el) => {
          const span = document.createElement('span');
          // For bill name inputs, keep the value; for any stray inputs, use value
          span.textContent = el.value || '';
          if (el.className === 'bill-name-input') {
            span.style.cssText = 'font-size:0.95rem;font-weight:600;color:#1e293b';
          } else {
            span.style.cssText = 'font-size:0.9rem;color:#1e293b';
          }
          el.parentNode?.replaceChild(span, el);
        });

        // 5. Clean up input wrapper divs (containing a % span child):
        //    - In .tax-row (global tax): remove entirely so only label + amount remain
        clone.querySelectorAll('.tax-row').forEach((row) => {
          row.querySelectorAll('div').forEach((wrapper) => {
            const kids = wrapper.children;
            if (kids.length >= 2) {
              const last = kids[kids.length - 1];
              if (last?.textContent?.trim() === '%') {
                wrapper.remove();
              }
            }
          });
        });
        //    - In .bill-meta-row (Override Bill Tax): replace the border-wrapper div with
        //      a clean text span showing e.g. "20%"
        clone.querySelectorAll('.bill-meta-row').forEach((row) => {
          const label = row.querySelector('.bill-paidby-label');
          if (label && label.textContent?.trim() === 'Override Bill Tax') {
            // Find the border wrapper div (contains the number + % span)
            row.querySelectorAll('div[style*="border"]').forEach((wrapper) => {
              const kids = wrapper.children;
              if (kids.length >= 2) {
                const last = kids[kids.length - 1];
                if (last?.textContent?.trim() === '%') {
                  const firstText = kids[0]?.textContent?.trim() || '0';
                  const valueSpan = document.createElement('span');
                  valueSpan.textContent = firstText + '%';
                  valueSpan.style.cssText = 'font-size:0.85rem;font-weight:600;color:#334155';
                  wrapper.parentNode?.replaceChild(valueSpan, wrapper);
                }
              }
            });
          }
        });

        wrapper.appendChild(clone);
      }

      if (summarySectionRef?.current) {
        const clone2 = summarySectionRef.current.cloneNode(true);
        // Remove settlement buttons (checkboxes)
        clone2.querySelectorAll('.settlement-check').forEach((el) => el.remove());
        wrapper.appendChild(clone2);
      }

      document.body.appendChild(wrapper);

      const canvas = await html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        allowTaint: false,
      });

      document.body.removeChild(wrapper);

      const link = document.createElement('a');
      link.download = 'splitbill-export.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className="btn btn-primary btn-block"
      onClick={handleExport}
      disabled={loading}
      style={{ marginTop: 16 }}
    >
      {loading ? (
        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
      ) : (
        <Download size={16} />
      )}
      {' '}Export as PNG
    </button>
  );
}
