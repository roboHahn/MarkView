<script lang="ts">
  import { tick } from 'svelte';
  import { renderMarkdown } from '$lib/markdown';
  import mermaid from 'mermaid';
  import '../styles/preview.css';

  interface Props {
    content: string;
    theme: 'dark' | 'light';
    onClose: () => void;
  }

  let { content, theme, onClose }: Props = $props();

  let currentSlide = $state(0);
  let slideContainer: HTMLDivElement | undefined = $state(undefined);

  let slides = $derived(
    content
      .split(/\n---\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  );

  let totalSlides = $derived(slides.length);

  let renderedSlide = $derived(
    slides.length > 0 ? renderMarkdown(slides[currentSlide] || '') : ''
  );

  let slideCounter = $derived(
    totalSlides > 0 ? `${currentSlide + 1} / ${totalSlides}` : '0 / 0'
  );

  function goNext() {
    if (currentSlide < totalSlides - 1) {
      currentSlide++;
    }
  }

  function goPrev() {
    if (currentSlide > 0) {
      currentSlide--;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      goNext();
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      goPrev();
      return;
    }
  }

  function handleSlideClick(event: MouseEvent) {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const halfWidth = rect.width / 2;

    if (clickX < halfWidth) {
      goPrev();
    } else {
      goNext();
    }
  }

  // Process mermaid diagrams after slide content renders
  $effect(() => {
    // Track dependencies
    const _slide = currentSlide;
    const _html = renderedSlide;
    const currentTheme = theme;

    const run = async () => {
      await tick();

      if (!slideContainer) return;

      mermaid.initialize({
        startOnLoad: false,
        theme: currentTheme === 'dark' ? 'dark' : 'default',
      });

      const mermaidNodes = slideContainer.querySelectorAll('.mermaid');
      if (mermaidNodes.length > 0) {
        mermaidNodes.forEach((node) => {
          node.removeAttribute('data-processed');
        });
        try {
          await mermaid.run({ nodes: mermaidNodes as NodeListOf<HTMLElement> });
        } catch {
          // Mermaid rendering errors are non-fatal
        }
      }
    };

    run();
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="presentation-overlay" class:dark={theme === 'dark'} class:light={theme === 'light'}>
  <!-- Close button -->
  <button class="close-btn" onclick={onClose} title="Exit presentation (Esc)">X</button>

  <!-- Slide area -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="slide-area" onclick={handleSlideClick}>
    <!-- Navigation hint zones -->
    <div class="nav-zone nav-zone-left" title="Previous slide">
      <span class="nav-arrow">&lsaquo;</span>
    </div>

    <div class="slide-content preview-content" bind:this={slideContainer}>
      {@html renderedSlide}
    </div>

    <div class="nav-zone nav-zone-right" title="Next slide">
      <span class="nav-arrow">&rsaquo;</span>
    </div>
  </div>

  <!-- Slide counter -->
  <div class="slide-counter">{slideCounter}</div>
</div>

<style>
  .presentation-overlay {
    position: fixed;
    inset: 0;
    z-index: 600;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .presentation-overlay.dark {
    background: #1e1e2e;
    color: #cdd6f4;
  }

  .presentation-overlay.light {
    background: #ffffff;
    color: #1e1e2e;
  }

  .close-btn {
    position: absolute;
    top: 16px;
    right: 20px;
    z-index: 610;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    opacity: 0.4;
    transition: opacity 0.2s, background 0.15s;
  }

  .close-btn:hover {
    opacity: 1;
    background: var(--hover-bg);
    border-color: var(--accent);
  }

  .slide-area {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    position: relative;
    cursor: pointer;
  }

  .nav-zone {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;
    z-index: 605;
    pointer-events: none;
  }

  .slide-area:hover .nav-zone {
    opacity: 0.3;
  }

  .slide-area:hover .nav-zone:hover {
    opacity: 0.7;
  }

  .nav-zone-left {
    left: 0;
  }

  .nav-zone-right {
    right: 0;
  }

  .nav-arrow {
    font-size: 48px;
    font-weight: 300;
    color: var(--text-secondary);
    user-select: none;
    -webkit-user-select: none;
  }

  .slide-content {
    max-width: 900px;
    width: 100%;
    max-height: calc(100vh - 100px);
    overflow-y: auto;
    padding: 48px 64px;
    box-sizing: border-box;
    font-size: 18px;
    line-height: 1.7;
  }

  .slide-content :global(h1) {
    font-size: 2.4em;
    margin-bottom: 0.4em;
  }

  .slide-content :global(h2) {
    font-size: 1.8em;
    margin-bottom: 0.4em;
  }

  .slide-content :global(h3) {
    font-size: 1.4em;
    margin-bottom: 0.3em;
  }

  .slide-content :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
  }

  .slide-content :global(pre) {
    font-size: 0.85em;
    border-radius: 6px;
    padding: 16px;
    overflow-x: auto;
  }

  .slide-content :global(code) {
    font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace;
  }

  .slide-content :global(blockquote) {
    border-left: 4px solid var(--accent);
    margin: 1em 0;
    padding: 0.5em 1em;
    opacity: 0.85;
  }

  .slide-counter {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 14px;
    color: var(--text-secondary);
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 4px 16px;
    user-select: none;
    -webkit-user-select: none;
    opacity: 0.6;
    transition: opacity 0.2s;
    z-index: 605;
  }

  .slide-counter:hover {
    opacity: 1;
  }

  .slide-content::-webkit-scrollbar {
    width: 6px;
  }

  .slide-content::-webkit-scrollbar-track {
    background: transparent;
  }

  .slide-content::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
    border-radius: 3px;
  }
</style>
