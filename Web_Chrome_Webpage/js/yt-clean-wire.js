document.addEventListener('DOMContentLoaded', () => {
	try {
		const btn = document.getElementById('yt-clean-button');
		if (!btn) {
			console.warn('yt-clean-wire: yt-clean-button not found');
			return;
		}
		if (btn._ytWireAttached) return;
		btn._ytWireAttached = true;
		btn.addEventListener('click', async () => {
			try {
				alert('yt-clean-button clicked');
				const module = await import('./modules/youtubeCleaner.js');
				await module.YouTubeCleaner.clean({ mode: 'close_left' });
			} catch (e) {
				try { alert('YT clean failed: ' + (e && e.message ? e.message : e)); } catch {}
				console.error('yt-clean-wire error:', e);
			}
		});
	} catch (e) {
		console.error('yt-clean-wire init failed:', e);
	}
});

