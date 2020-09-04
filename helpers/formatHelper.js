const currencyFormatter = Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const numberFormatter = Intl.NumberFormat('pt-BR', {});

function formatCurrency(value) {
  return currencyFormatter.format(value);
}

function formatNumber(value) {
  return numberFormatter.format(value);
}

export { formatCurrency, formatNumber };
