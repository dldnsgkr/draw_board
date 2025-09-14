import { useState, useEffect, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

export type DropdownProps = {
  buttonRef: RefObject<HTMLButtonElement | null>;
  show: boolean;
  children: ReactNode;
};

const Dropdown = ({ buttonRef, show, children }: DropdownProps) => {
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (buttonRef?.current && show) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width, // 버튼과 동일한 너비
      });
    }
  }, [buttonRef, show]);

  if (!show) return null;

  return createPortal(
    <div
      style={{
        position: "absolute",
        top: coords.top,
        left: coords.left,
        width: coords.width,
        maxWidth: coords.width,
        background: "#fff",
        border: "1px solid #ccc",
        borderRadius: "4px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
        zIndex: 9999,
        overflow: "hidden", // 버튼 너비를 넘어가면 자르기
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>{children}</div>
    </div>,
    document.body
  );
};

export default Dropdown;
