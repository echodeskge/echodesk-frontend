// Paste this in your browser console to check the token
console.log('=== Token Debug ===');
console.log('echodesk_auth_token:', localStorage.getItem('echodesk_auth_token'));
console.log('access_token:', localStorage.getItem('access_token'));
console.log('Token length:', localStorage.getItem('echodesk_auth_token')?.length);
console.log('Token preview:', localStorage.getItem('echodesk_auth_token')?.substring(0, 20) + '...');
