// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// ----- Plan info from URL -----
const q = new URLSearchParams(location.search);
const plan     = q.get('plan')     || 'Unknown Plan';
const websites = q.get('websites') || '—';
const price    = q.get('price')    || '—';
const billing  = q.get('billing')  || 'monthly';

const summaryEl = document.getElementById('orderSummary');
summaryEl.textContent = `${plan} • ${websites} websites • ₹${price}/${billing === 'yearly' ? 'mo (billed yearly)' : 'mo'}`;

const amount = price; // display amount carried over

// ----- Generic UPI helpers -----
const UPI_ID = 'gautamkaundilya1110-1@oksbi'; // 👈 your VPA (matches QR)
const NOTE   = `${plan} - ${billing}`;
function genericUpiLink() {
  return `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(plan)}&am=${encodeURIComponent(amount)}&tn=${encodeURIComponent(NOTE)}&cu=INR`;
}
document.getElementById('upiIntent').href = genericUpiLink();

// Copy buttons
function copy(text, btn){ navigator.clipboard.writeText(text).then(()=>{ if(btn){ const t=btn.textContent; btn.textContent='Copied'; setTimeout(()=>btn.textContent=t,1200);} });}
document.getElementById('copyUpi').addEventListener('click', e=> copy(UPI_ID, e.currentTarget));
document.getElementById('copyPaypal').addEventListener('click', e=> copy('gautamkaundilya11may@gmail.com', e.currentTarget));

// PayPal app scheme + email fallback
document.getElementById('btnPaypal').addEventListener('click', (e)=>{
  e.preventDefault();
  const email = 'gautamkaundilya11may@gmail.com';
  const appUrl = `paypal://send?recipient=${encodeURIComponent(email)}&amount=${encodeURIComponent(amount)}&currencyCode=INR&note=${encodeURIComponent(NOTE)}`;
  location.href = appUrl;
  setTimeout(()=>{
    const subject = `Payment for ${plan} (${billing})`;
    const body = `Plan: ${plan}\nWebsites: ${websites}\nBilling: ${billing}\nAmount: ₹${amount}\n\nIf the PayPal app didn't open, reply with proof or pay via PayPal app and send transaction ID.`;
    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank','noopener');
  },800);
});

// ----- QR “Auto Pay” (decode image then open UPI) -----
const qrImgEl       = document.getElementById('qrStatic');
const btnAutoPayQR  = document.getElementById('btnAutoPayQR');
const btnDownloadQR = document.getElementById('btnDownloadQR');
if (btnDownloadQR && qrImgEl) btnDownloadQR.href = qrImgEl.getAttribute('src');

function finalizeUpiLink(decoded){
  let s = decoded.trim();

  // If QR contains just VPA
  if (/^[\w\.-]+@[\w-]+$/i.test(s)) {
    s = `upi://pay?pa=${encodeURIComponent(s)}&pn=${encodeURIComponent(plan)}&cu=INR`;
  }
  if (s.startsWith('upi:')) {
    const url = new URL(s);
    const p = url.searchParams;
    const signed = p.has('sign');
    if (!signed) {
      if (!p.has('am')) p.set('am', String(amount));
      if (!p.has('tn')) p.set('tn', NOTE);
      if (!p.has('pn')) p.set('pn', plan);
      if (!p.has('cu')) p.set('cu', 'INR');
    }
    return `${url.protocol}//${url.host}${url.pathname}?${p.toString()}`;
  }
  return genericUpiLink();
}

function openUpi(url){
  location.href = url;   // upi://pay gets intercepted by UPI app
  // Show waiting overlay so user can continue after returning
  openWait();
}

// Decode current QR image and open
btnAutoPayQR.addEventListener('click', async ()=>{
  try{
    if (!qrImgEl.complete) await new Promise(res => qrImgEl.onload = res);
    const decoded = await QrScanner.scanImage(qrImgEl, { returnDetailedScanResult: false });
    const upiUrl  = finalizeUpiLink(decoded);
    openUpi(upiUrl);
  }catch(err){
    // Fallback: generic
    openUpi(genericUpiLink());
  }
});

// Also “Open UPI” button -> waiting overlay
document.getElementById('upiIntent').addEventListener('click', ()=> {
  setTimeout(openWait, 300);
});

