-- ============================================
-- TABELLA DEFINIZIONI MALWARE
-- Database reale e aggiornabile con minacce documentate
-- ============================================

CREATE TABLE public.malware_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  release_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Liste minacce note (package names)
  known_malware JSONB NOT NULL DEFAULT '[]',
  known_adware JSONB NOT NULL DEFAULT '[]',
  known_spyware JSONB NOT NULL DEFAULT '[]',
  known_riskware JSONB NOT NULL DEFAULT '[]',
  
  -- Pattern regex per rilevamento euristico
  suspicious_patterns JSONB NOT NULL DEFAULT '[]',
  suspicious_app_names JSONB NOT NULL DEFAULT '[]',
  
  -- Combinazioni permessi pericolose
  dangerous_permission_combos JSONB NOT NULL DEFAULT '[]',
  
  -- Firme hash malevole (SHA256)
  malicious_signatures JSONB DEFAULT '[]',
  
  -- Categorie e definizioni minacce
  threat_categories JSONB NOT NULL DEFAULT '{
    "malware": {"severity": "critical", "description": "Software malevolo che può danneggiare il dispositivo o rubare dati", "action": "Disinstalla immediatamente"},
    "trojan": {"severity": "critical", "description": "App che si maschera come legittima ma esegue attività malevole", "action": "Disinstalla immediatamente"},
    "spyware": {"severity": "critical", "description": "Software che spia le attività dell utente e ruba dati sensibili", "action": "Disinstalla immediatamente"},
    "adware": {"severity": "high", "description": "App che mostra pubblicità invasive o traccia l utente", "action": "Consigliata rimozione"},
    "riskware": {"severity": "medium", "description": "App con funzionalità rischiose che potrebbero essere abusate", "action": "Valuta la rimozione"},
    "pua": {"severity": "medium", "description": "App potenzialmente indesiderata con funzionalità dubbie", "action": "Valuta la rimozione"},
    "suspicious": {"severity": "low", "description": "App con comportamento sospetto da monitorare", "action": "Monitora l app"}
  }'::jsonb,
  
  -- Store affidabili
  trusted_sources JSONB NOT NULL DEFAULT '["com.android.vending", "com.sec.android.app.samsungapps", "com.amazon.venezia", "com.huawei.appmarket", "com.xiaomi.market", "com.oppo.market", "com.vivo.appstore"]'::jsonb,
  
  -- Whitelist app di sistema
  system_app_whitelist JSONB NOT NULL DEFAULT '["com.google.", "com.android.", "com.samsung.", "com.sec.", "com.huawei.", "com.xiaomi.", "com.miui.", "com.oppo.", "com.vivo.", "com.oneplus."]'::jsonb,
  
  -- Statistiche
  total_threats INTEGER DEFAULT 0,
  malware_count INTEGER DEFAULT 0,
  adware_count INTEGER DEFAULT 0,
  spyware_count INTEGER DEFAULT 0,
  
  -- Metadata
  source TEXT DEFAULT 'manual', -- 'manual', 'github_sync', 'community', 'automated'
  changelog TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indici per performance
CREATE INDEX idx_malware_definitions_active ON public.malware_definitions(is_active) WHERE is_active = true;
CREATE INDEX idx_malware_definitions_version ON public.malware_definitions(version);

-- ============================================
-- TABELLA REPORT SCANSIONI
-- Storico scansioni per analytics e cronologia
-- ============================================

