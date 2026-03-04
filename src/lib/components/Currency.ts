export const formatCurrency = (value: number | string) =>
  new Intl.NumberFormat('ur-PK', {
    style: 'currency',
    currency: 'PKR'
  }).format(typeof value === 'number' ? value : Number(value));
