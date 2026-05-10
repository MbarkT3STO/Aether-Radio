/* ═══════════════════════════════════════════════════════════════════
   AETHER RADIO — LANDING INTERACTIONS
   Theme toggle · accent picker · nav scroll · mobile menu · scroll
   reveal · animated counters. Zero dependencies.
   ═══════════════════════════════════════════════════════════════════ */
(() => {
  'use strict'

  const html = document.documentElement
  const body = document.body

  // ────────────────────────── STORAGE KEYS
  const THEME_KEY  = 'aether-landing-theme'
  const ACCENT_KEY = 'aether-landing-accent'

  const VALID_ACCENTS = [
    'blue', 'indigo', 'royal-purple', 'purple',
    'pink', 'red', 'orange', 'green',
    'mint', 'teal', 'cyan', 'graphite'
  ]

  // ────────────────────────── INITIAL STATE
  const initTheme = () => {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') {
      html.setAttribute('data-theme', stored)
      return
    }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    html.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  }

  const initAccent = () => {
    const stored = localStorage.getItem(ACCENT_KEY)
    const accent = VALID_ACCENTS.includes(stored) ? stored : 'blue'
    html.setAttribute('data-accent', accent)
  }

  initTheme()
  initAccent()

  // ────────────────────────── DOM READY
  const onReady = fn => {
    if (document.readyState !== 'loading') fn()
    else document.addEventListener('DOMContentLoaded', fn)
  }

  onReady(() => {
    // ══════════════ THEME TOGGLE
    const themeBtn = document.getElementById('theme-toggle')
    themeBtn?.addEventListener('click', () => {
      const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
      html.setAttribute('data-theme', next)
      localStorage.setItem(THEME_KEY, next)
    })

    // Respond to OS-level theme changes only if user hasn't made a choice
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem(THEME_KEY)) {
        html.setAttribute('data-theme', e.matches ? 'dark' : 'light')
      }
    })

    // ══════════════ ACCENT PICKER
    const accentBtn  = document.querySelector('[data-accent-picker]')
    const accentMenu = document.querySelector('.nav-accent-menu')

    const markCurrent = () => {
      const current = html.getAttribute('data-accent')
      accentMenu?.querySelectorAll('button[data-accent]').forEach(b => {
        b.classList.toggle('is-current', b.dataset.accent === current)
      })
    }
    markCurrent()

    const closeAccent = () => {
      accentMenu?.setAttribute('hidden', '')
      accentBtn?.setAttribute('aria-expanded', 'false')
    }
    const openAccent = () => {
      accentMenu?.removeAttribute('hidden')
      accentBtn?.setAttribute('aria-expanded', 'true')
    }

    accentBtn?.addEventListener('click', e => {
      e.stopPropagation()
      const isOpen = !accentMenu?.hasAttribute('hidden')
      isOpen ? closeAccent() : openAccent()
    })

    accentMenu?.addEventListener('click', e => {
      const btn = e.target.closest('button[data-accent]')
      if (!btn) return
      const next = btn.dataset.accent
      if (!VALID_ACCENTS.includes(next)) return
      html.setAttribute('data-accent', next)
      localStorage.setItem(ACCENT_KEY, next)
      markCurrent()
      closeAccent()
    })

    document.addEventListener('click', e => {
      if (!accentMenu || accentMenu.hasAttribute('hidden')) return
      if (!e.target.closest('.nav-accent')) closeAccent()
    })

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeAccent()
    })

    // ══════════════ NAV: sticky shadow + mobile menu (rAF-throttled scroll)
    const nav = document.getElementById('nav')
    let scrollTicking = false
    const onScroll = () => {
      if (scrollTicking) return
      scrollTicking = true
      requestAnimationFrame(() => {
        nav?.classList.toggle('is-scrolled', window.scrollY > 8)
        scrollTicking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    const burger  = document.getElementById('nav-burger')
    const mobile  = document.getElementById('nav-mobile')

    const closeMobile = () => {
      mobile?.setAttribute('hidden', '')
      nav?.removeAttribute('data-mobile-open')
      burger?.setAttribute('aria-expanded', 'false')
      body.style.overflow = ''
    }
    const openMobile = () => {
      mobile?.removeAttribute('hidden')
      nav?.setAttribute('data-mobile-open', 'true')
      burger?.setAttribute('aria-expanded', 'true')
      body.style.overflow = 'hidden'
    }

    burger?.addEventListener('click', () => {
      const isOpen = !mobile?.hasAttribute('hidden')
      isOpen ? closeMobile() : openMobile()
    })

    mobile?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMobile))
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 900) closeMobile()
    })

    // ══════════════ SCROLL REVEAL
    const toReveal = document.querySelectorAll(
      '.feature-card, .platform-card, .design-card, .value, .faq-item, .stat, .cta-banner, .section-head, .donate-card, .screenshots-track, .whatsnew-item'
    )
    toReveal.forEach(el => el.classList.add('reveal'))

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            io.unobserve(entry.target)
          }
        })
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
      toReveal.forEach(el => io.observe(el))
    } else {
      toReveal.forEach(el => el.classList.add('is-visible'))
    }

    // ══════════════ ANIMATED COUNTERS
    const counters = document.querySelectorAll('[data-count]')
    const animateCount = el => {
      const target = parseInt(el.dataset.count, 10)
      const suffix = el.dataset.suffix || ''
      const duration = 1400
      const format = n => n.toLocaleString('en-US')
      const ease = t => 1 - Math.pow(1 - t, 3)

      el.textContent = '0' + suffix
      const start = performance.now()
      const step = now => {
        const t = Math.min(1, (now - start) / duration)
        const v = Math.floor(target * ease(t))
        el.textContent = format(v) + suffix
        if (t < 1) requestAnimationFrame(step)
        else el.textContent = format(target) + suffix
      }
      requestAnimationFrame(step)
    }

    if ('IntersectionObserver' in window) {
      const io2 = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateCount(entry.target)
            io2.unobserve(entry.target)
          }
        })
      }, { threshold: 0.6 })
      counters.forEach(el => io2.observe(el))
    } else {
      counters.forEach(animateCount)
    }

    // ══════════════ DOWNLOAD DROPDOWNS (macOS / Linux)
    const dlDropdowns = document.querySelectorAll('[data-dropdown]')

    const closeDl = (dd) => {
      const trigger = dd.querySelector('.dl-dropdown-trigger')
      const menu    = dd.querySelector('.dl-dropdown-menu')
      menu?.setAttribute('hidden', '')
      trigger?.setAttribute('aria-expanded', 'false')
      dd.removeAttribute('data-direction')
    }
    const openDl = (dd) => {
      // close all others first
      dlDropdowns.forEach(other => { if (other !== dd) closeDl(other) })
      const trigger = dd.querySelector('.dl-dropdown-trigger')
      const menu    = dd.querySelector('.dl-dropdown-menu')

      // On mobile the menu is inline — no direction logic needed
      if (window.innerWidth >= 560) {
        const triggerRect = trigger.getBoundingClientRect()
        const menuHeight  = 120
        const spaceBelow  = window.innerHeight - triggerRect.bottom
        const spaceAbove  = triggerRect.top
        if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
          dd.setAttribute('data-direction', 'up')
        } else {
          dd.removeAttribute('data-direction')
        }
      } else {
        dd.removeAttribute('data-direction')
      }

      menu?.removeAttribute('hidden')
      trigger?.setAttribute('aria-expanded', 'true')
      menu?.querySelector('.dl-option')?.focus()
    }

    dlDropdowns.forEach(dd => {
      const trigger = dd.querySelector('.dl-dropdown-trigger')
      trigger?.addEventListener('click', (e) => {
        e.stopPropagation()
        const isOpen = trigger.getAttribute('aria-expanded') === 'true'
        isOpen ? closeDl(dd) : openDl(dd)
      })

      // keyboard: Escape closes, arrow keys navigate options
      dd.addEventListener('keydown', (e) => {
        const menu = dd.querySelector('.dl-dropdown-menu')
        if (!menu || menu.hasAttribute('hidden')) return
        const options = [...menu.querySelectorAll('.dl-option')]
        const idx = options.indexOf(document.activeElement)
        if (e.key === 'Escape') { closeDl(dd); trigger?.focus() }
        if (e.key === 'ArrowDown') { e.preventDefault(); options[Math.min(idx + 1, options.length - 1)]?.focus() }
        if (e.key === 'ArrowUp')   { e.preventDefault(); idx <= 0 ? trigger?.focus() : options[idx - 1]?.focus() }
      })
    })

    // click outside closes all
    document.addEventListener('click', () => dlDropdowns.forEach(closeDl))
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', e => {
        const id = link.getAttribute('href').slice(1)
        if (!id) return
        const target = document.getElementById(id) || document.querySelector(`[id="${CSS.escape(id)}"]`)
        if (!target) return
        e.preventDefault()
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        history.replaceState(null, '', `#${id}`)
      })
    })

    // ══════════════ HERO PARALLAX (subtle, desktop only, rAF-throttled)
    const device = document.querySelector('.device-phone')
    if (device && window.matchMedia('(hover: hover) and (min-width: 960px)').matches
              && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const hero = document.querySelector('.hero')
      let pendingX = 0, pendingY = 0, ticking = false
      const applyTransform = () => {
        device.style.transform = `rotate(${-4 + pendingX * 2}deg) translate3d(${pendingX * 8}px, ${pendingY * 8}px, 0)`
        ticking = false
      }
      hero?.addEventListener('mousemove', (e) => {
        const rect = hero.getBoundingClientRect()
        pendingX = (e.clientX - rect.left) / rect.width - 0.5
        pendingY = (e.clientY - rect.top) / rect.height - 0.5
        if (!ticking) { requestAnimationFrame(applyTransform); ticking = true }
      }, { passive: true })
      hero?.addEventListener('mouseleave', () => {
        device.style.transform = ''
      })
    }

    // ══════════════ DYNAMIC FOOTER YEAR
    const yearEl = document.getElementById('footer-year')
    if (yearEl) yearEl.textContent = new Date().getFullYear()

    // ══════════════ SCREENSHOTS CAROUSEL
    const screenshotGroups = document.querySelectorAll('.screenshots-group')

    screenshotGroups.forEach(group => {
      const track = group.querySelector('.screenshots-track')
      const scroll = track?.querySelector('.screenshots-scroll')
      const arrows = group.querySelectorAll('.screenshots-arrow')

      if (!track || !scroll) return

      // Arrow buttons scroll the track
      arrows.forEach(btn => {
        btn.addEventListener('click', () => {
          const dir = parseInt(btn.dataset.dir, 10)
          const items = track.querySelectorAll('.screenshot-item')
          if (!items.length) return
          const itemWidth = items[0].offsetWidth
          const gap = parseInt(getComputedStyle(scroll).gap) || 16
          track.scrollBy({ left: dir * (itemWidth + gap), behavior: 'smooth' })
        })
      })

      // Drag to scroll (pointer devices) — only activate after movement threshold
      let isDragging = false, didDrag = false, startX = 0, scrollStart = 0, pointerId = null
      track.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch') return
        isDragging = true
        didDrag = false
        startX = e.clientX
        scrollStart = track.scrollLeft
        pointerId = e.pointerId
      })
      track.addEventListener('pointermove', (e) => {
        if (!isDragging) return
        const dx = Math.abs(e.clientX - startX)
        if (!didDrag && dx > 5) {
          didDrag = true
          track.setPointerCapture(pointerId)
          track.style.cursor = 'grabbing'
        }
        if (didDrag) {
          e.preventDefault()
          track.scrollLeft = scrollStart - (e.clientX - startX)
        }
      })
      const stopDrag = () => {
        isDragging = false
        track.style.cursor = ''
        if (pointerId != null) {
          try { track.releasePointerCapture(pointerId) } catch (_) {}
        }
        pointerId = null
      }
      track.addEventListener('pointerup', stopDrag)
      track.addEventListener('pointercancel', stopDrag)

      // Prevent click if we actually dragged
      track.addEventListener('click', (e) => {
        if (didDrag) { e.stopPropagation(); e.preventDefault(); didDrag = false }
      }, true)
    })

    // ══════════════ LIGHTBOX (full-view screenshots + swipe)
    const lightbox     = document.getElementById('lightbox')
    const lightboxImg  = document.getElementById('lightbox-img')
    const lightboxClose = document.getElementById('lightbox-close')
    const lightboxPrev = document.getElementById('lightbox-prev')
    const lightboxNext = document.getElementById('lightbox-next')
    const lightboxCounter = document.getElementById('lightbox-counter')
    const allScreenshots = [...document.querySelectorAll('.screenshot-frame--desktop img, .screenshot-frame--mobile img')]
    let lbIndex = 0

    const openLightbox = (index) => {
      lbIndex = index
      updateLightbox()
      lightbox.removeAttribute('hidden')
      requestAnimationFrame(() => lightbox.classList.add('is-open'))
      body.style.overflow = 'hidden'
    }

    const closeLightbox = () => {
      lightbox.classList.remove('is-open')
      setTimeout(() => {
        lightbox.setAttribute('hidden', '')
        body.style.overflow = ''
      }, 220)
    }

    const updateLightbox = () => {
      const img = allScreenshots[lbIndex]
      if (!img) return
      lightboxImg.src = img.src
      lightboxImg.alt = img.alt
      lightboxImg.style.transform = ''
      lightboxCounter.textContent = `${lbIndex + 1} / ${allScreenshots.length}`
    }

    const lbPrev = () => { lbIndex = (lbIndex - 1 + allScreenshots.length) % allScreenshots.length; updateLightbox() }
    const lbNext = () => { lbIndex = (lbIndex + 1) % allScreenshots.length; updateLightbox() }

    // Click to open
    allScreenshots.forEach((img, i) => {
      img.closest('.screenshot-frame--desktop, .screenshot-frame--mobile')?.addEventListener('click', () => openLightbox(i))
    })

    // Controls
    lightboxClose?.addEventListener('click', closeLightbox)
    lightboxPrev?.addEventListener('click', lbPrev)
    lightboxNext?.addEventListener('click', lbNext)

    // Click backdrop to close
    lightbox?.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.classList.contains('lightbox-content')) closeLightbox()
    })

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (lightbox?.hasAttribute('hidden')) return
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') lbPrev()
      if (e.key === 'ArrowRight') lbNext()
    })

    // Swipe in lightbox (touch + mouse drag)
    const lbContent = document.getElementById('lightbox-content')
    if (lbContent) {
      let swipeStartX = 0, swipeStartY = 0, swiping = false, swipeDelta = 0

      const onSwipeStart = (x, y) => {
        swipeStartX = x
        swipeStartY = y
        swiping = true
        swipeDelta = 0
        lightboxImg.classList.add('is-swiping')
      }

      const onSwipeMove = (x) => {
        if (!swiping) return
        swipeDelta = x - swipeStartX
        lightboxImg.style.transform = `translateX(${swipeDelta}px) scale(${1 - Math.abs(swipeDelta) * 0.0003})`
      }

      const onSwipeEnd = () => {
        if (!swiping) return
        swiping = false
        lightboxImg.classList.remove('is-swiping')
        if (Math.abs(swipeDelta) > 60) {
          swipeDelta < 0 ? lbNext() : lbPrev()
        } else {
          lightboxImg.style.transform = ''
        }
      }

      // Touch events
      lbContent.addEventListener('touchstart', (e) => {
        onSwipeStart(e.touches[0].clientX, e.touches[0].clientY)
      }, { passive: true })
      lbContent.addEventListener('touchmove', (e) => {
        if (!swiping) return
        const dx = Math.abs(e.touches[0].clientX - swipeStartX)
        const dy = Math.abs(e.touches[0].clientY - swipeStartY)
        if (dx > dy) e.preventDefault()
        onSwipeMove(e.touches[0].clientX)
      }, { passive: false })
      lbContent.addEventListener('touchend', onSwipeEnd)
      lbContent.addEventListener('touchcancel', onSwipeEnd)

      // Mouse drag
      lbContent.addEventListener('mousedown', (e) => {
        e.preventDefault()
        onSwipeStart(e.clientX, e.clientY)
      })
      document.addEventListener('mousemove', (e) => {
        if (!swiping) return
        e.preventDefault()
        onSwipeMove(e.clientX)
      })
      document.addEventListener('mouseup', onSwipeEnd)
    }
  })
})()
