// ── ReplyIQ i18n ─────────────────────────────────────────────────────────────
// All UI strings in English, German and French.
// Reviews themselves are NEVER translated — they stay in original language.

export const T = {

  // ── Navigation ──────────────────────────────────────────────────────────────
  nav: {
    dashboard:   { en:'Dashboard',   de:'Dashboard',   fr:'Tableau de bord' },
    inbox:       { en:'Inbox',       de:'Posteingang', fr:'Boîte de réception' },
    reviews:     { en:'Reviews',     de:'Bewertungen', fr:'Avis' },
    risk:        { en:'Risk Index',  de:'Risikoindex', fr:'Indice de risque' },
    revenue:     { en:'ROI Impact',  de:'ROI-Analyse', fr:'Impact ROI' },
    competitors: { en:'Competitors', de:'Mitbewerber', fr:'Concurrents' },
    report:      { en:'Report',      de:'Bericht',     fr:'Rapport' },
    widget:      { en:'Widget',      de:'Widget',      fr:'Widget' },
    platforms:   { en:'Platforms',   de:'Plattformen', fr:'Plateformes' },
    settings:    { en:'Settings',    de:'Einstellungen',fr:'Paramètres' },
    platform:    { en:'Platform',    de:'Plattform',   fr:'Plateforme' },
  },

  // ── Greetings ────────────────────────────────────────────────────────────────
  greeting: {
    morning:   { en:'Good morning',   de:'Guten Morgen',  fr:'Bonjour' },
    afternoon: { en:'Good afternoon', de:'Guten Tag',     fr:'Bon après-midi' },
    evening:   { en:'Good evening',   de:'Guten Abend',   fr:'Bonsoir' },
    subtitle:  { en:"Here's what's happening with your reviews today.", de:'Hier ist, was heute mit Ihren Bewertungen passiert.', fr:'Voici ce qui se passe avec vos avis aujourd\'hui.' },
  },

  // ── Trial / Upgrade ──────────────────────────────────────────────────────────
  trial: {
    banner:     { en:'FREE TRIAL',       de:'KOSTENLOSE TESTPHASE',  fr:'ESSAI GRATUIT' },
    daysLeft:   { en:'days left',        de:'Tage verbleibend',      fr:'jours restants' },
    aiLeft:     { en:'AI generations remaining', de:'KI-Generierungen verbleibend', fr:'générations IA restantes' },
    upgrade:    { en:'Upgrade Now →',   de:'Jetzt upgraden →',      fr:'Passer au premium →' },
    earlyAccess:{ en:'Early Access',    de:'Früher Zugang',         fr:'Accès anticipé' },
    spots:      { en:'Limited spots',   de:'Begrenzte Plätze',      fr:'Places limitées' },
    trialExpired:{en:'Trial Expired',   de:'Testphase abgelaufen',  fr:'Essai expiré' },
    upgradeMsg: { en:'Upgrade to continue using ReplyIQ', de:'Upgraden Sie, um ReplyIQ weiter zu nutzen', fr:'Passez au premium pour continuer à utiliser ReplyIQ' },
  },

  // ── Sidebar bottom ───────────────────────────────────────────────────────────
  sidebar: {
    signOut:    { en:'Sign out',    de:'Abmelden',    fr:'Se déconnecter' },
    proPlan:    { en:'Pro Plan',    de:'Pro-Plan',    fr:'Plan Pro' },
    trialLeft:  { en:'Trial',       de:'Testphase',   fr:'Essai' },
  },

  // ── Dashboard ────────────────────────────────────────────────────────────────
  dashboard: {
    avgRating:      { en:'Your Average Rating',   de:'Ihre Durchschnittsbewertung', fr:'Votre note moyenne' },
    reviews:        { en:'Reviews',               de:'Bewertungen',                 fr:'Avis' },
    thisMonth:      { en:'this month',            de:'diesen Monat',                fr:'ce mois-ci' },
    allPlatforms:   { en:'Total across all platforms', de:'Gesamt auf allen Plattformen', fr:'Total sur toutes les plateformes' },
    awaiting:       { en:'Awaiting Response',     de:'Ausstehende Antworten',       fr:'En attente de réponse' },
    unanswered:     { en:'Unanswered reviews',    de:'Unbeantwortete Bewertungen',  fr:'Avis sans réponse' },
    replyToImprove: { en:'Reply to improve ranking', de:'Antworten zur Verbesserung des Rankings', fr:'Répondre pour améliorer le classement' },
    responseRate:   { en:'Response Rate',         de:'Antwortquote',               fr:'Taux de réponse' },
    needsImprovement:{en:'Needs improvement',     de:'Verbesserungsbedarf',        fr:'Doit être amélioré' },
    basedOn:        { en:'Based on your',         de:'Basierend auf Ihren',        fr:'Basé sur vos' },
    importedReviews:{ en:'imported reviews',      de:'importierten Bewertungen',   fr:'avis importés' },
    platformHealth: { en:'Platform Health',       de:'Plattform-Gesundheit',       fr:'Santé des plateformes' },
    liveStatus:     { en:'Live status across all connected platforms', de:'Live-Status auf allen verbundenen Plattformen', fr:'Statut en direct sur toutes les plateformes connectées' },
    aiBrief:        { en:'AI Intelligence Brief', de:'KI-Analysebericht',         fr:'Rapport d\'intelligence IA' },
    weeklyAnalysis: { en:'Weekly analysis',       de:'Wöchentliche Analyse',      fr:'Analyse hebdomadaire' },
    generateBrief:  { en:'Generate Now',          de:'Jetzt generieren',          fr:'Générer maintenant' },
    generateBriefDesc:{en:'AI analyses all reviews and surfaces your top issue, strength, and priority action.', de:'KI analysiert alle Bewertungen und zeigt Ihr wichtigstes Problem, Stärke und Prioritätsaktion.', fr:'L\'IA analyse tous les avis et identifie votre principal problème, point fort et action prioritaire.' },
    urgentAlert:    { en:'reviews are waiting for a response.', de:'Bewertungen warten auf eine Antwort.', fr:'avis attendent une réponse.' },
    unansweredHurt: { en:'Unanswered reviews hurt your search ranking on Google and TripAdvisor.', de:'Unbeantwortete Bewertungen schaden Ihrem Suchranking bei Google und TripAdvisor.', fr:'Les avis sans réponse nuisent à votre classement sur Google et TripAdvisor.' },
    replyNow:       { en:'Reply Now →',           de:'Jetzt antworten →',         fr:'Répondre maintenant →' },
    allReplied:     { en:'all replied',           de:'alle beantwortet',          fr:'tous répondus' },
  },

  // ── Inbox ────────────────────────────────────────────────────────────────────
  inbox: {
    title:          { en:'Inbox',               de:'Posteingang',              fr:'Boîte de réception' },
    subtitle:       { en:'AI drafts the perfect response — you approve and post', de:'KI erstellt die perfekte Antwort — Sie genehmigen und posten', fr:'L\'IA rédige la réponse parfaite — vous approuvez et publiez' },
    awaiting:       { en:'reviews awaiting response', de:'Bewertungen warten auf Antwort', fr:'avis en attente de réponse' },
    pending:        { en:'Pending',             de:'Ausstehend',              fr:'En attente' },
    urgent:         { en:'Urgent',              de:'Dringend',                fr:'Urgent' },
    positive:       { en:'Positive',            de:'Positiv',                 fr:'Positif' },
    all:            { en:'All',                 de:'Alle',                    fr:'Tous' },
    respondNow:     { en:'Respond now',         de:'Jetzt antworten',         fr:'Répondre maintenant' },
    aiSuggested:    { en:'AI suggested',        de:'KI-Vorschlag',            fr:'Suggéré par IA' },
    writeManually:  { en:'Write manually',      de:'Manuell schreiben',       fr:'Écrire manuellement' },
    aiBrandVoice:   { en:'AI brand voice',      de:'KI-Markenstimme',         fr:'Voix de marque IA' },
    generateAI:     { en:'Generate AI Response',de:'KI-Antwort generieren',   fr:'Générer une réponse IA' },
    generating:     { en:'Crafting response in your brand voice...', de:'Antwort in Ihrer Markenstimme wird erstellt...', fr:'Rédaction de la réponse avec votre voix de marque...' },
    approve:        { en:'Approve & Post',      de:'Genehmigen & Posten',     fr:'Approuver et publier' },
    edit:           { en:'Edit',                de:'Bearbeiten',              fr:'Modifier' },
    markDone:       { en:'Mark as done',        de:'Als erledigt markieren',  fr:'Marquer comme terminé' },
    tone:           { en:'Tone',                de:'Ton',                     fr:'Ton' },
    professional:   { en:'Professional',        de:'Professionell',           fr:'Professionnel' },
    empathetic:     { en:'Empathetic',          de:'Einfühlsam',              fr:'Empathique' },
    concise:        { en:'Concise',             de:'Prägnant',                fr:'Concis' },
    friendly:       { en:'Friendly',            de:'Freundlich',              fr:'Amical' },
    allCaughtUp:    { en:'All caught up! Every review has been replied to.', de:'Alles erledigt! Alle Bewertungen wurden beantwortet.', fr:'Tout est à jour ! Tous les avis ont reçu une réponse.' },
    selectReview:   { en:'Select a review to start responding', de:'Bewertung auswählen, um zu antworten', fr:'Sélectionnez un avis pour commencer à répondre' },
    backToList:     { en:'← Back to reviews',  de:'← Zurück zu Bewertungen', fr:'← Retour aux avis' },
    replied:        { en:'Replied',             de:'Beantwortet',             fr:'Répondu' },
    copyAgain:      { en:'Copy again',          de:'Erneut kopieren',         fr:'Copier à nouveau' },
    aiFailed:       { en:'AI generation failed', de:'KI-Generierung fehlgeschlagen', fr:'Échec de la génération IA' },
    tryAgain:       { en:'Try Again',           de:'Erneut versuchen',        fr:'Réessayer' },
  },

  // ── Risk ─────────────────────────────────────────────────────────────────────
  risk: {
    title:          { en:'Risk Index',          de:'Risikoindex',             fr:'Indice de risque' },
    subtitle:       { en:'AI-powered reputation risk analysis', de:'KI-gestützte Reputationsrisikoanalyse', fr:'Analyse des risques de réputation par IA' },
    generate:       { en:'Generate Risk Analysis', de:'Risikoanalyse generieren', fr:'Générer l\'analyse des risques' },
    stable:         { en:'STABLE',              de:'STABIL',                  fr:'STABLE' },
    moderate:       { en:'MODERATE',            de:'MODERAT',                 fr:'MODÉRÉ' },
    high:           { en:'HIGH RISK',           de:'HOHES RISIKO',            fr:'RISQUE ÉLEVÉ' },
    critical:       { en:'CRITICAL',            de:'KRITISCH',                fr:'CRITIQUE' },
  },

  // ── Revenue / ROI ─────────────────────────────────────────────────────────────
  revenue: {
    title:          { en:'ROI Impact',          de:'ROI-Analyse',             fr:'Impact ROI' },
    subtitle:       { en:'Based on Harvard Business School rating elasticity research (Luca, 2016)', de:'Basierend auf der Harvard-Forschung zur Bewertungselastizität (Luca, 2016)', fr:'Basé sur la recherche de la Harvard Business School (Luca, 2016)' },
    calculate:      { en:'Calculate ROI',       de:'ROI berechnen',           fr:'Calculer le ROI' },
    monthlyRevenue: { en:'Monthly Revenue',     de:'Monatlicher Umsatz',      fr:'Chiffre d\'affaires mensuel' },
    guests:         { en:'Monthly Covers/Guests',de:'Monatliche Gäste',       fr:'Couverts/Clients mensuels' },
    currentRating:  { en:'Current Rating',      de:'Aktuelle Bewertung',      fr:'Note actuelle' },
    targetRating:   { en:'Target Rating',       de:'Zielbewertung',           fr:'Note cible' },
    calculateNow:   { en:'Calculate Now',       de:'Jetzt berechnen',         fr:'Calculer maintenant' },
    ready:          { en:'ROI calculator ready',de:'ROI-Rechner bereit',      fr:'Calculateur ROI prêt' },
  },

  // ── Competitors ──────────────────────────────────────────────────────────────
  competitors: {
    title:          { en:'Competitor Intelligence', de:'Mitbewerber-Analyse',  fr:'Intelligence concurrentielle' },
    subtitle:       { en:'Real-time market benchmarking — 5km radius', de:'Echtzeit-Markt-Benchmarking — 5km Radius', fr:'Benchmarking marché en temps réel — rayon de 5km' },
    sync:           { en:'Sync Real Competitors', de:'Mitbewerber synchronisieren', fr:'Synchroniser les concurrents' },
    syncing:        { en:'Syncing...',           de:'Synchronisiere...',       fr:'Synchronisation...' },
    aiBenchmark:    { en:'AI Benchmark',         de:'KI-Benchmark',            fr:'Benchmark IA' },
    benchmark:      { en:'Local Market Benchmark',de:'Lokaler Markt-Benchmark',fr:'Benchmark marché local' },
    sortedBy:       { en:'Sorted by rating',    de:'Nach Bewertung sortiert', fr:'Trié par note' },
    property:       { en:'Property',            de:'Betrieb',                 fr:'Établissement' },
    rating:         { en:'Rating',              de:'Bewertung',               fr:'Note' },
    reviews:        { en:'Reviews',             de:'Bewertungen',             fr:'Avis' },
    trend:          { en:'Trend',               de:'Trend',                   fr:'Tendance' },
  },

  // ── Report ───────────────────────────────────────────────────────────────────
  report: {
    title:          { en:'Weekly Report',       de:'Wochenbericht',           fr:'Rapport hebdomadaire' },
    generate:       { en:'Generate Report',     de:'Bericht generieren',      fr:'Générer le rapport' },
    email:          { en:'Email Report',        de:'Bericht per E-Mail',      fr:'Envoyer le rapport' },
    sending:        { en:'Sending...',          de:'Sende...',                fr:'Envoi...' },
    generating:     { en:'Generating...',       de:'Generiere...',            fr:'Génération...' },
    riskScore:      { en:'Risk Score',          de:'Risiko-Score',            fr:'Score de risque' },
    threats:        { en:'Top Threats',         de:'Wichtigste Risiken',      fr:'Principales menaces' },
    strengths:      { en:'Strengths',           de:'Stärken',                 fr:'Points forts' },
    actions:        { en:'Priority Actions',    de:'Prioritätsmaßnahmen',     fr:'Actions prioritaires' },
    win:            { en:'Win of the Week',     de:'Erfolg der Woche',        fr:'Victoire de la semaine' },
    nextFocus:      { en:'Next Week Focus',     de:'Fokus nächste Woche',     fr:'Focus semaine prochaine' },
    urgent:         { en:'urgent',              de:'dringend',                fr:'urgent' },
    thisWeek:       { en:'this week',           de:'diese Woche',             fr:'cette semaine' },
    thisMonth:      { en:'this month',          de:'diesen Monat',            fr:'ce mois-ci' },
  },

  // ── Settings ──────────────────────────────────────────────────────────────────
  settings: {
    title:          { en:'Settings',            de:'Einstellungen',           fr:'Paramètres' },
    subtitle:       { en:'Manage your property and AI profile', de:'Verwalten Sie Ihren Betrieb und Ihr KI-Profil', fr:'Gérez votre établissement et votre profil IA' },
    save:           { en:'Save Changes',        de:'Änderungen speichern',    fr:'Enregistrer les modifications' },
    saving:         { en:'Saving...',           de:'Speichere...',            fr:'Enregistrement...' },
    saved:          { en:'Saved!',              de:'Gespeichert!',            fr:'Enregistré !' },
    language:       { en:'Dashboard Language',  de:'Dashboard-Sprache',       fr:'Langue du tableau de bord' },
    langDesc:       { en:'Choose the language for the dashboard interface. Reviews stay in their original language.', de:'Wählen Sie die Sprache für die Dashboard-Oberfläche. Bewertungen bleiben in ihrer Originalsprache.', fr:'Choisissez la langue de l\'interface du tableau de bord. Les avis restent dans leur langue d\'origine.' },
  },

  // ── Platforms ─────────────────────────────────────────────────────────────────
  platforms: {
    title:          { en:'Platforms',           de:'Plattformen',             fr:'Plateformes' },
    subtitle:       { en:'Connect your review platforms — AI monitors all simultaneously', de:'Verbinden Sie Ihre Bewertungsplattformen — KI überwacht alle gleichzeitig', fr:'Connectez vos plateformes d\'avis — l\'IA surveille tout simultanément' },
    connected:      { en:'Connected',           de:'Verbunden',               fr:'Connecté' },
    connect:        { en:'Connect',             de:'Verbinden',               fr:'Connecter' },
    sync:           { en:'Sync Reviews',        de:'Bewertungen synchronisieren', fr:'Synchroniser les avis' },
    locked:         { en:'Locked',              de:'Gesperrt',                fr:'Verrouillé' },
    totalReviews:   { en:'Total Reviews',       de:'Gesamtbewertungen',       fr:'Total des avis' },
    autoResponse:   { en:'Auto-Response',       de:'Auto-Antwort',            fr:'Réponse automatique' },
    active247:      { en:'Active 24/7',         de:'Aktiv 24/7',              fr:'Actif 24h/24' },
  },

  // ── Common ───────────────────────────────────────────────────────────────────
  common: {
    loading:        { en:'Loading...',          de:'Laden...',                fr:'Chargement...' },
    error:          { en:'Error',               de:'Fehler',                  fr:'Erreur' },
    cancel:         { en:'Cancel',              de:'Abbrechen',               fr:'Annuler' },
    close:          { en:'Close',               de:'Schließen',               fr:'Fermer' },
    save:           { en:'Save',                de:'Speichern',               fr:'Enregistrer' },
    edit:           { en:'Edit',                de:'Bearbeiten',              fr:'Modifier' },
    delete:         { en:'Delete',              de:'Löschen',                 fr:'Supprimer' },
    add:            { en:'Add',                 de:'Hinzufügen',              fr:'Ajouter' },
    copy:           { en:'Copy',                de:'Kopieren',                fr:'Copier' },
    copied:         { en:'Copied!',             de:'Kopiert!',                fr:'Copié !' },
    generating:     { en:'Generating...',       de:'Generiere...',            fr:'Génération...' },
    noData:         { en:'No data yet.',        de:'Noch keine Daten.',       fr:'Pas encore de données.' },
    riskStable:     { en:'STABLE',              de:'STABIL',                  fr:'STABLE' },
    riskModerate:   { en:'MODERATE',            de:'MODERAT',                 fr:'MODÉRÉ' },
    riskHigh:       { en:'HIGH',                de:'HOCH',                    fr:'ÉLEVÉ' },
    riskCritical:   { en:'CRITICAL',            de:'KRITISCH',                fr:'CRITIQUE' },
    viewAll:        { en:'View all',            de:'Alle anzeigen',           fr:'Voir tout' },
    proTip:         { en:'Pro Tip',             de:'Profi-Tipp',              fr:'Conseil pro' },
  },

}

// Helper — get a translation string
// t(T.nav.inbox, lang) returns the string for current language
export function t(entry, lang = 'en') {
  if (!entry) return ''
  return entry[lang] || entry.en || ''
}
