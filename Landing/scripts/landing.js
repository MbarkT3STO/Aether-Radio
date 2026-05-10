/* Aether Radio — Landing JS */
(() => {
  'use strict'
  const html = document.documentElement
  const body = document.body
  const THEME_KEY = 'aether-landing-theme'

  // ── Theme ──
  const initTheme = () => {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') { html.setAttribute('data-theme', stored); return }
    html.setAttribute('data-theme', window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  }
  initTheme()

  const onReady = fn => document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn)

  onReady(() => {
    // Theme toggle
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
      html.setAttribute('data-theme', next)
      localStorage.setItem(THEME_KEY, next)
    })

    // Mobile nav
    const nav = document.getElementById('nav')
    const burger = document.getElementById('nav-burger')
    const mobile = document.getElementById('nav-mobile')
    const closeMobile = () => { mobile?.setAttribute('hidden', ''); nav?.removeAttribute('data-open'); burger?.setAttribute('aria-expanded', 'false'); body.style.overflow = '' }
    const openMobile = () => { mobile?.removeAttribute('hidden'); nav?.setAttribute('data-open', ''); burger?.setAttribute('aria-expanded', 'true'); body.style.overflow = 'hidden' }
    burger?.addEventListener('click', () => mobile?.hasAttribute('hidden') ? openMobile() : closeMobile())
    mobile?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMobile))
    window.addEventListener('resize', () => { if (window.innerWidth >= 768) closeMobile() })

    // Scroll reveal
    const els = document.querySelectorAll('.feature, .platform, .value, .faq-item, .changelog-entry, .section-title, .gallery-group, .donate-wrap, .cta')
    els.forEach(el => el.classList.add('reveal'))
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target) } })
      }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' })
      els.forEach(el => io.observe(el))
    } else { els.forEach(el => el.classList.add('is-visible')) }

    // Animated counters
    const counters = document.querySelectorAll('[data-count]')
    const animateCount = el => {
      const target = parseInt(el.dataset.count, 10), suffix = el.dataset.suffix || ''
      const duration = 1200, ease = t => 1 - Math.pow(1 - t, 3)
      el.textContent = '0' + suffix
      const start = performance.now()
      const step = now => {
        const t = Math.min(1, (now - start) / duration)
        el.textContent = Math.floor(target * ease(t)).toLocaleString() + suffix
        if (t < 1) requestAnimationFrame(step)
        else el.textContent = target.toLocaleString() + suffix
      }
      requestAnimationFrame(step)
    }
    if ('IntersectionObserver' in window) {
      const io2 = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { animateCount(e.target); io2.unobserve(e.target) } })
      }, { threshold: 0.5 })
      counters.forEach(el => io2.observe(el))
    } else { counters.forEach(animateCount) }

    // Gallery scroll + arrows
    document.querySelectorAll('.gallery-group').forEach(group => {
      const track = group.querySelector('.gallery-track')
      const arrows = group.querySelectorAll('.gallery-arrow')
      if (!track) return
      arrows.forEach(btn => btn.addEventListener('click', () => {
        const dir = parseInt(btn.dataset.dir, 10)
        const item = track.querySelector('.gallery-item')
        const w = item ? item.offsetWidth + parseInt(getComputedStyle(track).gap) : 300
        track.scrollBy({ left: dir * w, behavior: 'smooth' })
      }))
      // Drag scroll (desktop)
      let dragging = false, didDrag = false, startX = 0, scrollL = 0
      track.addEventListener('pointerdown', e => {
        if (e.pointerType === 'touch') return
        dragging = true; didDrag = false; startX = e.clientX; scrollL = track.scrollLeft
      })
      track.addEventListener('pointermove', e => {
        if (!dragging) return
        if (!didDrag && Math.abs(e.clientX - startX) > 5) { didDrag = true; track.setPointerCapture(e.pointerId); track.style.cursor = 'grabbing' }
        if (didDrag) { e.preventDefault(); track.scrollLeft = scrollL - (e.clientX - startX) }
      })
      const stopDrag = () => { dragging = false; track.style.cursor = '' }
      track.addEventListener('pointerup', stopDrag)
      track.addEventListener('pointercancel', stopDrag)
      track.addEventListener('click', e => { if (didDrag) { e.stopPropagation(); e.preventDefault(); didDrag = false } }, true)
    })

    // Lightbox
    const lightbox = document.getElementById('lightbox')
    const lbImg = document.getElementById('lightbox-img')
    const lbCounter = document.getElementById('lightbox-counter')
    const allImgs = [...document.querySelectorAll('.gallery-item img')]
    let lbIdx = 0

    const lbOpen = i => { lbIdx = i; lbUpdate(); lightbox.removeAttribute('hidden'); requestAnimationFrame(() => lightbox.classList.add('is-open')); body.style.overflow = 'hidden' }
    const lbClose = () => { lightbox.classList.remove('is-open'); setTimeout(() => { lightbox.setAttribute('hidden', ''); body.style.overflow = '' }, 200) }
    const lbUpdate = () => { const img = allImgs[lbIdx]; if (!img) return; lbImg.src = img.src; lbImg.alt = img.alt; lbImg.style.transform = ''; lbCounter.textContent = `${lbIdx + 1} / ${allImgs.length}` }
    const lbPrev = () => { lbIdx = (lbIdx - 1 + allImgs.length) % allImgs.length; lbUpdate() }
    const lbNext = () => { lbIdx = (lbIdx + 1) % allImgs.length; lbUpdate() }

    allImgs.forEach((img, i) => img.closest('.gallery-item')?.addEventListener('click', () => lbOpen(i)))
    document.getElementById('lightbox-close')?.addEventListener('click', lbClose)
    document.getElementById('lightbox-prev')?.addEventListener('click', lbPrev)
    document.getElementById('lightbox-next')?.addEventListener('click', lbNext)
    lightbox?.addEventListener('click', e => { if (e.target === lightbox || e.target.id === 'lightbox-body') lbClose() })
    document.addEventListener('keydown', e => { if (lightbox?.hasAttribute('hidden')) return; if (e.key === 'Escape') lbClose(); if (e.key === 'ArrowLeft') lbPrev(); if (e.key === 'ArrowRight') lbNext() })

    // Lightbox swipe
    const lbBody = document.getElementById('lightbox-body')
    if (lbBody) {
      let sx = 0, swiping = false, delta = 0
      const swStart = x => { sx = x; swiping = true; delta = 0; lbImg.classList.add('is-swiping') }
      const swMove = x => { if (!swiping) return; delta = x - sx; lbImg.style.transform = `translateX(${delta}px)` }
      const swEnd = () => { if (!swiping) return; swiping = false; lbImg.classList.remove('is-swiping'); if (Math.abs(delta) > 50) { delta < 0 ? lbNext() : lbPrev() } else { lbImg.style.transform = '' } }
      lbBody.addEventListener('touchstart', e => swStart(e.touches[0].clientX), { passive: true })
      lbBody.addEventListener('touchmove', e => { swMove(e.touches[0].clientX); if (Math.abs(delta) > 10) e.preventDefault() }, { passive: false })
      lbBody.addEventListener('touchend', swEnd)
      lbBody.addEventListener('mousedown', e => { e.preventDefault(); swStart(e.clientX) })
      document.addEventListener('mousemove', e => { if (swiping) swMove(e.clientX) })
      document.addEventListener('mouseup', swEnd)
    }

    // Platform dropdowns
    document.querySelectorAll('[data-dropdown]').forEach(dd => {
      const trigger = dd.querySelector('.platform-trigger')
      const menu = dd.querySelector('.platform-menu')
      if (!trigger || !menu) return
      trigger.addEventListener('click', e => {
        e.stopPropagation()
        const open = trigger.getAttribute('aria-expanded') === 'true'
        // Close all others
        document.querySelectorAll('[data-dropdown] .platform-trigger[aria-expanded="true"]').forEach(t => {
          t.setAttribute('aria-expanded', 'false')
          t.closest('[data-dropdown]').querySelector('.platform-menu')?.setAttribute('hidden', '')
        })
        if (!open) { trigger.setAttribute('aria-expanded', 'true'); menu.removeAttribute('hidden') }
      })
    })
    document.addEventListener('click', () => {
      document.querySelectorAll('[data-dropdown] .platform-trigger[aria-expanded="true"]').forEach(t => {
        t.setAttribute('aria-expanded', 'false')
        t.closest('[data-dropdown]').querySelector('.platform-menu')?.setAttribute('hidden', '')
      })
    })

    // Footer year
    const y = document.getElementById('footer-year')
    if (y) y.textContent = new Date().getFullYear()
  })
})()
