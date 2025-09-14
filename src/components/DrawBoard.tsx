import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Container,
  Toolbar,
  Canvas,
  CanvasWrapper,
  ColorInput,
  DropdownButton,
  DropdownItem,
  DropdownWrapper,
  RangeInput,
  ToolButton,
  ButtonGroup,
  PaletteWrapper,
} from "../assets/styledComponent";
import Dropdown from "./Dropdown";

type PosType = { x: number; y: number };
type Mode =
  | "free"
  | "rect"
  | "circle"
  | "line"
  | "triangle"
  | "trapezoid"
  | "star"
  | "";

type Shape = {
  id: number;
  type: Mode;
  start: PosType;
  end: PosType;
  stroke: string;
  fill: string;
  lineWidth: number;
  path?: Path2D;
  points?: PosType[]; // free 선일 때 모든 점 저장
};

const DrawBoard = ({
  width = "800px",
  height = "750px",
}: {
  width?: number | string;
  height?: number | string;
}) => {
  // canvas DOM 참조
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 도형 선택 버튼의 DOM 요소를 참조하기 위한 ref
  const shapeBtnRef = useRef<HTMLButtonElement>(null);

  // 도형 선택 드롭다운의 표시 여부를 관리하는 state
  const [showDropdown, setShowDropdown] = useState(false);

  // 마우스 드로잉/조작 상태 플래그
  const isPaintingRef = useRef(false); // 새 도형 그리는 중 여부
  const isDraggingRef = useRef(false); // 선택된 도형 드래그 여부

  // 드래그/리사이즈 관련 참조값
  const dragOffsetRef = useRef<PosType | null>(null); // 클릭 지점과 start 좌표 차이
  const startPosRef = useRef<PosType | null>(null); // 그리기 시작 좌표 저장

  // 자유곡선(free draw) 관련
  const freePathRef = useRef<Path2D | null>(null); // 현재 그리고 있는 Path2D
  const freePathPointsRef = useRef<PosType[]>([]); // 자유선 좌표 저장용

  // Undo / Redo 히스토리 관리
  const historyRef = useRef<Shape[][]>([]); // 스냅샷 배열
  const historyIndexRef = useRef(-1); // 현재 스냅샷 인덱스

  const [shapes, setShapes] = useState<Shape[]>([]); // 현재 그려진 도형들
  const [selectedShapeId, setSelectedShapeId] = useState<number | null>(null); // 선택된 도형
  const [hoverShapeId, setHoverShapeId] = useState<number | null>(null); // 마우스 오버 도형
  const [mode, setMode] = useState<Mode>(""); // 현재 모드 (rect, circle, free 등)

  const [showShapesDropdown, setShowShapesDropdown] = useState(false); // 도형 선택 드롭다운

  // 도형 스타일 상태
  const [strokeColor, setStrokeColor] = useState("#000000"); // 선 색상
  const [fillColor, setFillColor] = useState("#ffffff"); // 채우기 색상
  const [lineWidth, setLineWidth] = useState(2); // 선 굵기

  // canvas 2D context 반환
  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  // 마우스 좌표를 canvas 좌표계로 변환
  const getCoordinates = (e: MouseEvent | React.MouseEvent): PosType => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return {
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0),
    };
  };

  // 도형 데이터를 Path2D로 변환
  const buildPath = (shape: Shape): Path2D => {
    const path = new Path2D();
    switch (shape.type) {
      case "free": {
        const path = new Path2D();
        if (shape.points && shape.points.length > 0) {
          path.moveTo(shape.points[0].x, shape.points[0].y);
          for (let i = 1; i < shape.points.length; i++) {
            path.lineTo(shape.points[i].x, shape.points[i].y);
          }
        } else {
          path.moveTo(shape.start.x, shape.start.y);
        }
        return path;
      }
      case "rect":
        path.rect(
          shape.start.x,
          shape.start.y,
          shape.end.x - shape.start.x,
          shape.end.y - shape.start.y
        );
        break;
      case "circle": {
        const radius = Math.sqrt(
          Math.pow(shape.end.x - shape.start.x, 2) +
            Math.pow(shape.end.y - shape.start.y, 2)
        );
        path.arc(shape.start.x, shape.start.y, radius, 0, Math.PI * 2);
        break;
      }
      case "line":
        path.moveTo(shape.start.x, shape.start.y);
        path.lineTo(shape.end.x, shape.end.y);
        break;
      case "triangle":
        path.moveTo(shape.start.x, shape.end.y);
        path.lineTo((shape.start.x + shape.end.x) / 2, shape.start.y);
        path.lineTo(shape.end.x, shape.end.y);
        path.closePath();
        break;
      case "trapezoid": {
        const topWidth = (shape.end.x - shape.start.x) * 0.6;
        const offsetX = (shape.end.x - shape.start.x - topWidth) / 2;
        path.moveTo(shape.start.x + offsetX, shape.start.y);
        path.lineTo(shape.start.x + offsetX + topWidth, shape.start.y);
        path.lineTo(shape.end.x, shape.end.y);
        path.lineTo(shape.start.x, shape.end.y);
        path.closePath();
        break;
      }
      case "star": {
        const cx = (shape.start.x + shape.end.x) / 2;
        const cy = (shape.start.y + shape.end.y) / 2;
        const spikes = 5;
        const outerRadius = Math.abs(shape.end.x - shape.start.x) / 2;
        const innerRadius = outerRadius / 2;
        let rot = (Math.PI / 2) * 3;
        const step = Math.PI / spikes;
        path.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
          let x = cx + Math.cos(rot) * outerRadius;
          let y = cy + Math.sin(rot) * outerRadius;
          path.lineTo(x, y);
          rot += step;
          x = cx + Math.cos(rot) * innerRadius;
          y = cy + Math.sin(rot) * innerRadius;
          path.lineTo(x, y);
          rot += step;
        }
        path.lineTo(cx, cy - outerRadius);
        path.closePath();
        break;
      }
    }
    return path;
  };

  // 도형을 실제 canvas에 그림
  const drawShape = (ctx: CanvasRenderingContext2D, shape: Shape) => {
    ctx.lineWidth = shape.lineWidth;
    ctx.strokeStyle = shape.stroke;
    ctx.fillStyle = shape.fill;

    const path = buildPath(shape);

    if (shape.type === "free") ctx.stroke(path);
    else {
      ctx.fill(path);
      ctx.stroke(path);
    }
  };

  // 전체 도형 다시 그리기
  const drawAll = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    shapes?.forEach((shape) => {
      drawShape(ctx, shape);
      if (selectedShapeId === shape.id) {
        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "red";
        ctx.setLineDash([5, 5]);
        ctx.stroke(buildPath(shape));
        ctx.restore();
      }
    });
  }, [shapes, selectedShapeId]);

  // 현재 도형 스냅샷 저장
  const snapshotHistory = (newShapes?: Shape[]) => {
    const snapshot = newShapes ?? shapes;

    // history 저장용으로 Path2D 제거
    const next: Shape[] = snapshot.map((s) => {
      if (s.type === "free") return { ...s, path: undefined }; // free도 points로만 저장
      return { ...s, path: undefined };
    });

    const last = historyRef.current[historyIndexRef.current];
    const isSame =
      last &&
      last.length === next.length &&
      last.every((s, i) => {
        const n = next[i];
        return (
          s.type === n.type &&
          s.start.x === n.start.x &&
          s.start.y === n.start.y &&
          s.end.x === n.end.x &&
          s.end.y === n.end.y &&
          s.stroke === n.stroke &&
          s.fill === n.fill &&
          s.lineWidth === n.lineWidth &&
          JSON.stringify(s.points) === JSON.stringify(n.points) // free선 비교
        );
      });

    if (isSame) return;

    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(
        0,
        historyIndexRef.current + 1
      );
    }

    if (next.length) historyRef.current.push(next);
    historyIndexRef.current = historyRef.current.length - 1;
  };

  // undo 실행 (히스토리 이전 단계로)
  const undo = useCallback(() => {
    if (historyIndexRef.current > -1) historyIndexRef.current--; // 먼저 감소
    if (historyIndexRef.current < 0) {
      setShapes([]);
    } else {
      const restoredShapes = historyRef.current[historyIndexRef.current].map(
        (s) => ({
          ...s,
          path: buildPath(s), // Path2D 재생성
        })
      );
      setShapes(restoredShapes);
    }
    setSelectedShapeId(null);
  }, []);

  // redo 실행 (히스토리 다음 단계로)
  const redo = useCallback(() => {
    // history가 없으면 바로 return
    if (historyIndexRef.current >= historyRef.current.length - 1) return;

    // 안전하게 index 증가
    historyIndexRef.current++;

    const restoredShapes = historyRef.current[historyIndexRef.current].map(
      (s) => ({
        ...s,
        path: buildPath(s), // Path2D 재생성
      })
    );
    setShapes(restoredShapes);
    setSelectedShapeId(null);
  }, []);

  // 마우스 클릭 시작 시 처리 (선택/드래그/새 도형 시작)
  const startPaint = useCallback(
    (e: MouseEvent) => {
      const pos = getCoordinates(e);
      const ctx = getCtx();
      if (!ctx) return;

      let clickedShapeId: number | null = null;
      for (let i = shapes?.length - 1; i >= 0; i--) {
        const s = shapes[i];
        const path = buildPath(s);
        const hit =
          s.type === "free"
            ? ctx.isPointInStroke(path, pos.x, pos.y)
            : ctx.isPointInPath(path, pos.x, pos.y) ||
              ctx.isPointInStroke(path, pos.x, pos.y);
        if (hit) clickedShapeId = s.id;
      }

      if (clickedShapeId) {
        setSelectedShapeId(clickedShapeId);
        const shape = shapes.find((s) => s.id === clickedShapeId);
        if (shape) {
          isDraggingRef.current = true;
          dragOffsetRef.current = {
            x: pos.x - shape.start.x,
            y: pos.y - shape.start.y,
          };
        }
        return;
      } else {
        setSelectedShapeId(null);
      }

      // 선택 모드("")일 때는 여기서 끝 → 새로운 도형 그리기 금지
      if (!mode) return;

      isPaintingRef.current = true;
      startPosRef.current = pos;

      if (mode === "free") {
        const path = new Path2D();
        path.moveTo(pos.x, pos.y);
        freePathRef.current = path;
      }
    },
    [shapes, selectedShapeId, mode]
  );

  // 마우스 이동 시 처리 (드래그/리사이즈/실시간 그리기)
  const paint = useCallback(
    (e: MouseEvent) => {
      //   if (!mode) return; // ← mode가 ""면 동작 안 함
      const pos = getCoordinates(e);
      const ctx = getCtx();
      if (!ctx) return;

      if (isDraggingRef.current && selectedShapeId) {
        setShapes((prev) =>
          prev.map((s) => {
            if (s.id !== selectedShapeId || !dragOffsetRef.current) return s;

            const dx = pos.x - dragOffsetRef.current.x;
            const dy = pos.y - dragOffsetRef.current.y;

            if (s.type === "free" && s.points) {
              // free 타입은 points 좌표 자체를 이동
              const offsetX = dx - s.start.x;
              const offsetY = dy - s.start.y;
              const movedPoints = s.points.map((p) => ({
                x: p.x + offsetX,
                y: p.y + offsetY,
              }));

              return {
                ...s,
                start: { x: dx, y: dy },
                end: {
                  x: dx + (s.end.x - s.start.x),
                  y: dy + (s.end.y - s.start.y),
                },
                points: movedPoints,
                path: buildPath({ ...s, points: movedPoints }),
              };
            }

            // 일반 도형(rect, circle 등)은 start/end만 이동
            return {
              ...s,
              start: { x: dx, y: dy },
              end: {
                x: dx + (s.end.x - s.start.x),
                y: dy + (s.end.y - s.start.y),
              },
              path: buildPath({
                ...s,
                start: { x: dx, y: dy },
                end: {
                  x: dx + (s.end.x - s.start.x),
                  y: dy + (s.end.y - s.start.y),
                },
              }),
            };
          })
        );
        return;
      }

      if (!isPaintingRef.current || !startPosRef.current || !mode) return;

      drawAll();
      if (mode === "free" && freePathRef.current) {
        freePathRef.current.lineTo(pos.x, pos.y);
        freePathPointsRef.current.push(pos); // 좌표 저장
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = strokeColor;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.stroke(freePathRef.current);
      } else {
        const tempShape: Shape = {
          id: -1,
          type: mode,
          start: startPosRef.current,
          end: pos,
          stroke: strokeColor,
          fill: fillColor,
          lineWidth,
        };
        drawShape(ctx, tempShape);
      }
    },
    [drawAll, mode, strokeColor, fillColor, lineWidth, selectedShapeId]
  );

  const exitPaint = useCallback(
    (e: MouseEvent) => {
      const pos = getCoordinates(e);

      // 드래그 종료 처리
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setShapes((prev) => {
          const next = [...prev];
          snapshotHistory(next);
          return next;
        });
        return;
      }

      if (!isPaintingRef.current || !startPosRef.current || !mode) return;
      isPaintingRef.current = false;

      if (mode === "free" && freePathRef.current) {
        const newFreeShape: Shape = {
          id: Date.now(),
          type: "free",
          start: startPosRef.current!,
          end: pos,
          stroke: strokeColor,
          fill: fillColor,
          lineWidth,
          path: undefined,
          points: [...freePathPointsRef.current],
        };

        setShapes((prev) => {
          const next = [...prev, newFreeShape];
          snapshotHistory(next);
          return next;
        });

        freePathRef.current = null;
        freePathPointsRef.current = [];
        startPosRef.current = null;

        setMode("");
        return;
      }

      // 자유곡선 외 도형
      const newShape: Shape = {
        id: Date.now(),
        type: mode,
        start: startPosRef.current!,
        end: pos,
        stroke: strokeColor,
        fill: fillColor,
        lineWidth,
      };

      setShapes((prev) => {
        const next = [...prev, newShape];
        snapshotHistory(next);
        return next;
      });

      setMode("");
      startPosRef.current = null;
    },
    [mode, strokeColor, fillColor, lineWidth]
  );

  // 마우스 hover 시 어떤 도형 위에 있는지 체크
  const handleCanvasHover = (pos: PosType) => {
    const ctx = getCtx();
    if (!ctx) return;

    for (let i = shapes?.length - 1; i >= 0; i--) {
      const s = shapes[i];
      const path = buildPath(s);
      const hit =
        s.type === "free"
          ? ctx.isPointInStroke(path, pos.x, pos.y)
          : ctx.isPointInPath(path, pos.x, pos.y) ||
            ctx.isPointInStroke(path, pos.x, pos.y);
      if (hit) {
        setHoverShapeId(s.id);
        return;
      }
    }
    setHoverShapeId(null);
  };

  // 마우스 클릭 시 도형 선택 처리
  const handleCanvasClick = (pos: PosType) => {
    const ctx = getCtx();
    if (!ctx) return;

    for (let i = shapes.length - 1; i >= 0; i--) {
      const s = shapes[i];
      const path = buildPath(s);
      const hit =
        s.type === "free"
          ? ctx.isPointInStroke(path, pos.x, pos.y)
          : ctx.isPointInPath(path, pos.x, pos.y) ||
            ctx.isPointInStroke(path, pos.x, pos.y);
      if (hit) {
        setSelectedShapeId(s.id);
        return;
      }
    }
    setSelectedShapeId(null);
  };

  // 전체 도형 및 히스토리 초기화
  const clearCanvas = () => {
    setShapes([]);
    snapshotHistory([]);
    setSelectedShapeId(null);
    historyRef.current = [];
    historyIndexRef.current = -1;
    localStorage.removeItem("drawState");
  };

  // localStorage 복원
  useEffect(() => {
    const saved = localStorage.getItem("drawState");
    if (saved) {
      const parsed = JSON.parse(saved);
      console.log(parsed);

      // history 복원 시 Path2D 재생성
      historyRef.current = (parsed.history || [])
        .filter((snapshot: Shape[]) => snapshot.length > 0) // 빈 배열 제거
        .map((snapshot: Shape[]) =>
          snapshot.map((s: Shape) => ({
            ...s,
            path: buildPath(s),
          }))
        );

      historyIndexRef.current = parsed.index ?? -1;

      // 마지막이 빈 배열이면 제거
      if (
        historyRef.current.length > 0 &&
        historyRef.current[historyRef.current.length - 1].length === 0
      ) {
        historyRef.current.pop();
        if (historyIndexRef.current >= historyRef.current.length) {
          historyIndexRef.current = historyRef.current.length - 1;
        }
      }

      // 마지막 snapshot를 현재 shapes로 적용
      if (historyIndexRef.current >= 0) {
        setShapes(
          historyRef.current[historyIndexRef.current]?.map((s) => ({
            ...s,
            path: buildPath(s), // points 기반 Path2D 재생성
          }))
        );
      } else {
        setShapes([]);
      }
    }
  }, []);

  // localStorage 저장
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const plainShapes = shapes?.map(({ path, ...rest }) => rest);
    localStorage.setItem(
      "drawState",
      JSON.stringify({
        shapes: plainShapes,
        history: historyRef.current,
        index: historyIndexRef.current,
      })
    );
  }, [shapes]);

  // canvas 이벤트 바인딩
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => startPaint(e);
    const handleMouseMove = (e: MouseEvent) => {
      paint(e);
      handleCanvasHover(getCoordinates(e));
    };
    const handleMouseUp = (e: MouseEvent) => exitPaint(e);
    const handleClick = (e: MouseEvent) => handleCanvasClick(getCoordinates(e));

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("click", handleClick);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("click", handleClick);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [startPaint, paint, exitPaint]);

  // 도형 dropdown 외부 클릭 커스텀 이벤트
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const dropdown =
        document.querySelector<HTMLDivElement>(".dropdown-wrapper");
      if (dropdown && !dropdown.contains(e.target as Node)) {
        setShowShapesDropdown(false);
      }
    };

    if (showShapesDropdown) {
      window.addEventListener("click", handleClickOutside);
    } else {
      window.removeEventListener("click", handleClickOutside);
    }

    return () => {
      window.removeEventListener("click", handleClickOutside);
    };
  }, [showShapesDropdown]);

  // ctrl + z, ctrl + shift + z를 인식해 이전과 원복을 가능하게 함
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isUndo =
        (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z";
      const isRedo =
        (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z";

      if (isUndo) {
        e.preventDefault();
        undo();
      }

      if (isRedo) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [undo, redo]);

  // 초기 history 스냅샷 저장
  useEffect(() => snapshotHistory([]), []);

  // 컴포넌트 마운트 또는 drawAll 변경 시 실행
  // (저장된 history를 불러와 canvas에 다시 그림)
  useEffect(() => drawAll(), [drawAll]);

  return (
    <Container>
      <Toolbar $width={width}>
        <ButtonGroup>
          <ToolButton onClick={() => setMode("free")} $active={mode === "free"}>
            자유 그리기
          </ToolButton>
          <DropdownWrapper>
            <DropdownButton
              ref={shapeBtnRef}
              onClick={() => setShowDropdown((prev) => !prev)}
              $active={[
                "rect",
                "circle",
                "line",
                "triangle",
                "trapezoid",
                "star",
              ].includes(mode)}
            >
              도형 선택 ▾
            </DropdownButton>

            <Dropdown buttonRef={shapeBtnRef} show={showDropdown}>
              <DropdownItem
                onClick={() => {
                  setMode("rect");
                  setShowDropdown(false);
                }}
                $active={mode === "rect"}
              >
                사각형
              </DropdownItem>
              <DropdownItem
                onClick={() => {
                  setMode("circle");
                  setShowDropdown(false);
                }}
                $active={mode === "circle"}
              >
                원
              </DropdownItem>
              <DropdownItem
                onClick={() => {
                  setMode("line");
                  setShowDropdown(false);
                }}
                $active={mode === "line"}
              >
                직선
              </DropdownItem>
              <DropdownItem
                onClick={() => {
                  setMode("triangle");
                  setShowDropdown(false);
                }}
                $active={mode === "triangle"}
              >
                삼각형
              </DropdownItem>
              <DropdownItem
                onClick={() => {
                  setMode("trapezoid");
                  setShowDropdown(false);
                }}
                $active={mode === "trapezoid"}
              >
                사다리꼴
              </DropdownItem>
              <DropdownItem
                onClick={() => {
                  setMode("star");
                  setShowDropdown(false);
                }}
                $active={mode === "star"}
              >
                별
              </DropdownItem>
            </Dropdown>
          </DropdownWrapper>

          <ToolButton onClick={() => setMode("")} $active={mode === ""}>
            선택 모드
          </ToolButton>

          <ToolButton onClick={clearCanvas}>초기화</ToolButton>
          <ToolButton
            onClick={undo}
            disabled={historyIndexRef.current < 0}
            $active={false}
          >
            되돌리기
          </ToolButton>
          <ToolButton
            onClick={redo}
            disabled={historyIndexRef.current >= historyRef.current.length - 1}
            $active={false}
          >
            다시하기
          </ToolButton>

          {(selectedShapeId || mode === "free") && (
            <PaletteWrapper>
              <label>선</label>
              <ColorInput
                type="color"
                value={
                  selectedShapeId
                    ? shapes.find((s) => s.id === selectedShapeId)?.stroke ||
                      strokeColor
                    : strokeColor
                }
                onChange={(e) => {
                  if (selectedShapeId) {
                    setShapes((prev) => {
                      const next = prev.map((s) =>
                        s.id === selectedShapeId
                          ? { ...s, stroke: e.target.value }
                          : s
                      );
                      snapshotHistory(next);
                      return next;
                    });
                  } else {
                    setStrokeColor(e.target.value);
                  }
                }}
              />
              <label>채우기</label>
              <ColorInput
                type="color"
                value={
                  selectedShapeId
                    ? shapes.find((s) => s.id === selectedShapeId)?.fill ||
                      fillColor
                    : fillColor
                }
                onChange={(e) => {
                  if (selectedShapeId) {
                    setShapes((prev) => {
                      const next = prev.map((s) =>
                        s.id === selectedShapeId
                          ? { ...s, fill: e.target.value }
                          : s
                      );
                      snapshotHistory(next);
                      return next;
                    });
                  } else {
                    setFillColor(e.target.value);
                  }
                }}
              />
              <label>두께</label>
              <RangeInput
                type="range"
                min={1}
                max={20}
                value={
                  selectedShapeId
                    ? shapes.find((s) => s.id === selectedShapeId)?.lineWidth ||
                      lineWidth
                    : lineWidth
                }
                onChange={(e) => {
                  if (selectedShapeId) {
                    setShapes((prev) => {
                      const next = prev.map((s) =>
                        s.id === selectedShapeId
                          ? { ...s, lineWidth: Number(e.target.value) }
                          : s
                      );
                      snapshotHistory(next);
                      return next;
                    });
                  } else {
                    setLineWidth(Number(e.target.value));
                  }
                }}
              />
            </PaletteWrapper>
          )}
        </ButtonGroup>
      </Toolbar>

      <CanvasWrapper $width={width}>
        <Canvas
          ref={canvasRef}
          width={width}
          height={height}
          $cursorStyle={
            // 드래그 중이면 move
            isDraggingRef.current && selectedShapeId
              ? "move"
              : // 자유그리기 모드면 펜 커서
              mode === "free"
              ? ""
              : hoverShapeId
              ? "pointer"
              : mode
              ? "crosshair"
              : "default"
          }
        />
      </CanvasWrapper>
    </Container>
  );
};

export default DrawBoard;