// ----- Waiting overlay & success redirect (manual confirm) -----
const waitOverlay = document.getElementById('waitOverlay');
const btnPaid     = document.getElementById('btnPaid');
const btnRetryUpi = document.getElementById('btnRetryUpi');
function openWait(){ waitOverlay.classList.add('show'); waitOverlay.setAttribute('aria-hidden','false'); }
function closeWait(){ waitOverlay.classList.remove('show'); waitOverlay.setAttribute('aria-hidden','true'); }

btnPaid.addEventListener('click', ()=>{
  // Continue to success page (web cannot confirm UPI result automatically)
  const out = new URLSearchParams({ plan, websites, price: amount, billing, via: 'upi' });
  location.href = `success.html?${out.toString()}`;
});

btnRetryUpi.addEventListener('click', ()=>{
  closeWait();
  location.href = genericUpiLink();
  setTimeout(openWait, 300);
});

// When user returns from background, remind them
document.addEventListener('visibilitychange', ()=>{
  if (document.visibilityState === 'visible') {
    openWait();
  }
});

// ----- Card payment (same as before with OTP) -----
const form = document.getElementById('cardForm');
const cardName  = document.getElementById('cardName');
const billEmail = document.getElementById('billEmail');
const cardNumber= document.getElementById('cardNumber');
const cardExpiry= document.getElementById('cardExpiry');
const cardCvv   = document.getElementById('cardCvv');

function digitsOnly(s){ return s.replace(/\D/g,''); }
function luhnOk(num){
  const arr = digitsOnly(num).split('').reverse().map(x => +x);
  const sum = arr.reduce((acc,d,idx)=> acc + (idx%2 ? ((d*=2)>9?d-9:d) : d), 0);
  return sum % 10 === 0;
}
function expiryOk(v){
  const m = v.match(/^(\d{2})\/(\d{2})$/);
  if(!m) return false;
  const [_, MM, YY] = m;
  const month = +MM, year = 2000 + (+YY);
  if(month<1 || month>12) return false;
  const now = new Date();
  const lastDay = new Date(year, month, 0);
  return lastDay >= new Date(now.getFullYear(), now.getMonth(), 1);
}
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
  if(!cardName.value.trim()) errs.push('name');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billEmail.value)) errs.push('email');
  if(!luhnOk(cardNumber.value)) errs.push('card');
  if(!expiryOk(cardExpiry.value)) errs.push('exp');
  if(!/^\d{3,4}$/.test(cardCvv.value)) errs.push('cvv');

  form.querySelectorAll('.field').forEach(el => el.classList.remove('invalid'));
  if(errs.length){
    if(errs.includes('name')) cardName.closest('.field').classList.add('invalid');
    if(errs.includes('email')) billEmail.closest('.field').classList.add('invalid');
    if(errs.includes('card')) cardNumber.closest('.field').classList.add('invalid');
    if(errs.includes('exp')) cardExpiry.closest('.field').classList.add('invalid');
    if(errs.includes('cvv')) cardCvv.closest('.field').classList.add('invalid');
    return;
  }
  openOtp();
});

// ----- OTP Overlay (6 boxes) -----
const otpOverlay = document.getElementById('otpOverlay');
const closeOtp   = document.getElementById('closeOtp');
const otpForm    = document.getElementById('otpForm');
const otpDigits  = document.querySelectorAll('.otp-digit');

function openOtp(){ otpOverlay.classList.add('show'); otpOverlay.setAttribute('aria-hidden','false'); setTimeout(()=> otpDigits[0].focus(), 50); }
function closeOtpFn(){ otpOverlay.classList.remove('show'); otpOverlay.setAttribute('aria-hidden','true'); otpDigits.forEach(i=> i.value=''); }
closeOtp.addEventListener('click', closeOtpFn);
otpOverlay.addEventListener('click', e=>{ if(e.target===otpOverlay) closeOtpFn(); });

otpDigits.forEach((input, idx) => {
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g,'').slice(0,1);
    if(input.value && idx < otpDigits.length - 1) otpDigits[idx + 1].focus();
  });
  input.addEventListener('keydown', (e) => {
    if(e.key === 'Backspace' && !input.value && idx > 0) otpDigits[idx - 1].focus();
  });
});

otpForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const code = Array.from(otpDigits).map(i=>i.value).join('');
  if(code === '123456'){
    const out = new URLSearchParams({ plan, websites, price: amount, billing, via: 'card' });
    location.href = `success.html?${out.toString()}`;
  } else {
    otpDigits.forEach(inp => { inp.classList.add('shake'); setTimeout(()=> inp.classList.remove('shake'), 400); });
  }
});
