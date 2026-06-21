import React, { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  BarChart3,
  CalendarDays,
  Car,
  Check,
  ChevronLeft,
  CircleDollarSign,
  Clock,
  Download,
  Edit3,
  Eye,
  Gauge,
  ImagePlus,
  LayoutDashboard,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Minus,
  Package,
  Phone,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Upload,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import * as api from './api.js'
import {
  Badge,
  Btn,
  Field,
  IconBtn,
  ImageUploader,
  Input,
  Modal,
  Panel,
  Select,
  Textarea,
  Toast,
  TyreImage,
  cx,
} from './ui.jsx'

const services = ['Tyre Fitting', 'Tyre Rotation', 'Wheel Alignment', 'Puncture Repair', 'Tyre Inspection', 'Wheel Balancing']
const adminTabs = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['stock', 'Stock', Package],
  ['bookings', 'Bookings', CalendarDays],
  ['enquiries', 'Enquiries', Mail],
  ['reviews', 'Reviews', Star],
  ['vehicles', 'Vehicles', Car],
  ['blocked', 'Closed Dates', Clock],
  ['settings', 'Settings', Settings],
]

const tyreDefaults = {
  brand: '',
  model: '',
  width: 225,
  profile: 45,
  rim: 18,
  condition: 'New',
  price: 0,
  qty: 4,
  speed: 'V',
  load_index: 91,
  description: '',
  warranty: '',
  featured: 0,
  image_url: '',
}

function money(value) {
  return `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function sizeOf(t) {
  return `${t.width}/${t.profile}R${t.rim}`
}

function whatsappUrl(phone, message) {
  return `https://wa.me/${String(phone || '').replace(/\D/g, '')}${message ? `?text=${encodeURIComponent(message)}` : ''}`
}

function Stars({ rating = 5 }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-tiger-orange">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={15} fill={n <= Math.round(rating) ? 'currentColor' : 'none'} />
      ))}
    </span>
  )
}

function StatusPill({ status }) {
  const tones = {
    new: 'border-tiger-orange/40 bg-tiger-orange/15 text-tiger-orange',
    pending: 'border-tiger-orange/40 bg-tiger-orange/15 text-tiger-orange',
    contacted: 'border-blue-400/30 bg-blue-950/40 text-blue-200',
    confirmed: 'border-green-400/30 bg-green-950/40 text-green-200',
    completed: 'border-green-400/30 bg-green-950/40 text-green-200',
    cancelled: 'border-red-400/30 bg-red-950/40 text-red-200',
    approved: 'border-green-400/30 bg-green-950/40 text-green-200',
    hidden: 'border-amber-400/30 bg-amber-950/40 text-amber-200',
  }
  return <span className={cx('tt-badge', tones[status] || 'border-white/10 bg-white/[0.06] text-zinc-300')}>{status}</span>
}

