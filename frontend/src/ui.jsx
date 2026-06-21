import React from 'react'
import { Image, Loader2, UploadCloud, X } from 'lucide-react'

export const O = '#ff6b00'
export const BB = { fontFamily: "'Bebas Neue', Impact, sans-serif" }

export const cx = (...parts) => parts.filter(Boolean).join(' ')

export function Btn({ children, variant = 'primary', className = '', disabled = false, ...props }) {
  const variants = {
    primary: 'tt-btn-primary',
    secondary: 'tt-btn-secondary',
    ghost: 'tt-btn-ghost',
    danger: 'tt-btn-danger',
  }
  return (
    <button disabled={disabled} className={cx('tt-btn', variants[variant] || variants.primary, className)} {...props}>
      {children}
    </button>
  )
}

export function IconBtn({ children, label, variant = 'ghost', className = '', ...props }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex h-10 w-10 items-center justify-center rounded-md border transition',
        variant === 'danger'
          ? 'border-red-500/30 bg-red-950/40 text-red-200 hover:border-red-400 hover:text-white'
          : 'border-white/10 bg-white/[0.04] text-zinc-400 hover:border-tiger-orange/60 hover:text-tiger-orange',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Field({ label, children, className = '' }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="tt-label">{label}</span>}
      {children}
    </label>
  )
}

export function Input(props) {
  return <input className={cx('tt-field', props.className)} {...props} />
}

export function Select({ children, ...props }) {
  return (
    <select className={cx('tt-field', props.className)} {...props}>
      {children}
    </select>
  )
}

export function Textarea(props) {
  return <textarea className={cx('tt-field min-h-28 resize-y', props.className)} {...props} />
}

export const inp = {
  background: '#101114',
  border: '1px solid rgba(255,255,255,.1)',
  color: '#f4f4f5',
  padding: '12px 14px',
  borderRadius: 6,
  width: '100%',
}
export const lbl = {}

export function Badge({ children, tone = 'neutral', c }) {
  const label = children || c
  const tones = {
    orange: 'border-tiger-orange/40 bg-tiger-orange/15 text-tiger-orange',
    green: 'border-success/35 bg-success/10 text-green-300',
    red: 'border-red-500/35 bg-red-950/40 text-red-200',
    yellow: 'border-warning/40 bg-warning/10 text-amber-200',
    neutral: 'border-white/10 bg-white/[0.06] text-zinc-300',
  }
  const inferred = label === 'New' ? 'orange' : label === 'Used' ? 'neutral' : tone
  return <span className={cx('tt-badge', tones[inferred] || tones.neutral)}>{label}</span>
}

export function Panel({ children, className = '' }) {
  return <div className={cx('tt-panel', className)}>{children}</div>
}

export function Modal({ children, onClose, className = '' }) {
  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
      <button aria-label="Close modal" className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className={cx('tt-panel relative max-h-[90vh] w-full max-w-2xl overflow-y-auto p-5 sm:p-7', className)}>
        <IconBtn label="Close" onClick={onClose} className="absolute right-4 top-4">
          <X size={18} />
        </IconBtn>
        {children}
      </div>
    </div>
  )
}

export function Toast({ toast }) {
  if (!toast) return null
  return (
    <div
      className={cx(
        'fixed bottom-5 left-1/2 z-[1500] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-md border px-5 py-3 text-center font-condensed text-sm font-black uppercase tracking-[0.12em] shadow-panel',
        toast.ok ? 'border-tiger-orange bg-tiger-orange text-black' : 'border-red-400 bg-red-950 text-red-50'
      )}
    >
      {toast.msg}
    </div>
  )
}

export function TyreSVG({ size = 120 }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full border-[10px] border-zinc-900 bg-black shadow-inner" />
      <div className="absolute inset-[20%] rounded-full border-[6px] border-tiger-orange/80 bg-zinc-950" />
      <div className="absolute inset-[39%] rounded-full border border-white/10 bg-zinc-900" />
      {[0, 45, 90, 135].map((deg) => (
        <div
          key={deg}
          className="absolute h-1 w-[42%] rounded-full bg-white/10"
          style={{ transform: `rotate(${deg}deg)` }}
        />
      ))}
    </div>
  )
}

