import styled from "styled-components";

// ====== Layout ======
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #f3f3f3;
  min-height: 100vh;
  padding: 20px;
`;

const Toolbar = styled.div<{ $width?: string | number }>`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 15px;
  padding: 10px 15px;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: ${({ $width }) => ($width ? $width : "max-content")};
  max-width: ${({ $width }) => ($width ? $width : "100%")};
  box-sizing: border-box;
  overflow-x: auto;
  white-space: nowrap;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex: 1;
`;

const ToolButton = styled.button<{ $active?: boolean }>`
  padding: 6px 12px;
  border: 1px solid ${({ $active }) => ($active ? "#0078d7" : "#ccc")};
  background: ${({ $active }) => ($active ? "#e6f2fb" : "#fff")};
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: black;
  transition: background 0.2s, border 0.2s;
  &:hover {
    background: ${({ $active }) => ($active ? "#d6ecfa" : "#f0f0f0")};
  }
`;

// ====== Dropdown ======
const DropdownWrapper = styled.div`
  position: relative;
  display: inline-block;
  z-index: 100;
`;

const DropdownButton = styled(ToolButton)``;

const DropdownItem = styled.button<{ $active?: boolean }>`
  padding: 6px 12px;
  text-align: left;
  background: ${({ $active }) => ($active ? "#e6f2fb" : "#fff")};
  border: none;
  font-size: 14px;
  cursor: pointer;
  &:hover {
    background: #f0f0f0;
  }
`;

// ====== Canvas ======
const CanvasWrapper = styled.div<{ $width: number | string }>`
  background: #fff;
  border: 2px solid #ccc;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  width: ${({ $width }) => $width};
`;

const Canvas = styled.canvas<{ $cursorStyle: string }>`
  display: block;
  cursor: ${({ $cursorStyle }) => $cursorStyle};
`;

// ====== Color & Range ======
const PaletteWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
`;

const ColorInput = styled.input`
  width: 28px;
  height: 28px;
  border: none;
  padding: 0;
  cursor: pointer;
`;

const RangeInput = styled.input`
  cursor: pointer;
`;

export {
  Container,
  Toolbar,
  ButtonGroup,
  PaletteWrapper,
  ToolButton,
  DropdownWrapper,
  DropdownButton,
  DropdownItem,
  ColorInput,
  RangeInput,
  CanvasWrapper,
  Canvas,
};
