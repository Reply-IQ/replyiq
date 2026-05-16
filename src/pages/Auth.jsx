import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Spinner } from '../components/UI.jsx'

// ── Translations for the Auth page ──────────────────────────────────────────
const AUTH_T = {
  en: {
    tagline1: 'More guests.',
    tagline2: 'Higher ratings.',
    tagline3: 'Zero extra work.',
    subtext: 'Respond to every guest review automatically — across Google, TripAdvisor, Booking.com and more. Your AI reputation manager, available 24/7.',
    stat1l: 'response rate', stat2l: 'avg rating lift', stat3l: 'per month',
    bullet1: 'Respond to every review — rank higher on Google and TripAdvisor',
    bullet2: 'Professional responses — better rating and more bookings',
    bullet3: 'Guests who feel heard — 2× more likely to return and recommend you',
    bullet4: 'One inbox for all platforms — your team saves hours every week',
    worksWith: 'Works with',
    earlyBadge: 'Swiss · Early Access · CHF 149/mo · Limited spots',
    welcomeBack: 'Welcome back',
    signInSub: 'Sign in to your ReplyIQ account',
    emailLabel: 'Email address',
    passLabel: 'Password',
    passPlaceholder: '••••••••',
    signIn: 'Sign In →',
    signingIn: 'Signing in...',
    loginError: 'Incorrect email or password.',
    divider: "Don't have access yet?",
    accessTitle: 'Request Early Access',
    accessDesc: 'ReplyIQ is invite-only during Early Access. We personally onboard every client in under 10 minutes.',
    nameLabel: 'Your full name',
    namePh: 'Maria Schneider',
    hotelLabel: 'Hotel or restaurant name',
    hotelPh: 'Hotel Opera Zürich',
    accessEmailLabel: 'Work email',
    accessEmailPh: 'maria@hotelopera.ch',
    requestBtn: 'Request Early Access →',
    requesting: 'Sending request...',
    successTitle: 'Request received!',
    successMsg: 'We will review your request and send your login credentials within 24 hours. Check your inbox.',
    gdpr: 'GDPR Compliant',
    swissPrivacy: 'Swiss Data Privacy',
    cancelAnytime: 'Cancel anytime',
    pricingBadge: 'EARLY ACCESS PRICING',
    pricingSub: 'Limited spots · Lock in forever',
    trialNote: '14-day free trial · 1 booking covers your monthly cost',
    testimonial: '"Went from 20% to 100% response rate — without hiring anyone. Google ranking improved and bookings went up within 6 weeks."',
    testimonialName: 'Marcus K.',
    testimonialRole: 'General Manager · 4-star Hotel, Zürich',
    trustedIn: 'Trusted in',
    fillAll: 'Please fill in all fields.',
  },
  de: {
    tagline1: 'Mehr Gäste.',
    tagline2: 'Bessere Bewertungen.',
    tagline3: 'Null Mehraufwand.',
    subtext: 'Antworten Sie automatisch auf jede Gästebewertung — auf Google, TripAdvisor, Booking.com und mehr. Ihr KI-Reputationsmanager, rund um die Uhr verfügbar.',
    stat1l: 'Antwortquote', stat2l: 'Ø Bewertungsanstieg', stat3l: 'pro Monat',
    bullet1: 'Auf jede Bewertung antworten — besser bei Google und TripAdvisor ranken',
    bullet2: 'Professionelle Antworten — bessere Bewertung und mehr Buchungen',
    bullet3: 'Gäste, die sich gehört fühlen — 2× häufiger zurückkehrend',
    bullet4: 'Ein Posteingang für alle Plattformen — Ihr Team spart Stunden pro Woche',
    worksWith: 'Funktioniert mit',
    earlyBadge: 'Schweizer Produkt · Früher Zugang · CHF 149/Mo · Begrenzte Plätze',
    welcomeBack: 'Willkommen zurück',
    signInSub: 'Melden Sie sich bei Ihrem ReplyIQ-Konto an',
    emailLabel: 'E-Mail-Adresse',
    passLabel: 'Passwort',
    passPlaceholder: '••••••••',
    signIn: 'Anmelden →',
    signingIn: 'Anmeldung läuft...',
    loginError: 'Falsche E-Mail-Adresse oder falsches Passwort.',
    divider: 'Noch keinen Zugang?',
    accessTitle: 'Frühen Zugang anfragen',
    accessDesc: 'ReplyIQ ist während des Early Access nur auf Einladung verfügbar. Wir onboarden jeden Kunden persönlich in unter 10 Minuten.',
    nameLabel: 'Ihr vollständiger Name',
    namePh: 'Maria Schneider',
    hotelLabel: 'Hotel- oder Restaurantname',
    hotelPh: 'Hotel Opera Zürich',
    accessEmailLabel: 'Geschäftliche E-Mail',
    accessEmailPh: 'maria@hotelopera.ch',
    requestBtn: 'Frühen Zugang anfragen →',
    requesting: 'Anfrage wird gesendet...',
    successTitle: 'Anfrage erhalten!',
    successMsg: 'Wir prüfen Ihre Anfrage und senden Ihre Zugangsdaten innerhalb von 24 Stunden. Prüfen Sie Ihren Posteingang.',
    gdpr: 'DSGVO-konform',
    swissPrivacy: 'Schweizer Datenschutz',
    cancelAnytime: 'Jederzeit kündbar',
    pricingBadge: 'EARLY ACCESS PREIS',
    pricingSub: 'Begrenzte Plätze · Preis für immer gesichert',
    trialNote: '14 Tage kostenlos testen · 1 Buchung deckt Ihre monatlichen Kosten',
    testimonial: '"Von 20% auf 100% Antwortquote — ohne neue Mitarbeiter. Google-Ranking verbessert, Buchungen gestiegen innerhalb von 6 Wochen."',
    testimonialName: 'Marcus K.',
    testimonialRole: 'Geschäftsführer · 4-Sterne-Hotel, Zürich',
    trustedIn: 'Vertraut in',
    fillAll: 'Bitte füllen Sie alle Felder aus.',
  },
  fr: {
    tagline1: 'Plus de clients.',
    tagline2: 'Meilleures notes.',
    tagline3: 'Zéro effort supplémentaire.',
    subtext: 'Répondez automatiquement à chaque avis de client — sur Google, TripAdvisor, Booking.com et plus. Votre gestionnaire de réputation IA, disponible 24h/24.',
    stat1l: 'taux de réponse', stat2l: 'hausse moy. de note', stat3l: 'par mois',
    bullet1: 'Répondre à chaque avis — mieux classé sur Google et TripAdvisor',
    bullet2: 'Réponses professionnelles — meilleure note et plus de réservations',
    bullet3: 'Clients qui se sentent écoutés — 2× plus susceptibles de revenir',
    bullet4: 'Une boîte de réception pour toutes les plateformes — des heures économisées par semaine',
    worksWith: 'Compatible avec',
    earlyBadge: 'Suisse · Accès anticipé · CHF 149/mois · Places limitées',
    welcomeBack: 'Bienvenue',
    signInSub: 'Connectez-vous à votre compte ReplyIQ',
    emailLabel: 'Adresse e-mail',
    passLabel: 'Mot de passe',
    passPlaceholder: '••••••••',
    signIn: 'Se connecter →',
    signingIn: 'Connexion en cours...',
    loginError: 'Email ou mot de passe incorrect.',
    divider: "Pas encore d'accès ?",
    accessTitle: "Demander l'accès anticipé",
    accessDesc: "ReplyIQ est sur invitation uniquement pendant l'accès anticipé. Nous intégrons chaque client personnellement en moins de 10 minutes.",
    nameLabel: 'Votre nom complet',
    namePh: 'Marie Schneider',
    hotelLabel: "Nom de l'hôtel ou du restaurant",
    hotelPh: 'Hôtel Opera Zürich',
    accessEmailLabel: 'E-mail professionnel',
    accessEmailPh: 'marie@hotelopera.ch',
    requestBtn: "Demander l'accès anticipé →",
    requesting: 'Envoi de la demande...',
    successTitle: 'Demande reçue !',
    successMsg: "Nous examinerons votre demande et vous enverrons vos identifiants dans les 24 heures. Vérifiez votre boîte de réception.",
    gdpr: 'Conforme RGPD',
    swissPrivacy: 'Confidentialité suisse',
    cancelAnytime: 'Annulable à tout moment',
    pricingBadge: "TARIF ACCÈS ANTICIPÉ",
    pricingSub: 'Places limitées · Prix garanti à vie',
    trialNote: '14 jours d\'essai gratuit · 1 réservation couvre votre coût mensuel',
    testimonial: '"Passé de 20% à 100% de taux de réponse — sans embaucher personne. Classement Google amélioré et réservations en hausse en 6 semaines."',
    testimonialName: 'Marcus K.',
    testimonialRole: 'Directeur Général · Hôtel 4 étoiles, Zurich',
    trustedIn: 'Présent à',
    fillAll: 'Veuillez remplir tous les champs.',
  }
}