export function TyreImage({ src, height = 190, className = '' }) {
  return (
    <div className={cx('relative flex items-center justify-center overflow-hidden bg-black/55', className)} style={{ minHeight: height }}>
      {src ? (
        <img src={src} alt="tyre" className="h-full min-h-[inherit] w-full object-cover" />
      ) : (
        <>
          <img src="/design/tyre-display.webp" alt="" className="absolute inset-0 h-full w-full object-cover opacity-75" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
        </>
      )}
    </div>
  )
}

export function TreadBar() {
  return <div className="h-1.5 w-full bg-[linear-gradient(90deg,#ff6b00_0_50%,#24262b_50%_100%)] bg-[length:24px_6px] opacity-30" />
}

export function StockStepper({ qty, onChange }) {
  const color = qty === 0 ? 'text-red-300' : qty <= 2 ? 'text-amber-200' : 'text-green-300'
  return (
    <div className="inline-flex items-center gap-2">
      <button className="h-8 w-8 rounded border border-white/10 bg-black/30 text-lg text-zinc-300" onClick={() => onChange(Math.max(0, qty - 1))}>-</button>
      <span className={cx('min-w-8 text-center font-black', color)}>{qty}</span>
      <button className="h-8 w-8 rounded border border-white/10 bg-black/30 text-lg text-zinc-300" onClick={() => onChange(qty + 1)}>+</button>
    </div>
  )
}

export function InlineEdit({ value, type = 'text', onSave, prefix = '' }) {
  const [editing, setEditing] = React.useState(false)
  const [val, setVal] = React.useState(value)
  React.useEffect(() => setVal(value), [value])
  const commit = () => {
    setEditing(false)
    const parsed = type === 'number' ? Number(val) : val
    if (parsed !== value) onSave(parsed)
  }
  if (editing) {
    return (
      <input
        autoFocus
        type={type}
        value={val ?? ''}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') {
            setEditing(false)
            setVal(value)
          }
        }}
        className="tt-field max-w-32 py-1"
      />
    )
  }
  return (
    <button className="border-b border-dashed border-white/20 text-left hover:text-tiger-orange" onClick={() => setEditing(true)}>
      {prefix}{value}
    </button>
  )
}

export function ImageUploader({ value, onChange, onUpload, height = 180 }) {
  const [drag, setDrag] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const ref = React.useRef(null)
  const handle = async (file) => {
    if (!file || !file.type.startsWith('image/')) return
    if (onUpload) {
      setUploading(true)
      try {
        const { url } = await onUpload(file)
        onChange(url)
      } finally {
        setUploading(false)
      }
    } else {
      const reader = new FileReader()
      reader.onload = (e) => onChange(e.target.result)
      reader.readAsDataURL(file)
    }
  }
  return (
    <div>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          handle(e.dataTransfer.files[0])
        }}
        className={cx(
          'relative flex w-full flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition',
          drag ? 'border-tiger-orange bg-tiger-orange/10' : 'border-white/15 bg-black/30'
        )}
        style={{ minHeight: height }}
      >
        {uploading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70">
            <Loader2 className="animate-spin text-tiger-orange" />
          </div>
        )}
        {value ? (
          <img src={value} alt="preview" className="h-full w-full object-cover" style={{ minHeight: height }} />
        ) : (
          <div className="p-6 text-center">
            <UploadCloud className="mx-auto mb-3 text-tiger-orange" />
            <div className="font-condensed font-black uppercase tracking-[0.12em] text-zinc-300">Upload image</div>
            <div className="mt-1 text-xs text-zinc-500">JPG, PNG, WEBP up to 8MB</div>
          </div>
        )}
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
      {value && (
        <button type="button" onClick={() => onChange('')} className="mt-2 inline-flex items-center gap-1 text-xs text-red-300 hover:text-red-200">
          <Image size={14} /> Remove image
        </button>
      )}
    </div>
  )
}
