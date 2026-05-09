declare module 'react-grid-layout' {
  import { ComponentType, CSSProperties, ReactNode } from 'react';

  export interface Layout {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
    isDraggable?: boolean;
    isResizable?: boolean;
    static?: boolean;
  }

  export type Layouts = { [breakpoint: string]: Layout[] };

  export interface ResponsiveProps {
    className?: string;
    style?: CSSProperties;
    layouts: Layouts;
    breakpoints?: { [key: string]: number };
    cols?: { [key: string]: number };
    rowHeight?: number;
    margin?: [number, number];
    containerPadding?: [number, number];
    isDraggable?: boolean;
    isResizable?: boolean;
    isBounded?: boolean;
    onLayoutChange?: (layout: Layout[], allLayouts: Layouts) => void;
    onBreakpointChange?: (newBreakpoint: string, newCols: number) => void;
    onDragStart?: (layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: any, event: MouseEvent, element: HTMLElement) => void;
    onDragStop?: (layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: any, event: MouseEvent, element: HTMLElement) => void;
    draggableCancel?: string;
    children?: ReactNode;
    width?: number;
    measureBeforeMount?: boolean;
    useCSSTransforms?: boolean;
    compactType?: 'vertical' | 'horizontal' | null;
    preventCollision?: boolean;
    allowOverlap?: boolean;
  }

  export const Responsive: ComponentType<ResponsiveProps>;
  export function WidthProvider<P>(Component: ComponentType<P>): ComponentType<Omit<P, 'width'>>;

  const GridLayout: ComponentType<any>;
  export default GridLayout;
}

declare module 'react-grid-layout/css/styles.css';
declare module 'react-resizable/css/styles.css';