const LOGOS = {
  Google: <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>,
  TripAdvisor: <svg width="18" height="18" viewBox="0 0 24 24"><circle cx="6.5" cy="14.5" r="3.5" fill="#00AF87"/><circle cx="17.5" cy="14.5" r="3.5" fill="#00AF87"/><path fill="#00AF87" d="M12 3C7 3 3 6 2 9h2.5a4 4 0 0 1 7.5 0h0a4 4 0 0 1 7.5 0H22C21 6 17 3 12 3z"/><circle cx="6.5" cy="14.5" r="1.5" fill="white"/><circle cx="17.5" cy="14.5" r="1.5" fill="white"/></svg>,
  'Booking.com': <svg width="18" height="18" viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#003580"/><text x="4" y="17" fontSize="11" fontWeight="900" fill="white" fontFamily="Arial">B.</text></svg>,
  Instagram: <svg width="18" height="18" viewBox="0 0 24 24"><defs><radialGradient id="ig" x1="30%" y1="107%" x2="0%" y2="96%"><stop offset="0%" stopColor="#ffd676"/><stop offset="25%" stopColor="#f46f30"/><stop offset="50%" stopColor="#dc2743"/><stop offset="75%" stopColor="#cc2366"/><stop offset="100%" stopColor="#bc1888"/></radialGradient></defs><rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig)"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="white" strokeWidth="1.8"/><circle cx="17.5" cy="6.5" r="1.2" fill="white"/></svg>,
  Facebook: <svg width="18" height="18" viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#1877F2"/><path fill="white" d="M16 8h-2a1 1 0 0 0-1 1v2h3l-.5 3H13v7h-3v-7H8v-3h2V9a4 4 0 0 1 4-4h2v3z"/></svg>,
}

