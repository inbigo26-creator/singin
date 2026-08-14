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
  }

  const targetStaff = training.targetStaff || [];
  let displayItems: PrintableItem[] = [];

  if (printAllTargetStaff && targetStaff.length > 0) {
    // Show only the admin-selected designated teachers in their exact designated order
    displayItems = targetStaff.map((staff) => {
      const match = attendances.find(
        (a) => (a.staffId && a.staffId === staff.id) || a.name.trim() === staff.name.trim()
      );
      return {
        id: staff.id,
        name: staff.name,
        department: staff.department,
        signature: match?.signature,
        isSigned: !!match,
      };
    });

    // Also include extra signers if any who signed but weren't in targetStaff
    attendances.forEach((att) => {
      const exists = displayItems.some(
        (d) => (att.staffId && d.id === att.staffId) || d.name.trim() === att.name.trim()
      );
      if (!exists) {
        displayItems.push({
          id: att.id,
          name: att.name,
          department: att.department,
          signature: att.signature,
          isSigned: true,
        });
      }
    });
  } else {
    // Show only attendees who actually signed
    displayItems = attendances.map((a) => ({
      id: a.id,
      name: a.name,
      department: a.department,
      signature: a.signature,
      isSigned: true,
    }));
  }

  const totalCount = displayItems.length;

  // Determine whether to use 1 column or 2 columns based on settings or count threshold (> 22)
  const isTwoColumns =
    settings.layoutMode === '2col' ||
    (settings.layoutMode === 'auto' && totalCount > 22);

  // Dynamic row sizing & font scaling to guarantee 1 page fitting
  let rowHeightClass = 'h-9 sm:h-10';
  let signatureImgMaxHeight = 'max-h-7 sm:max-h-8';
  let cellTextSize = 'text-xs';
  let tableHeaderHeight = 'py-2';

  if (isTwoColumns) {
    if (totalCount <= 36) {
      rowHeightClass = 'h-8';
      signatureImgMaxHeight = 'max-h-6';
      cellTextSize = 'text-xs';
    } else if (totalCount <= 54) {
      rowHeightClass = 'h-7';
      signatureImgMaxHeight = 'max-h-5';
      cellTextSize = 'text-[11px]';
    } else {
      rowHeightClass = 'h-[23px]';
      signatureImgMaxHeight = 'max-h-[17px]';
      cellTextSize = 'text-[10px]';
    }
  } else {
    if (totalCount <= 12) {
      rowHeightClass = 'h-11';
      signatureImgMaxHeight = 'max-h-9';
      cellTextSize = 'text-sm';
    } else if (totalCount <= 18) {
      rowHeightClass = 'h-9';
      signatureImgMaxHeight = 'max-h-7';
      cellTextSize = 'text-xs';
    } else {
      rowHeightClass = 'h-8';
      signatureImgMaxHeight = 'max-h-6';
      cellTextSize = 'text-xs';
    }
  }

  // Split attendances for 2 columns (Left / Right)
  const midpoint = isTwoColumns ? Math.ceil(totalCount / 2) : totalCount;
  const leftColumnItems = displayItems.slice(0, midpoint);
  const rightColumnItems = isTwoColumns ? displayItems.slice(midpoint) : [];

  const schoolDisplayName = training.schoolName || settings.schoolName || '인천비즈니스고등학교';

  return (
    <div
      id="printable-register-sheet"
      className="bg-white text-black font-sans w-full max-w-[210mm] mx-auto px-8 pt-16 pb-8 sm:px-12 sm:pt-20 sm:pb-10 print:px-6 print:pt-14 print:pb-4 box-border border border-slate-300 print:border-none print:shadow-none shadow-md"
      style={{
        width: '100%',
        maxWidth: '210mm',
        backgroundColor: '#ffffff',
        color: '#000000',
      }}
    >
      <div className="w-full flex flex-col pt-2 print:pt-4">
        {/* Top Header - School Name and Training Title (Only training title, no '(참석 서명부)' suffix) */}
        <div className="text-center mb-6 pb-3.5 border-b-2 border-black max-w-[155mm] mx-auto w-full">
          {settings.showSchoolHeader && (
            <p className="text-xs font-semibold text-slate-700 tracking-wider mb-1.5">
              {schoolDisplayName}
            </p>
          )}
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-snug text-slate-950 break-keep">
            {training.title}
          </h1>
        </div>

        {/* Training Meta Information Table (Centered with max-w-[155mm] for generous side margins) */}
        <div className="mb-4 max-w-[155mm] mx-auto w-full">
          <table className="w-full border-collapse border border-black text-left text-xs">
            <tbody>
              <tr className="border-b border-black">
                <th className="border-r border-black bg-slate-100 font-bold py-1.5 px-3 w-24 text-center shrink-0">
                  연수 일시
                </th>
                <td className="border-r border-black py-1.5 px-3 font-medium">
                  {training.date}
                </td>
                <th className="border-r border-black bg-slate-100 font-bold py-1.5 px-3 w-24 text-center shrink-0">
                  연수 장소
                </th>
                <td className="py-1.5 px-3 font-medium">
                  {training.location || '교내'}
                </td>
              </tr>
              <tr>
                <th className="border-r border-black bg-slate-100 font-bold py-1.5 px-3 w-24 text-center shrink-0">
                  연수 대상
                </th>
                <td className="border-r border-black py-1.5 px-3 font-medium">
                  {training.targetStaff && training.targetStaff.length > 0
                    ? `지정 교직원 (${training.targetStaff.length}명)`
                    : training.target}
                </td>
                <th className="border-r border-black bg-slate-100 font-bold py-1.5 px-3 w-24 text-center shrink-0">
                  담당자
                </th>
                <td className="py-1.5 px-3 font-medium">
                  {training.manager || '연수 담당자'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Attendees Attendance Table (Centered max-w-[155mm], department = signature width, wider notes, strictly selected staff only) */}
        {!isTwoColumns ? (
          /* ================= Single Column Layout (<= 22 attendees) ================= */
          <div className="max-w-[155mm] mx-auto w-full">
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
                    <td className="border-r border-black px-2 text-center align-middle bg-white">
                      {item.signature ? (
                        <div className="flex items-center justify-center h-full">
                          <img
                            src={item.signature}
                            alt={`${item.name} 서명`}
                            className={`${signatureImgMaxHeight} max-w-full object-contain filter contrast-150`}
                          />
                        </div>
                      ) : (
                        <span className="text-slate-300 text-[10px]">(인)</span>
                      )}
                    </td>
                    <td className={`${cellTextSize} text-center text-slate-400`}></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* ================= Two Columns Layout (> 22 attendees) ================= */
          <div className="max-w-[170mm] mx-auto w-full grid grid-cols-2 gap-3">
            {/* Left Half Table */}
            <table className="w-full border-collapse border border-black text-center table-fixed">
              <thead>
                <tr className={`bg-slate-100 border-b border-black ${cellTextSize} font-bold`}>
                  <th className={`border-r border-black ${tableHeaderHeight} w-[12%] text-center`}>연번</th>
                  <th className={`border-r border-black ${tableHeaderHeight} w-[26%] text-center`}>소속 / 직위</th>
                  <th className={`border-r border-black ${tableHeaderHeight} w-[18%] text-center`}>성명</th>
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
                    <td className={`border-r border-black ${cellTextSize} px-1.5 text-center truncate`}>
                      {item.department || '-'}
                    </td>
                    <td className={`border-r border-black ${cellTextSize} font-bold px-1 text-center`}>
                      {item.name}
                    </td>
                    <td className="border-r border-black px-1 text-center align-middle bg-white">
                      {item.signature ? (
                        <div className="flex items-center justify-center h-full">
                          <img
                            src={item.signature}
                            alt="서명"
                            className={`${signatureImgMaxHeight} max-w-full object-contain filter contrast-150`}
                          />
                        </div>
                      ) : (
                        <span className="text-slate-300 text-[10px]">(인)</span>
                      )}
                    </td>
                    <td className={`${cellTextSize} text-center text-slate-400`}></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Right Half Table */}
            <table className="w-full border-collapse border border-black text-center table-fixed">
              <thead>
                <tr className={`bg-slate-100 border-b border-black ${cellTextSize} font-bold`}>
                  <th className={`border-r border-black ${tableHeaderHeight} w-[12%] text-center`}>연번</th>
                  <th className={`border-r border-black ${tableHeaderHeight} w-[26%] text-center`}>소속 / 직위</th>
                  <th className={`border-r border-black ${tableHeaderHeight} w-[18%] text-center`}>성명</th>
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
                    <td className={`border-r border-black ${cellTextSize} px-1.5 text-center truncate`}>
                      {item.department || '-'}
                    </td>
                    <td className={`border-r border-black ${cellTextSize} font-bold px-1 text-center`}>
                      {item.name}
                    </td>
                    <td className="border-r border-black px-1 text-center align-middle bg-white">
                      {item.signature ? (
                        <div className="flex items-center justify-center h-full">
                          <img
                            src={item.signature}
                            alt="서명"
                            className={`${signatureImgMaxHeight} max-w-full object-contain filter contrast-150`}
                          />
                        </div>
                      ) : (
                        <span className="text-slate-300 text-[10px]">(인)</span>
                      )}
                    </td>
                    <td className={`${cellTextSize} text-center text-slate-400`}></td>
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
