'use strict';

const root = document.documentElement;
const header = document.getElementById('site-header');
const menu = document.getElementById('nav-menu');
const menuToggle = document.getElementById('menu-toggle');
const themeToggle = document.getElementById('theme-toggle');
const navLinks = [...document.querySelectorAll('.nav-link')];
const sections = [...document.querySelectorAll('main section[id]')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* Theme */
function readSavedTheme() {
  try {
    return localStorage.getItem('portfolio-theme');
  } catch (error) {
    return null;
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem('portfolio-theme', theme);
  } catch (error) {
    // The selected theme still applies when storage is unavailable.
  }
}

function applyTheme(theme, persist = false) {
  root.dataset.theme = theme;
  if (persist) saveTheme(theme);
  themeToggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  document.querySelector('meta[name="theme-color"]').setAttribute(
    'content',
    theme === 'dark' ? '#07111f' : '#f6f8fc'
  );
}

const savedTheme = readSavedTheme();
applyTheme(root.dataset.theme || 'dark');
themeToggle.addEventListener('click', () => {
  applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
});

const systemTheme = window.matchMedia('(prefers-color-scheme: light)');
if (!savedTheme) {
  systemTheme.addEventListener('change', (event) => {
    applyTheme(event.matches ? 'light' : 'dark');
  });
}

/* Mobile navigation */
function closeMenu({ restoreFocus = false } = {}) {
  const wasOpen = menu.classList.contains('open');
  menu.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open navigation');
  document.body.classList.remove('nav-open');
  if (restoreFocus && wasOpen) menuToggle.focus();
}

function openMenu() {
  menu.classList.add('open');
  menuToggle.setAttribute('aria-expanded', 'true');
  menuToggle.setAttribute('aria-label', 'Close navigation');
  document.body.classList.add('nav-open');
  requestAnimationFrame(() => menu.querySelector('a')?.focus());
}

menuToggle.addEventListener('click', () => {
  menu.classList.contains('open') ? closeMenu() : openMenu();
});

navLinks.forEach((link) => link.addEventListener('click', () => closeMenu()));

document.addEventListener('keydown', (event) => {
  if (!menu.classList.contains('open')) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    closeMenu({ restoreFocus: true });
    return;
  }

  if (event.key === 'Tab') {
    const menuLinks = [...menu.querySelectorAll('a[href]')];
    const firstLink = menuLinks[0];
    const lastLink = menuLinks[menuLinks.length - 1];
    if (event.shiftKey && document.activeElement === firstLink) {
      event.preventDefault();
      lastLink.focus();
    } else if (!event.shiftKey && document.activeElement === lastLink) {
      event.preventDefault();
      firstLink.focus();
    }
  }
});

document.addEventListener('click', (event) => {
  if (!menu.classList.contains('open')) return;
  if (!menu.contains(event.target) && !menuToggle.contains(event.target)) {
    closeMenu({ restoreFocus: true });
  }
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 820) closeMenu();
}, { passive: true });

/* Header state and active section */
function updateHeader() {
  header.classList.toggle('scrolled', window.scrollY > 18);
}

if ('IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
      });
    });
  }, { rootMargin: '-30% 0px -62% 0px', threshold: 0 });

  sections.forEach((section) => sectionObserver.observe(section));
}
window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();

/* Reveal content progressively */
const revealElements = document.querySelectorAll('.reveal');
if (!reducedMotion.matches && 'IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const siblings = [...entry.target.parentElement.children].filter((item) => item.classList.contains('reveal'));
      const order = Math.max(0, siblings.indexOf(entry.target));
      entry.target.style.transitionDelay = `${Math.min(order * 70, 280)}ms`;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px' });

  root.classList.add('reveal-ready');
  revealElements.forEach((element) => revealObserver.observe(element));
}

/* Lightweight cursor atmosphere for fine pointers */
const glow = document.getElementById('cursor-glow');
const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
if (hasFinePointer && !reducedMotion.matches) {
  let frameId = null;
  let pointerX = -500;
  let pointerY = -500;

  window.addEventListener('pointermove', (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    glow.style.opacity = '1';
    if (frameId) return;
    frameId = requestAnimationFrame(() => {
      glow.style.left = `${pointerX}px`;
      glow.style.top = `${pointerY}px`;
      frameId = null;
    });
  }, { passive: true });

  document.addEventListener('mouseleave', () => {
    glow.style.opacity = '0';
  });
}

/* Subtle project tilt, disabled for touch and reduced motion */
if (hasFinePointer && !reducedMotion.matches) {
  document.querySelectorAll('.project-card').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${-y * 2.5}deg) rotateY(${x * 2.5}deg) translateY(-3px)`;
    });
    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
    });
  });
}

/* Copy email interaction */
const copyButton = document.getElementById('copy-email');
const toast = document.getElementById('toast');
let toastTimer;

async function copyText(value) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const input = document.createElement('textarea');
  input.value = value;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  input.remove();
}

copyButton.addEventListener('click', async () => {
  try {
    await copyText(copyButton.dataset.email);
    toast.textContent = 'Email copied to clipboard';
  } catch {
    toast.textContent = 'Copy failed — use the email link';
  }
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
});

/* Current year */
document.getElementById('year').textContent = new Date().getFullYear();
