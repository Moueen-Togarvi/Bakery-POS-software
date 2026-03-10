export const formatCurrency = (value: number | string) => {
  try {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(typeof value === 'number' ? value : Number(value));
  } catch (error) {
    console.error('Currency formatting error:', error);
    // Fallback to basic formatting
    const num = typeof value === 'number' ? value : Number(value);
    return `Rs. ${num.toFixed(2)}`;
  }
};
