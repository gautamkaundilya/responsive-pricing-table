// Year in footer
document.getElementById('year').textContent = new Date().getFullYear();

// Billing toggle (Monthly ↔ Yearly)
const toggle = document.getElementById('billingToggle');
const amounts = document.querySelectorAll('.amount');
const saveBadge = document.getElementById('saveBadge');

function setBillingMode(isYearly) {
  amounts.forEach(el => {
    const m = Number(el.getAttribute('data-monthly'));
    const y = Number(el.getAttribute('data-yearly')); // discounted monthly-equivalent for yearly
    el.textContent = isYearly ? y : m;
  });
  toggle?.setAttribute('aria-pressed', String(isYearly));
  if (saveBadge) saveBadge.hidden = !isYearly;
}
setBillingMode(false);
toggle.addEventListener('change', (e) => setBillingMode(e.target.checked));

// Route to payment page with query params
function goToPayment({ plan, websites, price, billing }) {
  const params = new URLSearchParams({
    plan,
    websites: String(websites),
    price: String(price),
    billing
  });
  window.location.href = `payment.html?${params.toString()}`;
}

document.querySelectorAll('.btn.choose').forEach(btn => {
  btn.addEventListener('click', () => {
    const plan = btn.dataset.plan;
    const websites = Number(btn.dataset.websites);
    const monthly = Number(btn.dataset.monthly);
    const yearly = Number(btn.dataset.yearly);
    const isYearly = toggle.checked;
    const price = isYearly ? yearly : monthly;
    const billing = isYearly ? 'yearly' : 'monthly';
    goToPayment({ plan, websites, price, billing });
  });
});
