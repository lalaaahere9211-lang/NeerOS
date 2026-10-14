export const shapes = {
  shapeExtraSmall: 4,
  shapeSmall: 8,
  shapeMedium: 12,
  shapeLarge: 16,
  shapeExtraLarge: 28,
  shapeFull: 999,
} as const;

export type Shapes = typeof shapes;
