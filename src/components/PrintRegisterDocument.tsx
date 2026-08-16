import React from 'react';
import { Training, Attendance, PrintSettings } from '../types';

interface PrintRegisterDocumentProps {
  training: Training;
  attendances: Attendance[];
  settings: PrintSettings;
  printAllTargetStaff?: boolean;
}

export const PrintRegisterDocument: React.FC<PrintRegisterDocumentProps> = ({
  training,
  attendances,
  settings,
  printAllTargetStaff = true,
}) => {
  // Build items to print
  interface PrintableItem {
    id: string;
    name: string;
    department?: string;
    signature?: string;
    isSigned: boolean;
    note?: string;
  }

  const targetStaff = training.targetStaff || [];
  let displayItems: PrintableItem[] = [];

  const trainingNotes = training.notes || {};

  if (printAllTargetStaff && targetStaff.length > 0) {
    // Show only the admin-selected designated teachers in their exact designated order
    displayItems = targetStaff.map((staff) => {
      const match = attendances.find(
        (a) => (a.staffId && a.staffId === staff.id) || a.name.trim() === staff.name.trim()
      );
      const note = trainingNotes[staff.id] || trainingNotes[staff.name] || match?.note || '';
      return {
        id: staff.id,
        name: staff.name,
        department: staff.department,
        signature: match?.signature,
        isSigned: !!match,
        note,
      };
    });

    // Also include extra signers if any who signed but weren't in targetStaff
    attendances.forEach((att) => {
      const exists = displayItems.some(
        (d) => (att.staffId && d.id === att.staffId) || d.name.trim() === att.name.trim()
      );
      if (!exists) {
        const note = trainingNotes[att.id] || (att.staffId && trainingNotes[att.staffId]) || trainingNotes[att.name] || att.note || '';
        displayItems.push({
          id: att.id,
          name: att.name,
          department: att.department,
          signature: att.signature,
          isSigned: true,
          note,
        });
      }
    });
  } else {
    // Show only attendees who actually signed
    displayItems = attendances.map((a) => {
      const note = trainingNotes[a.id] || (a.staffId && trainingNotes[a.staffId]) || trainingNotes[a.name] || a.note || '';
      return {
        id: a.id,
        name: a.name,
        department: a.department,
        signature: a.signature,
        isSigned: true,
        note,
      };
    });
  }

  const totalCount = displayItems.length;

  // Determine whether to use 1 column or 2 columns based on settings or count threshold (> 22)
  const isTwoColumns =
    settings.layoutMode === '2col' ||
    (settings.layoutMode === 'auto' && totalCount > 22);

  // Dynamic row sizing & font scaling to guarantee 1 page fitting
  const rowsPerCol = isTwoColumns ? Math.ceil(totalCount / 2) : totalCount;

  let rowHeightClass = 'h-9 sm:h-10';
  let signatureImgMaxHeight = 'max-h-7 sm:max-h-8';
  let cellTextSize = 'text-xs';
  let tableHeaderHeight = 'py-1.5';
  let metaTablePadding = 'py-1.5 px-3';
  let titleMarginBottom = 'mb-4 pb-2.5';
  let metaMarginBottom = 'mb-3.5';

  if (isTwoColumns) {
    if (rowsPerCol <= 14) {
      // <= 28 people
      rowHeightClass = 'h-8.5';
      signatureImgMaxHeight = 'max-h-7';
      cellTextSize = 'text-xs';
      tableHeaderHeight = 'py-1.5';
      metaTablePadding = 'py-1.5 px-3';
      titleMarginBottom = 'mb-3.5 pb-2';
      metaMarginBottom = 'mb-3';
    } else if (rowsPerCol <= 20) {
      // 29 ~ 40 people
      rowHeightClass = 'h-7';
      signatureImgMaxHeight = 'max-h-5.5';
      cellTextSize = 'text-[11px]';
      tableHeaderHeight = 'py-1';
      metaTablePadding = 'py-1 px-2.5';
      titleMarginBottom = 'mb-2.5 pb-1.5';
      metaMarginBottom = 'mb-2';
    } else if (rowsPerCol <= 28) {
      // 41 ~ 56 people
      rowHeightClass = 'h-[23px]';
      signatureImgMaxHeight = 'max-h-[17px]';
      cellTextSize = 'text-[10px]';
      tableHeaderHeight = 'py-0.5';
      metaTablePadding = 'py-0.5 px-2';
      titleMarginBottom = 'mb-2 pb-1';
      metaMarginBottom = 'mb-1.5';
    } else if (rowsPerCol <= 36) {
      // 57 ~ 72 people
      rowHeightClass = 'h-[19px]';
      signatureImgMaxHeight = 'max-h-[14px]';
      cellTextSize = 'text-[9px]';
      tableHeaderHeight = 'py-0';
      metaTablePadding = 'py-0.5 px-2';
      titleMarginBottom = 'mb-1.5 pb-1';
      metaMarginBottom = 'mb-1';
    } else {
      // 73+ people
      rowHeightClass = 'h-[16px]';
      signatureImgMaxHeight = 'max-h-[12px]';
      cellTextSize = 'text-[8px]';
      tableHeaderHeight = 'py-0';
      metaTablePadding = 'py-0.5 px-1.5';
      titleMarginBottom = 'mb-1 pb-0.5';
      metaMarginBottom = 'mb-1';
    }
  } else {
    if (rowsPerCol <= 12) {
      rowHeightClass = 'h-10';
      signatureImgMaxHeight = 'max-h-8';
      cellTextSize = 'text-xs';
    } else if (rowsPerCol <= 18) {
      rowHeightClass = 'h-8';
      signatureImgMaxHeight = 'max-h-6';
      cellTextSize = 'text-xs';
    } else {
      rowHeightClass = 'h-7';
      signatureImgMaxHeight = 'max-h-5';
      cellTextSize = 'text-[11px]';
    }
  }

  // Matching container width for both top meta table & attendance grid
  const contentWidthClass = isTwoColumns ? 'max-w-[188mm]' : 'max-w-[155mm]';

  // Split attendances for 2 columns (Left / Right)
  const midpoint = isTwoColumns ? Math.ceil(totalCount / 2) : totalCount;
  const leftColumnItems = displayItems.slice(0, midpoint);
  const rightColumnItems = isTwoColumns ? displayItems.slice(midpoint) : [];

  const schoolDisplayName = training.schoolName || settings.schoolName || '인천비즈니스고등학교';

  return (
    <div
      id="printable-register-sheet"
      className="bg-white text-black font-sans w-full max-w-[210mm] mx-auto px-6 pt-10 pb-6 sm:px-10 sm:pt-14 sm:pb-8 print:p-0 box-border border border-slate-300 print:border-none print:shadow-none shadow-md"
      style={{
        width: '100%',
        maxWidth: '210mm',
        backgroundColor: '#ffffff',
        color: '#000000',
      }}
    >
      <div className="w-full flex flex-col pt-1 print:pt-1">
        {/* Top Header - School Name and Training Title */}
        <div className={`text-center ${titleMarginBottom} border-b-2 border-black ${contentWidthClass} mx-auto w-full`}>
          {settings.showSchoolHeader && (
            <p className="text-[11px] sm:text-xs font-semibold text-slate-700 tracking-wider mb-1">
              {schoolDisplayName}
            </p>
          )}
          <h1 className="text-lg sm:text-xl font-bold tracking-tight leading-snug text-slate-950 break-keep">
            {training.title}
          </h1>
        </div>

        {/* Training Meta Information Table - Width EXACTLY matches the attendance table */}
        <div className={`${metaMarginBottom} ${contentWidthClass} mx-auto w-full`}>
          <table className="w-full border-collapse border border-black text-left text-xs table-fixed">
            <tbody>
              <tr className="border-b border-black">
                <th className={`border-r border-black bg-slate-100 font-bold ${metaTablePadding} w-20 sm:w-24 text-center shrink-0 text-[11px] sm:text-xs`}>
                  연수 일시
                </th>
                <td className={`border-r border-black ${metaTablePadding} font-medium text-[11px] sm:text-xs`}>
                  {training.date}
                </td>
                <th className={`border-r border-black bg-slate-100 font-bold ${metaTablePadding} w-20 sm:w-24 text-center shrink-0 text-[11px] sm:text-xs`}>
                  연수 장소
                </th>
                <td className={`${metaTablePadding} font-medium text-[11px] sm:text-xs`}>
                  {training.location || '교내'}
                </td>
              </tr>
              <tr>
                <th className={`border-r border-black bg-slate-100 font-bold ${metaTablePadding} w-20 sm:w-24 text-center shrink-0 text-[11px] sm:text-xs`}>
                  연수 대상
                </th>
                <td className={`border-r border-black ${metaTablePadding} font-medium text-[11px] sm:text-xs`}>
                  {training.target || '전 교직원'}
                </td>
                <th className={`border-r border-black bg-slate-100 font-bold ${metaTablePadding} w-20 sm:w-24 text-center shrink-0 text-[11px] sm:text-xs`}>
                  담당자
                </th>
                <td className={`${metaTablePadding} font-medium text-[11px] sm:text-xs`}>
                  {training.manager || '연수 담당자'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Attendees Attendance Table */}
        {!isTwoColumns ? (
          /* ================= Single Column Layout (<= 22 attendees) ================= */
          <div className={`${contentWidthClass} mx-auto w-full`}>
            <table className="w-full border-collapse border border-black text-center table-fixed">
              <thead>
                <tr className={`bg-slate-100 border-b border-black ${cellTextSize} font-bold`}>
                  <th className={`border-r border-black ${tableHeaderHeight} w-[10%] text-center`}>연번</th>
                  <th className={`border-r border-black ${tableHeaderHeight} w-[26%] text-center`}>소속 / 직위</th>
                  <th className={`border-r border-black ${tableHeaderHeight} w-[18%] text-center`}>성명</th>
                  <th className={`border-r border-black ${tableHeaderHeight} w-[26%] text-center`}>서명</th>
                  <th className={`${tableHeaderHeight} w-[20%] text-center`}>비고</th>
                </tr>
              </thead>
              <tbody>
                {displayItems.map((item, index) => (
                  <tr key={item.id || index} className={`border-b border-black ${rowHeightClass}`}>
                    <td className={`border-r border-black ${cellTextSize} font-bold text-center`}>
                      {index + 1}
                    </td>
                    <td className={`border-r border-black ${cellTextSize} px-2 text-center truncate`}>
                      {item.department || '-'}
                    </td>
                    <td className={`border-r border-black ${cellTextSize} font-bold px-2 text-center`}>
                      {item.name}
                    </td>
                    <td className="border-r border-black px-1 text-center align-middle bg-white">
                      {item.signature ? (
                        <div className="flex items-center justify-center h-full w-full py-0.5">
                          <img
                            src={item.signature}
                            alt={`${item.name} 서명`}
                            className={`${signatureImgMaxHeight} w-auto max-w-[95%] object-contain mx-auto block mix-blend-multiply`}
                          />
                        </div>
                      ) : (
                        <span className="text-slate-300 text-[10px]">(인)</span>
                      )}
                    </td>
                    <td className={`${cellTextSize} px-1 text-center text-slate-700 font-medium truncate`}>
                      {item.note || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* ================= Two Columns Layout (> 22 attendees) ================= */
          <div className={`${contentWidthClass} mx-auto w-full grid grid-cols-2 gap-2.5 sm:gap-3`}>
            {/* Left Half Table */}
            <table className="w-full border-collapse border border-black text-center table-fixed">
              <thead>
                <tr className={`bg-slate-100 border-b border-black ${cellTextSize} font-bold`}>
                  <th className={`border-r border-black ${tableHeaderHeight} w-[11%] text-center`}>연번</th>
                  <th className={`border-r border-black ${tableHeaderHeight} w-[26%] text-center`}>소속 / 직위</th>
                  <th className={`border-r border-black ${tableHeaderHeight} w-[19%] text-center`}>성명</th>
                  <th className={`border-r border-black ${tableHeaderHeight} w-[26%] text-center`}>서명</th>
                  <th className={`${tableHeaderHeight} w-[18%] text-center`}>비고</th>
                </tr>
              </thead>
              <tbody>
                {leftColumnItems.map((item, idx) => (
                  <tr key={item.id || idx} className={`border-b border-black ${rowHeightClass}`}>
                    <td className={`border-r border-black ${cellTextSize} font-bold text-center`}>
                      {idx + 1}
                    </td>
                    <td className={`border-r border-black ${cellTextSize} px-1 text-center truncate`}>
                      {item.department || '-'}
                    </td>
                    <td className={`border-r border-black ${cellTextSize} font-bold px-1 text-center truncate`}>
                      {item.name}
                    </td>
                    <td className="border-r border-black px-0.5 text-center align-middle bg-white">
                      {item.signature ? (
                        <div className="flex items-center justify-center h-full w-full py-0.5">
                          <img
                            src={item.signature}
                            alt="서명"
                            className={`${signatureImgMaxHeight} w-auto max-w-[95%] object-contain mx-auto block mix-blend-multiply`}
                          />
                        </div>
                      ) : (
                        <span className="text-slate-300 text-[10px]">(인)</span>
                      )}
                    </td>
                    <td className={`${cellTextSize} px-0.5 text-center text-slate-700 font-medium truncate`}>
                      {item.note || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Right Half Table */}
            <table className="w-full border-collapse border border-black text-center table-fixed">
              <thead>
                <tr className={`bg-slate-100 border-b border-black ${cellTextSize} font-bold`}>
                  <th className={`border-r border-black ${tableHeaderHeight} w-[11%] text-center`}>연번</th>
                  <th className={`border-r border-black ${tableHeaderHeight} w-[26%] text-center`}>소속 / 직위</th>
                  <th className={`border-r border-black ${tableHeaderHeight} w-[19%] text-center`}>성명</th>
                  <th className={`border-r border-black ${tableHeaderHeight} w-[26%] text-center`}>서명</th>
                  <th className={`${tableHeaderHeight} w-[18%] text-center`}>비고</th>
                </tr>
              </thead>
              <tbody>
                {rightColumnItems.map((item, idx) => (
                  <tr key={item.id || idx} className={`border-b border-black ${rowHeightClass}`}>
                    <td className={`border-r border-black ${cellTextSize} font-bold text-center`}>
                      {midpoint + idx + 1}
                    </td>
                    <td className={`border-r border-black ${cellTextSize} px-1 text-center truncate`}>
                      {item.department || '-'}
                    </td>
                    <td className={`border-r border-black ${cellTextSize} font-bold px-1 text-center truncate`}>
                      {item.name}
                    </td>
                    <td className="border-r border-black px-0.5 text-center align-middle bg-white">
                      {item.signature ? (
                        <div className="flex items-center justify-center h-full w-full py-0.5">
                          <img
                            src={item.signature}
                            alt="서명"
                            className={`${signatureImgMaxHeight} w-auto max-w-[95%] object-contain mx-auto block mix-blend-multiply`}
                          />
                        </div>
                      ) : (
                        <span className="text-slate-300 text-[10px]">(인)</span>
                      )}
                    </td>
                    <td className={`${cellTextSize} px-0.5 text-center text-slate-700 font-medium truncate`}>
                      {item.note || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

