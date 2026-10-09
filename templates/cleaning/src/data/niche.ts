// Niche-level constants for the house-cleaning template: the same for every cleaner,
// so they live in code rather than in each business's content JSON.

/** CTA ladder: quote (price) -> request a time (booking) -> no-commitment reassurance -> "not sure" catch-all. */
export const cta = {
  quote: 'Get a Free Quote',
  quoteShort: 'Free Quote',
  book: 'Request a Cleaning Time',
  bookShort: 'Request a Time',
  bandHeading: 'Free quote. No contract required.',
  formHeading: 'Get a Free Quote',
  formSubmit: 'Request My Free Quote',
  formMessageLabel: 'Tell Us About Your Home',
  formMessagePlaceholder: 'Bedrooms, bathrooms, pets, anything we should know…',
  sidebarFallback: 'Get a clear quote before you commit.',
};

/** Request-a-time widget (Kai criterion 7): a preferred date plus an arrival window. */
export const booking = {
  windows: ['Morning 8–11', 'Midday 11–2', 'Afternoon 2–5', 'Any time'],
};

/** Theme registry. CSS lives in styles/themes.css; fonts load from Google Fonts. */
export const themes = {
  fresh: { label: 'Fresh', fonts: 'family=Plus+Jakarta+Sans:wght@400;500;600;700;800' },
  classic: { label: 'Classic', fonts: 'family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600' },
  warm: { label: 'Warm', fonts: 'family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,600&family=Inter:wght@400;500;600' },
} as const;
export type ThemeName = keyof typeof themes;

const today = 'January 2026';

/** Legal pages. {{tokens}} are filled by components/LegalPage.astro. */
export const legal = {
  privacy: {
    meta: { title: 'Privacy Policy | {{name}}', description: 'How {{name}} collects, uses and protects the information you share when you request a cleaning quote or contact us.' },
    title: 'Privacy Policy',
    sub: `Last updated: ${today}`,
    html: `
<p class="lead-p">{{name}} ("we," "us," or "our") respects your privacy. This policy explains what we collect when you visit {{domain}} or contact us about cleaning services, how we use it, and the choices you have.</p>
<h2>Information We Collect</h2>
<p>When you request a quote, request a cleaning time, send a text through the site, call us, or email us, you may give us:</p>
<ul>
  <li>Your name, phone number and email address</li>
  <li>Your service address and details about your home (size, pets, entry instructions)</li>
  <li>Your preferred date and arrival window</li>
  <li>Anything else you choose to include in a message</li>
</ul>
<p>Like most websites, our hosting provider automatically records basic technical data such as your browser type, device, pages visited and approximate location derived from your IP address.</p>
<h2>How We Use Your Information</h2>
<ul>
  <li>To answer your request, prepare a quote and schedule your cleaning</li>
  <li>To confirm appointments and send reminders and follow-ups by phone, text or email</li>
  <li>To improve our services and this website</li>
  <li>To meet legal, tax and accounting obligations</li>
</ul>
<h2>Text Messages (SMS)</h2>
<p>If you give us your mobile number and agree to receive text messages, we may text you about your quote, booking and service. Message frequency varies. Message and data rates may apply. Reply STOP to opt out at any time, or HELP for help. Consent to receive texts is not a condition of purchase.</p>
<p>We do not sell, rent or share your mobile number or SMS opt-in data with third parties or affiliates for their marketing purposes.</p>
<h2>How We Share Information</h2>
<p>We do not sell your personal information. We share it only with service providers who help us run the business (for example, scheduling, payment, phone and email tools), and only as needed to provide our services, or when required by law.</p>
<h2>Entry Codes and Keys</h2>
<p>If you give us a door code, lockbox code or key, we use it only to access your home for scheduled cleanings, limit it to the people doing your cleaning, and delete or return it when you ask or when service ends.</p>
<h2>Data Retention and Security</h2>
<p>We keep your information for as long as needed to provide services and meet legal obligations, then delete it. We use reasonable safeguards to protect it, but no method of transmission or storage is completely secure.</p>
<h2>Your Choices</h2>
<p>You can ask us to access, correct or delete your personal information, or to stop contacting you, at any time. {{contact_line}}</p>
<h2>Children</h2>
<p>This website is not directed to children under 13, and we do not knowingly collect their information.</p>
<h2>Changes</h2>
<p>We may update this policy from time to time. The date at the top of this page shows when it last changed.</p>
<h2>Contact Us</h2>
<p>{{name}}, {{hq}}. {{contact_line}}</p>`,
  },
  terms: {
    meta: { title: 'Terms and Conditions | {{name}}', description: 'Terms for using the {{name}} website and requesting quotes, bookings and text messages for cleaning services.' },
    title: 'Terms and Conditions',
    sub: `Last updated: ${today}`,
    html: `
<p class="lead-p">These terms apply to your use of {{domain}} and to quotes and bookings you request through it. By using the site or submitting a form, you agree to them.</p>
<h2>Quotes and Bookings</h2>
<p>Quotes are based on the information you provide about your home and the service requested. If the home's size or condition differs from what was described, we will tell you before work begins and confirm any change in price with you first. A requested date and arrival window is a request, not a confirmed appointment, until we confirm it with you.</p>
<h2>Scheduling, Rescheduling and Cancellation</h2>
<p>Please give us as much notice as possible if you need to reschedule or cancel. Any cancellation or lockout terms will be explained when your booking is confirmed.</p>
<h2>Access, Pets and Safety</h2>
<p>You agree to give us safe access to the areas to be cleaned, and to tell us about pets, alarms and any hazards in advance. We may decline or stop work in unsafe conditions.</p>
<h2>If Something Isn't Right</h2>
<p>If you are not satisfied with any part of a cleaning, contact us promptly so we can review it and make it right. If something is damaged during a cleaning, tell us as soon as possible with a description and photos, and we will work with you to resolve it.</p>
<h2>Text Message Terms</h2>
<p>By checking the consent box on our forms, you agree to receive text messages from {{name}} about your request and service at the number you provided. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is not a condition of purchase. See our <a href="/privacy">Privacy Policy</a> for how we handle your number.</p>
<h2>Website Content</h2>
<p>Content on this site is for general information. Service descriptions, timing and availability may change without notice. Reviews shown are from public Google reviews of {{name}}.</p>
<h2>Limitation of Liability</h2>
<p>To the fullest extent permitted by law, {{name}} is not liable for indirect, incidental or consequential damages arising from your use of this website.</p>
<h2>Governing Law</h2>
<p>These terms are governed by the laws of the state in which {{name}} is located.</p>
<h2>Contact</h2>
<p>Questions about these terms? {{contact_line}}</p>`,
  },
};