function Header({ page, setPage, cartCount, onCartOpen, settings: s }) {
  const [open, setOpen] = useState(false)
  const nav = [
    ['shop', 'Shop'],
    ['about', 'About'],
    ['admin', 'Admin'],
  ]
  return (
    <header className="sticky top-0 z-[900] border-b border-tiger-orange/30 bg-garage-black/88 shadow-panel backdrop-blur-xl">
      <div className="tt-shell flex min-h-[72px] items-center gap-3 py-3">
        <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setPage('shop')}>
          {s?.hero_logo_url ? (
            <img src={s.hero_logo_url} alt={s.shop_name} className="h-12 w-auto rounded-md object-contain" />
          ) : (
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-tiger-orange/40 bg-tiger-orange text-black shadow-glow">
              <Gauge size={28} />
            </div>
          )}
          <span className="min-w-0">
            <span className="tt-display block truncate text-3xl text-tiger-orange">{s?.shop_name || 'Tiger Tyres'}</span>
            <span className="block truncate font-condensed text-[0.68rem] font-bold uppercase tracking-[0.22em] text-zinc-500">Napier, New Zealand</span>
          </span>
        </button>

        <nav className="hidden items-center gap-2 md:flex">
          {nav.map(([value, label]) => (
            <button
              key={value}
              onClick={() => setPage(value)}
              className={cx(
                'rounded-md px-4 py-2 font-condensed text-sm font-black uppercase tracking-[0.16em] transition',
                page === value ? 'bg-tiger-orange text-black' : 'text-zinc-400 hover:bg-white/[0.06] hover:text-white'
              )}
            >
              {label}
            </button>
          ))}
        </nav>

        <IconBtn label="Open cart" onClick={onCartOpen} className="relative">
          <ShoppingCart size={19} />
          {cartCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-tiger-orange px-1 text-xs font-black text-black">{cartCount}</span>}
        </IconBtn>
        <IconBtn label="Menu" className="md:hidden" onClick={() => setOpen((v) => !v)}>
          {open ? <X size={19} /> : <Menu size={19} />}
        </IconBtn>
      </div>
      {open && (
        <div className="border-t border-white/10 bg-black/95 px-4 py-3 md:hidden">
          <div className="grid gap-2">
            {nav.map(([value, label]) => (
              <button
                key={value}
                className={cx('rounded-md px-4 py-3 text-left font-condensed font-black uppercase tracking-[0.16em]', page === value ? 'bg-tiger-orange text-black' : 'bg-white/[0.05] text-zinc-300')}
                onClick={() => {
                  setPage(value)
                  setOpen(false)
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}

function Hero({ settings: s, onBook }) {
  return (
    <section className="hero-garage relative overflow-hidden border-b border-white/10">
      <div className="steel-grid absolute inset-0 opacity-25" />
      <div className="tt-shell relative grid min-h-[calc(100svh-72px)] items-center py-10 sm:py-14 lg:min-h-[650px] lg:grid-cols-[1.02fr_0.98fr] lg:py-20">
        <div className="max-w-3xl">
          <div className="tt-eyebrow mb-5">{s?.hero_eyebrow || "Napier's tyre specialists"}</div>
          <h1 className="tt-display text-[3.55rem] text-white sm:text-[6.5rem] lg:text-[8.2rem]">
            <span>{s?.hero_heading || 'Find your'}</span>
            <span className="block text-tiger-orange drop-shadow-[0_0_38px_rgba(255,107,0,.35)]">{s?.hero_heading_highlight || 'Perfect tyre'}</span>
          </h1>
          {s?.hero_subtext && <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-300 sm:text-xl">{s.hero_subtext}</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            {s?.phone && (
              <a className="tt-btn tt-btn-primary" href={`tel:${s.phone}`}>
                <Phone size={18} /> Call now
              </a>
            )}
            {s?.whatsapp && (
              <a className="tt-btn tt-btn-secondary" href={whatsappUrl(s.whatsapp, "Hi Tiger Tyres, I'd like to enquire about tyres.")} target="_blank" rel="noreferrer">
                <MessageCircle size={18} /> WhatsApp
              </a>
            )}
            <Btn onClick={onBook} variant="secondary">
              <CalendarDays size={18} /> Book fitting
            </Btn>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:mt-8 lg:grid-cols-4">
            {[
              [ShieldCheck, 'Price match', s?.price_match === 'true' ? s?.hero_badge_text : 'Written quotes welcome'],
              [Wrench, 'Expert fitting', 'Slots across the working week'],
              [BadgeCheck, 'New + used', 'Premium, budget and quality used'],
              [Star, 'Local shop', 'Napier service, fast response'],
            ].map(([Icon, title, body]) => (
              <div key={title} className="rounded-lg border border-white/10 bg-black/45 p-3 backdrop-blur sm:p-4">
                <Icon className="mb-2 text-tiger-orange sm:mb-3" size={22} />
                <div className="font-condensed text-base font-black uppercase tracking-[0.12em] text-white sm:text-lg">{title}</div>
                <p className="mt-1 line-clamp-2 text-xs text-zinc-400 sm:text-sm">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function BrandStrip() {
  const brands = ['Michelin', 'Pirelli', 'Continental', 'Bridgestone', 'Goodyear', 'Yokohama', 'Dunlop', 'Falken', 'Hankook', 'Toyo', 'BF Goodrich', 'Nexen']
  return (
    <section className="border-y border-white/10 bg-black py-4">
      <div className="tt-shell">
        <div className="mb-3 text-center font-condensed text-[0.65rem] font-black uppercase tracking-[0.35em] text-zinc-600">Authorised stockist</div>
        <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
          {brands.map((brand) => (
            <span key={brand} className="font-condensed text-sm font-black uppercase tracking-[0.18em] text-zinc-700 transition hover:text-tiger-orange">
              {brand}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

function SearchPanel({ onVehicleResults, onSizeSearch, showToast }) {
  const [tab, setTab] = useState('size')
  const [makes, setMakes] = useState([])
  const [models, setModels] = useState([])
  const [years, setYears] = useState([])
  const [meta, setMeta] = useState({ widths: [], profiles: [], rims: [] })
  const [sel, setSel] = useState({ make: '', model: '', year: '' })
  const [size, setSize] = useState({ width: '', profile: '', rim: '', condition: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([api.getVehicleMakes(), api.getWidths(), api.getProfiles(), api.getRims()])
      .then(([makeRows, widths, profiles, rims]) => {
        setMakes(makeRows)
        setMeta({ widths, profiles, rims })
      })
      .catch(() => showToast('Could not load search options', false))
  }, [])

  useEffect(() => {
    if (!sel.make) {
      setModels([])
      setYears([])
      return
    }
    api.getVehicleModels(sel.make).then(setModels).catch(() => setModels([]))
    setSel((s) => ({ ...s, model: '', year: '' }))
  }, [sel.make])

  useEffect(() => {
    if (!sel.make || !sel.model) {
      setYears([])
      return
    }
    api.getVehicleYears(sel.make, sel.model).then(setYears).catch(() => setYears([]))
    setSel((s) => ({ ...s, year: '' }))
  }, [sel.model])

  const findVehicle = async () => {
    setLoading(true)
    try {
      onVehicleResults(await api.getVehicleFitment(sel.make, sel.model, sel.year), sel)
    } catch {
      showToast('No fitment data found for this vehicle', false)
    } finally {
      setLoading(false)
    }
  }

  const findSize = () => {
    if (!size.width && !size.profile && !size.rim) return showToast('Select at least one tyre dimension', false)
    onSizeSearch(size)
  }

  return (
    <section id="tyre-search" className="tread-bg relative -mt-10 pb-12">
      <div className="tt-shell">
        <Panel className="overflow-hidden border-tiger-orange/25">
          <div className="grid border-b border-white/10 sm:grid-cols-2">
            {[
              ['vehicle', Car, 'Search by vehicle'],
              ['size', Search, 'Search by tyre size'],
            ].map(([value, Icon, label]) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                className={cx(
                  'flex min-h-14 items-center justify-center gap-3 px-4 font-condensed text-sm font-black uppercase tracking-[0.16em] transition',
                  tab === value ? 'bg-tiger-orange text-black' : 'bg-black/35 text-zinc-400 hover:text-white'
                )}
              >
                <Icon size={18} /> {label}
              </button>
            ))}
          </div>
          <div className="p-5 sm:p-7">
            {tab === 'vehicle' ? (
              <>
                <div className="mb-5 flex items-start gap-3 text-sm text-zinc-400">
                  <Car className="mt-0.5 text-tiger-orange" size={19} />
                  <p>Select your vehicle and we’ll show every compatible tyre in stock.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <Field label="Make">
                    <Select value={sel.make} onChange={(e) => setSel((s) => ({ ...s, make: e.target.value }))}>
                      <option value="">Select make</option>
                      {makes.map((m) => <option key={m}>{m}</option>)}
                    </Select>
                  </Field>
                  <Field label="Model">
                    <Select value={sel.model} disabled={!sel.make} onChange={(e) => setSel((s) => ({ ...s, model: e.target.value }))}>
                      <option value="">Select model</option>
                      {models.map((m) => <option key={m}>{m}</option>)}
                    </Select>
                  </Field>
                  <Field label="Year">
                    <Select value={sel.year} disabled={!sel.model} onChange={(e) => setSel((s) => ({ ...s, year: e.target.value }))}>
                      <option value="">Select year</option>
                      {years.map((y) => <option key={y}>{y}</option>)}
                    </Select>
                  </Field>
                  <Btn className="self-end" onClick={findVehicle} disabled={!sel.year || loading}>
                    <Search size={18} /> {loading ? 'Searching' : 'Find tyres'}
                  </Btn>
                </div>
              </>
            ) : (
              <>
                <div className="mb-5 flex items-start gap-3 text-sm text-zinc-400">
                  <Gauge className="mt-0.5 text-tiger-orange" size={19} />
                  <p>
                    Read the size off your tyre sidewall, for example <span className="font-mono font-bold text-tiger-orange">225/45 R18</span>.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <Field label="Width">
                    <Select value={size.width} onChange={(e) => setSize((s) => ({ ...s, width: e.target.value }))}>
                      <option value="">Any width</option>
                      {meta.widths.map((w) => <option key={w} value={w}>{w}</option>)}
                    </Select>
                  </Field>
                  <Field label="Profile">
                    <Select value={size.profile} onChange={(e) => setSize((s) => ({ ...s, profile: e.target.value }))}>
                      <option value="">Any profile</option>
                      {meta.profiles.map((p) => <option key={p} value={p}>{p}</option>)}
                    </Select>
                  </Field>
                  <Field label="Rim">
                    <Select value={size.rim} onChange={(e) => setSize((s) => ({ ...s, rim: e.target.value }))}>
                      <option value="">Any rim</option>
                      {meta.rims.map((r) => <option key={r} value={r}>{r}"</option>)}
                    </Select>
                  </Field>
                  <Field label="Condition">
                    <Select value={size.condition} onChange={(e) => setSize((s) => ({ ...s, condition: e.target.value }))}>
                      <option value="">New or used</option>
                      <option value="New">New only</option>
                      <option value="Used">Used only</option>
                    </Select>
                  </Field>
                  <Btn className="self-end" onClick={findSize}>
                    <Search size={18} /> Search
                  </Btn>
                </div>
                {(size.width || size.profile || size.rim || size.condition) && (
                  <div className="mt-5 rounded-md border border-tiger-orange/25 bg-tiger-orange/10 px-4 py-3 font-condensed text-lg font-black uppercase tracking-[0.12em] text-tiger-orange">
                    {size.width || '?'}/{size.profile || '?'}R{size.rim || '?'} {size.condition && <span className="text-zinc-300">· {size.condition}</span>}
                  </div>
                )}
              </>
            )}
          </div>
        </Panel>
      </div>
    </section>
  )
}

function TyreCard({ tyre, onView, onAddCart, onCompare, inCompare }) {
  const low = tyre.qty > 0 && tyre.qty <= 2
  return (
    <article className="tt-panel tt-card-hover group overflow-hidden">
      <button className="block w-full text-left" onClick={() => onView(tyre)}>
        <div className="relative">
          <TyreImage src={tyre.image_url} height={220} />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <Badge c={tyre.condition} />
            {tyre.featured === 1 && <Badge tone="yellow"><Sparkles size={12} /> Featured</Badge>}
          </div>
          {low && <div className="absolute bottom-3 left-3"><Badge tone="red">Only {tyre.qty} left</Badge></div>}
          {tyre.qty === 0 && <div className="absolute inset-0 grid place-items-center bg-black/72"><Badge tone="red">Out of stock</Badge></div>}
        </div>
      </button>
      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <button onClick={() => onView(tyre)} className="flex min-h-11 max-w-full items-center truncate font-condensed text-2xl font-black uppercase tracking-[0.08em] text-white hover:text-tiger-orange">
              {tyre.brand}
            </button>
            <div className="truncate text-sm text-zinc-400">{tyre.model}</div>
          </div>
          <div className="tt-display shrink-0 text-3xl text-tiger-orange">{money(tyre.price)}</div>
        </div>
        <div className="mb-4 grid grid-cols-3 gap-2 rounded-lg border border-white/10 bg-black/30 p-2 text-center">
          <div>
            <div className="text-[0.65rem] uppercase tracking-[0.16em] text-zinc-600">Size</div>
            <div className="font-condensed text-lg font-black text-white">{sizeOf(tyre)}</div>
          </div>
          <div>
            <div className="text-[0.65rem] uppercase tracking-[0.16em] text-zinc-600">Speed</div>
            <div className="font-condensed text-lg font-black text-white">{tyre.speed}</div>
          </div>
          <div>
            <div className="text-[0.65rem] uppercase tracking-[0.16em] text-zinc-600">Stock</div>
            <div className={cx('font-condensed text-lg font-black', tyre.qty === 0 ? 'text-red-300' : low ? 'text-amber-200' : 'text-green-300')}>{tyre.qty}</div>
          </div>
        </div>
        <p className="line-clamp-2 min-h-10 text-sm leading-5 text-zinc-400">{tyre.description || tyre.warranty || 'Ready for fitting at Tiger Tyres.'}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Btn variant={inCompare ? 'primary' : 'secondary'} className="min-h-10 px-3 text-xs" onClick={() => onCompare(tyre)}>
            <BarChart3 size={16} /> {inCompare ? 'Comparing' : 'Compare'}
          </Btn>
          <Btn className="min-h-10 px-3 text-xs" onClick={() => onAddCart(tyre)} disabled={tyre.qty === 0}>
            <ShoppingCart size={16} /> Add
          </Btn>
        </div>
      </div>
    </article>
  )
}

function DetailView({ tyre, onBack, onAddCart, showToast }) {
  const [detail, setDetail] = useState(tyre)
  const [review, setReview] = useState({ author: '', rating: 5, body: '' })
  useEffect(() => {
    api.getTyre(tyre.id).then(setDetail).catch(() => setDetail(tyre))
  }, [tyre.id])
  const submitReview = async () => {
    try {
      await api.submitReview(detail.id, review)
      setReview({ author: '', rating: 5, body: '' })
      showToast('Review submitted for moderation')
    } catch (e) {
      showToast(e.message, false)
    }
  }
  return (
    <main className="tread-bg min-h-screen py-8">
      <div className="tt-shell">
        <Btn variant="ghost" onClick={onBack} className="mb-5">
          <ChevronLeft size={18} /> Back to shop
        </Btn>
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Panel className="overflow-hidden">
            <TyreImage src={detail.image_url} height={520} />
          </Panel>
          <Panel className="p-5 sm:p-8">
            <div className="flex flex-wrap gap-2">
              <Badge c={detail.condition} />
              {detail.featured === 1 && <Badge tone="yellow">Featured</Badge>}
              <Badge tone={detail.qty ? 'green' : 'red'}>{detail.qty ? `${detail.qty} in stock` : 'Out of stock'}</Badge>
            </div>
            <h1 className="tt-display mt-5 text-6xl text-white sm:text-7xl">{detail.brand}</h1>
            <p className="mt-1 text-xl text-zinc-400">{detail.model}</p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Size', sizeOf(detail)],
                ['Speed', detail.speed],
                ['Load', detail.load_index],
                ['Rim', `${detail.rim}"`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/10 bg-black/30 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-zinc-600">{label}</div>
                  <div className="mt-1 font-condensed text-2xl font-black text-white">{value}</div>
                </div>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <div className="tt-display text-6xl text-tiger-orange">{money(detail.price)}</div>
              <Btn onClick={() => onAddCart(detail)} disabled={detail.qty === 0}>
                <ShoppingCart size={18} /> Add to enquiry
              </Btn>
            </div>
            <p className="mt-6 text-lg leading-8 text-zinc-300">{detail.description}</p>
            {detail.warranty && <div className="mt-4 flex items-center gap-2 text-sm text-green-300"><ShieldCheck size={18} /> {detail.warranty}</div>}
            <div className="mt-8 border-t border-white/10 pt-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-condensed text-2xl font-black uppercase tracking-[0.12em] text-white">Reviews</h2>
                {detail.avg_rating && <div className="flex items-center gap-2"><Stars rating={Number(detail.avg_rating)} /><span className="text-sm text-zinc-400">{detail.avg_rating} · {detail.review_count}</span></div>}
              </div>
              <div className="grid gap-3">
                {(detail.reviews || []).slice(0, 4).map((r) => (
                  <div key={r.id} className="rounded-lg border border-white/10 bg-black/25 p-4">
                    <div className="flex items-center justify-between"><strong>{r.author}</strong><Stars rating={r.rating} /></div>
                    {r.body && <p className="mt-2 text-sm text-zinc-400">{r.body}</p>}
                  </div>
                ))}
                {!detail.reviews?.length && <p className="text-sm text-zinc-500">No approved reviews yet.</p>}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                <Input placeholder="Your name" value={review.author} onChange={(e) => setReview((r) => ({ ...r, author: e.target.value }))} />
                <Select value={review.rating} onChange={(e) => setReview((r) => ({ ...r, rating: Number(e.target.value) }))}>
                  {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}
                </Select>
                <Textarea className="sm:col-span-2" placeholder="Optional review" value={review.body} onChange={(e) => setReview((r) => ({ ...r, body: e.target.value }))} />
                <Btn className="sm:col-span-2" onClick={submitReview} disabled={!review.author}>Submit review</Btn>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </main>
  )
}

function BookingModal({ onClose, showToast }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', service: 'Tyre Fitting', vehicle: '', date: '', time: '', notes: '' })
  const [slots, setSlots] = useState([])
  const [step, setStep] = useState('form')
  const [loading, setLoading] = useState(false)
  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const checkSlots = async () => {
    setLoading(true)
    try {
      const data = await api.getAvailability(form.date)
      if (!data.length) return showToast('Shop is closed on this date. Please choose another.', false)
      setSlots(data)
      setStep('slots')
    } catch (e) {
      showToast(e.message, false)
    } finally {
      setLoading(false)
    }
  }
  const submit = async () => {
    setLoading(true)
    try {
      await api.submitBooking(form)
      setStep('done')
      showToast('Booking confirmed')
    } catch (e) {
      showToast(e.message, false)
    } finally {
      setLoading(false)
    }
  }
  return (
    <Modal onClose={onClose}>
      <div className="pr-10">
        <div className="tt-eyebrow">Fitting calendar</div>
        <h2 className="tt-display mt-2 text-4xl text-white">{step === 'done' ? 'Booking confirmed' : 'Book a fitting'}</h2>
      </div>
      {step === 'form' && (
        <div className="mt-6 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><Input value={form.name} onChange={(e) => f('name', e.target.value)} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => f('phone', e.target.value)} /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => f('email', e.target.value)} /></Field>
            <Field label="Service"><Select value={form.service} onChange={(e) => f('service', e.target.value)}>{services.map((s) => <option key={s}>{s}</option>)}</Select></Field>
            <Field label="Vehicle"><Input value={form.vehicle} onChange={(e) => f('vehicle', e.target.value)} placeholder="Toyota RAV4, Ford Ranger..." /></Field>
            <Field label="Date"><Input type="date" min={minDate} value={form.date} onChange={(e) => f('date', e.target.value)} /></Field>
          </div>
          <Field label="Notes"><Textarea value={form.notes} onChange={(e) => f('notes', e.target.value)} /></Field>
          <Btn onClick={checkSlots} disabled={!form.name || !form.phone || !form.date || loading}><CalendarDays size={18} /> Check times</Btn>
        </div>
      )}
      {step === 'slots' && (
        <div className="mt-6">
          <div className="mb-4 rounded-lg border border-white/10 bg-black/30 p-4 text-sm text-zinc-400">{form.service} on <strong className="text-white">{form.date}</strong></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {slots.map((slot) => (
              <button
                key={slot.time}
                disabled={!slot.available}
                onClick={() => f('time', slot.time)}
                className={cx('rounded-md border px-4 py-3 font-condensed font-black tracking-[0.12em]', form.time === slot.time ? 'border-tiger-orange bg-tiger-orange text-black' : slot.available ? 'border-white/10 bg-white/[0.05] text-zinc-200' : 'cursor-not-allowed border-white/5 bg-black/20 text-zinc-700')}
              >
                {slot.time}
              </button>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Btn variant="secondary" onClick={() => setStep('form')}>Back</Btn>
            <Btn onClick={submit} disabled={!form.time || loading}><Check size={18} /> Confirm booking</Btn>
          </div>
        </div>
      )}
      {step === 'done' && (
        <div className="mt-6 rounded-lg border border-green-400/30 bg-green-950/30 p-5 text-green-100">
          Your booking request has been received. Tiger Tyres will contact you to confirm the details.
        </div>
      )}
    </Modal>
  )
}

function CartDrawer({ cart, setCart, onClose, showToast }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' })
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const setQty = (id, qty) => setCart((items) => items.map((item) => item.id === id ? { ...item, qty: Math.max(1, qty) } : item))
  const remove = (id) => setCart((items) => items.filter((item) => item.id !== id))
  const submit = async () => {
    try {
      await api.submitEnquiry({ ...form, items: cart })
      setCart([])
      showToast('Enquiry sent')
      onClose()
    } catch (e) {
      showToast(e.message, false)
    }
  }
  return (
    <div className="fixed inset-0 z-[1200]">
      <button aria-label="Close cart" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[470px] flex-col border-l border-tiger-orange/40 bg-asphalt shadow-panel">
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div>
            <div className="tt-eyebrow">Enquiry cart</div>
            <h2 className="tt-display mt-1 text-4xl text-white">Selected tyres</h2>
          </div>
          <IconBtn label="Close" onClick={onClose}><X size={18} /></IconBtn>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {!cart.length ? (
            <div className="grid h-full place-items-center text-center text-zinc-500">
              <div><ShoppingCart className="mx-auto mb-3 text-zinc-700" size={46} /><p>No tyres selected yet.</p></div>
            </div>
          ) : (
            <div className="grid gap-3">
              {cart.map((item) => (
                <div key={item.id} className="rounded-lg border border-white/10 bg-black/25 p-3">
                  <div className="flex gap-3">
                    <TyreImage src={item.image_url} height={78} className="h-20 w-24 shrink-0 rounded-md" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-condensed text-lg font-black uppercase text-white">{item.brand} {item.model}</div>
                      <div className="text-sm text-zinc-500">{sizeOf(item)} · {money(item.price)} ea</div>
                      <div className="mt-2 flex items-center gap-2">
                        <IconBtn label="Decrease" className="h-8 w-8" onClick={() => setQty(item.id, item.qty - 1)}><Minus size={14} /></IconBtn>
                        <span className="w-8 text-center font-black">{item.qty}</span>
                        <IconBtn label="Increase" className="h-8 w-8" onClick={() => setQty(item.id, item.qty + 1)}><Plus size={14} /></IconBtn>
                        <button className="ml-auto text-xs text-red-300 hover:text-red-200" onClick={() => remove(item.id)}>Remove</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-white/10 p-5">
          {cart.length > 0 && <div className="mb-4 rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-zinc-400">{cart.length} item{cart.length === 1 ? '' : 's'} · estimated total <strong className="text-tiger-orange">{money(total)}</strong></div>}
          <div className="grid gap-3">
            <Input placeholder="Name" value={form.name} onChange={(e) => f('name', e.target.value)} />
            <Input placeholder="Phone" value={form.phone} onChange={(e) => f('phone', e.target.value)} />
            <Input placeholder="Email" value={form.email} onChange={(e) => f('email', e.target.value)} />
            <Textarea placeholder="Message" value={form.message} onChange={(e) => f('message', e.target.value)} />
            <Btn onClick={submit} disabled={!cart.length || !form.name || !form.phone}><Mail size={18} /> Send enquiry</Btn>
          </div>
        </div>
      </aside>
    </div>
  )
}

function ComparePanel({ tyres, onRemove, onClose }) {
  if (tyres.length < 2) return null
  return (
    <div className="fixed inset-x-0 bottom-0 z-[850] border-t border-tiger-orange/40 bg-garage-black/95 p-3 shadow-panel backdrop-blur">
      <div className="tt-shell flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex items-center justify-between gap-3">
          <div><div className="tt-eyebrow">Compare</div><div className="font-condensed text-xl font-black uppercase text-white">{tyres.length} tyres selected</div></div>
          <IconBtn label="Close compare" onClick={onClose}><X size={18} /></IconBtn>
        </div>
        <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {tyres.map((t) => (
            <div key={t.id} className="rounded-md border border-white/10 bg-white/[0.04] p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-condensed font-black uppercase text-white">{t.brand} {t.model}</div>
                  <div className="text-xs text-zinc-500">{sizeOf(t)} · {money(t.price)} · Qty {t.qty}</div>
                </div>
                <button onClick={() => onRemove(t.id)} className="text-zinc-500 hover:text-red-300"><X size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AboutPage({ settings: s, onBook, showToast }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' })
  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const submit = async () => {
    try {
      await api.submitEnquiry(form)
      setForm({ name: '', phone: '', email: '', message: '' })
      showToast('Message sent')
    } catch (e) {
      showToast(e.message, false)
    }
  }
  return (
    <main className="tread-bg min-h-screen py-10">
      <div className="tt-shell grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <Panel className="p-6 sm:p-9">
          <div className="tt-eyebrow">About Tiger Tyres</div>
          <h1 className="tt-display mt-3 text-6xl text-white sm:text-7xl">{s?.shop_name || 'Tiger Tyres'}</h1>
          <p className="mt-6 text-lg leading-8 text-zinc-300">{s?.about_text1}</p>
          <p className="mt-4 text-lg leading-8 text-zinc-300">{s?.about_text2}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            {s?.phone && <a className="tt-btn tt-btn-primary" href={`tel:${s.phone}`}><Phone size={18} /> Call us</a>}
            <Btn variant="secondary" onClick={onBook}><CalendarDays size={18} /> Book fitting</Btn>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              [MapPin, s?.address],
              [Clock, `${s?.hours_weekday || ''} ${s?.hours_sat || ''}`],
              [Mail, s?.email],
            ].map(([Icon, text], i) => (
              <div key={i} className="rounded-lg border border-white/10 bg-black/25 p-4">
                <Icon className="mb-3 text-tiger-orange" size={22} />
                <p className="text-sm leading-6 text-zinc-400">{text}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="p-6 sm:p-8">
          <div className="tt-eyebrow">Quick enquiry</div>
          <h2 className="tt-display mt-2 text-4xl text-white">Talk tyres</h2>
          <div className="mt-5 grid gap-3">
            <Input placeholder="Name" value={form.name} onChange={(e) => f('name', e.target.value)} />
            <Input placeholder="Phone" value={form.phone} onChange={(e) => f('phone', e.target.value)} />
            <Input placeholder="Email" value={form.email} onChange={(e) => f('email', e.target.value)} />
            <Textarea placeholder="What are you looking for?" value={form.message} onChange={(e) => f('message', e.target.value)} />
            <Btn onClick={submit} disabled={!form.name || !form.phone}><Mail size={18} /> Send message</Btn>
          </div>
          {s?.maps_embed ? (
            <div className="mt-6 overflow-hidden rounded-lg border border-white/10" dangerouslySetInnerHTML={{ __html: s.maps_embed }} />
          ) : (
            <div className="mt-6 grid min-h-40 place-items-center rounded-lg border border-white/10 bg-black/25 text-center text-sm text-zinc-500">
              <MapPin className="mb-2 text-tiger-orange" /> Add a Google Maps embed in Admin Settings
            </div>
          )}
        </Panel>
      </div>
    </main>
  )
}

function Footer({ settings: s, onBook }) {
  return (
    <footer className="border-t border-tiger-orange/30 bg-black py-10">
      <div className="tt-shell grid gap-7 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <div>
          <div className="tt-display text-4xl text-tiger-orange">{s?.shop_name || 'Tiger Tyres'}</div>
          <p className="mt-3 max-w-md text-sm leading-6 text-zinc-500">{s?.footer_tagline}</p>
        </div>
        <div className="text-sm leading-7 text-zinc-400">
          <div className="font-condensed font-black uppercase tracking-[0.14em] text-white">Contact</div>
          <div>{s?.phone}</div>
          <div>{s?.email}</div>
          <div>{s?.address}</div>
        </div>
        <div>
          <div className="font-condensed font-black uppercase tracking-[0.14em] text-white">Fitting</div>
          <p className="mt-2 text-sm leading-6 text-zinc-500">{s?.hours_weekday}<br />{s?.hours_sat}<br />{s?.hours_sun}</p>
          <Btn className="mt-4" onClick={onBook}><CalendarDays size={18} /> Book</Btn>
        </div>
      </div>
    </footer>
  )
}

function ShopPage({ settings, tyres, loading, searchSummary, clearSearch, onVehicleResults, onSizeSearch, onView, onAddCart, onCompare, compareList, showToast, onBook }) {
  return (
    <>
      <Hero settings={settings} onBook={onBook} />
      <SearchPanel onVehicleResults={onVehicleResults} onSizeSearch={onSizeSearch} showToast={showToast} />
      <BrandStrip />
      <main className="bg-garage-black py-10">
        <div className="tt-shell">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="tt-eyebrow">Live stock</div>
              <h2 className="tt-display mt-2 text-5xl text-white sm:text-6xl">Tyres ready now</h2>
              {searchSummary && <p className="mt-2 text-sm text-zinc-400">{searchSummary}</p>}
            </div>
            {searchSummary && <Btn variant="secondary" onClick={clearSearch}>Clear search</Btn>}
          </div>
          {loading ? (
            <Panel className="grid min-h-64 place-items-center p-8 text-zinc-400">Loading stock...</Panel>
          ) : tyres.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {tyres.map((tyre) => (
                <TyreCard
                  key={tyre.id}
                  tyre={tyre}
                  onView={onView}
                  onAddCart={onAddCart}
                  onCompare={onCompare}
                  inCompare={!!compareList.find((item) => item.id === tyre.id)}
                />
              ))}
            </div>
          ) : (
            <Panel className="grid min-h-64 place-items-center p-8 text-center">
              <div>
                <Search className="mx-auto mb-3 text-zinc-700" size={44} />
                <div className="font-condensed text-2xl font-black uppercase text-white">No tyres found</div>
                <p className="mt-2 text-zinc-500">Try a broader search or send an enquiry with the size you need.</p>
              </div>
            </Panel>
          )}
        </div>
      </main>
    </>
  )
}

function AdminLogin({ onLogin, showToast }) {
  const [username, setUsername] = useState('tiger')
  const [password, setPassword] = useState('')
  const submit = async () => {
    try {
      const res = await api.login(username, password)
      localStorage.setItem('tt_token', res.token)
      onLogin(res.username)
    } catch (e) {
      showToast(e.message, false)
    }
  }
  return (
    <main className="tread-bg grid min-h-[calc(100vh-72px)] place-items-center p-4">
      <Panel className="w-full max-w-md p-7">
        <div className="tt-eyebrow">Admin bay</div>
        <h1 className="tt-display mt-2 text-5xl text-white">Sign in</h1>
        <div className="mt-6 grid gap-4">
          <Field label="Username"><Input value={username} onChange={(e) => setUsername(e.target.value)} /></Field>
          <Field label="Password"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} /></Field>
          <Btn onClick={submit}>Login</Btn>
        </div>
      </Panel>
    </main>
  )
}

function StatCard({ label, value, icon: Icon, tone = 'orange' }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <Icon className={tone === 'red' ? 'text-red-300' : tone === 'green' ? 'text-green-300' : 'text-tiger-orange'} size={22} />
      <div className="mt-4 font-condensed text-sm font-black uppercase tracking-[0.14em] text-zinc-500">{label}</div>
      <div className="mt-1 font-condensed text-3xl font-black text-white">{value}</div>
    </div>
  )
}

function DashboardTab({ stats }) {
  const items = [
    ['SKUs', stats.total_skus, Package],
    ['Units', stats.total_units, BarChart3],
    ['New', stats.new_count, Sparkles],
    ['Used', stats.used_count, BadgeCheck],
    ['Low stock', stats.low_stock, Gauge, stats.low_stock ? 'red' : 'green'],
    ['Enquiries', stats.new_enquiries, Mail, stats.new_enquiries ? 'orange' : 'green'],
    ['Bookings', stats.new_bookings, CalendarDays, stats.new_bookings ? 'orange' : 'green'],
    ['Vehicles', stats.vehicle_count, Car],
    ['Stock value', money(stats.stock_value), CircleDollarSign],
  ]
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map(([label, value, Icon, tone]) => <StatCard key={label} label={label} value={value ?? 0} icon={Icon} tone={tone} />)}</div>
}

function TyreForm({ item, onCancel, onSave, showToast }) {
  const [form, setForm] = useState(item ? { ...tyreDefaults, ...item } : tyreDefaults)
  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const submit = () => onSave({ ...form, featured: form.featured ? 1 : 0 })
  return (
    <Panel className="mb-5 p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="font-condensed text-2xl font-black uppercase tracking-[0.12em] text-white">{item?.id ? 'Edit tyre' : 'New tyre'}</h3>
        <IconBtn label="Cancel" onClick={onCancel}><X size={18} /></IconBtn>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Field label="Brand"><Input value={form.brand} onChange={(e) => f('brand', e.target.value)} /></Field>
        <Field label="Model"><Input value={form.model} onChange={(e) => f('model', e.target.value)} /></Field>
        <Field label="Condition"><Select value={form.condition} onChange={(e) => f('condition', e.target.value)}><option>New</option><option>Used</option></Select></Field>
        <Field label="Price"><Input type="number" value={form.price} onChange={(e) => f('price', e.target.value)} /></Field>
        <Field label="Width"><Input type="number" value={form.width} onChange={(e) => f('width', e.target.value)} /></Field>
        <Field label="Profile"><Input type="number" value={form.profile} onChange={(e) => f('profile', e.target.value)} /></Field>
        <Field label="Rim"><Input type="number" value={form.rim} onChange={(e) => f('rim', e.target.value)} /></Field>
        <Field label="Qty"><Input type="number" value={form.qty} onChange={(e) => f('qty', e.target.value)} /></Field>
        <Field label="Speed"><Input value={form.speed} onChange={(e) => f('speed', e.target.value)} /></Field>
        <Field label="Load index"><Input type="number" value={form.load_index} onChange={(e) => f('load_index', e.target.value)} /></Field>
        <label className="mt-7 flex items-center gap-3 text-sm text-zinc-300"><input type="checkbox" checked={!!form.featured} onChange={(e) => f('featured', e.target.checked ? 1 : 0)} /> Featured</label>
        <div className="md:col-span-2"><Field label="Warranty"><Input value={form.warranty} onChange={(e) => f('warranty', e.target.value)} /></Field></div>
        <div className="md:col-span-4"><Field label="Description"><Textarea value={form.description} onChange={(e) => f('description', e.target.value)} /></Field></div>
        <div className="md:col-span-2"><ImageUploader value={form.image_url} onChange={(v) => f('image_url', v)} onUpload={api.uploadImage} /></div>
        <div className="md:col-span-4 flex flex-wrap gap-3"><Btn onClick={submit}><Check size={18} /> Save tyre</Btn><Btn variant="secondary" onClick={onCancel}>Cancel</Btn></div>
      </div>
    </Panel>
  )
}

function StockTab({ showToast, onStats }) {
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [edit, setEdit] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const load = async () => {
    const data = await api.getTyres({ sort: 'brand' })
    setRows(data)
    onStats()
  }
  useEffect(() => { load().catch(() => showToast('Could not load stock', false)) }, [])
  const filtered = rows.filter((t) => `${t.brand} ${t.model} ${sizeOf(t)} ${t.condition}`.toLowerCase().includes(search.toLowerCase()))
  const save = async (payload) => {
    try {
      if (payload.id) await api.updateTyre(payload.id, payload)
      else await api.createTyre(payload)
      setEdit(null)
      showToast('Stock saved')
      await load()
    } catch (e) {
      showToast(e.message, false)
    }
  }
  const remove = async (id) => {
    if (!confirm('Delete this tyre?')) return
    await api.deleteTyre(id)
    showToast('Tyre deleted')
    load()
  }
  const patch = async (id, data) => {
    await api.patchTyre(id, data)
    load()
  }
  const importFile = async (file) => {
    if (!file) return
    try {
      const result = await api.importStock(file)
      setImportResult(result)
      showToast(`Imported ${result.imported} rows`)
      load()
    } catch (e) {
      showToast(e.message, false)
    }
  }
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <Btn onClick={() => setEdit({})}><Plus size={18} /> New tyre</Btn>
        <Btn variant="secondary" onClick={api.exportStock}><Download size={18} /> Export CSV</Btn>
        <label className="tt-btn tt-btn-secondary cursor-pointer"><Upload size={18} /> Import CSV<input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => importFile(e.target.files?.[0])} /></label>
        <Input className="max-w-sm" placeholder="Search stock..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {importResult && <Panel className="mb-4 p-4 text-sm text-zinc-300">Imported {importResult.imported}; skipped {importResult.skipped}. {importResult.errors?.length ? importResult.errors.join(' | ') : 'No import errors.'}</Panel>}
      {edit !== null && <TyreForm item={edit.id ? edit : null} onSave={save} onCancel={() => setEdit(null)} showToast={showToast} />}
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tt-table">
            <thead><tr><th className="tt-th">Tyre</th><th className="tt-th">Size</th><th className="tt-th">Price</th><th className="tt-th">Qty</th><th className="tt-th">Status</th><th className="tt-th">Actions</th></tr></thead>
            <tbody className="divide-y divide-white/10">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-white/[0.03]">
                  <td className="tt-td"><div className="font-condensed text-lg font-black uppercase text-white">{t.brand} {t.model}</div><div className="text-xs text-zinc-500">{t.warranty}</div></td>
                  <td className="tt-td font-mono">{sizeOf(t)}</td>
                  <td className="tt-td text-tiger-orange">{money(t.price)}</td>
                  <td className="tt-td"><Input className="w-20 py-2" type="number" value={t.qty} onChange={(e) => patch(t.id, { qty: Number(e.target.value) })} /></td>
                  <td className="tt-td"><Badge c={t.condition} /></td>
                  <td className="tt-td"><div className="flex gap-2"><IconBtn label="Edit" onClick={() => setEdit(t)}><Edit3 size={16} /></IconBtn><IconBtn label="Delete" variant="danger" onClick={() => remove(t.id)}><Trash2 size={16} /></IconBtn></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}

function EnquiriesTab({ showToast, onStats }) {
  const [rows, setRows] = useState([])
  const load = () => api.getEnquiries().then(setRows)
  useEffect(() => { load().catch(() => showToast('Could not load enquiries', false)) }, [])
  const setStatus = async (id, status) => { await api.patchEnquiry(id, status); load(); onStats() }
  const remove = async (id) => { await api.deleteEnquiry(id); load(); onStats() }
  return <RecordList rows={rows} kind="enquiry" setStatus={setStatus} remove={remove} />
}

function BookingsTab({ showToast, onStats }) {
  const [rows, setRows] = useState([])
  const load = () => api.getBookings().then(setRows)
  useEffect(() => { load().catch(() => showToast('Could not load bookings', false)) }, [])
  const setStatus = async (id, status) => { await api.patchBooking(id, status); load(); onStats() }
  const remove = async (id) => { await api.deleteBooking(id); load(); onStats() }
  return <RecordList rows={rows} kind="booking" setStatus={setStatus} remove={remove} />
}

function RecordList({ rows, kind, setStatus, remove }) {
  const statuses = kind === 'booking' ? ['pending', 'confirmed', 'cancelled', 'completed'] : ['new', 'contacted', 'completed']
  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <Panel key={row.id} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h3 className="font-condensed text-xl font-black uppercase text-white">{row.name}</h3><StatusPill status={row.status} /></div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-400">
                <span><Phone size={14} className="mr-1 inline" />{row.phone}</span>
                {row.email && <span><Mail size={14} className="mr-1 inline" />{row.email}</span>}
                {row.date && <span><CalendarDays size={14} className="mr-1 inline" />{row.date} {row.time}</span>}
                {row.service && <span><Wrench size={14} className="mr-1 inline" />{row.service}</span>}
              </div>
              {row.message && <p className="mt-3 text-sm text-zinc-300">{row.message}</p>}
              {row.items_json && <pre className="mt-3 whitespace-pre-wrap rounded bg-black/30 p-3 text-xs text-zinc-500">{row.items_json}</pre>}
            </div>
            <div className="flex shrink-0 gap-2">
              <Select className="w-36 py-2" value={row.status} onChange={(e) => setStatus(row.id, e.target.value)}>{statuses.map((s) => <option key={s}>{s}</option>)}</Select>
              <IconBtn label="Delete" variant="danger" onClick={() => remove(row.id)}><Trash2 size={16} /></IconBtn>
            </div>
          </div>
        </Panel>
      ))}
      {!rows.length && <Panel className="p-8 text-center text-zinc-500">No records yet.</Panel>}
    </div>
  )
}

function ReviewsTab({ showToast, onStats }) {
  const [rows, setRows] = useState([])
  const load = () => api.getReviews().then(setRows)
  useEffect(() => { load().catch(() => showToast('Could not load reviews', false)) }, [])
  const approve = async (id, approved) => { await api.patchReview(id, approved); load(); onStats() }
  const remove = async (id) => { await api.deleteReview(id); load(); onStats() }
  return (
    <div className="grid gap-3">
      {rows.map((r) => (
        <Panel key={r.id} className="p-4">
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2"><h3 className="font-condensed text-xl font-black uppercase text-white">{r.brand} {r.model}</h3><StatusPill status={r.approved ? 'approved' : 'hidden'} /></div>
              <div className="mt-2 flex items-center gap-2"><Stars rating={r.rating} /><span className="text-sm text-zinc-400">by {r.author}</span></div>
              {r.body && <p className="mt-3 text-zinc-300">{r.body}</p>}
            </div>
            <div className="flex gap-2"><Btn variant="secondary" onClick={() => approve(r.id, !r.approved)}>{r.approved ? 'Hide' : 'Approve'}</Btn><IconBtn label="Delete" variant="danger" onClick={() => remove(r.id)}><Trash2 size={16} /></IconBtn></div>
          </div>
        </Panel>
      ))}
      {!rows.length && <Panel className="p-8 text-center text-zinc-500">No reviews yet.</Panel>}
    </div>
  )
}

function BlockedDatesTab({ showToast }) {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ date: '', reason: '' })
  const load = () => api.getBlockedDates().then(setRows)
  useEffect(() => { load().catch(() => showToast('Could not load closed dates', false)) }, [])
  const save = async () => { try { await api.createBlockedDate(form); setForm({ date: '', reason: '' }); load(); showToast('Date blocked') } catch (e) { showToast(e.message, false) } }
  const remove = async (id) => { await api.deleteBlockedDate(id); load() }
  return (
    <div>
      <Panel className="mb-4 p-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <Field label="Date"><Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></Field>
          <Field label="Reason"><Input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} /></Field>
          <Btn className="self-end" onClick={save} disabled={!form.date}>Block</Btn>
        </div>
      </Panel>
      <div className="grid gap-3">{rows.map((r) => <Panel key={r.id} className="flex items-center justify-between gap-4 p-4"><div><strong>{r.date}</strong><div className="text-sm text-zinc-500">{r.reason}</div></div><IconBtn label="Delete" variant="danger" onClick={() => remove(r.id)}><Trash2 size={16} /></IconBtn></Panel>)}</div>
    </div>
  )
}

function VehiclesTab({ showToast, onStats }) {
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ make: '', model: '', year: new Date().getFullYear(), width: 205, profile: 55, rim: 16, notes: '' })
  const [editId, setEditId] = useState(null)
  const load = () => api.getAdminVehicles().then(setRows)
  useEffect(() => { load().catch(() => showToast('Could not load vehicles', false)) }, [])
  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const reset = () => { setEditId(null); setForm({ make: '', model: '', year: new Date().getFullYear(), width: 205, profile: 55, rim: 16, notes: '' }) }
  const save = async () => {
    try {
      if (editId) await api.updateVehicle(editId, form)
      else await api.createVehicle(form)
      reset(); load(); onStats(); showToast('Vehicle saved')
    } catch (e) { showToast(e.message, false) }
  }
  const remove = async (id) => { await api.deleteVehicle(id); load(); onStats() }
  const filtered = rows.filter((r) => `${r.make} ${r.model} ${r.year}`.toLowerCase().includes(search.toLowerCase())).slice(0, 180)
  return (
    <div>
      <Panel className="mb-4 p-5">
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Make"><Input value={form.make} onChange={(e) => f('make', e.target.value)} /></Field>
          <Field label="Model"><Input value={form.model} onChange={(e) => f('model', e.target.value)} /></Field>
          <Field label="Year"><Input type="number" value={form.year} onChange={(e) => f('year', e.target.value)} /></Field>
          <Field label="Size"><div className="grid grid-cols-3 gap-2"><Input type="number" value={form.width} onChange={(e) => f('width', e.target.value)} /><Input type="number" value={form.profile} onChange={(e) => f('profile', e.target.value)} /><Input type="number" value={form.rim} onChange={(e) => f('rim', e.target.value)} /></div></Field>
          <div className="md:col-span-3"><Field label="Notes"><Input value={form.notes} onChange={(e) => f('notes', e.target.value)} /></Field></div>
          <div className="flex items-end gap-2"><Btn onClick={save}>{editId ? 'Update' : 'Add'}</Btn><Btn variant="secondary" onClick={reset}>Reset</Btn></div>
        </div>
      </Panel>
      <Input className="mb-4 max-w-md" placeholder="Search vehicles..." value={search} onChange={(e) => setSearch(e.target.value)} />
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tt-table"><thead><tr><th className="tt-th">Vehicle</th><th className="tt-th">Year</th><th className="tt-th">OE size</th><th className="tt-th">Notes</th><th className="tt-th">Actions</th></tr></thead><tbody className="divide-y divide-white/10">
            {filtered.map((v) => <tr key={v.id}><td className="tt-td font-condensed text-lg font-black uppercase text-white">{v.make} {v.model}</td><td className="tt-td">{v.year}</td><td className="tt-td font-mono">{v.width}/{v.profile}R{v.rim}</td><td className="tt-td">{v.notes}</td><td className="tt-td"><div className="flex gap-2"><IconBtn label="Edit" onClick={() => { setEditId(v.id); setForm(v) }}><Edit3 size={16} /></IconBtn><IconBtn label="Delete" variant="danger" onClick={() => remove(v.id)}><Trash2 size={16} /></IconBtn></div></td></tr>)}
          </tbody></table>
        </div>
      </Panel>
    </div>
  )
}

function SettingsTab({ showToast, onSaved }) {
  const [form, setForm] = useState({})
  useEffect(() => { api.getSettings().then(setForm).catch(() => showToast('Could not load settings', false)) }, [])
  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const save = async () => { try { await api.saveSettings(form); showToast('Settings saved'); onSaved?.(form) } catch (e) { showToast(e.message, false) } }
  const fields = [
    ['Shop', [['shop_name', 'Shop name'], ['phone', 'Phone'], ['email', 'Email'], ['address', 'Address'], ['whatsapp', 'WhatsApp']]],
    ['Hero', [['hero_eyebrow', 'Eyebrow'], ['hero_heading', 'Heading'], ['hero_heading_highlight', 'Highlight'], ['hero_subtext', 'Subtext'], ['hero_badge_text', 'Price badge']]],
    ['Hours', [['hours_weekday', 'Weekday'], ['hours_sat', 'Saturday'], ['hours_sun', 'Sunday']]],
    ['Bookings', [['booking_open_days', 'Open days'], ['booking_open_time', 'Open time'], ['booking_close_time', 'Close time'], ['booking_slot_minutes', 'Slot minutes'], ['booking_buffer_minutes', 'Buffer minutes']]],
    ['SMTP', [['smtp_host', 'Host'], ['smtp_port', 'Port'], ['smtp_user', 'User'], ['smtp_pass', 'Password'], ['notify_email', 'Notify email']]],
  ]
  return (
    <div className="grid gap-4">
      {fields.map(([section, entries]) => (
        <Panel key={section} className="p-5">
          <h3 className="mb-4 font-condensed text-2xl font-black uppercase tracking-[0.12em] text-white">{section}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {entries.map(([key, label]) => <Field key={key} label={label}><Input type={key.includes('pass') ? 'password' : 'text'} value={form[key] || ''} onChange={(e) => f(key, e.target.value)} /></Field>)}
          </div>
        </Panel>
      ))}
      <Panel className="p-5">
        <h3 className="mb-4 font-condensed text-2xl font-black uppercase tracking-[0.12em] text-white">Content</h3>
        <div className="grid gap-4">
          <Field label="Footer tagline"><Input value={form.footer_tagline || ''} onChange={(e) => f('footer_tagline', e.target.value)} /></Field>
          <Field label="About text 1"><Textarea value={form.about_text1 || ''} onChange={(e) => f('about_text1', e.target.value)} /></Field>
          <Field label="About text 2"><Textarea value={form.about_text2 || ''} onChange={(e) => f('about_text2', e.target.value)} /></Field>
          <Field label="Maps embed"><Textarea value={form.maps_embed || ''} onChange={(e) => f('maps_embed', e.target.value)} /></Field>
        </div>
      </Panel>
      <Btn onClick={save} className="w-fit"><Check size={18} /> Save settings</Btn>
    </div>
  )
}

function AdminPanel({ showToast, onSettingsSaved }) {
  const [authed, setAuthed] = useState(!!localStorage.getItem('tt_token'))
  const [adminUser, setAdminUser] = useState('admin')
  const [tab, setTab] = useState('dashboard')
  const [stats, setStats] = useState({})
  const refreshStats = () => api.getStats().then(setStats).catch(() => {})
  useEffect(() => { if (authed) refreshStats() }, [authed])
  if (!authed) return <AdminLogin onLogin={(u) => { setAdminUser(u); setAuthed(true) }} showToast={showToast} />
  const ActiveIcon = adminTabs.find(([id]) => id === tab)?.[2] || LayoutDashboard
  return (
    <main className="min-h-screen bg-garage-black py-8">
      <div className="tt-shell">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="tt-eyebrow">Tiger Tyres command centre</div>
            <h1 className="tt-display mt-2 flex items-center gap-3 text-5xl text-white sm:text-6xl"><ActiveIcon className="text-tiger-orange" size={38} /> {adminTabs.find(([id]) => id === tab)?.[1]}</h1>
            <p className="mt-2 text-sm text-zinc-500">Signed in as {adminUser}</p>
          </div>
          <Btn variant="secondary" onClick={() => { localStorage.removeItem('tt_token'); setAuthed(false) }}>Sign out</Btn>
        </div>
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {adminTabs.map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)} className={cx('inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border px-4 font-condensed text-sm font-black uppercase tracking-[0.12em]', tab === id ? 'border-tiger-orange bg-tiger-orange text-black' : 'border-white/10 bg-white/[0.04] text-zinc-400 hover:text-white')}>
              <Icon size={17} /> {label}
            </button>
          ))}
        </div>
        {tab === 'dashboard' && <DashboardTab stats={stats} />}
        {tab === 'stock' && <StockTab showToast={showToast} onStats={refreshStats} />}
        {tab === 'bookings' && <BookingsTab showToast={showToast} onStats={refreshStats} />}
        {tab === 'enquiries' && <EnquiriesTab showToast={showToast} onStats={refreshStats} />}
        {tab === 'reviews' && <ReviewsTab showToast={showToast} onStats={refreshStats} />}
        {tab === 'vehicles' && <VehiclesTab showToast={showToast} onStats={refreshStats} />}
        {tab === 'blocked' && <BlockedDatesTab showToast={showToast} />}
        {tab === 'settings' && <SettingsTab showToast={showToast} onSaved={onSettingsSaved} />}
      </div>
    </main>
  )
}

export default function App() {
  const [settings, setSettings] = useState({})
  const [allTyres, setAllTyres] = useState([])
  const [displayTyres, setDisplayTyres] = useState([])
  const [page, setPage] = useState('shop')
  const [detail, setDetail] = useState(null)
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [compareList, setCompareList] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [searchSummary, setSearchSummary] = useState('')

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3200)
  }

  const loadStock = async () => {
    setLoading(true)
    try {
      const data = await api.getTyres({ sort: 'price_asc' })
      setAllTyres(data)
      setDisplayTyres(data)
    } catch {
      showToast('Could not load tyres', false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => {})
    loadStock()
  }, [])

  const handleSizeSearch = async (params) => {
    setLoading(true)
    try {
      const data = await api.getTyres(params)
      setDisplayTyres(data)
      setSearchSummary(`Showing ${data.length} tyre${data.length === 1 ? '' : 's'} for ${params.width || '?'}/${params.profile || '?'}R${params.rim || '?'}${params.condition ? ` · ${params.condition}` : ''}`)
      document.getElementById('tyre-search')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (e) {
      showToast(e.message, false)
    } finally {
      setLoading(false)
    }
  }

  const handleVehicleResults = (data, sel) => {
    setDisplayTyres(data.tyres || [])
    setSearchSummary(`${sel.make} ${sel.model} ${sel.year}: ${data.tyres?.length || 0} compatible tyre${data.tyres?.length === 1 ? '' : 's'}`)
    document.getElementById('tyre-search')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const clearSearch = () => {
    setDisplayTyres(allTyres)
    setSearchSummary('')
  }

  const addToCart = (tyre) => {
    setCart((items) => {
      const existing = items.find((item) => item.id === tyre.id)
      return existing ? items.map((item) => item.id === tyre.id ? { ...item, qty: item.qty + 1 } : item) : [...items, { ...tyre, qty: 1 }]
    })
    showToast(`${tyre.brand} ${tyre.model} added`)
  }

  const toggleCompare = (tyre) => {
    setCompareList((items) => {
      if (items.find((item) => item.id === tyre.id)) return items.filter((item) => item.id !== tyre.id)
      return [...items.slice(-2), tyre]
    })
  }

  const viewTyre = (tyre) => {
    setDetail(tyre)
    setPage('detail')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className={cx('min-h-screen bg-garage-black text-zinc-100', compareList.length >= 2 && 'pb-36')}>
      <Header page={page} setPage={(p) => { setPage(p); setDetail(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }} cartCount={cart.reduce((n, item) => n + item.qty, 0)} onCartOpen={() => setCartOpen(true)} settings={settings} />
      {page === 'shop' && <ShopPage settings={settings} tyres={displayTyres} loading={loading} searchSummary={searchSummary} clearSearch={clearSearch} onVehicleResults={handleVehicleResults} onSizeSearch={handleSizeSearch} onView={viewTyre} onAddCart={addToCart} onCompare={toggleCompare} compareList={compareList} showToast={showToast} onBook={() => setBookingOpen(true)} />}
      {page === 'detail' && detail && <DetailView tyre={detail} onBack={() => setPage('shop')} onAddCart={addToCart} showToast={showToast} />}
      {page === 'about' && <AboutPage settings={settings} onBook={() => setBookingOpen(true)} showToast={showToast} />}
      {page === 'admin' && <AdminPanel showToast={showToast} onSettingsSaved={(s) => setSettings((prev) => ({ ...prev, ...s }))} />}
      {page !== 'admin' && <Footer settings={settings} onBook={() => setBookingOpen(true)} />}
      {bookingOpen && <BookingModal onClose={() => setBookingOpen(false)} showToast={showToast} />}
      {cartOpen && <CartDrawer cart={cart} setCart={setCart} onClose={() => setCartOpen(false)} showToast={showToast} />}
      <ComparePanel tyres={compareList} onRemove={(id) => setCompareList((items) => items.filter((item) => item.id !== id))} onClose={() => setCompareList([])} />
      <Toast toast={toast} />
    </div>
  )
}
