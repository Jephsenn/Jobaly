console.log('🧪 TEST CONTENT SCRIPT LOADED!');
console.log('URL:', window.location.href);
console.log('Title:', document.title);

// Add a visible banner to the page
const banner = document.createElement('div');
banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:green;color:white;padding:10px;z-index:999999;text-align:center;font-size:16px;font-weight:bold;';
banner.textContent = '✅ TEST CONTENT SCRIPT IS WORKING!';
document.body.appendChild(banner);

setTimeout(() => banner.remove(), 3000);
