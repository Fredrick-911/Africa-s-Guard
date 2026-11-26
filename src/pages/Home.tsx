import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Shield,
  Send,
  ScanSearch,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Users,
  Newspaper,
  Scale,
  Building2,
  ArrowRight,
  MessageCircle,
} from 'lucide-react';

// Replace with your production WhatsApp Business number (digits only, country code first).
const WHATSAPP_NUMBER = '14155238886';
const WHATSAPP_HREF = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  'Hi, I have media I want verified.'
)}`;

function openWhatsApp() {
  window.open(WHATSAPP_HREF, '_blank', 'noreferrer');
}

type VerdictBand = 'manipulated' | 'inconclusive' | 'authentic';

const verdictStyles: Record<VerdictBand, string> = {
  manipulated: 'bg-destructive/20 text-destructive-foreground border-destructive/30',
  inconclusive: 'bg-warning/20 text-warning-foreground border-warning/30',
  authentic: 'bg-success/20 text-success-foreground border-success/30',
};

const verdictIcons: Record<VerdictBand, typeof AlertTriangle> = {
  manipulated: AlertTriangle,
  inconclusive: HelpCircle,
  authentic: CheckCircle2,
};

function VerdictChip({ band, label }: { band: VerdictBand; label: string }) {
  const Icon = verdictIcons[band];
  return (
    <Badge variant="outline" className={cn('gap-1.5 py-1', verdictStyles[band])}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Badge>
  );
}

const steps = [
  {
    icon: Send,
    title: 'Forward the media',
    description:
      'Send any suspicious image, video, or voice note straight to our WhatsApp number. No app to install, no account to create.',
  },
  {
    icon: ScanSearch,
    title: 'AI verifies it',
    description:
      'Vision and speaker-verification models built for deepfake and voice-clone detection score the file in seconds.',
  },
  {
    icon: CheckCircle2,
    title: 'Get a clear verdict',
    description:
      "Manipulated, Authentic, or Inconclusive. Confident results arrive instantly; uncertain ones go to a trained human reviewer before anyone acts on them.",
  },
];

const audiences = [
  {
    icon: Users,
    title: 'Individuals & families',
    description:
      'Check a suspicious photo or voice note before it changes how someone sees you — or someone you love.',
  },
  {
    icon: Newspaper,
    title: 'Journalists & newsrooms',
    description: 'Verify user-submitted media before it runs, without waiting on a specialist lab.',
  },
  {
    icon: Scale,
    title: 'Human rights defenders',
    description:
      'Build an evidence trail for cases of image-based abuse, backed by a case dashboard built for advocacy work.',
  },
  {
    icon: Building2,
    title: 'Platforms & moderation teams',
    description: 'Screen reported content at the point of upload, with an API built to plug into an existing queue.',
  },
];

const bands: { band: VerdictBand; label: string; range: string; description: string }[] = [
  {
    band: 'manipulated',
    label: 'Manipulated',
    range: '≥ 80% confidence',
    description:
      "We only use this label when the model is highly confident, because a false accusation can do as much harm as the deepfake itself.",
  },
  {
    band: 'inconclusive',
    label: 'Inconclusive',
    range: '20–80% confidence',
    description: 'Neither confident enough to clear nor condemn. Routed straight to a human reviewer instead of guessing.',
  },
  {
    band: 'authentic',
    label: 'Authentic',
    range: '≤ 20% confidence',
    description: 'Low deepfake probability across the board — cleared without waiting on a human queue.',
  },
];

const trustFacts = [
  { icon: Shield, text: 'Verdicts in under 30 seconds' },
  { icon: ScanSearch, text: 'Open, published detection models' },
  { icon: Users, text: 'Human review on every uncertain case' },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Shield className="h-7 w-7 text-primary" />
            <div>
              <p className="text-base font-bold leading-none">AfriGuard</p>
              <p className="text-[11px] leading-none text-muted-foreground">Verify</p>
            </div>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#how-it-works" className="hover:text-foreground">
              How it works
            </a>
            <a href="#verdicts" className="hover:text-foreground">
              How we decide
            </a>
            <a href="#who" className="hover:text-foreground">
              Who it's for
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
              Sign in
            </Button>
            <Button size="sm" className="gap-2" onClick={openWhatsApp}>
              <MessageCircle className="h-4 w-4" />
              Verify on WhatsApp
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-7xl gap-16 px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
            Media verification · now worldwide
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Before you believe it,
            <br />
            verify it.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            AfriGuard checks images, video, and voice notes for deepfakes and manipulated media —
            right inside WhatsApp, wherever you are in the world.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" className="gap-2" onClick={openWhatsApp}>
              <MessageCircle className="h-4 w-4" />
              Verify on WhatsApp
            </Button>
            <Button size="lg" variant="outline" className="gap-2" onClick={() => navigate('/login')}>
              For organizations
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <dl className="mt-10 grid max-w-md grid-cols-1 gap-4 sm:grid-cols-3">
            {trustFacts.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-2">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="text-xs text-muted-foreground">{text}</span>
              </div>
            ))}
          </dl>
        </div>

        {/* Signature: live WhatsApp verdict mockup, mirrors the real bot's reply */}
        <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-6 motion-safe:duration-700">
          <div className="mx-auto max-w-sm overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
            <div className="flex items-center gap-3 bg-sidebar px-4 py-3">
              <Shield className="h-6 w-6 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-sidebar-foreground">AfriGuard Verify</p>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-success motion-safe:animate-pulse" />
                  <span className="text-[11px] text-muted-foreground">online</span>
                </div>
              </div>
            </div>
            <div className="space-y-3 bg-background p-4">
              <div className="flex justify-end">
                <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-primary-foreground">
                  <p className="text-xs">📷 photo.jpg</p>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-border bg-card px-3 py-2.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground motion-safe:animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground motion-safe:animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground motion-safe:animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[85%] space-y-2 rounded-2xl rounded-tl-sm border border-border bg-card px-3 py-2.5">
                  <p className="text-xs text-card-foreground">Analysis complete.</p>
                  <VerdictChip band="manipulated" label="82% Likely Manipulated" />
                  <p className="font-mono text-[11px] text-muted-foreground">Case ID: case-4f9a21b3</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works — a real sequence, so numbering earns its place */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-20">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">How it works</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Three steps. No specialist required.
        </h2>
        <ol className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="rounded-lg border border-border bg-card p-6">
              <span className="text-4xl font-bold text-primary/20">{String(i + 1).padStart(2, '0')}</span>
              <step.icon className="mt-4 h-6 w-6 text-primary" />
              <h3 className="mt-3 text-lg font-semibold text-card-foreground">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Origin story, reframed for a global audience */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Our starting point</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Built to close a real gap — now built for everyone
          </h2>
          <p className="mt-6 text-muted-foreground">
            Most deepfake detection was trained almost entirely on Western faces and voices,
            leaving huge parts of the world with no reliable way to check what they were being
            shown. AfriGuard started by taking that gap seriously. The same verification pipeline
            — and the same commitment to accuracy over assumption — now scales to anyone,
            anywhere, who forwards a file to WhatsApp and needs an honest answer.
          </p>
        </div>
      </section>

      {/* Who it protects */}
      <section id="who" className="mx-auto max-w-7xl px-6 py-20">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Who it's for</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Built for the people who need proof
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {audiences.map((a) => (
            <div
              key={a.title}
              className="rounded-lg border border-border bg-card p-6 transition-colors hover:bg-muted/50"
            >
              <a.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-base font-semibold text-card-foreground">{a.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{a.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How we decide — the real threshold logic, shown as UI */}
      <section id="verdicts" className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">How we decide</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            A verdict only when we're actually sure
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            We'd rather say "we're not sure" than get it wrong. Every file gets a deepfake
            probability score; only the two ends of that scale get an automatic verdict.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {bands.map(({ band, label, range, description }) => (
              <div key={band} className="rounded-lg border border-border bg-card p-6">
                <VerdictChip band={band} label={label} />
                <p className="mt-4 font-mono text-sm text-muted-foreground">{range}</p>
                <p className="mt-2 text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="rounded-2xl bg-sidebar px-8 py-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-sidebar-foreground sm:text-4xl">
            Ready to verify something?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sidebar-foreground/70">
            Forward it on WhatsApp and get a verdict in under 30 seconds. No account, no waiting
            room.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" className="gap-2" onClick={openWhatsApp}>
              <MessageCircle className="h-4 w-4" />
              Verify on WhatsApp
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => navigate('/login')}
            >
              Get dashboard access
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-6 py-10 text-center">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold">AfriGuard Verify</span>
          </div>
          <p className="text-xs text-muted-foreground">Verification you can forward.</p>
        </div>
      </footer>
    </div>
  );
}