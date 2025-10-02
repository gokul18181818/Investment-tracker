export const $ = (n: number): string => {
  const val = Math.abs(n) < 0.005 ? 0 : n;
  return val.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
}; 