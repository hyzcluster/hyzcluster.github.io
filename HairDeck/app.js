'use strict';

const video = document.querySelector('#full-demo');
const lightbox = document.querySelector('#lightbox');
const lightboxContent = document.querySelector('#lightbox-content');
const lightboxCaption = document.querySelector('#lightbox-caption');
let lastFocus = null;

function openLightbox(content, caption) {
  lastFocus = document.activeElement;
  lightboxContent.replaceChildren(content);
  lightboxCaption.textContent = caption;
  lightbox.showModal();
  document.body.classList.add('dialog-open');
}

document.querySelectorAll('[data-lightbox]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    const img = new Image();
    img.className = 'lightbox-image';
    img.alt = link.querySelector('img').alt;
    img.src = link.href;
    openLightbox(img, link.dataset.caption);
  });
});

document.querySelector('#close-lightbox').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', (event) => {
  const rect = lightbox.getBoundingClientRect();
  if (event.target === lightbox && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) lightbox.close();
});
lightbox.addEventListener('close', () => {
  document.body.classList.remove('dialog-open');
  lightboxContent.replaceChildren();
  lastFocus?.focus({ preventScroll: true });
});

function galleryTile(index, interactive = true) {
  const tile = document.createElement(interactive ? 'button' : 'div');
  tile.className = 'gallery-tile';
  const label = `Result ${String(index + 1).padStart(2, '0')}: input image and generated back and front views`;
  if (interactive) {
    tile.type = 'button';
    tile.setAttribute('aria-label', `Enlarge ${label.toLowerCase()}`);
    tile.addEventListener('click', () => openLightbox(galleryTile(index, false), label));
  }
  const img = new Image();
  img.src = 'https://huggingface.co/hyz317/HairDeck/resolve/main/assets/supp_gallery_uc.jpg';
  img.alt = interactive ? '' : label;
  img.width = 3840;
  img.height = 4901;
  img.loading = interactive ? 'lazy' : 'eager';
  img.style.left = `${-(index % 4) * 100}%`;
  img.style.top = `${-Math.floor(index / 4) * 100}%`;
  tile.append(img);
  return tile;
}

function showGalleryPage(page) {
  document.querySelector('#character-grid').replaceChildren(...Array.from({ length: 8 }, (_, i) => galleryTile(page * 8 + i)));
  document.querySelectorAll('[data-page]').forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.page) === page)));
  document.querySelector('#gallery-status').textContent = `Showing results ${page * 8 + 1} to ${page * 8 + 8} of 32.`;
}
document.querySelectorAll('[data-page]').forEach((button) => button.addEventListener('click', () => showGalleryPage(Number(button.dataset.page))));
showGalleryPage(0);

const resultTabs = [...document.querySelectorAll('[data-panel]')];
function selectPanel(button) {
  resultTabs.forEach((tab) => {
    const selected = tab === button;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.querySelector(`#panel-${tab.dataset.panel}`).hidden = !selected;
  });
}
resultTabs.forEach((button, index) => {
  button.addEventListener('click', () => selectPanel(button));
  button.addEventListener('keydown', (event) => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % resultTabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + resultTabs.length) % resultTabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = resultTabs.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      selectPanel(resultTabs[next]);
      resultTabs[next].focus();
    }
  });
});

let pendingSeek = null;
function seekVideo(seconds) {
  pendingSeek = seconds;
  const play = () => {
    if (pendingSeek === null) return;
    video.currentTime = pendingSeek;
    pendingSeek = null;
    video.play().catch(() => {
      document.querySelector('.video-status').textContent = 'Chapter selected. Press play to watch.';
      video.focus();
    });
  };
  if (video.readyState >= 1) play();
  else {
    video.addEventListener('loadedmetadata', play, { once: true });
    if (video.networkState !== HTMLMediaElement.NETWORK_LOADING) video.load();
  }
}
document.querySelectorAll('[data-seek]').forEach((link) => link.addEventListener('click', () => seekVideo(Number(link.dataset.seek))));
video.addEventListener('error', () => {
  const status = document.querySelector('.video-status');
  status.classList.remove('sr-only');
  status.textContent = 'The video could not be loaded. You can download it using the link below.';
  const link = document.createElement('a');
  link.className = 'text-link';
  link.href = 'https://huggingface.co/hyz317/HairDeck/resolve/main/assets/hairdeck-demo.mp4';
  link.textContent = ' Download video';
  status.append(link);
});

let copyTimer;
document.querySelector('#copy-bibtex').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const text = document.querySelector('#bibtex').textContent;
  let copied = false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      copied = true;
    }
  } catch { /* The selected-text fallback also works with local files. */ }
  if (!copied) {
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('#bibtex'));
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    try { copied = document.execCommand('copy'); } catch { copied = false; }
    if (copied) selection.removeAllRanges();
  }
  button.textContent = copied ? 'Copied!' : 'Select & copy';
  document.querySelector('#copy-status').textContent = copied ? 'BibTeX copied to clipboard.' : 'Citation selected. Press Command+C or Control+C to copy.';
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => { button.textContent = 'Copy'; }, 2500);
});
