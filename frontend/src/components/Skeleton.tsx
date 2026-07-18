export function Skeleton({
  width,
  height,
  radius,
}: {
  width?: string;
  height?: string;
  radius?: string;
}) {
  return (
    <span
      className="skeleton"
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}