const SwissFlag = ({ size=11 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius:2, flexShrink:0, display:'inline-block', verticalAlign:'middle' }}>
    <rect width="20" height="20" fill="#FF0000"/>
    <rect x="3" y="7" width="14" height="6" fill="white"/>
    <rect x="7" y="3" width="6" height="14" fill="white"/>
  </svg>
)


// ── Internal notification email to Alex ──────────────────────────────────────
function buildInternalNotification(name, hotel, email) {
  return '<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0A0A0F;color:#E8E4DC;padding:32px">' +
    '<div style="max-width:520px;margin:0 auto;background:#1C2430;border-radius:14px;padding:32px;border:1px solid #2A3545">' +
    '<div style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:#C9A96E;margin-bottom:24px">New Access Request 🔔</div>' +
    '<div style="margin-bottom:16px;padding:16px;background:#0A0A0F;border-radius:10px;border-left:3px solid #C9A96E">' +
    '<div style="margin-bottom:10px"><span style="color:#C9A96E;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:1px">Name</span><br/><span style="color:#E8E4DC;font-size:15px;font-weight:600">' + name + '</span></div>' +
    '<div style="margin-bottom:10px"><span style="color:#C9A96E;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:1px">Property</span><br/><span style="color:#E8E4DC;font-size:15px;font-weight:600">' + hotel + '</span></div>' +
    '<div><span style="color:#C9A96E;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:1px">Email</span><br/><a href="mailto:' + email + '" style="color:#60A5FA;font-size:15px">' + email + '</a></div>' +
    '</div>' +
    '<div style="padding:14px;background:rgba(201,169,110,0.06);border-radius:10px;font-size:13px;color:#A0A0B8;line-height:1.7">' +
    '<strong style="color:#C9A96E">Next steps:</strong><br/>1. They will receive a booking link for a 30-min call<br/>2. After the call: Supabase &rarr; Authentication &rarr; Invite user<br/>3. Send credentials via <code style="background:#0A0A0F;padding:1px 5px;border-radius:3px">/api/send-invite</code>' +
    '</div></div></body></html>'
}