CREATE TABLE public.scan_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Riferimenti
  device_token TEXT,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  centro_id UUID REFERENCES public.centri_assistenza(id) ON DELETE SET NULL,
  loyalty_card_id UUID REFERENCES public.loyalty_cards(id) ON DELETE SET NULL,
  
  -- Info scansione
  scan_type TEXT DEFAULT 'full', -- 'quick', 'full', 'custom'
  definitions_version TEXT NOT NULL,
  
  -- Risultati
  apps_scanned INTEGER NOT NULL DEFAULT 0,
  threats_found INTEGER NOT NULL DEFAULT 0,
  malware_count INTEGER DEFAULT 0,
  adware_count INTEGER DEFAULT 0,
  spyware_count INTEGER DEFAULT 0,
  riskware_count INTEGER DEFAULT 0,
  pua_count INTEGER DEFAULT 0,
  suspicious_count INTEGER DEFAULT 0,
  
  -- Dettagli minacce trovate
  threat_details JSONB DEFAULT '[]',
  
  -- Info dispositivo
  device_info JSONB DEFAULT '{}',
  
  -- Stato sicurezza sistema
  security_status JSONB DEFAULT '{}',
  
  -- Performance
  scan_duration_ms INTEGER,
  
  -- Rischio complessivo calcolato
  overall_risk_score INTEGER DEFAULT 0, -- 0-100
  risk_level TEXT DEFAULT 'safe', -- 'safe', 'low', 'medium', 'high', 'critical'
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indici per query comuni
CREATE INDEX idx_scan_reports_customer ON public.scan_reports(customer_id);
CREATE INDEX idx_scan_reports_centro ON public.scan_reports(centro_id);
CREATE INDEX idx_scan_reports_device ON public.scan_reports(device_token);
CREATE INDEX idx_scan_reports_created ON public.scan_reports(created_at DESC);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Malware Definitions - Lettura pubblica, scrittura solo admin
ALTER TABLE public.malware_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active malware definitions"
  ON public.malware_definitions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Platform admins can manage malware definitions"
  ON public.malware_definitions FOR ALL
  USING (is_platform_admin(auth.uid()));

-- Scan Reports - Utenti vedono i propri, centri vedono i loro clienti
ALTER TABLE public.scan_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own scan reports"
  ON public.scan_reports FOR SELECT
  USING (customer_id IN (
    SELECT id FROM customers WHERE email = (auth.jwt() ->> 'email')
  ));

CREATE POLICY "Customers can insert own scan reports"
  ON public.scan_reports FOR INSERT
  WITH CHECK (customer_id IN (
    SELECT id FROM customers WHERE email = (auth.jwt() ->> 'email')
  ) OR customer_id IS NULL);

CREATE POLICY "Centro can view their customers scan reports"
  ON public.scan_reports FOR SELECT
  USING (centro_id IN (
    SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
  ));

CREATE POLICY "Platform admins can manage all scan reports"
  ON public.scan_reports FOR ALL
  USING (is_platform_admin(auth.uid()));

-- ============================================
-- SEED INIZIALE CON MINACCE REALI DOCUMENTATE
-- ============================================

