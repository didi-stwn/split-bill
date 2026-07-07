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

        // 2. Remove disabled Override Bill Tax and Discount rows (checkbox unchecked)
        clone.querySelectorAll('.bill-meta-row').forEach((row) => {
          const label = row.querySelector('.bill-paidby-label');
          if (!label) return;
          const labelText = label.textContent?.trim();
          if (labelText === 'Bill Tax' || labelText === 'Discount') {
            const checkbox = row.querySelector('input[type="checkbox"]');
            if (!checkbox || !checkbox.checked) {
              row.remove();
            }
          }
        });

        // 3. Remove interactive elements (checkboxes already removed, but keep
        //    the rows that contain Override Bill Tax if enabled)
        clone.querySelectorAll('button, details, .quick-person-row, [type="submit"], [type="checkbox"]').forEach((el) => el.remove());

        // 4. Replace remaining inputs with text spans
        clone.querySelectorAll('input').forEach((el) => {
          const span = document.createElement('span');
          span.textContent = el.value || '';
          if (el.className === 'bill-name-input') {
            span.style.cssText = 'font-size:0.95rem;font-weight:600;color:#1e293b';
          } else {
            span.style.cssText = 'font-size:0.9rem;color:#1e293b';
          }
          el.parentNode?.replaceChild(span, el);
        });

        // 5. For Override Bill Tax / Discount rows: replace the entire border-wrapper div
        //    (which looks like an input box) with a clean text value like "20%" or "30,000"
        clone.querySelectorAll('.bill-meta-row').forEach((row) => {
          const label = row.querySelector('.bill-paidby-label');
          if (!label) return;
          const labelText = label.textContent?.trim();
          if (labelText === 'Bill Tax' || labelText === 'Discount') {
            // Replace the border-wrapper div (contains number input value + %/Rp suffix)
            row.querySelectorAll('[class=""], div:not([class])').forEach((wrapper) => {
              // Only match the inline border wrapper (has border style)
              const style = wrapper.getAttribute('style');
              if (!style || !style.includes('border')) return;
              const kids = wrapper.children;
              if (kids.length === 0) return;
              const firstText = kids[0]?.textContent?.trim() || '0';
              const suffix = kids.length >= 2 ? kids[kids.length - 1]?.textContent?.trim() || '' : '';
              const valueText = firstText + suffix;
              const valueSpan = document.createElement('span');
              valueSpan.textContent = valueText;
              valueSpan.style.cssText = 'font-size:0.85rem;font-weight:600;color:#334155';
              wrapper.parentNode?.replaceChild(valueSpan, wrapper);
            });
          }
        });

        // 6. In global tax rows (not bill-meta-rows), remove the input wrapper div
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
