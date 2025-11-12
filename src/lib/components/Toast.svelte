<script lang="ts">
  import { toastStore, type Toast } from '$lib/stores/toast';
  import { onMount } from 'svelte';

  export let position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' = 'top-right';

  let toasts: Toast[] = [];
  let containerElement: HTMLElement;

  onMount(() => {
    const unsubscribe = toastStore.subscribe(store => {
      toasts = store.toasts;
    });

    return unsubscribe;
  });

  function removeToast(toastId: string) {
    toastStore.remove(toastId);
  }

  function handleToastAction(toast: Toast, action: any) {
    action.action();
    if (!action.persistent) {
      removeToast(toast.id);
    }
  }

  function getToastIcon(type: Toast['type']): string {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return 'ℹ';
    }
  }

  function getPositionClasses(): string {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'top-4 right-4';
    }
  }
</script>

<div bind:this={containerElement} class="toast-container {getPositionClasses()}" role="region" aria-label="Notifications" aria-live="polite">
  {#each toasts as toast (toast.id)}
    <div
      class="toast toast-{toast.type}"
      class:toast-persistent={toast.persistent}
      role="alert"
      aria-atomic="true"
    >
      <div class="toast-icon">
        {getToastIcon(toast.type)}
      </div>

      <div class="toast-content">
        <div class="toast-title">{toast.title}</div>
        {#if toast.message}
          <div class="toast-message">{toast.message}</div>
        {/if}

        {#if toast.actions && toast.actions.length > 0}
          <div class="toast-actions">
            {#each toast.actions as action}
              <button
                class="toast-action {action.primary ? 'toast-action-primary' : 'toast-action-secondary'}"
                on:click={() => handleToastAction(toast, action)}
              >
                {action.label}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      {#if !toast.persistent}
        <button
          class="toast-close"
          on:click={() => removeToast(toast.id)}
          aria-label="Close notification"
        >
          ×
        </button>
      {/if}
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: 420px;
    width: 100%;
    pointer-events: none;
  }

  .toast-container.top-right,
  .toast-container.bottom-right {
    align-items: flex-end;
  }

  .toast-container.top-left,
  .toast-container.bottom-left {
    align-items: flex-start;
  }

  .toast-container.top-right {
    top: 1rem;
    right: 1rem;
  }

  .toast-container.top-left {
    top: 1rem;
    left: 1rem;
  }

  .toast-container.bottom-right {
    bottom: 1rem;
    right: 1rem;
  }

  .toast-container.bottom-left {
    bottom: 1rem;
    left: 1rem;
  }

  .toast {
    pointer-events: auto;
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(8px);
    min-width: 320px;
    max-width: 100%;
    animation: slideIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    transition: all 0.2s ease;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .toast:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  }

  /* Toast Types */
  .toast-success {
    background: linear-gradient(135deg, rgba(40, 167, 69, 0.95), rgba(34, 139, 34, 0.95));
    color: white;
  }

  .toast-error {
    background: linear-gradient(135deg, rgba(220, 53, 69, 0.95), rgba(178, 34, 34, 0.95));
    color: white;
  }

  .toast-warning {
    background: linear-gradient(135deg, rgba(255, 193, 7, 0.95), rgba(255, 160, 0, 0.95));
    color: #333;
  }

  .toast-info {
    background: linear-gradient(135deg, rgba(52, 152, 219, 0.95), rgba(41, 128, 185, 0.95));
    color: white;
  }

  .toast-persistent {
    border-left: 4px solid rgba(255, 255, 255, 0.5);
  }

  .toast-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    font-weight: 700;
    font-size: 14px;
    flex-shrink: 0;
  }

  .toast-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .toast-title {
    font-weight: 600;
    font-size: 0.9rem;
    line-height: 1.3;
  }

  .toast-message {
    font-size: 0.8rem;
    opacity: 0.9;
    line-height: 1.4;
  }

  .toast-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .toast-action {
    padding: 0.25rem 0.75rem;
    border: none;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .toast-action-primary {
    background: rgba(255, 255, 255, 0.9);
    color: #333;
  }

  .toast-action-primary:hover {
    background: rgba(255, 255, 255, 1);
    transform: translateY(-1px);
  }

  .toast-action-secondary {
    background: rgba(255, 255, 255, 0.1);
    color: inherit;
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .toast-action-secondary:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .toast-close {
    background: none;
    border: none;
    color: inherit;
    font-size: 1.5rem;
    font-weight: 300;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    opacity: 0.7;
    transition: opacity 0.2s ease;
    flex-shrink: 0;
  }

  .toast-close:hover {
    opacity: 1;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  /* Responsive Design */
  @media (max-width: 480px) {
    .toast-container {
      left: 0.5rem !important;
      right: 0.5rem !important;
      max-width: none;
    }

    .toast {
      min-width: auto;
      width: 100%;
    }
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .toast {
      border-color: rgba(255, 255, 255, 0.1);
    }
  }
</style>