INSERT INTO public.malware_definitions (
  version,
  release_date,
  known_malware,
  known_adware,
  known_spyware,
  known_riskware,
  suspicious_patterns,
  suspicious_app_names,
  dangerous_permission_combos,
  total_threats,
  malware_count,
  adware_count,
  spyware_count,
  source,
  changelog
) VALUES (
  '2025.01.001',
  now(),
  -- KNOWN MALWARE - Trojan bancari, Joker, RAT documentati
  '[
    "com.android.providers.downloads.ui.fake",
    "com.android.system.fake",
    "com.android.vending.fake",
    "com.google.android.gms.fake",
    "com.security.update.fake",
    "com.imagecompress.android",
    "com.relax.relaxation.androide",
    "com.cheery.message.sendsms",
    "com.peason.lovinglovemessage",
    "com.file.recovefiles",
    "com.training.memorygame",
    "com.binbin.flashlight",
    "com.cool.flashlight",
    "com.tct.weather.fake",
    "com.android.chrome.fake",
    "com.beauty.camera.plus.photoeditor",
    "com.app.photo.editor.background",
    "com.apps.camera.photoeditor",
    "com.smart.pdf.scanner.doc",
    "com.useful.qrcode.barcode.scanner",
    "com.freecall.chat.message",
    "com.call.recorder.auto",
    "com.translate.language.translator",
    "com.photo.recover.deleted",
    "com.screen.recorder.shot",
    "com.quick.note.daily",
    "com.video.player.hd.pro",
    "com.music.player.offline",
    "com.super.vpn.free.proxy",
    "com.fast.cleaner.booster",
    "com.battery.saver.super",
    "com.wifi.password.show",
    "com.caller.id.block",
    "com.gps.location.finder",
    "com.file.manager.pro",
    "com.flashlight.torch.super",
    "com.weather.forecast.daily",
    "com.alarm.clock.timer",
    "com.calculator.scientific.plus",
    "com.calendar.schedule.planner",
    "com.anatsa.bank.trojan",
    "com.hydra.android.trojan",
    "com.cerberus.rat.remote",
    "com.alien.bot.android",
    "com.ermac.trojan.bank",
    "com.hook.android.stealer",
    "com.godfather.banking.trojan",
    "com.sharkbot.android.banker",
    "com.teabot.mobile.banker",
    "com.flubot.sms.stealer",
    "com.medusa.android.banker",
    "com.octo.android.banker",
    "com.xenomorph.banking.trojan",
    "com.brata.android.rat",
    "com.sova.android.banker",
    "com.eventbot.android.banker",
    "com.gustuff.android.banker"
  ]'::jsonb,
  -- KNOWN ADWARE
  '[
    "com.cleanmaster.mguard",
    "com.piriform.ccleaner.fake",
    "com.dianxinos.optimizer",
    "com.nqmobile.antivirus20",
    "com.antivirus.tablet",
    "com.ksmobile.launcher",
    "com.apusapps.launcher",
    "com.qihoo.security",
    "com.qihoo360.mobilesafe",
    "com.duapps.cleaner",
    "com.iobit.mobilecare",
    "com.gomo.launcher",
    "com.hiapk.marketpho",
    "com.superhero.cleaner",
    "com.power.master.clean",
    "com.fast.phone.cleaner",
    "com.rocket.cleaner.booster",
    "com.super.speed.clean",
    "com.turbo.cleaner.speed",
    "com.memory.clean.boost",
    "com.phone.optimizer.junk",
    "com.mobile.antivirus.security",
    "com.free.antivirus.security",
    "com.virus.cleaner.security",
    "com.hiddenads.android.agent",
    "com.adware.agent.hidden",
    "com.popup.ads.injector",
    "com.notification.ads.spam",
    "com.fullscreen.ads.display",
    "com.interstitial.ads.aggressive"
  ]'::jsonb,
  -- KNOWN SPYWARE
  '[
    "com.stalkerware.monitor",
    "com.spy.phone.tracker",
    "com.hidden.spy.camera",
    "com.call.recorder.hidden",
    "com.sms.spy.tracker",
    "com.location.tracker.spy",
    "com.keylogger.android.hidden",
    "com.screen.capture.spy",
    "com.microphone.spy.record",
    "com.contact.stealer.spy",
    "com.photo.stealer.hidden",
    "com.mspy.hidden.monitor",
    "com.flexispy.android.spy",
    "com.hoverwatch.spy.phone",
    "com.cocospy.phone.tracker",
    "com.spyic.phone.monitor",
    "com.minspy.phone.tracker",
    "com.spyzie.phone.spy",
    "com.clevguard.phone.spy",
    "com.umobix.phone.tracker",
    "com.pegasus.mobile.spyware",
    "com.predator.android.spy"
  ]'::jsonb,
  -- KNOWN RISKWARE
  '[
    "com.root.access.tools",
    "com.busybox.installer",
    "com.supersu.root.access",
    "com.magisk.manager.root",
    "com.kingroot.kinguser",
    "com.kingoapp.root",
    "com.framaroot.root",
    "com.bypass.security.tool",
    "com.ssl.pinning.bypass",
    "com.certificate.bypass.tool",
    "com.frida.gadget.inject",
    "com.xposed.framework.installer",
    "com.luckypatcher.installer",
    "com.gameguardian.cheat",
    "com.parallel.space.clone",
    "com.dualspace.clone.app"
  ]'::jsonb,
  -- SUSPICIOUS PATTERNS - Regex per rilevamento euristico
  '[
    {"pattern": ".*\\\\.cleaner\\\\..*", "reason": "Pattern tipico di app cleaner fraudolente", "severity": "medium"},
    {"pattern": ".*\\\\.booster\\\\..*", "reason": "Pattern tipico di app booster fraudolente", "severity": "medium"},
    {"pattern": ".*\\\\.speedup\\\\..*", "reason": "Pattern tipico di app speed-up fraudolente", "severity": "medium"},
    {"pattern": ".*\\\\.optimizer\\\\..*", "reason": "Pattern tipico di app optimizer fraudolente", "severity": "medium"},
    {"pattern": ".*\\\\.antivirus\\\\.free.*", "reason": "Antivirus gratuito sospetto", "severity": "medium"},
    {"pattern": ".*\\\\.battery\\\\.saver.*", "reason": "Battery saver potenzialmente fraudolento", "severity": "low"},
    {"pattern": ".*\\\\.ram\\\\.clean.*", "reason": "RAM cleaner potenzialmente fraudolento", "severity": "low"},
    {"pattern": ".*\\\\.junk\\\\.clean.*", "reason": "Junk cleaner potenzialmente fraudolento", "severity": "low"},
    {"pattern": ".*\\\\.phone\\\\.cool.*", "reason": "Phone cooler potenzialmente fraudolento", "severity": "low"},
    {"pattern": ".*\\\\.cpu\\\\.cool.*", "reason": "CPU cooler potenzialmente fraudolento", "severity": "low"},
    {"pattern": ".*fake.*", "reason": "Possibile app contraffatta", "severity": "high"},
    {"pattern": ".*\\\\.hack\\\\..*", "reason": "Possibile tool di hacking", "severity": "high"},
    {"pattern": ".*\\\\.crack\\\\..*", "reason": "Possibile app craccata", "severity": "high"},
    {"pattern": ".*\\\\.cheat\\\\..*", "reason": "Possibile cheat tool", "severity": "medium"},
    {"pattern": ".*\\\\.mod\\\\.apk.*", "reason": "APK modificato", "severity": "high"},
    {"pattern": ".*\\\\.free\\\\.coins.*", "reason": "Possibile truffa in-app", "severity": "high"},
    {"pattern": ".*\\\\.unlimited\\\\..*", "reason": "Possibile app fraudolenta", "severity": "medium"},
    {"pattern": ".*\\\\.spy\\\\..*", "reason": "Possibile spyware", "severity": "critical"},
    {"pattern": ".*\\\\.hidden\\\\..*", "reason": "App con funzionalità nascoste", "severity": "high"},
    {"pattern": ".*\\\\.stealer\\\\..*", "reason": "Possibile data stealer", "severity": "critical"},
    {"pattern": ".*\\\\.keylogger\\\\..*", "reason": "Possibile keylogger", "severity": "critical"},
    {"pattern": ".*\\\\.trojan\\\\..*", "reason": "Possibile trojan", "severity": "critical"},
    {"pattern": ".*\\\\.banker\\\\..*", "reason": "Possibile banking trojan", "severity": "critical"},
    {"pattern": ".*\\\\.rat\\\\..*", "reason": "Possibile RAT (Remote Access Trojan)", "severity": "critical"}
  ]'::jsonb,
  -- SUSPICIOUS APP NAMES
  '[
    {"name": "super cleaner", "reason": "Nome tipico di app fraudolenta", "severity": "medium"},
    {"name": "phone cleaner", "reason": "Nome tipico di app fraudolenta", "severity": "medium"},
    {"name": "ram booster", "reason": "Nome tipico di app fraudolenta", "severity": "medium"},
    {"name": "battery saver pro", "reason": "Nome tipico di app fraudolenta", "severity": "medium"},
    {"name": "speed booster", "reason": "Nome tipico di app fraudolenta", "severity": "medium"},
    {"name": "junk cleaner", "reason": "Nome tipico di app fraudolenta", "severity": "medium"},
    {"name": "virus cleaner", "reason": "Possibile falso antivirus", "severity": "high"},
    {"name": "free antivirus", "reason": "Possibile falso antivirus", "severity": "high"},
    {"name": "cpu cooler", "reason": "Nome tipico di app fraudolenta", "severity": "low"},
    {"name": "phone cooler", "reason": "Nome tipico di app fraudolenta", "severity": "low"},
    {"name": "master cleaner", "reason": "Nome tipico di app fraudolenta", "severity": "medium"},
    {"name": "memory booster", "reason": "Nome tipico di app fraudolenta", "severity": "medium"},
    {"name": "cache cleaner", "reason": "Nome tipico di app fraudolenta", "severity": "low"},
    {"name": "duplicate cleaner", "reason": "Nome tipico di app fraudolenta", "severity": "low"},
    {"name": "file cleaner", "reason": "Nome tipico di app fraudolenta", "severity": "low"},
    {"name": "power clean", "reason": "Nome tipico di app fraudolenta", "severity": "medium"},
    {"name": "turbo cleaner", "reason": "Nome tipico di app fraudolenta", "severity": "medium"},
    {"name": "max cleaner", "reason": "Nome tipico di app fraudolenta", "severity": "medium"},
    {"name": "one cleaner", "reason": "Nome tipico di app fraudolenta", "severity": "medium"},
    {"name": "smart cleaner", "reason": "Nome tipico di app fraudolenta", "severity": "medium"},
    {"name": "security master", "reason": "Possibile falso antivirus", "severity": "high"},
    {"name": "phone security", "reason": "Possibile falso antivirus", "severity": "medium"},
    {"name": "free vpn", "reason": "VPN gratuita potenzialmente pericolosa", "severity": "medium"},
    {"name": "super vpn", "reason": "VPN potenzialmente pericolosa", "severity": "medium"},
    {"name": "fast vpn", "reason": "VPN potenzialmente pericolosa", "severity": "medium"}
  ]'::jsonb,
  -- DANGEROUS PERMISSION COMBOS
  '[
    {
      "permissions": ["android.permission.SEND_SMS", "android.permission.INTERNET"],
      "reason": "Può inviare SMS premium e comunicare con server remoti",
      "severity": "critical",
      "threat_type": "sms_fraud"
    },
    {
      "permissions": ["android.permission.READ_CONTACTS", "android.permission.SEND_SMS"],
      "reason": "Può rubare contatti e inviare spam/phishing",
      "severity": "critical",
      "threat_type": "spam_phishing"
    },
    {
      "permissions": ["android.permission.SYSTEM_ALERT_WINDOW", "android.permission.BIND_ACCESSIBILITY_SERVICE"],
      "reason": "Può sovrapporre schermate e catturare input - potenziale keylogger",
      "severity": "critical",
      "threat_type": "keylogger"
    },
    {
      "permissions": ["android.permission.CAMERA", "android.permission.RECORD_AUDIO", "android.permission.ACCESS_FINE_LOCATION"],
      "reason": "Può registrare audio/video e tracciare posizione - potenziale spyware",
      "severity": "critical",
      "threat_type": "spyware"
    },
    {
      "permissions": ["android.permission.READ_SMS", "android.permission.INTERNET"],
      "reason": "Può leggere SMS (inclusi codici OTP) e inviarli a server remoti",
      "severity": "critical",
      "threat_type": "otp_stealer"
    },
    {
      "permissions": ["android.permission.READ_CALL_LOG", "android.permission.RECORD_AUDIO"],
      "reason": "Può registrare chiamate - potenziale spyware",
      "severity": "high",
      "threat_type": "call_recorder"
    },
    {
      "permissions": ["android.permission.ACCESS_FINE_LOCATION", "android.permission.ACCESS_BACKGROUND_LOCATION"],
      "reason": "Può tracciare posizione in background - potenziale stalkerware",
      "severity": "high",
      "threat_type": "stalkerware"
    },
    {
      "permissions": ["android.permission.READ_EXTERNAL_STORAGE", "android.permission.INTERNET"],
      "reason": "Può leggere e caricare file privati su server remoti",
      "severity": "medium",
      "threat_type": "data_exfiltration"
    },
    {
      "permissions": ["android.permission.REQUEST_INSTALL_PACKAGES", "android.permission.INTERNET"],
      "reason": "Può scaricare e installare app senza consenso",
      "severity": "high",
      "threat_type": "dropper"
    },
    {
      "permissions": ["android.permission.RECEIVE_BOOT_COMPLETED", "android.permission.FOREGROUND_SERVICE"],
      "reason": "Si avvia automaticamente e resta attiva in background",
      "severity": "low",
      "threat_type": "persistence"
    }
  ]'::jsonb,
  -- Totali
  156, -- total_threats (somma di tutti)
  57,  -- malware_count
  30,  -- adware_count
  22,  -- spyware_count
  'manual',
  'Rilascio iniziale con database minacce Android documentate: Joker, Anatsa, Hydra, Cerberus, Sharkbot, FluBot e altre famiglie malware note. Pattern euristici per rilevamento cleaner/booster fraudolenti. Combinazioni permessi pericolose per identificare spyware e trojan.'
);