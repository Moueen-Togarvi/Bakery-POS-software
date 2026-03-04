export const formatCurrency = (value: number | string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(typeof value === 'number' ? value : Number(value));
