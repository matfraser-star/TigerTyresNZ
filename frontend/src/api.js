const BASE = import.meta.env.VITE_API_URL || '';
function authHeaders() {
  const t = localStorage.getItem('tt_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}
async function req(method, path, body, isForm=false) {
  const headers = { ...authHeaders() };
  let bodyContent;
  if (body && !isForm) { headers['Content-Type']='application/json'; bodyContent=JSON.stringify(body); }
  else bodyContent = body;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: bodyContent });
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// Auth
export const login          = (u,p)   => req('POST','/api/auth/login',{username:u,password:p});
export const changePassword = (c,n)   => req('POST','/api/auth/change-password',{currentPassword:c,newPassword:n});

// Tyres (public)
export const getTyres        = (p={}) => req('GET',`/api/tyres?${new URLSearchParams(p)}`);
export const getTyre         = (id)   => req('GET',`/api/tyres/${id}`);
export const getRims         = ()     => req('GET','/api/tyres/meta/rims');
export const getWidths       = ()     => req('GET','/api/tyres/meta/widths');
export const getProfiles     = ()     => req('GET','/api/tyres/meta/profiles');
export const submitReview    = (id,d) => req('POST',`/api/tyres/${id}/reviews`,d);

// Vehicle lookup
export const getVehicleMakes   = ()           => req('GET','/api/vehicles/makes');
export const getVehicleModels  = (make)       => req('GET',`/api/vehicles/models?make=${encodeURIComponent(make)}`);
export const getVehicleYears   = (make,model) => req('GET',`/api/vehicles/years?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`);
export const getVehicleFitment = (make,model,year) => req('GET',`/api/vehicles/fitment?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&year=${year}`);

// Bookings & enquiries (public)
export const getAvailability = (date) => req('GET',`/api/bookings/availability?date=${date}`);
export const submitBooking   = (d)    => req('POST','/api/bookings',d);
export const submitEnquiry   = (d)    => req('POST','/api/enquiries',d);
export const getSettings     = ()     => req('GET','/api/settings');

// Admin — tyres
export const createTyre  = (d)    => req('POST','/api/admin/tyres',d);
export const updateTyre  = (id,d) => req('PUT',`/api/admin/tyres/${id}`,d);
export const patchTyre   = (id,d) => req('PATCH',`/api/admin/tyres/${id}`,d);
export const deleteTyre  = (id)   => req('DELETE',`/api/admin/tyres/${id}`);
export const bulkPrice   = (d)    => req('POST','/api/admin/tyres/bulk-price',d);
export const exportStock = ()     => { window.location.href=`${BASE}/api/admin/export/stock`; };
export async function importStock(file) {
  const fd = new FormData(); fd.append('csv', file);
  return req('POST', '/api/admin/import/stock', fd, true);
}
export async function uploadImage(file) {
  const fd = new FormData(); fd.append('image',file);
  return req('POST','/api/admin/upload',fd,true);
}

// Admin — enquiries
export const getEnquiries  = ()       => req('GET','/api/admin/enquiries');
export const patchEnquiry  = (id,s)   => req('PATCH',`/api/admin/enquiries/${id}`,{status:s});
export const deleteEnquiry = (id)     => req('DELETE',`/api/admin/enquiries/${id}`);

// Admin — bookings
export const getBookings   = ()       => req('GET','/api/admin/bookings');
export const patchBooking  = (id,s)   => req('PATCH',`/api/admin/bookings/${id}`,{status:s});
export const deleteBooking = (id)     => req('DELETE',`/api/admin/bookings/${id}`);

// Admin — blocked dates
export const getBlockedDates    = ()     => req('GET','/api/admin/blocked-dates');
export const createBlockedDate  = (d)    => req('POST','/api/admin/blocked-dates',d);
export const deleteBlockedDate  = (id)   => req('DELETE',`/api/admin/blocked-dates/${id}`);

// Admin — reviews
export const getReviews    = ()       => req('GET','/api/admin/reviews');
export const patchReview   = (id,a)   => req('PATCH',`/api/admin/reviews/${id}`,{approved:a});
export const deleteReview  = (id)     => req('DELETE',`/api/admin/reviews/${id}`);

// Admin — vehicles
export const getAdminVehicles  = ()      => req('GET','/api/admin/vehicles');
export const createVehicle     = (d)     => req('POST','/api/admin/vehicles',d);
export const updateVehicle     = (id,d)  => req('PUT',`/api/admin/vehicles/${id}`,d);
export const deleteVehicle     = (id)    => req('DELETE',`/api/admin/vehicles/${id}`);
export const bulkVehicles      = (v)     => req('POST','/api/admin/vehicles/bulk',{vehicles:v});

// Admin — misc
export const getStats          = ()      => req('GET','/api/admin/stats');
export const saveSettings      = (d)     => req('PUT','/api/admin/settings',d);
