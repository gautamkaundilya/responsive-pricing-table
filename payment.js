// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// ----- Read plan info from URL -----
const params = new URLSearchParams(window.location.search);
const plan = params.get('plan') || 'Unknown Plan';
const websites = params.get('websites') || '—';
const price = params.get('price') || '—';
const billing = params.get('billing') || 'monthly';

// Inject summary
const summaryEl = document.getElementById('orderSummary');
summaryEl.textContent = `${plan} • ${websites} websites • ₹${price}/${billing === 'yearly' ? 'mo (billed yearly)' : 'mo'}`;

// Card button amount
document.getElementById('cardAmount').textContent = price;

// Copy helpers
function copy(text, btn) {
  navigator.clipboard.writeText(text).then(()=>{
    if (btn) { const old = btn.textContent; btn.textContent = 'Copied'; setTimeout(()=> btn.textContent = old, 1200); }
  });
}
document.getElementById('copyUpi').addEventListener('click', (e) => copy('7700891004@ptsbi', e.currentTarget));
document.getElementById('copyPaypal').addEventListener('click', (e) => copy('gautamkaundilya11may@gmail.com', e.currentTarget));

// ----- Build UPI Links -----
const upiID = '7700891004@ptsbi';
const note = `${plan} - ${billing}`;
const amount = price;

function genericUpiLink() {
  return `upi://pay?pa=${encodeURIComponent(upiID)}&pn=${encodeURIComponent(plan)}&am=${encodeURIComponent(amount)}&tn=${encodeURIComponent(note)}&cu=INR`;
}
function intentFor(packageName) {
  // Android intent deep link to force specific app
  const qp = `pa=${encodeURIComponent(upiID)}&pn=${encodeURIComponent(plan)}&am=${encodeURIComponent(amount)}&tn=${encodeURIComponent(note)}&cu=INR`;
  return `intent://pay?${qp}#Intent;scheme=upi;package=${packageName};end`;
}
// Generic open
const upiIntent = document.getElementById('upiIntent');
upiIntent.href = genericUpiLink();

// App specific
document.getElementById('btnGpay').href     = intentFor('com.google.android.apps.nbu.paisa.user'); // GPay
document.getElementById('btnPaytm').href    = intentFor('net.one97.paytm');                         // Paytm
document.getElementById('btnPhonePe').href  = intentFor('com.phonepe.app');                         // PhonePe
document.getElementById('btnBharatPe').href = intentFor('com.bharatpe.app');                        // BharatPe

