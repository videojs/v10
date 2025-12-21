export interface Point {
  x: number;
  y: number;
}

/**
 * Get progress ratio of a point on a line segment.
 * @param x - The x coordinate of the point.
 * @param y - The y coordinate of the point.
 * @param p1 - The first point of the line segment.
 * @param p2 - The second point of the line segment.
 */
export function getPointProgressOnLine(x: number, y: number, p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) return 0; // Avoid division by zero if p1 === p2

  const projection = ((x - p1.x) * dx + (y - p1.y) * dy) / lengthSquared;

  return Math.max(0, Math.min(1, projection)); // Clamp between 0 and 1
}

export function distance(p1: Point, p2: Point): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}
