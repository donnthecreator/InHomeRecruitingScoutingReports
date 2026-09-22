/* =====================================================================
   sms.js
   Text a coach through Twilio. Only coaches who opted in are ever sent
   anything (the caller checks that); every send is logged. Without the
   Twilio variables this returns { sent:false, error } so admin can say
   exactly why nothing went out.

   ENV: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and one of
        TWILIO_MESSAGING_SERVICE_SID (preferred, carries the registered
        business campaign) or TWILIO_FROM (an E.164 number, +12055551234)
===================================================================== */
function normalizePhone(raw) {
  const d = String(raw || '').replace(/[^\d+]/g, '');
  if (!d) return null;
  if (d.startsWith('+')) return d.length >= 11 ? d : null;
  const n = d.replace(/\D/g, '');
  if (n.length === 10) return '+1' + n;
  if (n.length === 11 && n.startsWith('1')) return '+' + n;
  return null;
}

async function sendSms(to, body) {
  const sid = process.env.TWILIO_ACCOUNT_SID, token = process.env.TWILIO_AUTH_TOKEN;
  const svc = process.env.TWILIO_MESSAGING_SERVICE_SID, from = process.env.TWILIO_FROM;
  if (!sid || !token || (!svc && !from)) return { sent: false, error: 'Texting is not set up yet (Twilio keys missing on the scout site).' };
  const phone = normalizePhone(to);
  if (!phone) return { sent: false, error: 'Bad phone number' };
  const form = new URLSearchParams({ To: phone, Body: body });
  if (svc) form.set('MessagingServiceSid', svc); else form.set('From', from);
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return { sent: false, error: j.message || ('Twilio HTTP ' + res.status) };
    return { sent: true, sid: j.sid, status: j.status };
  } catch (e) { return { sent: false, error: e.message }; }
}

module.exports = { sendSms, normalizePhone };
