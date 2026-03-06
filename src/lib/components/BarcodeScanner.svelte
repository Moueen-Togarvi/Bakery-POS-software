<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let { onScan, onClose } = $props();

  let scanner: any = null;
  const scannerId = 'barcode-reader';

  onMount(async () => {
    // Dynamic import to avoid SSR issues
    const { Html5QrcodeScanner } = await import('html5-qrcode');

    // Initialize the scanner
    scanner = new Html5QrcodeScanner(
      scannerId,
      { 
        fps: 10, 
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
        defaultZoomValueIfSupported: 2
      },
      /* verbose= */ false
    );

    function onScanSuccess(decodedText: string, decodedResult: any) {
      // Pass the decoded text to the callback
      onScan(decodedText);
    }

    function onScanFailure(error: any) {
      // Optional: Handle scan failure (usually ignore as it happens every frame no code is found)
      // console.warn(`Code scan error = ${error}`);
    }

    scanner.render(onScanSuccess, onScanFailure);
  });

  onDestroy(async () => {
    if (scanner) {
      try {
        await scanner.clear();
      } catch (error) {
        console.error("Failed to clear scanner", error);
      }
    }
  });
</script>

<div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
  <div class="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
    <div class="flex items-center justify-between border-b p-4 bg-slate-50">
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-primary">barcode_scanner</span>
        <h3 class="text-lg font-bold text-slate-900">Camera Scanner</h3>
      </div>
      <button 
        onclick={onClose}
        class="rounded-full p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
      >
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>

    <div class="p-6">
      <div id={scannerId} class="overflow-hidden rounded-xl border-2 border-dashed border-primary/20 bg-slate-100 min-h-[300px]"></div>
      
      <div class="mt-4 flex flex-col items-center gap-2 text-center text-xs text-slate-500">
        <p>Position the barcode within the scanner box above.</p>
        <p class="font-medium text-primary/60 italic">Make sure your camera is well-lit.</p>
      </div>
    </div>

    <div class="bg-slate-50 p-4 border-t flex justify-center">
      <button 
        onclick={onClose}
        class="rounded-xl bg-primary px-8 py-3 font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95"
      >
        Done Scanning
      </button>
    </div>
  </div>
</div>

<style>
  /* Fix for library generated UI styling */
  :global(#barcode-reader) {
    border: none !important;
  }
  :global(#barcode-reader button) {
    background-color: theme('colors.primary') !important;
    color: white !important;
    border: none !important;
    padding: 8px 16px !important;
    border-radius: 8px !important;
    font-weight: 600 !important;
    font-size: 14px !important;
    cursor: pointer !important;
    transition: all 0.2s !important;
  }
  :global(#barcode-reader button:hover) {
    opacity: 0.9 !important;
    transform: translateY(-1px) !important;
  }
  :global(#barcode-reader select) {
    padding: 6px 12px !important;
    border-radius: 6px !important;
    border: 1px solid #e2e8f0 !important;
    margin: 4px !important;
    font-size: 14px !important;
  }
</style>