// ── Beautiful prospect email ──────────────────────────────────────────────────
function buildProspectEmail(name, hotel, lang) {
  const firstName = name.split(' ')[0]

  const copy = {
    en: {
      subject:   'You made the right call, ' + firstName,
      hero:      'Your reputation is about to change.',
      sub:       firstName + ', you just took the first step toward higher ratings, more bookings and zero wasted hours on review management.',
      whyTitle:  'Here is what ReplyIQ will do for ' + hotel,
      why1t: 'Respond to every review — automatically',
      why1d: 'Your AI replies to every Google, TripAdvisor and Booking.com review in your exact brand voice. In seconds. While you sleep.',
      why2t: 'Rank higher on Google',
      why2d: 'Google rewards businesses that respond. Properties using ReplyIQ see measurable ranking improvements within 4–6 weeks.',
      why3t: 'Save 2–3 hours every week',
      why3d: 'The average GM spends 2–3 hours per week writing review replies manually. ReplyIQ gives that time back — permanently.',
      why4t: 'Know exactly where you stand vs competitors',
      why4d: 'Live competitor benchmarking shows every hotel or restaurant within 5km, their rating, their trend, and where you rank.',
      ctaTitle: 'Book your 30-minute onboarding call',
      ctaDesc:  'We will set everything up together. Import your reviews, build your AI brand voice, and show you the full dashboard. Takes 10 minutes — the rest of the call is yours to ask anything.',
      ctaBtn:   'Choose a time that works for you →',
      ps:       'P.S. We only work with properties we genuinely believe we can help. If ReplyIQ is not the right fit after our call, we will tell you honestly.',
      footer:   'ReplyIQ · Zürich, Switzerland · Swiss data privacy',
    },
    de: {
      subject:   'Sie haben die richtige Entscheidung getroffen, ' + firstName,
      hero:      'Ihre Online-Reputation wird sich verändern.',
      sub:       firstName + ', Sie haben soeben den ersten Schritt zu besseren Bewertungen, mehr Buchungen und null Zeitverschwendung bei der Bewertungsverwaltung gemacht.',
      whyTitle:  'Was ReplyIQ für ' + hotel + ' tun wird',
      why1t: 'Auf jede Bewertung antworten — automatisch',
      why1d: 'Ihre KI antwortet auf jede Google-, TripAdvisor- und Booking.com-Bewertung in Ihrer exakten Markenstimme. In Sekunden. Auch nachts.',
      why2t: 'Besser bei Google ranken',
      why2d: 'Google belohnt Betriebe, die antworten. ReplyIQ-Nutzer sehen messbare Verbesserungen im Ranking innerhalb von 4–6 Wochen.',
      why3t: '2–3 Stunden pro Woche einsparen',
      why3d: 'Der durchschnittliche Hoteldirektor verbringt 2–3 Stunden pro Woche mit dem manuellen Schreiben von Bewertungsantworten. ReplyIQ gibt diese Zeit dauerhaft zurück.',
      why4t: 'Genau wissen, wo Sie im Vergleich zur Konkurrenz stehen',
      why4d: 'Live-Konkurrenzanalyse zeigt jeden Betrieb im Umkreis von 5 km, seine Bewertung, seinen Trend und wo Sie stehen.',
      ctaTitle: 'Buchen Sie Ihr 30-minütiges Onboarding-Gespräch',
      ctaDesc:  'Wir richten alles gemeinsam ein. Bewertungen importieren, KI-Markenstimme aufbauen, Dashboard zeigen. Dauert 10 Minuten — der Rest gehört Ihnen.',
      ctaBtn:   'Wählen Sie einen passenden Termin →',
      ps:       'P.S. Wir arbeiten nur mit Betrieben, bei denen wir wirklich überzeugt sind, helfen zu können. Falls ReplyIQ nach unserem Gespräch nicht passt, sagen wir das ehrlich.',
      footer:   'ReplyIQ · Zürich, Schweiz · Schweizer Datenschutz',
    },
    fr: {
      subject:   'Vous avez fait le bon choix, ' + firstName,
      hero:      'Votre réputation va changer.',
      sub:       firstName + ', vous venez de faire le premier pas vers de meilleures notes, plus de réservations et zéro temps perdu sur la gestion des avis.',
      whyTitle:  'Ce que ReplyIQ fera pour ' + hotel,
      why1t: 'Répondre à chaque avis — automatiquement',
      why1d: 'Votre IA répond à chaque avis Google, TripAdvisor et Booking.com avec votre voix de marque exacte. En quelques secondes. Même la nuit.',
      why2t: 'Mieux se classer sur Google',
      why2d: 'Google récompense les établissements qui répondent. Les utilisateurs de ReplyIQ voient des améliorations mesurables en 4 à 6 semaines.',
      why3t: 'Économiser 2 à 3 heures par semaine',
      why3d: 'Le directeur moyen passe 2 à 3 heures par semaine à rédiger manuellement des réponses aux avis. ReplyIQ rend ce temps définitivement.',
      why4t: 'Savoir exactement où vous en êtes face à la concurrence',
      why4d: 'Le benchmark concurrentiel en direct montre chaque établissement dans un rayon de 5 km, sa note, sa tendance et votre classement.',
      ctaTitle: 'Réservez votre appel d\'intégration de 30 minutes',
      ctaDesc:  'Nous configurerons tout ensemble. Importer vos avis, construire votre voix de marque IA, vous montrer le tableau de bord complet. 10 minutes — le reste vous appartient.',
      ctaBtn:   'Choisissez un créneau qui vous convient →',
      ps:       'P.S. Nous ne travaillons qu\'avec des établissements que nous croyons vraiment pouvoir aider. Si ReplyIQ ne convient pas après notre appel, nous vous le dirons honnêtement.',
      footer:   'ReplyIQ · Zurich, Suisse · Confidentialité suisse',
    }
  }

  const c = copy[lang] || copy.en
  const calendlyUrl = 'https://calendly.com/replyiq/30min'

  // Calendly visual block — looks like a calendar widget
  const calendlyBlock =
    '<a href="' + calendlyUrl + '" target="_blank" rel="noopener" style="display:block;text-decoration:none;margin:24px 0">' +
    '<div style="background:#1C2430;border:1px solid #2A3545;border-radius:14px;overflow:hidden;font-family:-apple-system,sans-serif">' +
    // Header bar
    '<div style="background:linear-gradient(135deg,#C9A96E,#F59E0B);padding:16px 24px;display:flex;align-items:center;justify-content:space-between">' +
    '<div><div style="font-size:13px;font-weight:700;color:#141920;letter-spacing:0.5px">ReplyIQ · 30 min</div>' +
    '<div style="font-size:11px;color:rgba(0,0,0,0.55);margin-top:2px">Onboarding &amp; Demo Call</div></div>' +
    '<div style="background:rgba(0,0,0,0.15);border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;color:#141920">FREE</div>' +
    '</div>' +
    // Calendar grid preview
    '<div style="padding:20px 24px">' +
    '<div style="font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:14px;font-weight:600">Available this week</div>' +
    '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:16px">' +
    ['Mon','Tue','Wed','Thu','Fri'].map((day, i) => {
      const isHighlight = i === 1 || i === 3
      return '<div style="text-align:center">' +
        '<div style="font-size:10px;color:#6B7280;margin-bottom:6px;font-weight:500">' + day + '</div>' +
        '<div style="width:36px;height:36px;border-radius:8px;margin:0 auto;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;' +
        (isHighlight ? 'background:#C9A96E;color:#141920' : 'background:#1C2430;border:1px solid #2A3545;color:#A0A0B8') + '">' +
        (13 + i) + '</div>' +
        '</div>'
    }).join('') +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:8px;padding:12px;background:rgba(201,169,110,0.06);border-radius:10px;border:1px solid rgba(201,169,110,0.15)">' +
    '<div style="width:8px;height:8px;border-radius:50%;background:#C9A96E;flex-shrink:0"></div>' +
    '<div style="font-size:13px;font-weight:600;color:#C9A96E">' + c.ctaBtn + '</div>' +
    '</div>' +
    '</div></div></a>'

  const why = [
    [c.why1t, c.why1d, '#34D399'],
    [c.why2t, c.why2d, '#C9A96E'],
    [c.why3t, c.why3d, '#60A5FA'],
    [c.why4t, c.why4d, '#A78BFA'],
  ]

  return '<!DOCTYPE html><html>' +
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:#0A0A0F;font-family:-apple-system,sans-serif;color:#E8E4DC">' +
    '<div style="max-width:580px;margin:0 auto;padding:32px 20px">' +

    // Logo
    '<div style="text-align:center;margin-bottom:32px">' +
    '<div style="font-family:Georgia,serif;font-size:30px;font-weight:700;color:#fff;letter-spacing:-1px">Reply<span style="color:#C9A96E">IQ</span></div>' +
    '<div style="font-size:10px;letter-spacing:3px;color:rgba(255,255,255,0.25);text-transform:uppercase;margin-top:5px">Reputation Intelligence</div>' +
    '<div style="display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:3px 12px;background:rgba(255,0,0,0.05);border:1px solid rgba(255,0,0,0.12);border-radius:20px">' +
    '<svg width="11" height="11" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" style="border-radius:2px"><rect width="20" height="20" fill="#FF0000"/><rect x="3" y="7" width="14" height="6" fill="white"/><rect x="7" y="3" width="6" height="14" fill="white"/></svg>' +
    '<span style="font-size:9px;color:rgba(255,255,255,0.3);letter-spacing:1.5px;text-transform:uppercase;font-weight:600">Swiss</span>' +
    '</div></div>' +

    // Hero
    '<div style="background:#1C2430;border:1px solid #2A3545;border-radius:16px;padding:32px;margin-bottom:16px;text-align:center">' +
    '<div style="font-family:Georgia,serif;font-size:26px;font-weight:700;color:#fff;line-height:1.2;margin-bottom:12px">' + c.hero + '</div>' +
    '<div style="font-size:14px;color:rgba(255,255,255,0.45);line-height:1.8">' + c.sub + '</div>' +
    '</div>' +

    // Why section
    '<div style="background:#1C2430;border:1px solid #2A3545;border-radius:14px;padding:24px;margin-bottom:16px">' +
    '<div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#C9A96E;margin-bottom:18px;font-weight:700">' + c.whyTitle + '</div>' +
    why.map(([title, desc, color]) =>
      '<div style="display:flex;gap:14px;margin-bottom:18px">' +
      '<div style="width:8px;height:8px;border-radius:50%;background:' + color + ';flex-shrink:0;margin-top:5px"></div>' +
      '<div><div style="font-size:13px;font-weight:700;color:#E8E4DC;margin-bottom:3px">' + title + '</div>' +
      '<div style="font-size:12px;color:#6B7280;line-height:1.65">' + desc + '</div></div>' +
      '</div>'
    ).join('') +
    '</div>' +

    // Calendly CTA section
    '<div style="background:#1C2430;border:1px solid #2A3545;border-radius:14px;padding:24px;margin-bottom:16px">' +
    '<div style="font-family:Georgia,serif;font-size:18px;font-weight:700;color:#fff;margin-bottom:8px">' + c.ctaTitle + '</div>' +
    '<div style="font-size:13px;color:rgba(255,255,255,0.45);line-height:1.7;margin-bottom:4px">' + c.ctaDesc + '</div>' +
    calendlyBlock +
    '</div>' +

    // PS
    '<div style="padding:16px 20px;background:rgba(201,169,110,0.04);border-radius:10px;border:1px solid rgba(201,169,110,0.1);margin-bottom:24px">' +
    '<div style="font-size:12px;color:rgba(255,255,255,0.35);line-height:1.7;font-style:italic">' + c.ps + '</div>' +
    '</div>' +

    // Footer
    '<div style="text-align:center;padding-top:16px;border-top:1px solid #2A3545;font-size:10px;color:rgba(255,255,255,0.18);line-height:2">' +
    '<svg width="10" height="10" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" style="border-radius:2px;display:inline-block;vertical-align:middle;margin-right:4px"><rect width="20" height="20" fill="#FF0000"/><rect x="3" y="7" width="14" height="6" fill="white"/><rect x="7" y="3" width="6" height="14" fill="white"/></svg>' +
    c.footer + '<br>' +
    '<a href="' + calendlyUrl + '" style="color:#C9A96E;text-decoration:none">calendly.com/replyiq/30min</a>' +
    '</div>' +

    '</div></body></html>'
}