// PayPal app scheme (may not work on all browsers) + fallback to email
document.getElementById('btnPaypal').addEventListener('click', (e) => {
  e.preventDefault();
  const paypalEmail = 'gautamkaundilya11may@gmail.com';
  const appUrl = `paypal://send?recipient=${encodeURIComponent(paypalEmail)}&amount=${encodeURIComponent(amount)}&currencyCode=INR&note=${encodeURIComponent(note)}`;
  // Try opening app scheme
  window.location.href = appUrl;
  // Fallback after a short delay to mailto with instructions
  setTimeout(() => {
    const subject = `Payment for ${plan} (${billing})`;
    const body = `Plan: ${plan}\nWebsites: ${websites}\nBilling: ${billing}\nAmount: ₹${price}\n\nIf PayPal app didn't open, reply with proof or pay via app and send transaction ID.`;
    window.open(`mailto:${paypalEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank', 'noopener');
  }, 800);
});

// ----- Card Payment (Front-end demo flow) -----
const form = document.getElementById('cardForm');
const cardName  = document.getElementById('cardName');
const billEmail = document.getElementById('billEmail');
const cardNumber= document.getElementById('cardNumber');
const cardExpiry= document.getElementById('cardExpiry');
const cardCvv   = document.getElementById('cardCvv');

function digitsOnly(s){ return s.replace(/\D/g,''); }
function luhnOk(num){
  // Luhn algorithm
  const arr = digitsOnly(num).split('').reverse().map(x => +x);
  const sum = arr.reduce((acc,d,idx)=> acc + (idx%2 ? ((d*=2)>9?d-9:d) : d), 0);
  return sum % 10 === 0;
}
function expiryOk(v){
  const m = v.match(/^(\d{2})\/(\d{2})$/);
  if(!m) return false;
  let [_, MM, YY] = m;
  const month = +MM;
  const year  = 2000 + (+YY);
  if(month<1 || month>12) return false;
  const now = new Date();
  const lastDay = new Date(year, month, 0);
  return lastDay >= new Date(now.getFullYear(), now.getMonth(), 1);
}

// formatting helpers
cardNumber.addEventListener('input', ()=>{
  let v = digitsOnly(cardNumber.value).slice(0,19);
  cardNumber.value = v.replace(/(.{4})/g,'$1 ').trim();
});
cardExpiry.addEventListener('input', ()=>{
  let v = digitsOnly(cardExpiry.value).slice(0,4);
  if(v.length>=3) v = v.slice(0,2) + '/' + v.slice(2);
  cardExpiry.value = v;
});

form.addEventListener('submit', (e)=>{
  e.preventDefault();
  const errs = [];
  if(!cardName.value.trim()) errs.push('Name required');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billEmail.value)) errs.push('Valid email required');
  if(!luhnOk(cardNumber.value)) errs.push('Invalid card number');
  if(!expiryOk(cardExpiry.value)) errs.push('Invalid expiry');
  if(!/^\d{3,4}$/.test(cardCvv.value)) errs.push('Invalid CVV');

  if(errs.length){
    // lightweight inline error UX
    form.querySelectorAll('.field').forEach(el => el.classList.remove('invalid'));
    if(!cardName.value.trim()) form.querySelector('#cardName').closest('.field').classList.add('invalid');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billEmail.value)) billEmail.closest('.field').classList.add('invalid');
    if(!luhnOk(cardNumber.value)) cardNumber.closest('.field').classList.add('invalid');
    if(!expiryOk(cardExpiry.value)) cardExpiry.closest('.field').classList.add('invalid');
    if(!/^\d{3,4}$/.test(cardCvv.value)) cardCvv.closest('.field').classList.add('invalid');
    return;
  }

  // Show OTP overlay
  openOtp();
});

// ----- OTP Overlay -----
const otpOverlay = document.getElementById('otpOverlay');
const closeOtp   = document.getElementById('closeOtp');
const otpForm    = document.getElementById('otpForm');
const otpDigits  = document.querySelectorAll('.otp-digit');

function openOtp(){
  otpOverlay.setAttribute('aria-hidden','false');
  otpOverlay.classList.add('show');
  setTimeout(()=> otpDigits[0].focus(), 50);
}
function closeOtpFn(){
  otpOverlay.classList.remove('show');
  otpOverlay.setAttribute('aria-hidden','true');
  otpDigits.forEach(inp => inp.value = '');
}
closeOtp.addEventListener('click', closeOtpFn);
otpOverlay.addEventListener('click', (e)=>{ if(e.target === otpOverlay) closeOtpFn(); });

// Auto move to next input
otpDigits.forEach((input, idx) => {
  input.addEventListener('input', () => {
    if(input.value.length === 1 && idx < otpDigits.length - 1) {
      otpDigits[idx + 1].focus();
    }
  });
  input.addEventListener('keydown', (e) => {
    if(e.key === 'Backspace' && !input.value && idx > 0) {
      otpDigits[idx - 1].focus();
    }
  });
});

otpForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const code = Array.from(otpDigits).map(i=>i.value).join('');
  if(code === '123456'){
    const out = new URLSearchParams({
      plan, websites, price, billing, via: 'card'
    });
    window.location.href = `success.html?${out.toString()}`;
  } else {
    otpDigits.forEach(inp => {
      inp.classList.add('shake');
      setTimeout(()=> inp.classList.remove('shake'), 400);
    });
  }
});

