const formatIndianNumber = (num: any) => {
  if (num === undefined || num === null) return '0.00';
  const numStr = typeof num === 'number' ? num.toString() : num;
  const number = parseFloat(numStr.replace(/,/g, ''));
  if (isNaN(number)) return '0.00';
  return number.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
};

export default formatIndianNumber;