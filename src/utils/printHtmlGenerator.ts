import { Training, Attendance, PrintSettings, Staff } from '../types';
import { compareStaffNumber } from '../api';

export function generateStandalonePrintHtml(
  training: Training,
  attendances: Attendance[],
  settings: PrintSettings
): string {
  const targetStaff = training.targetStaff || [];
  const trainingNotes = training.notes || {};

  interface PrintableItem {
    id: string;
    code?: string;
    order?: number;
    name: string;
    department?: string;
    signature?: string;
    isSigned: boolean;
    note?: string;
  }

  let displayItems: PrintableItem[] = [];

  if (targetStaff.length > 0) {
    displayItems = targetStaff.map((staff) => {
      const match = attendances.find(
        (a) => (a.staffId && a.staffId === staff.id) || a.name.trim() === staff.name.trim()
      );
      const note = trainingNotes[staff.id] || (match?.staffId && trainingNotes[match.staffId]) || (match?.id && trainingNotes[match.id]) || trainingNotes[staff.name] || '';
      return {
        id: staff.id,
        code: staff.code,
        order: staff.order,
        name: staff.name,
        department: staff.department,
        signature: match?.signature,
        isSigned: !!match,
        note,
      };
    });

    // Append extra attendees if any
    attendances.forEach((att) => {
      const exists = displayItems.some(
        (d) => (att.staffId && d.id === att.staffId) || d.name.trim() === att.name.trim()
      );
      if (!exists) {
        const note = (att.staffId && trainingNotes[att.staffId]) || trainingNotes[att.id] || trainingNotes[att.name] || '';
        displayItems.push({
          id: att.id,
          code: undefined,
          name: att.name,
          department: att.department,
          signature: att.signature,
          isSigned: true,
          note,
        });
      }
    });
  } else {
    displayItems = attendances.map((a) => {
      const staffMatch = targetStaff.find((s) => (a.staffId && s.id === a.staffId) || s.name.trim() === a.name.trim());
      const note = (a.staffId && trainingNotes[a.staffId]) || trainingNotes[a.id] || trainingNotes[a.name] || '';
      return {
        id: a.id,
        code: staffMatch?.code,
        order: staffMatch?.order,
        name: a.name,
        department: a.department,
        signature: a.signature,
        isSigned: true,
        note,
      };
    });
  }

  displayItems.sort((a, b) => compareStaffNumber(a, b));

  const totalCount = displayItems.length;
  const isTwoColumns =
    settings.layoutMode === '2col' ||
    (settings.layoutMode === 'auto' && totalCount > 15);

  const rowsPerCol = isTwoColumns ? Math.ceil(totalCount / 2) : totalCount;

  // Dynamic row sizing in millimeters & font sizes
  let rowHeightMm = '9.5mm';
  let sigMaxHeightMm = '7.5mm';
  let fontSizePt = '9.5pt';
  let headerPadMm = '1.8mm';
  let metaPadMm = '2mm';
  let titleMarginBottomMm = '4mm';
  let metaMarginBottomMm = '4mm';

  if (isTwoColumns) {
    if (rowsPerCol <= 12) {
      rowHeightMm = '9mm';
      sigMaxHeightMm = '7mm';
      fontSizePt = '9pt';
      headerPadMm = '1.5mm';
      metaPadMm = '1.8mm';
      titleMarginBottomMm = '3.5mm';
      metaMarginBottomMm = '3mm';
    } else if (rowsPerCol <= 18) {
      rowHeightMm = '7.8mm';
      sigMaxHeightMm = '6mm';
      fontSizePt = '8.5pt';
      headerPadMm = '1.2mm';
      metaPadMm = '1.5mm';
      titleMarginBottomMm = '3mm';
      metaMarginBottomMm = '2.5mm';
    } else if (rowsPerCol <= 25) {
      rowHeightMm = '6.2mm';
      sigMaxHeightMm = '4.8mm';
      fontSizePt = '8pt';
      headerPadMm = '0.8mm';
      metaPadMm = '1.2mm';
      titleMarginBottomMm = '2.5mm';
      metaMarginBottomMm = '2mm';
    } else if (rowsPerCol <= 34) {
      rowHeightMm = '5.2mm';
      sigMaxHeightMm = '4mm';
      fontSizePt = '7.5pt';
      headerPadMm = '0.5mm';
      metaPadMm = '1mm';
      titleMarginBottomMm = '2mm';
      metaMarginBottomMm = '1.8mm';
    } else {
      rowHeightMm = '4.6mm';
      sigMaxHeightMm = '3.5mm';
      fontSizePt = '7pt';
      headerPadMm = '0.4mm';
      metaPadMm = '0.8mm';
      titleMarginBottomMm = '1.5mm';
      metaMarginBottomMm = '1.5mm';
    }
  } else {
    if (rowsPerCol <= 10) {
      rowHeightMm = '10mm';
      sigMaxHeightMm = '8mm';
      fontSizePt = '10pt';
    } else if (rowsPerCol <= 15) {
      rowHeightMm = '8.5mm';
      sigMaxHeightMm = '6.5mm';
      fontSizePt = '9.5pt';
    } else {
      rowHeightMm = '7.5mm';
      sigMaxHeightMm = '5.5mm';
      fontSizePt = '9pt';
    }
  }

  const schoolDisplayName = training.schoolName || settings.schoolName || '인천비즈니스고등학교';

  // Build Approval line if enabled
  let approvalLineHtml = '';
  if (settings.showApprovalLine && settings.approvalTitles?.length > 0) {
    const titles = settings.approvalTitles;
    approvalLineHtml = `
      <table style="border-collapse: collapse; border: 1.5px solid #000; float: right; margin-bottom: 2.5mm; font-size: 8pt; text-align: center;">
        <tr>
          <th rowspan="2" style="border: 1px solid #000; background-color: #f1f5f9; padding: 2px 4px; width: 16px; writing-mode: vertical-rl; letter-spacing: 2px; font-weight: bold;">결재</th>
          ${titles.map((t) => `<th style="border: 1px solid #000; background-color: #f1f5f9; padding: 1.5px 6px; width: 42px; font-weight: bold;">${t}</th>`).join('')}
        </tr>
        <tr style="height: 12mm;">
          ${titles.map(() => `<td style="border: 1px solid #000;"></td>`).join('')}
        </tr>
      </table>
      <div style="clear: both;"></div>
    `;
  }

  // Generate Table Row HTML
  const buildRowHtml = (item: PrintableItem, num: number) => {
    const sigCell = item.signature
      ? `<img src="${item.signature}" alt="서명" style="max-height: ${sigMaxHeightMm}; max-width: 90%; object-fit: contain; display: block; margin: 0 auto;" />`
      : `<span style="color: #cbd5e1; font-size: 7.5pt;">(인)</span>`;

    return `
      <tr style="height: ${rowHeightMm}; border-bottom: 1px solid #000000;">
        <td style="border-right: 1px solid #000000; font-weight: bold; text-align: center; font-size: ${fontSizePt}; padding: 0 1px;">
          ${num}
        </td>
        <td style="border-right: 1px solid #000000; text-align: center; font-size: ${fontSizePt}; padding: 0 2px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
          ${item.department || '-'}
        </td>
        <td style="border-right: 1px solid #000000; font-weight: bold; text-align: center; font-size: ${fontSizePt}; padding: 0 2px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
          ${item.name}
        </td>
        <td style="border-right: 1px solid #000000; text-align: center; vertical-align: middle; padding: 0 2px; background-color: #ffffff;">
          ${sigCell}
        </td>
        <td style="text-align: center; font-size: ${fontSizePt}; padding: 0 2px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: #334155;">
          ${item.note || ''}
        </td>
      </tr>
    `;
  };

  let tablesHtml = '';

  if (!isTwoColumns) {
    // 1-column table
    tablesHtml = `
      <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000000; text-align: center; table-layout: fixed;">
        <thead>
          <tr style="background-color: #f1f5f9; border-bottom: 1.5px solid #000000; font-size: ${fontSizePt}; font-weight: bold;">
            <th style="border-right: 1px solid #000000; padding: ${headerPadMm} 0; width: 10%;">연번</th>
            <th style="border-right: 1px solid #000000; padding: ${headerPadMm} 0; width: 26%;">소속 / 직위</th>
            <th style="border-right: 1px solid #000000; padding: ${headerPadMm} 0; width: 18%;">성명</th>
            <th style="border-right: 1px solid #000000; padding: ${headerPadMm} 0; width: 26%;">서명</th>
            <th style="padding: ${headerPadMm} 0; width: 20%;">비고</th>
          </tr>
        </thead>
        <tbody>
          ${displayItems.map((item, idx) => buildRowHtml(item, idx + 1)).join('')}
        </tbody>
      </table>
    `;
  } else {
    // 2-columns table
    const midpoint = Math.ceil(totalCount / 2);
    const leftItems = displayItems.slice(0, midpoint);
    const rightItems = displayItems.slice(midpoint);

    tablesHtml = `
      <div style="display: flex; gap: 4mm; width: 100%;">
        <!-- Left Table -->
        <div style="flex: 1; min-width: 0;">
          <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000000; text-align: center; table-layout: fixed;">
            <thead>
              <tr style="background-color: #f1f5f9; border-bottom: 1.5px solid #000000; font-size: ${fontSizePt}; font-weight: bold;">
                <th style="border-right: 1px solid #000000; padding: ${headerPadMm} 0; width: 11%;">연번</th>
                <th style="border-right: 1px solid #000000; padding: ${headerPadMm} 0; width: 26%;">소속 / 직위</th>
                <th style="border-right: 1px solid #000000; padding: ${headerPadMm} 0; width: 19%;">성명</th>
                <th style="border-right: 1px solid #000000; padding: ${headerPadMm} 0; width: 26%;">서명</th>
                <th style="padding: ${headerPadMm} 0; width: 18%;">비고</th>
              </tr>
            </thead>
            <tbody>
              ${leftItems.map((item, idx) => buildRowHtml(item, idx + 1)).join('')}
            </tbody>
          </table>
        </div>

        <!-- Right Table -->
        <div style="flex: 1; min-width: 0;">
          <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000000; text-align: center; table-layout: fixed;">
            <thead>
              <tr style="background-color: #f1f5f9; border-bottom: 1.5px solid #000000; font-size: ${fontSizePt}; font-weight: bold;">
                <th style="border-right: 1px solid #000000; padding: ${headerPadMm} 0; width: 11%;">연번</th>
                <th style="border-right: 1px solid #000000; padding: ${headerPadMm} 0; width: 26%;">소속 / 직위</th>
                <th style="border-right: 1px solid #000000; padding: ${headerPadMm} 0; width: 19%;">성명</th>
                <th style="border-right: 1px solid #000000; padding: ${headerPadMm} 0; width: 26%;">서명</th>
                <th style="padding: ${headerPadMm} 0; width: 18%;">비고</th>
              </tr>
            </thead>
            <tbody>
              ${rightItems.map((item, idx) => buildRowHtml(item, midpoint + idx + 1)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${training.title} 연수 서명부</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 20mm 10mm 10mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", "Nanum Gothic", sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .print-page-container {
      width: 190mm;
      margin: 0 auto;
      background-color: #ffffff;
      padding-top: 4mm;
    }
    table {
      border-collapse: collapse;
    }
    th, td {
      border-color: #000000;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-page-container">
    ${approvalLineHtml}

    <!-- Header: School Name & Training Title -->
    <div style="text-align: center; margin-bottom: ${titleMarginBottomMm}; padding-bottom: 2mm; border-bottom: 2px solid #000000;">
      ${
        settings.showSchoolHeader
          ? `<div style="font-size: 10pt; font-weight: bold; color: #475569; margin-bottom: 1.5mm; letter-spacing: 0.5px;">${schoolDisplayName}</div>`
          : ''
      }
      <h1 style="font-size: 16pt; font-weight: bold; margin: 0; padding: 0; line-height: 1.3; color: #000000; word-break: keep-all;">
        ${training.title}
      </h1>
    </div>

    <!-- Meta Table: Date, Location, Target, Manager -->
    <div style="margin-bottom: ${metaMarginBottomMm};">
      <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000000; text-align: left; font-size: ${fontSizePt}; table-layout: fixed;">
        <tbody>
          <tr style="border-bottom: 1px solid #000000;">
            <th style="border-right: 1px solid #000000; background-color: #f1f5f9; font-weight: bold; padding: ${metaPadMm} 2mm; width: 22mm; text-align: center;">
              연수 일시
            </th>
            <td style="border-right: 1px solid #000000; padding: ${metaPadMm} 3mm; font-weight: 500;">
              ${training.date}
            </td>
            <th style="border-right: 1px solid #000000; background-color: #f1f5f9; font-weight: bold; padding: ${metaPadMm} 2mm; width: 22mm; text-align: center;">
              연수 장소
            </th>
            <td style="padding: ${metaPadMm} 3mm; font-weight: 500;">
              ${training.location || '교내'}
            </td>
          </tr>
          <tr>
            <th style="border-right: 1px solid #000000; background-color: #f1f5f9; font-weight: bold; padding: ${metaPadMm} 2mm; width: 22mm; text-align: center;">
              연수 대상
            </th>
            <td style="border-right: 1px solid #000000; padding: ${metaPadMm} 3mm; font-weight: 500;">
              ${training.target || '전 교직원'}
            </td>
            <th style="border-right: 1px solid #000000; background-color: #f1f5f9; font-weight: bold; padding: ${metaPadMm} 2mm; width: 22mm; text-align: center;">
              담당자
            </th>
            <td style="padding: ${metaPadMm} 3mm; font-weight: 500;">
              ${training.manager || '연수 담당자'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Attendance Signature Table(s) -->
    <div>
      ${tablesHtml}
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 300);
    });
  </script>
</body>
</html>
  `;
}

/**
 * Open print dialog with 100% guarantee of clean rendering
 */
export function executePrintDocument(
  training: Training,
  attendances: Attendance[],
  settings: PrintSettings
): void {
  const htmlContent = generateStandalonePrintHtml(training, attendances, settings);

  // 1. Try opening a clean standalone popup window (Best compatibility for Hancom PDF, Chrome, Whale, Edge)
  const printWindow = window.open('', '_blank', 'width=950,height=1050,menubar=no,toolbar=no,location=no,status=no');

  if (printWindow && printWindow.document) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    return;
  }

  // 2. Fallback: Use direct iframe if popups are strictly blocked
  const oldIframe = document.getElementById('a4-print-safe-frame');
  if (oldIframe) {
    oldIframe.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'a4-print-safe-frame';
  // Note: DO NOT use visibility: hidden or width: 0, which breaks PDF printer drivers!
  // Instead, position it offscreen with real A4 pixel dimensions
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '210mm';
  iframe.style.height = '297mm';
  iframe.style.border = 'none';
  iframe.style.zIndex = '-1000';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Iframe print failed:', e);
        window.print();
      }
    }, 400);
  } else {
    window.print();
  }
}