const LANGS = [
  { code:'en', label:'EN' },
  { code:'de', label:'DE' },
  { code:'fr', label:'FR' },
]

export default function Auth() {
  const [lang, setLangState] = useState(() => {
    const s = localStorage.getItem('replyiq_lang')
    return ['en','de','fr'].includes(s) ? s : 'en'
  })
  const T = AUTH_T[lang]

  function setLang(l) {
    localStorage.setItem('replyiq_lang', l)
    setLangState(l)
  }

  // Sign-in state
  const [email,    setEmail]   = useState('')
  const [password, setPass]    = useState('')
  const [loginErr, setLoginErr]= useState('')
  const [loading,  setLoading] = useState(false)

  // Request access state — completely separate from sign-in
  const [reqName,   setReqName]  = useState('')
  const [reqHotel,  setReqHotel] = useState('')
  const [reqEmail,  setReqEmail] = useState('')
  const [reqErr,    setReqErr]   = useState('')
  const [reqSent,   setReqSent]  = useState(false)
  const [reqLoading,setReqLoad]  = useState(false)

  async function signIn(e) {
    e.preventDefault()
    setLoginErr('')
    if (!email || !password) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setLoginErr(T.loginError)
    setLoading(false)
  }

  async function requestAccess(e) {
    e.preventDefault()
    setReqErr('')
    if (!reqName.trim() || !reqHotel.trim() || !reqEmail.trim()) {
      setReqErr(T.fillAll)
      return
    }
    setReqLoad(true)
    try {
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'info@replyiq.ch',
          subject: 'New ReplyIQ Access Request — ' + reqHotel,
          html: buildInternalNotification(reqName, reqHotel, reqEmail)
        })
      })
      // Send beautiful welcome email to the prospect
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: reqEmail,
          subject: lang === 'de' ? 'Ihre ReplyIQ Early-Access-Anfrage — nächster Schritt' :
                   lang === 'fr' ? 'Votre demande d\'accès ReplyIQ — prochaine étape' :
                   'Your ReplyIQ Early Access request — next step',
          html: buildProspectEmail(reqName, reqHotel, lang),
        })
      })
      setReqSent(true)
    } catch {
      setReqErr(lang === 'de' ? 'Fehler. Bitte schreiben Sie uns direkt an info@replyiq.ch' :
                lang === 'fr' ? 'Erreur. Veuillez nous écrire à info@replyiq.ch' :
                'Something went wrong. Please email us at info@replyiq.ch')
    }
    setReqLoad(false)
  }

  const inputStyle = {
    width:'100%', background:'rgba(240,237,232,0.04)', border:'1px solid #243044',
    borderRadius:10, padding:'14px 16px', color:'#fff', fontSize:'14px',
    outline:'none', fontFamily:'Inter,sans-serif', transition:'border-color 0.18s', boxSizing:'border-box'
  }
  const inputSmStyle = { ...inputStyle, padding:'12px 14px', fontSize:'13px', borderRadius:9, border:'1px solid #2A3545', background:'rgba(240,237,232,0.03)' }

  return (
    <div style={{ minHeight:'100vh', background:'#141920', fontFamily:'Inter,-apple-system,sans-serif', overflowX:'hidden', position:'relative' }}>
      {/* Background */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }}>
        <div style={{ position:'absolute', top:'-20%', left:'-10%', width:'70vw', height:'70vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(201,169,110,0.07) 0%, transparent 60%)' }} />
        <div style={{ position:'absolute', bottom:'-20%', right:'-10%', width:'60vw', height:'60vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(74,124,111,0.04) 0%, transparent 60%)' }} />
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,.007) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.007) 1px,transparent 1px)', backgroundSize:'80px 80px' }} />
      </div>

      <div style={{ position:'relative', zIndex:1, minHeight:'100vh', display:'flex', flexDirection:'column' }}>

        {/* ── NAV ── */}
        <div style={{ padding:'24px 60px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>

          {/* Logo + Swiss badge */}
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div>
              <div style={{ fontSize:'1.6rem', fontWeight:700, letterSpacing:'-1px', color:'#fff', fontFamily:"Georgia,serif", lineHeight:1 }}>Reply<span style={{ color:'#C9A96E' }}>IQ</span></div>
              <div style={{ fontSize:'9px', letterSpacing:'3px', color:'rgba(255,255,255,0.2)', textTransform:'uppercase', marginTop:4 }}>Reputation Intelligence</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', background:'rgba(255,0,0,0.05)', border:'1px solid rgba(255,0,0,0.12)', borderRadius:20 }}>
              <SwissFlag size={14} />
              <span style={{ fontSize:'9px', color:'rgba(255,255,255,0.3)', letterSpacing:'1.5px', textTransform:'uppercase', fontWeight:600 }}>Swiss</span>
            </div>
          </div>

          {/* Right side — language switcher + early access badge */}
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>

            {/* Language switcher — the ONLY place it appears */}
            <div style={{ display:'flex', gap:2, background:'rgba(255,255,255,0.04)', borderRadius:8, padding:3, border:'1px solid rgba(255,255,255,0.08)' }}>
              {LANGS.map(({ code, label }) => {
                const active = lang === code
                return (
                  <button key={code} onClick={() => setLang(code)} style={{
                    padding:'5px 12px', border:'none', borderRadius:6, cursor:'pointer',
                    fontSize:'11px', fontWeight:active?700:400, fontFamily:'Inter,sans-serif',
                    background: active ? '#C9A96E' : 'transparent',
                    color: active ? '#141920' : 'rgba(255,255,255,0.35)',
                    transition:'all .15s',
                  }}>
                    {label}
                  </button>
                )
              })}
            </div>

            {/* Early access pill */}
            <div style={{ display:'flex', alignItems:'center', gap:7, background:'rgba(201,169,110,0.07)', border:'1px solid rgba(201,169,110,0.15)', borderRadius:20, padding:'6px 14px' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#C9A96E' }} />
              <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)', letterSpacing:'1px', fontWeight:600 }}>{T.earlyBadge}</span>
            </div>
          </div>
        </div>

        {/* ── BODY ── */}
        <div style={{ flex:1, display:'flex', gap:0 }}>

          {/* Left hero */}
          <div style={{ flex:1, padding:'20px 60px 60px', display:'flex', flexDirection:'column', justifyContent:'center', minWidth:0 }}>
            <div style={{ fontFamily:"Georgia,serif", lineHeight:1.05, letterSpacing:'-2px', marginBottom:24 }}>
              <div style={{ fontSize:'clamp(3rem,5vw,5.5rem)', fontWeight:700, color:'#fff' }}>{T.tagline1}</div>
              <div style={{ fontSize:'clamp(3rem,5vw,5.5rem)', fontWeight:700, color:'#fff' }}>{T.tagline2}</div>
              <div style={{ fontSize:'clamp(3rem,5vw,5.5rem)', fontWeight:700, color:'#C9A96E' }}>{T.tagline3}</div>
            </div>

            <div style={{ fontSize:'17px', color:'rgba(255,255,255,0.38)', lineHeight:1.8, maxWidth:480, marginBottom:44, fontWeight:300 }}>
              {T.subtext}
            </div>

            <div style={{ display:'flex', gap:40, marginBottom:44 }}>
              {[['100%', T.stat1l], ['0.3★', T.stat2l], ['CHF 149', T.stat3l]].map(([v,l],i,arr) => (
                <div key={l} style={{ paddingRight:i<arr.length-1?40:0, borderRight:i<arr.length-1?'1px solid rgba(255,255,255,0.07)':'none' }}>
                  <div style={{ fontSize:'2.6rem', fontWeight:700, color:'#C9A96E', letterSpacing:'-1.5px', lineHeight:1, fontFamily:"Georgia,serif" }}>{v}</div>
                  <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.25)', marginTop:6 }}>{l}</div>
                </div>
              ))}
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:44 }}>
              {[
                ['#34D399', T.bullet1],
                ['#C9A96E', T.bullet2],
                ['#60A5FA', T.bullet3],
                ['#A78BFA', T.bullet4],
              ].map(([dot,text]) => (
                <div key={text} style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:dot, flexShrink:0 }} />
                  <span style={{ fontSize:'14px', color:'rgba(255,255,255,0.42)', lineHeight:1.5 }}>{text}</span>
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.2)', textTransform:'uppercase', letterSpacing:'2px', marginBottom:14 }}>{T.worksWith}</div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                {Object.entries(LOGOS).map(([name, logo]) => (
                  <div key={name} style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 14px', background:'rgba(240,237,232,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:30 }}>
                    {logo}
                    <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.55)', fontWeight:500 }}>{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right panel ── */}
          <div style={{ width:460, background:'#1C2430', borderLeft:'1px solid #243044', padding:'40px 44px', display:'flex', flexDirection:'column', justifyContent:'flex-start', overflowY:'auto' }}>

            {/* Sign in */}
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:'1.4rem', fontWeight:700, color:'#fff', letterSpacing:'-0.5px', marginBottom:6, fontFamily:"Georgia,serif" }}>{T.welcomeBack}</div>
              <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.28)', marginBottom:22 }}>{T.signInSub}</div>

              <form onSubmit={signIn} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.28)', textTransform:'uppercase', letterSpacing:'1.5px', fontWeight:600, marginBottom:8 }}>{T.emailLabel}</div>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="gm@yourhotel.ch"
                    style={inputStyle}
                    onFocus={e=>e.target.style.borderColor='rgba(201,169,110,0.5)'}
                    onBlur={e=>e.target.style.borderColor='#243044'} />
                </div>
                <div>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.28)', textTransform:'uppercase', letterSpacing:'1.5px', fontWeight:600, marginBottom:8 }}>{T.passLabel}</div>
                  <input type="password" value={password} onChange={e=>setPass(e.target.value)} placeholder={T.passPlaceholder}
                    style={inputStyle}
                    onFocus={e=>e.target.style.borderColor='rgba(201,169,110,0.5)'}
                    onBlur={e=>e.target.style.borderColor='#243044'} />
                </div>
                {loginErr && <div style={{ background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.2)', borderRadius:9, padding:'10px 13px', fontSize:'13px', color:'#d4714f' }}>{loginErr}</div>}
                <button type="submit" disabled={loading} style={{ width:'100%', padding:'14px', background:'linear-gradient(135deg,#F5C842,#D4860E)', border:'none', borderRadius:11, color:'#141920', fontSize:'15px', fontWeight:700, cursor:loading?'not-allowed':'pointer', fontFamily:'Inter,sans-serif', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:'0 4px 32px rgba(201,169,110,0.22)', opacity:loading?0.7:1 }}>
                  {loading ? <><Spinner size={14}/>{T.signingIn}</> : T.signIn}
                </button>
              </form>
            </div>

            {/* Divider */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
              <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)' }} />
              <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.22)', whiteSpace:'nowrap' }}>{T.divider}</span>
              <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)' }} />
            </div>

            {/* Request Early Access — COMPLETELY SEPARATE from sign-in */}
            {reqSent ? (
              <div style={{ background:'rgba(16,185,129,0.07)', border:'1px solid rgba(16,185,129,0.18)', borderRadius:12, padding:'22px', textAlign:'center', marginBottom:20 }}>
                <div style={{ fontSize:'28px', marginBottom:10 }}>✓</div>
                <div style={{ fontSize:'15px', fontWeight:700, color:'#34D399', marginBottom:8, fontFamily:"Georgia,serif" }}>{T.successTitle}</div>
                <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)', lineHeight:1.7 }}>{T.successMsg}</div>
              </div>
            ) : (
              <div style={{ background:'rgba(201,169,110,0.03)', border:'1px solid rgba(201,169,110,0.1)', borderRadius:14, padding:'20px', marginBottom:20 }}>
                <div style={{ fontSize:'13px', fontWeight:700, color:'#C9A96E', marginBottom:6, fontFamily:"Georgia,serif" }}>{T.accessTitle}</div>
                <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', lineHeight:1.65, marginBottom:16 }}>{T.accessDesc}</div>

                <form onSubmit={requestAccess} style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {[
                    { label:T.nameLabel,        val:reqName,  set:setReqName,  type:'text',  ph:T.namePh },
                    { label:T.hotelLabel,        val:reqHotel, set:setReqHotel, type:'text',  ph:T.hotelPh },
                    { label:T.accessEmailLabel,  val:reqEmail, set:setReqEmail, type:'email', ph:T.accessEmailPh },
                  ].map(f => (
                    <div key={f.label}>
                      <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.25)', textTransform:'uppercase', letterSpacing:'1.5px', fontWeight:600, marginBottom:5 }}>{f.label}</div>
                      <input type={f.type} value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph}
                        style={inputSmStyle}
                        onFocus={e=>e.target.style.borderColor='rgba(201,169,110,0.4)'}
                        onBlur={e=>e.target.style.borderColor='#2A3545'} />
                    </div>
                  ))}
                  {reqErr && <div style={{ background:'rgba(244,63,94,0.07)', border:'1px solid rgba(244,63,94,0.15)', borderRadius:8, padding:'9px 12px', fontSize:'12px', color:'#d4714f' }}>{reqErr}</div>}
                  <button type="submit" disabled={reqLoading} style={{ width:'100%', padding:'12px', background:'rgba(201,169,110,0.1)', border:'1px solid rgba(201,169,110,0.3)', borderRadius:10, color:'#C9A96E', fontSize:'13px', fontWeight:600, cursor:reqLoading?'not-allowed':'pointer', fontFamily:'Inter,sans-serif', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:reqLoading?0.7:1, marginTop:2 }}>
                    {reqLoading ? <><Spinner size={13}/>{T.requesting}</> : T.requestBtn}
                  </button>
                </form>
              </div>
            )}

            {/* Trust badges */}
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 }}>
              {[T.gdpr, T.swissPrivacy, T.cancelAnytime].map(b => (
                <div key={b} style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 11px', background:b===T.swissPrivacy?'rgba(255,0,0,0.04)':'rgba(255,255,255,0.03)', border:b===T.swissPrivacy?'1px solid rgba(255,0,0,0.12)':'1px solid #243044', borderRadius:20, fontSize:'10px', color:b===T.swissPrivacy?'rgba(255,255,255,0.35)':'rgba(255,255,255,0.2)' }}>
                  {b === T.swissPrivacy && <SwissFlag size={11} />}
                  {b}
                </div>
              ))}
            </div>

            {/* Pricing */}
            <div style={{ padding:'14px 16px', background:'rgba(201,169,110,0.04)', border:'1px solid rgba(201,169,110,0.12)', borderRadius:12, marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:'11px', fontWeight:700, color:'#C9A96E', letterSpacing:'1px' }}>{T.pricingBadge}</div>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', marginTop:3 }}>{T.pricingSub}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:"Georgia,serif", fontSize:'1.4rem', color:'#C9A96E', lineHeight:1 }}>CHF 149<span style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>/mo</span></div>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.25)', marginTop:2 }}>or CHF 1,490/yr</div>
                </div>
              </div>
              <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.22)', paddingTop:10, borderTop:'1px solid rgba(255,255,255,0.06)', textAlign:'center' }}>{T.trialNote}</div>
            </div>

            {/* Testimonial */}
            <div style={{ padding:'16px 18px', background:'rgba(201,169,110,0.03)', border:'1px solid rgba(201,169,110,0.08)', borderRadius:12 }}>
              <div style={{ display:'flex', gap:1, marginBottom:8 }}>{[1,2,3,4,5].map(i=><span key={i} style={{ color:'#C9A96E', fontSize:'12px' }}>★</span>)}</div>
              <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)', lineHeight:1.75, fontStyle:'italic', marginBottom:10 }}>{T.testimonial}</div>
              <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#F5C842,#D4860E)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, color:'#141920', flexShrink:0 }}>MK</div>
                <div>
                  <div style={{ fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,0.45)' }}>{T.testimonialName}</div>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.2)', marginTop:2 }}>{T.testimonialRole}</div>
                </div>
              </div>
            </div>

            <div style={{ textAlign:'center', marginTop:16, fontSize:'10px', color:'rgba(255,255,255,0.15)' }}>
              <SwissFlag size={10} /> replyiq.ch · Zürich, Switzerland
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:'18px 60px', borderTop:'1px solid rgba(255,255,255,0.05)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <SwissFlag size={12} />
            <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.2)' }}>{T.trustedIn}</span>
            {['Zürich','Geneva','Basel','Bern','Lausanne'].map(c => (
              <span key={c} style={{ fontSize:'11px', color:'rgba(255,255,255,0.15)', marginLeft:10 }}>{c}</span>
            ))}
          </div>
          <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.13)' }}>© 2026 ReplyIQ · replyiq.ch</div>
        </div>
      </div>
    </div>
  )
}
