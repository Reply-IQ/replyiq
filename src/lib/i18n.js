// ── ReplyIQ i18n ─────────────────────────────────────────────────────────────
// All UI strings in English, German and French.
// Reviews themselves are NEVER translated — they stay in original language.

export const T = {

  // ── Navigation ──────────────────────────────────────────────────────────────
  nav: {
    dashboard:   { en:'Dashboard',      de:'Dashboard',       fr:'Tableau de bord' },
    inbox:       { en:'Inbox',          de:'Posteingang',     fr:"Boite de reception" },
    reviews:     { en:'Review History', de:'Bewertungen',     fr:'Historique' },
    risk:        { en:'Risk Index',     de:'Risikoindex',     fr:'Indice de risque' },
    revenue:     { en:'ROI Impact',     de:'ROI-Analyse',     fr:'Impact ROI' },
    competitors: { en:'Competitors',    de:'Mitbewerber',     fr:'Concurrents' },
    report:      { en:'Report',         de:'Bericht',         fr:'Rapport' },
    widget:      { en:'Widget',         de:'Widget',          fr:'Widget' },
    platforms:   { en:'Platforms',      de:'Plattformen',     fr:'Plateformes' },
    settings:    { en:'Settings',       de:'Einstellungen',   fr:'Parametres' },
    platform:    { en:'Platform',       de:'Plattform',       fr:'Plateforme' },
  },

  // ── Greetings ────────────────────────────────────────────────────────────────
  greeting: {
    morning:   { en:'Good morning',   de:'Guten Morgen',  fr:'Bonjour' },
    afternoon: { en:'Good afternoon', de:'Guten Tag',     fr:'Bon apres-midi' },
    evening:   { en:'Good evening',   de:'Guten Abend',   fr:'Bonsoir' },
    subtitle:  { en:"Here's what's happening with your reviews today.", de:'Hier ist, was heute mit Ihren Bewertungen passiert.', fr:"Voici ce qui se passe avec vos avis aujourd'hui." },
  },

  // ── Trial / Upgrade ──────────────────────────────────────────────────────────
  trial: {
    banner:      { en:'EARLY ACCESS',   de:'FRUHER ZUGANG',         fr:'ACCES ANTICIPE' },
    daysLeft:    { en:'days left',      de:'Tage verbleibend',     fr:'jours restants' },
    aiLeft:      { en:'AI generations remaining', de:'KI-Generierungen verbleibend', fr:'generations IA restantes' },
    upgrade:     { en:'Upgrade Now →', de:'Jetzt upgraden →',     fr:'Passer au premium →' },
    earlyAccess: { en:'Early Access',  de:'Fruher Zugang',         fr:'Acces anticipe' },
    spots:       { en:'Limited spots', de:'Begrenzte Platze',      fr:'Places limitees' },
    trialExpired:{ en:'Trial Expired', de:'Testphase abgelaufen',  fr:'Essai expire' },
    upgradeMsg:  { en:'Upgrade to continue using ReplyIQ', de:'Upgraden Sie, um ReplyIQ weiter zu nutzen', fr:'Passez au premium pour continuer' },
  },

  // ── Sidebar bottom ───────────────────────────────────────────────────────────
  sidebar: {
    signOut:  { en:'Sign out', de:'Abmelden',  fr:'Se deconnecter' },
    proPlan:  { en:'Pro Plan', de:'Pro-Plan',  fr:'Plan Pro' },
    trialLeft:{ en:'Trial',    de:'Testphase', fr:'Essai' },
  },

  // ── Dashboard ────────────────────────────────────────────────────────────────
  dashboard: {
    avgRating:       { en:'Your Average Rating',   de:'Ihre Durchschnittsbewertung', fr:'Votre note moyenne' },
    reviews:         { en:'Reviews',               de:'Bewertungen',                 fr:'Avis' },
    thisMonth:       { en:'this month',            de:'diesen Monat',                fr:'ce mois-ci' },
    allPlatforms:    { en:'Total across all platforms', de:'Gesamt auf allen Plattformen', fr:'Total sur toutes les plateformes' },
    awaiting:        { en:'Awaiting Response',     de:'Ausstehende Antworten',       fr:'En attente de reponse' },
    unanswered:      { en:'Unanswered reviews',    de:'Unbeantwortete Bewertungen',  fr:'Avis sans reponse' },
    replyToImprove:  { en:'Reply to improve ranking', de:'Antworten zur Verbesserung des Rankings', fr:'Repondre pour ameliorer le classement' },
    responseRate:    { en:'Response Rate',         de:'Antwortquote',                fr:'Taux de reponse' },
    needsImprovement:{ en:'Needs improvement',     de:'Verbesserungsbedarf',         fr:'Doit etre ameliore' },
    basedOn:         { en:'Based on your',         de:'Basierend auf Ihren',         fr:'Base sur vos' },
    importedReviews: { en:'imported reviews',      de:'importierten Bewertungen',    fr:'avis importes' },
    platformHealth:  { en:'Platform Health',       de:'Plattform-Status',            fr:'Sante des plateformes' },
    liveStatus:      { en:'Live status across all connected platforms', de:'Live-Status auf allen verbundenen Plattformen', fr:'Statut en direct sur toutes les plateformes' },
    aiBrief:         { en:'AI Intelligence Brief', de:'KI-Analysebericht',           fr:'Rapport IA' },
    weeklyAnalysis:  { en:'Weekly analysis',       de:'Wochentliche Analyse',        fr:'Analyse hebdomadaire' },
    generateBrief:   { en:'Generate Now',          de:'Jetzt generieren',            fr:'Generer maintenant' },
    generateBriefDesc:{ en:'AI analyses all reviews and surfaces your top issue, strength, and priority action.', de:'KI analysiert alle Bewertungen und zeigt Ihr wichtigstes Problem und Prioritatsaktion.', fr:"L'IA analyse tous les avis et identifie votre principal probleme et action prioritaire." },
    urgentAlert:     { en:'reviews are waiting for a response.', de:'Bewertungen warten auf eine Antwort.', fr:'avis attendent une reponse.' },
    unansweredHurt:  { en:'Unanswered reviews hurt your search ranking on Google and TripAdvisor.', de:'Unbeantwortete Bewertungen schaden Ihrem Suchranking.', fr:'Les avis sans reponse nuisent a votre classement sur Google et TripAdvisor.' },
    replyNow:        { en:'Reply Now →', de:'Jetzt antworten →', fr:'Repondre maintenant →' },
    allReplied:      { en:'all replied', de:'alle beantwortet',  fr:'tous repondus' },
  },

  // ── Inbox ────────────────────────────────────────────────────────────────────
  inbox: {
    title:       { en:'Inbox',            de:'Posteingang',      fr:'Boite de reception' },
    subtitle:    { en:'AI drafts the perfect response. You approve and post.', de:'KI erstellt die perfekte Antwort. Sie genehmigen und posten.', fr:"L'IA redige la reponse parfaite. Vous approuvez et publiez." },
    awaiting:    { en:'reviews awaiting response', de:'Bewertungen warten auf Antwort', fr:'avis en attente de reponse' },
    pending:     { en:'Pending',          de:'Ausstehend',       fr:'En attente' },
    urgent:      { en:'Urgent',           de:'Dringend',         fr:'Urgent' },
    positive:    { en:'Positive',         de:'Positiv',          fr:'Positif' },
    all:         { en:'All',              de:'Alle',             fr:'Tous' },
    respondNow:  { en:'Respond now',      de:'Jetzt antworten',  fr:'Repondre maintenant' },
    aiSuggested: { en:'AI suggested',     de:'KI-Vorschlag',     fr:'Suggere par IA' },
    writeManually:{ en:'Write manually',  de:'Manuell schreiben',fr:'Ecrire manuellement' },
    aiBrandVoice:{ en:'AI brand voice',   de:'KI-Markenstimme',  fr:'Voix de marque IA' },
    generateAI:  { en:'Generate AI Response', de:'KI-Antwort generieren', fr:'Generer une reponse IA' },
    generating:  { en:'Crafting response in your brand voice...', de:'Antwort in Ihrer Markenstimme wird erstellt...', fr:'Redaction de la reponse avec votre voix de marque...' },
    approve:     { en:'Approve & Post',   de:'Genehmigen & Posten', fr:'Approuver et publier' },
    edit:        { en:'Edit',             de:'Bearbeiten',       fr:'Modifier' },
    markDone:    { en:'Mark as done',     de:'Als erledigt markieren', fr:'Marquer comme termine' },
    tone:        { en:'Tone',             de:'Ton',              fr:'Ton' },
    professional:{ en:'Professional',     de:'Professionell',    fr:'Professionnel' },
    empathetic:  { en:'Empathetic',       de:'Einfuhlsam',       fr:'Empathique' },
    concise:     { en:'Concise',          de:'Pragnant',         fr:'Concis' },
    friendly:    { en:'Friendly',         de:'Freundlich',       fr:'Amical' },
    allCaughtUp: { en:'All caught up! Every review has been replied to.', de:'Alles erledigt! Alle Bewertungen wurden beantwortet.', fr:'Tout est a jour ! Tous les avis ont recu une reponse.' },
    selectReview:{ en:'Select a review to start responding', de:'Bewertung auswahlen, um zu antworten', fr:'Selectionnez un avis pour commencer a repondre' },
    backToList:  { en:'Back to reviews',  de:'Zuruck zu Bewertungen', fr:'Retour aux avis' },
    replied:     { en:'Replied',          de:'Beantwortet',      fr:'Repondu' },
    copyAgain:   { en:'Copy again',       de:'Erneut kopieren',  fr:'Copier a nouveau' },
    aiFailed:    { en:'AI generation failed', de:'KI-Generierung fehlgeschlagen', fr:'Echec de la generation IA' },
    tryAgain:    { en:'Try Again',        de:'Erneut versuchen', fr:'Reessayer' },
  },

  // ── Risk ─────────────────────────────────────────────────────────────────────
  risk: {
    title:    { en:'Risk Index',    de:'Risikoindex',     fr:'Indice de risque' },
    subtitle: { en:'AI-powered reputation risk analysis', de:'KI-gestutzte Reputationsrisikoanalyse', fr:'Analyse des risques de reputation par IA' },
    generate: { en:'Generate Risk Analysis', de:'Risikoanalyse generieren', fr:'Generer analyse des risques' },
    stable:   { en:'STABLE',        de:'STABIL',           fr:'STABLE' },
    moderate: { en:'MODERATE',      de:'MODERAT',          fr:'MODERE' },
    high:     { en:'HIGH RISK',     de:'HOHES RISIKO',     fr:'RISQUE ELEVE' },
    critical: { en:'CRITICAL',      de:'KRITISCH',         fr:'CRITIQUE' },
  },

  // ── Revenue / ROI ─────────────────────────────────────────────────────────────
  revenue: {
    title:         { en:'ROI Impact',    de:'ROI-Analyse',    fr:'Impact ROI' },
    subtitle:      { en:'Based on Harvard Business School rating elasticity research (Luca, 2016)', de:'Basierend auf der Harvard-Forschung zur Bewertungselastizitat (Luca, 2016)', fr:'Base sur la recherche de Harvard Business School (Luca, 2016)' },
    calculate:     { en:'Calculate ROI', de:'ROI berechnen',  fr:'Calculer le ROI' },
    monthlyRevenue:{ en:'Monthly Revenue', de:'Monatlicher Umsatz', fr:"Chiffre d'affaires mensuel" },
    guests:        { en:'Monthly Covers/Guests', de:'Monatliche Gaste', fr:'Couverts/Clients mensuels' },
    currentRating: { en:'Current Rating', de:'Aktuelle Bewertung', fr:'Note actuelle' },
    targetRating:  { en:'Target Rating',  de:'Zielbewertung',  fr:'Note cible' },
    calculateNow:  { en:'Calculate Now',  de:'Jetzt berechnen',fr:'Calculer maintenant' },
    ready:         { en:'ROI calculator ready', de:'ROI-Rechner bereit', fr:'Calculateur ROI pret' },
  },

  // ── Competitors ──────────────────────────────────────────────────────────────
  competitors: {
    title:      { en:'Competitor Intelligence', de:'Mitbewerber-Analyse', fr:'Intelligence concurrentielle' },
    subtitle:   { en:'Real-time market benchmarking within 3km', de:'Echtzeit-Markt-Benchmarking im Umkreis von 3km', fr:'Benchmarking marche en temps reel — rayon de 3km' },
    sync:       { en:'Sync Competitors', de:'Mitbewerber synchronisieren', fr:'Synchroniser les concurrents' },
    syncing:    { en:'Syncing...', de:'Synchronisiere...', fr:'Synchronisation...' },
    aiBenchmark:{ en:'AI Benchmark',    de:'KI-Benchmark',   fr:'Benchmark IA' },
    benchmark:  { en:'Local Market Benchmark', de:'Lokaler Markt-Benchmark', fr:'Benchmark marche local' },
    sortedBy:   { en:'Sorted by rating', de:'Nach Bewertung sortiert', fr:'Trie par note' },
    property:   { en:'Properties',      de:'Betriebe',       fr:'Etablissements' },
    rating:     { en:'Rating',          de:'Bewertung',      fr:'Note' },
    reviews:    { en:'Reviews',         de:'Bewertungen',    fr:'Avis' },
    trend:      { en:'Trend',           de:'Trend',          fr:'Tendance' },
  },

  // ── Report ───────────────────────────────────────────────────────────────────
  report: {
    title:     { en:'Weekly Report',   de:'Wochenbericht',  fr:'Rapport hebdomadaire' },
    generate:  { en:'Generate Report', de:'Bericht generieren', fr:'Generer le rapport' },
    email:     { en:'Email Report',    de:'Bericht per E-Mail', fr:'Envoyer le rapport' },
    sending:   { en:'Sending...',      de:'Sende...',       fr:'Envoi...' },
    generating:{ en:'Generating...',   de:'Generiere...',   fr:'Generation...' },
    riskScore: { en:'Risk Score',      de:'Risiko-Score',   fr:'Score de risque' },
    threats:   { en:'Top Threats',     de:'Wichtigste Risiken', fr:'Principales menaces' },
    strengths: { en:'Strengths',       de:'Starken',        fr:'Points forts' },
    actions:   { en:'Priority Actions',de:'Prioritatsmassnahmen', fr:'Actions prioritaires' },
    win:       { en:'Win of the Week', de:'Erfolg der Woche', fr:'Victoire de la semaine' },
    nextFocus: { en:'Next Week Focus', de:'Fokus nachste Woche', fr:'Focus semaine prochaine' },
    urgent:    { en:'urgent',          de:'dringend',       fr:'urgent' },
    thisWeek:  { en:'this week',       de:'diese Woche',    fr:'cette semaine' },
    thisMonth: { en:'this month',      de:'diesen Monat',   fr:'ce mois-ci' },
  },

  // ── Settings ──────────────────────────────────────────────────────────────────
  settings: {
    title:    { en:'Settings',    de:'Einstellungen',  fr:'Parametres' },
    subtitle: { en:'Manage your property and AI profile', de:'Verwalten Sie Ihren Betrieb und Ihr KI-Profil', fr:'Gerez votre etablissement et votre profil IA' },
    save:     { en:'Save Changes', de:'Anderungen speichern', fr:'Enregistrer les modifications' },
    saving:   { en:'Saving...',   de:'Speichere...',   fr:'Enregistrement...' },
    saved:    { en:'Saved!',      de:'Gespeichert!',   fr:'Enregistre !' },
    language: { en:'Dashboard Language', de:'Dashboard-Sprache', fr:'Langue du tableau de bord' },
    langDesc: { en:'Choose the language for the dashboard interface. Reviews stay in their original language.', de:'Wahlen Sie die Sprache fur die Dashboard-Oberflache. Bewertungen bleiben in ihrer Originalsprache.', fr:"Choisissez la langue de l'interface. Les avis restent dans leur langue d'origine." },
  },

  // ── Platforms ─────────────────────────────────────────────────────────────────
  platforms: {
    title:       { en:'Platforms',      de:'Plattformen',    fr:'Plateformes' },
    subtitle:    { en:'Connect your review platforms', de:'Verbinden Sie Ihre Bewertungsplattformen', fr:'Connectez vos plateformes' },
    connected:   { en:'Connected',      de:'Verbunden',      fr:'Connecte' },
    connect:     { en:'Connect',        de:'Verbinden',      fr:'Connecter' },
    sync:        { en:'Sync Reviews',   de:'Bewertungen synchronisieren', fr:'Synchroniser les avis' },
    locked:      { en:'Locked',         de:'Gesperrt',       fr:'Verrouille' },
    totalReviews:{ en:'Total Reviews',  de:'Gesamtbewertungen', fr:'Total des avis' },
    autoResponse:{ en:'Auto-Response',  de:'Auto-Antwort',   fr:'Reponse automatique' },
    active247:   { en:'Active 24/7',    de:'Aktiv 24/7',     fr:'Actif 24h/24' },
  },

  // ── Review History ────────────────────────────────────────────────────────────
  reviewHistory: {
    title:        { en:'Review History',        de:'Bewertungsverlauf',            fr:'Historique des avis' },
    subtitle:     { en:'Your full review archive', de:'Ihr vollstandiges Bewertungsarchiv', fr:'Votre archive complete des avis' },
    totalReviews: { en:'Total Reviews',          de:'Bewertungen gesamt',           fr:'Total des avis' },
    unanswered:   { en:'Unanswered',             de:'Unbeantwortet',                fr:'Sans reponse' },
    negative:     { en:'Negative (1-2★)',        de:'Negativ (1-2★)',               fr:'Negatif (1-2etoile)' },
    flagged:      { en:'Risk Flagged',           de:'Risiko markiert',              fr:'Signale a risque' },
    noFlagged:    { en:'No flagged reviews',     de:'Keine markierten Bewertungen', fr:'Aucun avis signale' },
    classifyHint: { en:'Negative reviews are automatically classified overnight. Click Classify Unanalysed to run AI analysis now.', de:'Negative Bewertungen werden uber Nacht automatisch klassifiziert. Klicken Sie auf Analysieren, um die KI-Analyse jetzt auszufuhren.', fr:'Les avis negatifs sont classes automatiquement pendant la nuit. Cliquez sur Classifier pour lancer analyse IA maintenant.' },
    classifyBtn:  { en:'Classify Unanalysed',   de:'Unanalysierte klassifizieren', fr:'Classifier les non analyses' },
  },

  // ── Risk Page ─────────────────────────────────────────────────────────────────
  riskPage: {
    riskRadar:   { en:'Risk Radar',          de:'Risiko-Radar',                fr:'Radar de risque' },
    runAnalysis: { en:'Run AI analysis',     de:'KI-Analyse starten',          fr:'Lancer analyse IA' },
    breakdown:   { en:'Component Breakdown', de:'Komponentenaufschlusselung',  fr:'Decomposition des composants' },
  },

  // ── Revenue Page ──────────────────────────────────────────────────────────────
  revenuePage: {
    monthlyGain: { en:'Monthly Revenue Gain',  de:'Monatlicher Umsatzgewinn', fr:'Gain mensuel de revenus' },
    annualGain:  { en:'Annual Revenue Gain',   de:'Jahrlicher Umsatzgewinn',  fr:'Gain annuel de revenus' },
    roiLabel:    { en:'ReplyIQ ROI',           de:'ReplyIQ ROI',              fr:'ROI ReplyIQ' },
    ratingClose: { en:'Rating to Close',       de:'Bewertung zu schliessen',  fr:'Note a combler' },
    comparison:  { en:'Revenue Comparison',    de:'Umsatzvergleich',          fr:'Comparaison des revenus' },
    breakdown:   { en:'Model Breakdown',       de:'Modellaufschlusselung',    fr:'Decomposition du modele' },
  },

  // ── Competitors Extra ─────────────────────────────────────────────────────────
  competitorsExtra: {
    yourRank:    { en:'Your Rank',           de:'Ihr Rang',                    fr:'Votre rang' },
    ratingGap:   { en:'Rating Gap to Leader',de:'Bewertungsabstand zum Marktfuhrer', fr:'Ecart de note par rapport au leader' },
    yourRating:  { en:'Your Rating',         de:'Ihre Bewertung',              fr:'Votre note' },
    reviewCount: { en:'Review Count',        de:'Anzahl Bewertungen',          fr:'Nombre de avis' },
    localMarket: { en:'Local Market',        de:'Lokaler Markt',               fr:'Marche local' },
    marketLeader:{ en:'Market leader',       de:'Marktfuhrer',                 fr:'Leader du marche' },
  },

  // ── Report Extra ──────────────────────────────────────────────────────────────
  reportExtra: {
    title:       { en:'Weekly Intelligence Report', de:'Wochentlicher Analysebericht', fr:'Rapport intelligence hebdomadaire' },
    generating:  { en:'Generating your intelligence report...', de:'Ihr Analysebericht wird erstellt...', fr:'Generation de votre rapport intelligence...' },
    priorityPlan:{ en:'Priority Action Plan',       de:'Prioritatsaktionsplan',         fr:'Plan actions prioritaires' },
    thisWeek:    { en:'This Week',                  de:'Diese Woche',                   fr:'Cette semaine' },
  },

  // ── Settings Extra ────────────────────────────────────────────────────────────
  settingsExtra: {
    propertyProfile:{ en:'Property Profile',    de:'Betriebsprofil',    fr:'Profil etablissement' },
    propertyName:   { en:'Property Name',       de:'Betriebsname',      fr:'Nom etablissement' },
    websiteUrl:     { en:'Website URL',         de:'Website-URL',       fr:'URL du site web' },
    reportEmail:    { en:'Report Email',        de:'Bericht-E-Mail',    fr:'E-mail rapport' },
    monthlyRev:     { en:'Monthly Revenue (CHF)',de:'Monatlicher Umsatz (CHF)', fr:'Chiffre affaires mensuel (CHF)' },
    targetRating:   { en:'Target Rating',       de:'Zielbewertung',     fr:'Note cible' },
    aiDesc:         { en:'AI Brand Profile',    de:'KI-Markenprofil',   fr:'Profil de marque IA' },
    subscription:   { en:'Subscription',        de:'Abonnement',        fr:'Abonnement' },
    snippetDesc:    { en:'Facts the AI weaves naturally into every response', de:'Fakten, die die KI naturlich in jede Antwort einwebt', fr:'Faits que IA integre naturellement dans chaque reponse' },
  },

  // ── Respond Page ──────────────────────────────────────────────────────────────
  respondPage: {
    title:       { en:'AI Response Tester', de:'KI-Antwort-Tester', fr:'Testeur de reponse IA' },
    pasteHint:   { en:'Paste any review. AI drafts a perfect response in seconds.', de:'Fugen Sie eine Bewertung ein. KI erstellt in Sekunden eine perfekte Antwort.', fr:'Collez un avis — IA redige une reponse parfaite en quelques secondes' },
    reviewInput: { en:'Review Input',       de:'Bewertungseingabe', fr:'Saisie de avis' },
    reviewText:  { en:'Review Text',        de:'Bewertungstext',    fr:'Texte de avis' },
    unanswered:  { en:'Unanswered Reviews', de:'Unbeantwortete Bewertungen', fr:'Avis sans reponse' },
    responseHere:{ en:'Response will appear here', de:'Antwort erscheint hier', fr:'La reponse apparaitra ici' },
  },

  // ── Common ────────────────────────────────────────────────────────────────────
  common: {
    loading:     { en:'Loading...',  de:'Laden...',      fr:'Chargement...' },
    error:       { en:'Error',       de:'Fehler',        fr:'Erreur' },
    cancel:      { en:'Cancel',      de:'Abbrechen',     fr:'Annuler' },
    close:       { en:'Close',       de:'Schliessen',    fr:'Fermer' },
    save:        { en:'Save',        de:'Speichern',     fr:'Enregistrer' },
    edit:        { en:'Edit',        de:'Bearbeiten',    fr:'Modifier' },
    delete:      { en:'Delete',      de:'Loschen',       fr:'Supprimer' },
    add:         { en:'Add',         de:'Hinzufugen',    fr:'Ajouter' },
    copy:        { en:'Copy',        de:'Kopieren',      fr:'Copier' },
    copied:      { en:'Copied!',     de:'Kopiert!',      fr:'Copie !' },
    generating:  { en:'Generating...', de:'Generiere...', fr:'Generation...' },
    noData:      { en:'No data yet.', de:'Noch keine Daten.', fr:'Pas encore de donnees.' },
    riskStable:  { en:'STABLE',      de:'STABIL',        fr:'STABLE' },
    riskModerate:{ en:'MODERATE',    de:'MODERAT',       fr:'MODERE' },
    riskHigh:    { en:'HIGH',        de:'HOCH',          fr:'ELEVE' },
    riskCritical:{ en:'CRITICAL',    de:'KRITISCH',      fr:'CRITIQUE' },
    viewAll:     { en:'View all',    de:'Alle anzeigen', fr:'Voir tout' },
    proTip:      { en:'Pro Tip',     de:'Profi-Tipp',    fr:'Conseil pro' },
  },

  // ── Risk page extra ───────────────────────────────────────────────────────────
  riskExtra: {
    ratingVolatility:   { en:'Rating Volatility',   de:'Bewertungsschwankung',      fr:'Volatilite des notes' },
    responseGap:        { en:'Response Gap',         de:'Antwortlucke',              fr:'Manque de reponses' },
    complianceRisk:     { en:'Compliance Risk',      de:'Compliance-Risiko',         fr:'Risque de conformite' },
    sentimentTrend:     { en:'Sentiment Trend',      de:'Stimmungstrend',            fr:'Tendance des sentiments' },
    competitorPressure: { en:'Competitor Pressure',  de:'Wettbewerbsdruck',          fr:'Pression concurrentielle' },
    highRisk:           { en:'HIGH RISK',            de:'HOHES RISIKO',              fr:'RISQUE ELEVE' },
    aiRecommended:      { en:'AI recommended',       de:'KI empfohlen',              fr:'Recommande par IA' },
    baselineEstimate:   { en:'Baseline estimate',    de:'Basisschatzung',            fr:'Estimation de base' },
    aiAnalysis:         { en:'Based on AI analysis of your reviews', de:'Basierend auf KI-Analyse Ihrer Bewertungen', fr:'Base sur analyse IA de vos avis' },
    sevenDayTitle:      { en:'7-Day Improvement Plan', de:'7-Tage-Verbesserungsplan', fr:'Plan amelioration 7 jours' },
    sevenDayDesc:       { en:'Based on your risk analysis. Specific actions for your team this week.', de:'Basierend auf Ihrer Risikoanalyse. Konkrete Massnahmen fur Ihr Team diese Woche.', fr:'Base sur votre analyse des risques. Actions concretes pour votre equipe cette semaine.' },
    generatePlan:       { en:'Generate 7-Day Plan',  de:'7-Tage-Plan generieren',    fr:'Generer plan 7 jours' },
    regenerate:         { en:'Regenerate',           de:'Neu generieren',            fr:'Regenerer' },
    generatingPlan:     { en:'Building your personalised 7-day plan...', de:'Ihr personalisierter 7-Tage-Plan wird erstellt...', fr:'Creation de votre plan 7 jours personnalise...' },
    planPrompt:         { en:'Click Generate 7-Day Plan to get specific daily actions for your team to improve the risks identified above. Each action is tailored to your actual scores.', de:'Klicken Sie auf Plan generieren, um konkrete tagliche Massnahmen fur Ihr Team zu erhalten. Jede Massnahme ist auf Ihre tatsachlichen Werte zugeschnitten.', fr:'Cliquez sur Generer plan pour obtenir des actions quotidiennes specifiques pour votre equipe.' },
    fiveVectors:        { en:'5-vector risk overview', de:'5-Vektor Risikoubersicht', fr:'Apercu des risques en 5 vecteurs' },
  },

  // ── Revenue extra ─────────────────────────────────────────────────────────────
  revenueExtra: {
    currentMonthly:   { en:'Current monthly revenue',  de:'Aktueller monatlicher Umsatz',     fr:'Chiffre affaires mensuel actuel' },
    projectedMonthly: { en:'Projected monthly revenue', de:'Prognostizierter monatlicher Umsatz', fr:'Chiffre affaires mensuel projete' },
    monthlyGainRow:   { en:'Monthly gain',             de:'Monatlicher Gewinn',               fr:'Gain mensuel' },
    annualGain:       { en:'Annual gain',              de:'Jahrlicher Gewinn',                fr:'Gain annuel' },
    subscription:     { en:'ReplyIQ subscription',    de:'ReplyIQ-Abonnement',               fr:'Abonnement ReplyIQ' },
    netMonthly:       { en:'Net monthly gain',         de:'Netto monatlicher Gewinn',         fr:'Gain mensuel net' },
    confidence:       { en:'Confidence',              de:'Vertrauen',                        fr:'Confiance' },
  },

  // ── Competitor extra ──────────────────────────────────────────────────────────
  competitorExtra2: {
    leading:      { en:'Leading',      de:'Fuhrend',    fr:'En tete' },
    yourProperty: { en:'Your Property', de:'Ihr Betrieb', fr:'Votre etablissement' },
    analysed:     { en:'Analysed',     de:'Analysiert', fr:'Analyse' },
  },

  // ── Report stats ──────────────────────────────────────────────────────────────
  reportStats: {
    responded:    { en:'Responded',    de:'Beantwortet',  fr:'Repondu' },
    responseRate: { en:'Response rate', de:'Antwortquote', fr:'Taux de reponse' },
    unanswered:   { en:'Unanswered',   de:'Unbeantwortet', fr:'Sans reponse' },
    riskScore:    { en:'Risk score',   de:'Risiko-Score', fr:'Score de risque' },
    revenueRisk:  { en:'Revenue risk', de:'Umsatzrisiko', fr:'Risque de revenus' },
  },


}

// Helper — get a translation string
// t(T.nav.inbox, lang) returns the string for current language
export function t(entry, lang = 'en') {
  if (!entry) return ''
  return entry[lang] || entry.en || ''
}
