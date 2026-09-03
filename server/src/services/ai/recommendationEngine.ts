export function listingAdvice(farmerPaise: number, modalPaise: number | null) {
  if (modalPaise == null) {
    return "No stored market modal for this commodity yet. Set price from your harvest cost, not invented ‘live’ rates.";
  }
  const farmer = farmerPaise / 100;
  const modal = modalPaise / 100;
  const lo = Math.round(modal * 0.96 * 100) / 100;
  const hi = Math.round(modal * 1.08 * 100) / 100;
  return `Current market trend uses stored modal ₹${modal}/unit. Consider ₹${lo}–₹${hi}. Your listing is ₹${farmer}.`;
}
