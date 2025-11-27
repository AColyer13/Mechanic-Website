
// Remove part from service ticket
async function removePartFromTicket() {
	const resultDiv = document.getElementById('remove-part-from-ticket-result');
	if (!authToken) {
		resultDiv.innerHTML = '<div class="error">Please login first!</div>';
		return;
	}
	const ticketId = document.getElementById('removePartTicketId').value;
	const partId = document.getElementById('removePartInventoryId').value;
	if (!ticketId || !partId) {
		resultDiv.innerHTML = '<div class="error">Please enter both Ticket ID and Part ID!</div>';
		return;
	}
	resultDiv.innerHTML = '<div class="loading">Removing part from ticket...</div>';
	try {
		const path = `/service-tickets/${ticketId}/remove-part/${partId}`;
		let response = await apiFetch(path, { method: 'PUT' });
		// If server replies with 308 Permanent Redirect (often means trailing slash expected), retry once with trailing slash
		if (response.status === 308 && !path.endsWith('/')) {
			response = await apiFetch(path + '/', { method: 'PUT' });
		}
		// Use parseResponse to surface any backend JSON error details
		const data = await parseResponse(response, 'removing part from ticket');
		resultDiv.innerHTML = `<div class="success">✅ Part removed from ticket!${data && data.id ? ' — Updated ticket #' + data.id : ''}</div>`;
		document.getElementById('removePartTicketId').value = '';
		document.getElementById('removePartInventoryId').value = '';
		// Update tickets list to reflect the change
		setTimeout(() => refreshTickets(), 500);
	} catch (error) {
		resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
	}
}
// Toggle inventory list visibility and fetch if needed
// Add part to service ticket
async function addPartToTicket() {
	const resultDiv = document.getElementById('add-part-to-ticket-result');
	if (!authToken) {
		resultDiv.innerHTML = '<div class="error">Please login first!</div>';
		return;
	}
	const ticketId = document.getElementById('addPartTicketId').value;
	const partId = document.getElementById('addPartInventoryId').value;
	if (!ticketId || !partId) {
		resultDiv.innerHTML = '<div class="error">Please enter both Ticket ID and Part ID!</div>';
		return;
	}
	resultDiv.innerHTML = '<div class="loading">Adding part to ticket...</div>';
	try {
		const path = `/service-tickets/${ticketId}/add-part/${partId}`;
		let response = await apiFetch(path, { method: 'PUT' });
		if (response.status === 308 && !path.endsWith('/')) {
			response = await apiFetch(path + '/', { method: 'PUT' });
		}
		const data = await parseResponse(response, 'adding part to ticket');
		resultDiv.innerHTML = `<div class="success">✅ Part added to ticket!${data && data.id ? ' — Updated ticket #' + data.id : ''}</div>`;
		document.getElementById('addPartTicketId').value = '';
		document.getElementById('addPartInventoryId').value = '';
		// Refresh tickets view so the new part appears
		setTimeout(() => refreshTickets(), 500);
	} catch (error) {
		resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
	}
}
let inventoryVisible = false;
async function toggleInventoryList() {
	const btn = document.getElementById('toggle-inventory-btn');
	const list = domElements.inventoryList;
	if (!inventoryVisible) {
		// Show and fetch
		btn.textContent = 'Hide';
		list.style.display = '';
		await getAllInventory();
		inventoryVisible = true;
	} else {
		// Hide
		btn.textContent = 'Get All Items';
		list.style.display = 'none';
		inventoryVisible = false;
	}
}

// Toggle customers list visibility and fetch if needed
let customersVisible = false;
async function toggleCustomersList() {
	const btn = document.getElementById('toggle-customers-btn');
	const list = domElements.customersList;
	if (!customersVisible) {
		// Show and fetch
		btn.textContent = 'Hide';
		list.style.display = '';
		await getAllCustomers();
		customersVisible = true;
	} else {
		// Hide
		btn.textContent = 'Get All Customers';
		list.style.display = 'none';
		customersVisible = false;
	}
}

// Toggle mechanics list visibility and fetch if needed
let mechanicsVisible = false;
async function toggleMechanicsList() {
	const btn = document.getElementById('toggle-mechanics-btn');
	const list = domElements.mechanicsList;
	if (!mechanicsVisible) {
		// Show and fetch
		btn.textContent = 'Hide';
		list.style.display = '';
		await getAllMechanics();
		mechanicsVisible = true;
	} else {
		// Hide
		btn.textContent = 'Get All Mechanics';
		list.style.display = 'none';
		mechanicsVisible = false;
	}
}

// Toggle tickets list visibility and fetch if needed
let ticketsVisible = false;
async function toggleTicketsList() {
	const btn = document.getElementById('toggle-tickets-btn');
	const list = domElements.ticketsList;
	if (!ticketsVisible) {
		// Show and fetch
		btn.textContent = 'Hide';
		list.style.display = '';
		await getAllTickets();
		ticketsVisible = true;
	} else {
		// Hide
		btn.textContent = 'Get All Tickets';
		list.style.display = 'none';
		ticketsVisible = false;
	}
}
// ===== PRELOAD VARIABLES =====
const preloadedData = {
	customers: null,
	mechanics: null,
	inventory: null,
	tickets: null
};

// ===== CACHE DOM ELEMENTS =====
const domElements = {
	customersList: document.getElementById('customers-list'),
	mechanicsList: document.getElementById('mechanics-list'),
	inventoryList: document.getElementById('inventory-list'),
	ticketsList: document.getElementById('tickets-list')
};

// ===== GENERIC GET ALL FUNCTION =====
async function getAllData(type, usePreload = true) {
	const resultDiv = domElements[`${type}List`];
	resultDiv.innerHTML = '<div class="loading">Loading...</div>';
	let data = null;
	try {
		if (usePreload && preloadedData[type]) {
			data = preloadedData[type];
		} else {
			const response = await apiFetch(`/${type === 'tickets' ? 'service-tickets' : type}/?_=${Date.now()}`);
			data = await parseResponse(response, `retrieving all ${type}`);
			preloadedData[type] = data;
		}
		if (!data || data.length === 0) {
			resultDiv.innerHTML = '<div class="error">No data found.</div>';
			return;
		}
		const refreshButton = `<button onclick="refreshData('${type}')" class="refresh-btn">🔄 Refresh</button>`;
		const html = refreshButton + renderDataList(type, data);
		resultDiv.innerHTML = html;
	} catch (error) {
		resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
	}
}

// ===== RENDER DATA LIST =====
function renderDataList(type, data) {
	const renderers = {
		customers: (item) => `<div class="data-card">
			<h3>${item.first_name} ${item.last_name}</h3>
			<p><b>ID:</b> ${item.id}</p>
			<p><b>Email:</b> ${item.email}</p>
			<p><b>Phone:</b> ${item.phone || ''}</p>
			<p><b>Address:</b> ${item.address || ''}</p>
		</div>`,
		mechanics: (item) => `<div class="data-card">
			<h3>${item.first_name} ${item.last_name}</h3>
			<p><b>ID:</b> ${item.id}</p>
			<p><b>Email:</b> ${item.email}</p>
			<p><b>Phone:</b> ${item.phone || ''}</p>
			<p><b>Specialty:</b> ${item.specialty || ''}</p>
			<p><b>Hourly Rate:</b> $${item.hourly_rate || ''}</p>
			<p><b>Hire Date:</b> ${item.hire_date || ''}</p>
		</div>`,
		inventory: (item) => `<div class="data-card">
			<h3>${item.name}</h3>
			<p><b>ID:</b> ${item.id}</p>
			<p><b>Price:</b> $${item.price}</p>
		</div>`,
		tickets: (item) => {
			const vehicleInfo = item.vehicle_year || item.vehicle_make || item.vehicle_model
				? `${item.vehicle_year || ''} ${item.vehicle_make || ''} ${item.vehicle_model || ''}`.trim()
				: 'Not specified';
			const customerName = item.customer 
				? `${item.customer.first_name} ${item.customer.last_name}`
				: `Customer ID: ${item.customer_id}`;
			const mechanicsList = item.mechanics && item.mechanics.length > 0
				? item.mechanics.map(m => `${m.first_name} ${m.last_name}`).join(', ')
				: 'Not assigned';
			const dateCreated = item.created_at 
				? new Date(item.created_at).toLocaleDateString()
				: 'Unknown';
			// Parts rendering
			let partsHtml = '';
			if (item.parts && Array.isArray(item.parts) && item.parts.length > 0) {
				partsHtml = `<p><b>Parts:</b> ` + item.parts.map(p => `${p.name || p.part_name || 'Part'} (ID: ${p.id}${p.quantity ? ', Qty: ' + p.quantity : ''})`).join(', ') + `</p>`;
			} else if (item.inventory && Array.isArray(item.inventory) && item.inventory.length > 0) {
				partsHtml = `<p><b>Parts:</b> ` + item.inventory.map(p => `${p.name || p.part_name || 'Part'} (ID: ${p.id}${p.quantity ? ', Qty: ' + p.quantity : ''})`).join(', ') + `</p>`;
			}
			return `<div class="data-card">
				<h3>Ticket #${item.id}</h3>
				<p><b>Vehicle:</b> ${vehicleInfo}</p>
				${item.vehicle_vin ? `<p><b>VIN:</b> ${item.vehicle_vin}</p>` : ''}
				<p><b>Description:</b> ${item.description}</p>
				<p><b>Created:</b> ${dateCreated}</p>
				<p><b>Status:</b> ${item.status || 'Open'}</p>
				<p><b>Customer:</b> ${customerName}</p>
				<p><b>Mechanic(s):</b> ${mechanicsList}</p>
				${partsHtml}
				${item.estimated_cost ? `<p><b>Estimated Cost:</b> $${item.estimated_cost.toFixed(2)}</p>` : ''}
				${item.actual_cost ? `<p><b>Actual Cost:</b> $${item.actual_cost.toFixed(2)}</p>` : ''}
			</div>`;
		}
	};
	return data.map(renderers[type]).join('');
}

// ===== REFRESH DATA =====
async function refreshData(type) {
	preloadedData[type] = null;
	await getAllData(type, false);
}

// ===== PRELOAD ALL DATA ON PAGE LOAD =====
async function preloadAllData() {
	try {
		const [customers, mechanics, inventory, tickets] = await Promise.all([
			apiFetch(`/customers/?_=${Date.now()}`).then(res => parseResponse(res, 'preloading customers')),
			apiFetch(`/mechanics/?_=${Date.now()}`).then(res => parseResponse(res, 'preloading mechanics')),
			apiFetch(`/inventory/?_=${Date.now()}`).then(res => parseResponse(res, 'preloading inventory')),
			apiFetch(`/service-tickets/?_=${Date.now()}`).then(res => parseResponse(res, 'preloading service tickets'))
		]);
		preloadedData.customers = customers;
		preloadedData.mechanics = mechanics;
		preloadedData.inventory = inventory;
		preloadedData.tickets = tickets;
		console.log('All data preloaded successfully');
	} catch (error) {
		console.error('Error preloading data:', error);
		// Continue without preloaded data
	}
}

// Call preload on page load
window.addEventListener('load', preloadAllData);
// =========================
// Configuration & helpers
// =========================
// API base URL (hardcoded)
const API_URL = 'https://mechanic-api-copy-with-testing-and.onrender.com';
let authToken = null;
let loggedInCustomer = null;

function getApiUrl() {
	return API_URL;
}

// Build headers helper — use json:true to add Content-Type, auth:true to include the Bearer header
function buildHeaders({ json = false, auth = true, extra = {} } = {}) {
	const headers = { ...extra };
	if (json) headers['Content-Type'] = 'application/json';
	if (auth && authToken) headers['Authorization'] = `Bearer ${authToken}`;
	return headers;
}

// Lightweight wrapper over fetch to centralize URL/header construction
async function apiFetch(path, { method = 'GET', json = null, auth = true, headers = {}, ...rest } = {}) {
	const url = path.startsWith('http') ? path : `${getApiUrl()}${path}`;
	const builtHeaders = buildHeaders({ json: json !== null, auth, extra: headers });
	const opts = { method, headers: builtHeaders, ...rest };
	if (json !== null) opts.body = JSON.stringify(json);
	return fetch(url, opts);
}

// Parse fetch responses and produce rich errors for UI (handles 404, 308, etc.)
async function parseResponse(response, context = '') {
	const text = await response.text();
	let data = null;
	try { data = text ? JSON.parse(text) : null; } catch { data = text; }

	if (!response.ok) {
		let message = `HTTP ${response.status} ${response.statusText}`;
		if (response.status === 404) {
			message += ` — Not Found. ${context} The requested resource doesn't exist or the ID/URL is incorrect.`;
		} else if (response.status === 308) {
			message += ` — Permanent Redirect. The server is redirecting (likely the endpoint expects a trailing slash). Use the correct endpoint URL with a trailing slash.`;
		} else if (response.status === 409) {
			message += ` — Conflict. ${data && data.error ? data.error : ''}`;
		}
		if (data) {
			try {
				// Prefer common error fields (error, message, detail) and handle arrays of errors
				let extra = '';
				if (typeof data === 'string') {
					extra = data;
				} else if (data.error) {
					extra = (typeof data.error === 'string') ? data.error : JSON.stringify(data.error);
				} else if (data.message) {
					extra = (typeof data.message === 'string') ? data.message : JSON.stringify(data.message);
				} else if (data.detail) {
					extra = (typeof data.detail === 'string') ? data.detail : JSON.stringify(data.detail);
				} else if (data.errors) {
					// `errors` may be an array or object — stringify sensibly
					if (Array.isArray(data.errors)) extra = data.errors.join('; ');
					else extra = JSON.stringify(data.errors);
				} else {
					extra = JSON.stringify(data);
				}

				if (extra) message += ` Response: ${extra}`;
			} catch (e) {}
		}

		const err = new Error(message);
		err.status = response.status;
		err.response = data;
		throw err;
	}

	return data;
}

function updateAuthStatus() {
	const authMessage = document.getElementById('auth-message');
	const authRequiredSections = document.querySelectorAll('.auth-required');
    
	if (authToken && loggedInCustomer) {
		authMessage.innerHTML = `🔐 Logged in as: ${loggedInCustomer.email}`;
		authMessage.style.background = '#e0ffe0';
        
		// Show auth-required sections
		authRequiredSections.forEach(section => {
			section.classList.add('logged-in');
		});
        
		// Auto-fill customer ID in update and delete forms
		document.getElementById('updateCustomerId').value = loggedInCustomer.id;
		document.getElementById('deleteCustomerId').value = loggedInCustomer.id;
	} else {
		authMessage.innerHTML = '🔓 Not logged in';
		authMessage.style.background = '#f0f0f0';
        
		// Hide auth-required sections
		authRequiredSections.forEach(section => {
			section.classList.remove('logged-in');
		});
	}
}

// Tab switching
function switchTab(tabName) {
	// Hide all tabs
	document.querySelectorAll('.tab-content').forEach(tab => {
		tab.classList.remove('active');
	});
	document.querySelectorAll('.tab').forEach(tab => {
		tab.classList.remove('active');
	});
    
	// Show selected tab
	document.getElementById(tabName + '-tab').classList.add('active');
	event.target.classList.add('active');
}

// ===== AUTHENTICATION FUNCTIONS =====
async function login() {
	const resultDiv = document.getElementById('login-result');
	const email = document.getElementById('loginEmail').value;
	const password = document.getElementById('loginPassword').value;
    
	if (!email || !password) {
		resultDiv.innerHTML = '<div class="error">Please enter email and password!</div>';
		return;
	}
    
	try {
		const response = await apiFetch(`/customers/login`, { method: 'POST', json: { email, password }, auth: false });
        
		const data = await parseResponse(response, 'retrieving customers');
		authToken = data.token;
		loggedInCustomer = data.customer;
        
		resultDiv.innerHTML = `<div class="success">✅ Login successful!<br>Customer: ${data.customer.first_name} ${data.customer.last_name}</div>`;
		updateAuthStatus();
        
		// Clear form
		document.getElementById('loginEmail').value = '';
		document.getElementById('loginPassword').value = '';
	} catch (error) {
		resultDiv.innerHTML = `<div class="error">Login failed: ${error.message}</div>`;
	}
}

function logout() {
	authToken = null;
	loggedInCustomer = null;
	updateAuthStatus();
	const resultDiv = document.getElementById('login-result');
	resultDiv.innerHTML = '<div class="success">👋 Logged out successfully</div>';
}

async function getMyTickets() {
	const resultDiv = document.getElementById('my-tickets-list');
    
	if (!authToken) {
		resultDiv.innerHTML = '<div class="error">Please login first!</div>';
		return;
	}
    
	resultDiv.innerHTML = '<div class="loading">Loading your tickets...</div>';
    
	try {
		const response = await apiFetch(`/customers/my-tickets`);
        
		const data = await parseResponse(response, 'fetching login result');
        
		if (data.length === 0) {
			resultDiv.innerHTML = '<p>No tickets found.</p>';
			return;
		}
        
		let html = '';
		data.forEach(ticket => {
			const vehicleInfo = ticket.vehicle_year || ticket.vehicle_make || ticket.vehicle_model
				? `${ticket.vehicle_year || ''} ${ticket.vehicle_make || ''} ${ticket.vehicle_model || ''}`.trim()
				: 'Not specified';
            
			html += `
				<div class="data-card">
					<h3>Ticket #${ticket.id}</h3>
					<p><b>Vehicle:</b> ${vehicleInfo}</p>
					<p><b>Description:</b> ${ticket.description}</p>
					<p><b>Status:</b> ${ticket.status || 'Open'}</p>
					${ticket.estimated_cost ? `<p><b>Estimated Cost:</b> $${ticket.estimated_cost.toFixed(2)}</p>` : ''}
					${ticket.actual_cost ? `<p><b>Actual Cost:</b> $${ticket.actual_cost.toFixed(2)}</p>` : ''}
				</div>
			`;
		});
        
		resultDiv.style.display = '';
		resultDiv.innerHTML = html;
	} catch (error) {
		resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
	}
}

// ===== CUSTOMER FUNCTIONS =====
// ===== REFACTORED: GET ALL CUSTOMERS (PRELOAD + REFRESH) =====
async function getAllCustomers(usePreload = true) {
	await getAllData('customers', usePreload);
}
async function refreshCustomers() {
	await refreshData('customers');
}

async function addCustomer() {
	const resultDiv = document.getElementById('add-customer-result');
	const firstName = document.getElementById('customerFirstName').value;
	const lastName = document.getElementById('customerLastName').value;
	const email = document.getElementById('customerEmail').value;
	const password = document.getElementById('customerPassword').value;
	const phone = document.getElementById('customerPhone').value;
	const address = document.getElementById('customerAddress').value;
    
	if (!firstName || !lastName || !email || !password) {
		resultDiv.innerHTML = '<div class="error">Please fill in all required fields!</div>';
		return;
	}
    
	const customerData = {
		first_name: firstName,
		last_name: lastName,
		email: email,
		password: password
	};
    
	if (phone) customerData.phone = phone;
	if (address) customerData.address = address;
    
	try {
		const response = await apiFetch(`/customers/`, { method: 'POST', json: customerData, auth: false });
        
		const data = await parseResponse(response, 'retrieving mechanics');
		resultDiv.innerHTML = `<div class="success">Customer added successfully! ID: ${data.id}</div>`;
        
		// Clear form
		document.getElementById('customerFirstName').value = '';
		document.getElementById('customerLastName').value = '';
		document.getElementById('customerEmail').value = '';
		document.getElementById('customerPassword').value = '';
		document.getElementById('customerPhone').value = '';
		document.getElementById('customerAddress').value = '';
        
		// Refresh customer list
		setTimeout(() => refreshCustomers(), 1000);
	} catch (error) {
		resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
	}
}

// ===== MECHANIC FUNCTIONS =====
// ===== REFACTORED: GET ALL MECHANICS (PRELOAD + REFRESH) =====
async function getAllMechanics(usePreload = true) {
	await getAllData('mechanics', usePreload);
}
async function refreshMechanics() {
	await refreshData('mechanics');
}

async function addMechanic() {
	const resultDiv = document.getElementById('add-mechanic-result');
	if (!authToken) {
		resultDiv.innerHTML = '<div class="error">Please login first!</div>';
		return;
	}
	const firstName = document.getElementById('mechanicFirstName').value;
	const lastName = document.getElementById('mechanicLastName').value;
	const email = document.getElementById('mechanicEmail').value;
	const phone = document.getElementById('mechanicPhone').value;
	const specialty = document.getElementById('mechanicSpecialty').value;
	const hourlyRate = document.getElementById('mechanicHourlyRate').value;
	const hireDate = document.getElementById('mechanicHireDate') ? document.getElementById('mechanicHireDate').value : '';
    
	if (!firstName || !lastName || !email) {
		resultDiv.innerHTML = '<div class="error">Please fill in all required fields!</div>';
		return;
	}
    
	const mechanicData = {
		first_name: firstName,
		last_name: lastName,
		email: email
	};
    
	if (phone) mechanicData.phone = phone;
	if (specialty) mechanicData.specialty = specialty;
	if (hourlyRate) mechanicData.hourly_rate = parseFloat(hourlyRate);
	if (hireDate) mechanicData.hire_date = hireDate;
    
	try {
		const response = await apiFetch(`/mechanics/`, { method: 'POST', json: mechanicData });
        
		const data = await parseResponse(response, 'getting mechanic by id');
		resultDiv.innerHTML = `<div class="success">Mechanic added successfully! ID: ${data.id}</div>`;
        
		// Clear form
		document.getElementById('mechanicFirstName').value = '';
		document.getElementById('mechanicLastName').value = '';
		document.getElementById('mechanicEmail').value = '';
		document.getElementById('mechanicPhone').value = '';
		document.getElementById('mechanicSpecialty').value = '';
		document.getElementById('mechanicHourlyRate').value = '';
		document.getElementById('mechanicHireDate').value = '';
        
		// Refresh mechanic list
		setTimeout(() => refreshMechanics(), 1000);
	} catch (error) {
		resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
	}
}

// ===== INVENTORY FUNCTIONS =====
// ===== REFACTORED: GET ALL INVENTORY (PRELOAD + REFRESH) =====
async function getAllInventory(usePreload = true) {
	await getAllData('inventory', usePreload);
}
async function refreshInventory() {
	await refreshData('inventory');
}

// ===== SERVICE TICKET FUNCTIONS =====
// ===== REFACTORED: GET ALL TICKETS (PRELOAD + REFRESH) =====
async function getAllTickets(usePreload = true) {
	await getAllData('tickets', usePreload);
}
async function refreshTickets() {
	await refreshData('tickets');
}

// Additional Customer Functions
async function getCustomerById() {
	const resultDiv = document.getElementById('get-customer-result');
	const customerId = document.getElementById('getCustomerId').value;
    
	if (!customerId) {
		resultDiv.innerHTML = '<div class="error">Please enter a customer ID!</div>';
		return;
	}
    
	resultDiv.innerHTML = '<div class="loading">Loading customer...</div>';
    
	try {
		const response = await apiFetch(`/customers/${customerId}`);
        
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
        
		const customer = await response.json();
        
		resultDiv.style.display = '';
		resultDiv.innerHTML = `
			<div class="data-card">
				<h3>${customer.first_name} ${customer.last_name}</h3>
				<p><b>ID:</b> ${customer.id}</p>
				<p><b>Email:</b> ${customer.email}</p>
				<p><b>Phone:</b> ${customer.phone || ''}</p>
				<p><b>Address:</b> ${customer.address || ''}</p>
			</div>
		`;
	} catch (error) {
		resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
	}
}

async function updateCustomer() {
	const resultDiv = document.getElementById('update-customer-result');
    
	if (!authToken) {
		resultDiv.innerHTML = '<div class="error">Please login first!</div>';
		return;
	}
    
	const customerId = document.getElementById('updateCustomerId').value;
	const firstName = document.getElementById('updateCustomerFirstName').value;
	const lastName = document.getElementById('updateCustomerLastName').value;
	const email = document.getElementById('updateCustomerEmail').value;
	const password = document.getElementById('updateCustomerPassword') ? document.getElementById('updateCustomerPassword').value : '';
	const phone = document.getElementById('updateCustomerPhone').value;
	const address = document.getElementById('updateCustomerAddress').value;
    
	if (!customerId) {
		resultDiv.innerHTML = '<div class="error">Please enter a customer ID!</div>';
		return;
	}
    
	const updateData = {};
	if (firstName) updateData.first_name = firstName;
	if (lastName) updateData.last_name = lastName;
	if (email) updateData.email = email;
	if (password) updateData.password = password;
	if (phone) updateData.phone = phone;
	if (address) updateData.address = address;
    
	if (Object.keys(updateData).length === 0) {
		resultDiv.innerHTML = '<div class="error">Please enter at least one field to update!</div>';
		return;
	}
    
	try {
		const response = await apiFetch(`/customers/${customerId}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${authToken}`
			},
			body: JSON.stringify(updateData)
		});
        
		const data = await parseResponse(response, 'creating inventory item');
		resultDiv.innerHTML = `<div class="success">✅ Customer updated successfully!</div>`;
        
		// Clear form
		document.getElementById('updateCustomerId').value = '';
		document.getElementById('updateCustomerFirstName').value = '';
		document.getElementById('updateCustomerLastName').value = '';
		document.getElementById('updateCustomerEmail').value = '';
		document.getElementById('updateCustomerPassword').value = '';
		document.getElementById('updateCustomerPhone').value = '';
		document.getElementById('updateCustomerAddress').value = '';
	} catch (error) {
		resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
	}
}

async function deleteCustomer() {
	const resultDiv = document.getElementById('delete-customer-result');
    
	if (!authToken) {
		resultDiv.innerHTML = '<div class="error">Please login first!</div>';
		return;
	}
    
	const customerId = document.getElementById('deleteCustomerId').value;
    
	if (!customerId) {
		resultDiv.innerHTML = '<div class="error">Please enter a customer ID!</div>';
		return;
	}
    
	if (!confirm(`Are you sure you want to delete customer ${customerId}?`)) {
		return;
	}
    
	try {
		const response = await apiFetch(`/customers/${customerId}`, {
			method: 'DELETE',
			headers: {
				'Authorization': `Bearer ${authToken}`
			}
		});
        
		const data = await response.json();
        
		if (response.status === 409) {
			resultDiv.innerHTML = `<div class="error">❌ Cannot delete customer!<br>${data.error || 'Customer has associated service tickets.'}<br><br>💡 Tip: Delete the customer's service tickets first.</div>`;
			return;
		}
        
		if (!response.ok) {
			throw new Error(data.error || `HTTP error! status: ${response.status}`);
		}
        
		resultDiv.innerHTML = `<div class="success">✅ Customer deleted successfully!</div>`;
		document.getElementById('deleteCustomerId').value = '';
        
		// Refresh customer list if visible
		setTimeout(() => refreshCustomers(), 500);
	} catch (error) {
		resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
	}
}

// Additional Mechanic Functions
async function getMechanicById() {
	const resultDiv = document.getElementById('get-mechanic-result');
	const mechanicId = document.getElementById('getMechanicId').value;
    
	if (!mechanicId) {
		resultDiv.innerHTML = '<div class="error">Please enter a mechanic ID!</div>';
		return;
	}
    
	resultDiv.innerHTML = '<div class="loading">Loading mechanic...</div>';
    
	try {
		const response = await apiFetch(`/mechanics/${mechanicId}`);
        
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
        
		const mechanic = await response.json();
        
		resultDiv.style.display = '';
		resultDiv.innerHTML = `
			<div class="data-card">
				<h3>${mechanic.first_name} ${mechanic.last_name}</h3>
				<p><b>ID:</b> ${mechanic.id}</p>
				<p><b>Email:</b> ${mechanic.email}</p>
				<p><b>Phone:</b> ${mechanic.phone || ''}</p>
				<p><b>Specialty:</b> ${mechanic.specialty || ''}</p>
				<p><b>Hourly Rate:</b> $${mechanic.hourly_rate || ''}</p>
				<p><b>Hire Date:</b> ${mechanic.hire_date || ''}</p>
			</div>
		`;
	} catch (error) {
		resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
	}
}

async function updateMechanic() {
	const resultDiv = document.getElementById('update-mechanic-result');
	if (!authToken) {
		resultDiv.innerHTML = '<div class="error">Please login first!</div>';
		return;
	}
	const mechanicId = document.getElementById('updateMechanicId').value;
	const firstName = document.getElementById('updateMechanicFirstName').value;
	const lastName = document.getElementById('updateMechanicLastName').value;
	const email = document.getElementById('updateMechanicEmail').value;
	const phone = document.getElementById('updateMechanicPhone').value;
	const specialty = document.getElementById('updateMechanicSpecialty').value;
	const hourlyRate = document.getElementById('updateMechanicHourlyRate').value;
	const hireDate = document.getElementById('updateMechanicHireDate') ? document.getElementById('updateMechanicHireDate').value : '';
    
	if (!mechanicId) {
		resultDiv.innerHTML = '<div class="error">Please enter a mechanic ID!</div>';
		return;
	}
    
	const updateData = {};
	if (firstName) updateData.first_name = firstName;
	if (lastName) updateData.last_name = lastName;
	if (email) updateData.email = email;
	if (phone) updateData.phone = phone;
	if (specialty) updateData.specialty = specialty;
	if (hourlyRate) updateData.hourly_rate = parseFloat(hourlyRate);
	if (hireDate) updateData.hire_date = hireDate;
    
	if (Object.keys(updateData).length === 0) {
		resultDiv.innerHTML = '<div class="error">Please enter at least one field to update!</div>';
		return;
	}
    
	try {
		const response = await apiFetch(`/mechanics/${mechanicId}`, { method: 'PUT', json: updateData });
        
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
        
		resultDiv.innerHTML = `<div class="success">✅ Mechanic updated successfully!</div>`;
        
		// Clear form
		document.getElementById('updateMechanicId').value = '';
		document.getElementById('updateMechanicFirstName').value = '';
		document.getElementById('updateMechanicLastName').value = '';
		document.getElementById('updateMechanicEmail').value = '';
		document.getElementById('updateMechanicPhone').value = '';
		document.getElementById('updateMechanicSpecialty').value = '';
		document.getElementById('updateMechanicHourlyRate').value = '';
		document.getElementById('updateMechanicHireDate').value = '';
	} catch (error) {
		resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
	}
}

async function deleteMechanic() {
	const resultDiv = document.getElementById('delete-mechanic-result');
	if (!authToken) {
		resultDiv.innerHTML = '<div class="error">Please login first!</div>';
		return;
	}
	const mechanicId = document.getElementById('deleteMechanicId').value;
    
	if (!mechanicId) {
		resultDiv.innerHTML = '<div class="error">Please enter a mechanic ID!</div>';
		return;
	}
    
	if (!confirm(`Are you sure you want to delete mechanic ${mechanicId}?`)) {
		return;
	}
    
	try {
		const response = await apiFetch(`/mechanics/${mechanicId}`, { method: 'DELETE' });
        
		const data = await response.json();
        
		if (response.status === 409) {
			resultDiv.innerHTML = `<div class="error">❌ Cannot delete mechanic!<br>${data.error || 'Mechanic is assigned to service tickets.'}<br><br>💡 Tip: Remove the mechanic from all service tickets first.</div>`;
			return;
		}
        
		if (!response.ok) {
			throw new Error(data.error || `HTTP error! status: ${response.status}`);
		}
        
		resultDiv.innerHTML = `<div class="success">✅ Mechanic deleted successfully!</div>`;
		document.getElementById('deleteMechanicId').value = '';
        
		// Refresh mechanic list if visible
		setTimeout(() => refreshMechanics(), 500);
	} catch (error) {
		resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
	}
}

// Additional Inventory Functions
async function addInventoryItem() {
	const resultDiv = document.getElementById('add-inventory-result');
	if (!authToken) {
		resultDiv.innerHTML = '<div class="error">Please login first!</div>';
		return;
	}
	const partName = document.getElementById('inventoryPartName').value;
	const price = document.getElementById('inventoryPrice').value;
    
	if (!partName || !price) {
		resultDiv.innerHTML = '<div class="error">Please fill in all fields!</div>';
		return;
	}
    
	try {
		const body = {
			name: partName,
			price: parseFloat(price)
		};

		const response = await apiFetch(`/inventory/`, { method: 'POST', json: body });

		const data = await parseResponse(response, 'adding inventory item');
		resultDiv.innerHTML = `<div class="success">✅ Inventory item added! ID: ${data.id}</div>`;

		// Clear form
		document.getElementById('inventoryPartName').value = '';
		document.getElementById('inventoryPrice').value = '';

		// Refresh inventory list
		setTimeout(() => refreshInventory(), 500);
	} catch (error) {
		resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
	}
}

async function getInventoryById() {
	const resultDiv = document.getElementById('get-inventory-result');
	const inventoryId = document.getElementById('getInventoryId').value;
    
	if (!inventoryId) {
		resultDiv.innerHTML = '<div class="error">Please enter an inventory ID!</div>';
		return;
	}
    
	resultDiv.innerHTML = '<div class="loading">Loading inventory item...</div>';
    
	try {
		const response = await apiFetch(`/inventory/${inventoryId}`);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const item = await response.json();
		let ticketsHtml = '';
		// Try to find related tickets in the response
		let tickets = [];
		if (item.tickets && Array.isArray(item.tickets)) {
			tickets = item.tickets;
		} else if (item.service_tickets && Array.isArray(item.service_tickets)) {
			tickets = item.service_tickets;
		}
		if (tickets.length > 0) {
			ticketsHtml = `<div style='margin-top:1em;'><b>Used in Tickets:</b><ul style='margin:0 0 0 1em;'>` +
				tickets.map(t => `<li>Ticket #${t.id}: ${t.description ? t.description : ''}</li>`).join('') +
				`</ul></div>`;
		}
		resultDiv.style.display = '';
		resultDiv.innerHTML = `
			<div class="data-card">
				<h3>${item.name || item.part_name}</h3>
				<p><b>ID:</b> ${item.id}</p>
				<p><b>Price:</b> $${item.price}</p>
				<p><b>Quantity:</b> ${item.quantity}</p>
				${item.sku ? `<p><b>SKU:</b> ${item.sku}</p>` : ''}
				${item.supplier ? `<p><b>Supplier:</b> ${item.supplier}</p>` : ''}
				${item.description ? `<p><b>Description:</b> ${item.description}</p>` : ''}
				${ticketsHtml}
			</div>
		`;
	} catch (error) {
		resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
	}
}

async function updateInventoryItem() {
	const resultDiv = document.getElementById('update-inventory-result');
	if (!authToken) {
		resultDiv.innerHTML = '<div class="error">Please login first!</div>';
		return;
	}
	const inventoryId = document.getElementById('updateInventoryId').value;
	const partName = document.getElementById('updateInventoryPartName').value;
	const price = document.getElementById('updateInventoryPrice').value;
    
	if (!inventoryId) {
		resultDiv.innerHTML = '<div class="error">Please enter an inventory ID!</div>';
		return;
	}
    
	const updateData = {};
	if (partName) updateData.name = partName;
	if (price) updateData.price = parseFloat(price);
    
	if (Object.keys(updateData).length === 0) {
		resultDiv.innerHTML = '<div class="error">Please enter at least one field to update!</div>';
		return;
	}
    
	try {
		const response = await apiFetch(`/inventory/${inventoryId}`, { method: 'PUT', json: updateData });
        
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
        
		resultDiv.innerHTML = `<div class="success">✅ Inventory item updated!</div>`;
        
		// Clear form
		document.getElementById('updateInventoryId').value = '';
		document.getElementById('updateInventoryPartName').value = '';
		document.getElementById('updateInventoryPrice').value = '';
	} catch (error) {
		resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
	}
}

async function deleteInventoryItem() {
	const resultDiv = document.getElementById('delete-inventory-result');
	if (!authToken) {
		resultDiv.innerHTML = '<div class="error">Please login first!</div>';
		return;
	}
	const inventoryId = document.getElementById('deleteInventoryId').value;
    
	if (!inventoryId) {
		resultDiv.innerHTML = '<div class="error">Please enter an inventory ID!</div>';
		return;
	}
    
	if (!confirm(`Are you sure you want to delete inventory item ${inventoryId}?`)) {
		return;
	}
    
	try {
		const response = await apiFetch(`/inventory/${inventoryId}`, { method: 'DELETE' });
        
		const data = await response.json();
        
		if (response.status === 409) {
			resultDiv.innerHTML = `<div class="error">❌ Cannot delete inventory item!<br>${data.error || 'Item is associated with service tickets.'}<br><br>💡 Tip: Remove this part from service tickets first.</div>`;
			return;
		}
        
		if (!response.ok) {
			throw new Error(data.error || `HTTP error! status: ${response.status}`);
		}
        
		resultDiv.innerHTML = `<div class="success">✅ Inventory item deleted!</div>`;
		document.getElementById('deleteInventoryId').value = '';
        
		// Refresh inventory list
		setTimeout(() => refreshInventory(), 500);
	} catch (error) {
		resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
	}
}

// Additional Service Ticket Functions
async function createServiceTicket() {
	const resultDiv = document.getElementById('create-ticket-result');
	if (!authToken) {
		resultDiv.innerHTML = '<div class="error">Please login first!</div>';
		return;
	}
	const customerId = document.getElementById('ticketCustomerId').value;
	const description = document.getElementById('ticketDescription').value;
	const vehicleYear = document.getElementById('ticketVehicleYear').value;
	const vehicleMake = document.getElementById('ticketVehicleMake').value;
	const vehicleModel = document.getElementById('ticketVehicleModel').value;
	const vehicleVin = document.getElementById('ticketVehicleVin').value;
	const mechanicId = document.getElementById('ticketMechanicId') ? document.getElementById('ticketMechanicId').value : '';
	const estimatedCost = document.getElementById('ticketEstimatedCost').value;
	const status = document.getElementById('ticketStatus').value;
    
	if (!customerId || !description) {
		resultDiv.innerHTML = '<div class="error">Please enter customer ID and description!</div>';
		return;
	}
    
	const ticketData = {
		customer_id: parseInt(customerId),
		description: description,
		status: status
	};
    
	if (vehicleYear) ticketData.vehicle_year = parseInt(vehicleYear);
	if (vehicleMake) ticketData.vehicle_make = vehicleMake;
	if (vehicleModel) ticketData.vehicle_model = vehicleModel;
	if (vehicleVin) ticketData.vehicle_vin = vehicleVin;
	if (mechanicId) ticketData.mechanic_id = parseInt(mechanicId);
	if (estimatedCost) ticketData.estimated_cost = parseFloat(estimatedCost);
    
	try {
		const response = await apiFetch(`/service-tickets/`, { method: 'POST', json: ticketData });
        
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
        
		const data = await response.json();
		resultDiv.innerHTML = `<div class="success">✅ Service ticket created! ID: ${data.id}</div>`;
        
		// Clear form
		document.getElementById('ticketCustomerId').value = '';
		document.getElementById('ticketDescription').value = '';
		document.getElementById('ticketVehicleYear').value = '';
		document.getElementById('ticketVehicleMake').value = '';
		document.getElementById('ticketVehicleModel').value = '';
		document.getElementById('ticketVehicleVin').value = '';
		document.getElementById('ticketEstimatedCost').value = '';
		document.getElementById('ticketStatus').value = 'Open';
        
		// Refresh ticket list
		setTimeout(() => refreshTickets(), 500);
	} catch (error) {
		resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
	}
}

async function getTicketById() {
	const resultDiv = document.getElementById('get-ticket-result');
	const ticketId = document.getElementById('getTicketId').value;
    
	if (!ticketId) {
		resultDiv.innerHTML = '<div class="error">Please enter a ticket ID!</div>';
		return;
	}
    
	resultDiv.innerHTML = '<div class="loading">Loading ticket...</div>';
    
	try {
		const response = await apiFetch(`/service-tickets/${ticketId}`);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const ticket = await response.json();
		const vehicleInfo = ticket.vehicle_year || ticket.vehicle_make || ticket.vehicle_model
			? `${ticket.vehicle_year || ''} ${ticket.vehicle_make || ''} ${ticket.vehicle_model || ''}`.trim()
			: 'Not specified';
		const customerName = ticket.customer 
			? `${ticket.customer.first_name} ${ticket.customer.last_name}`
			: `Customer ID: ${ticket.customer_id}`;
		const mechanicsList = ticket.mechanics && ticket.mechanics.length > 0
			? ticket.mechanics.map(m => `${m.first_name} ${m.last_name}`).join(', ')
			: 'Not assigned';
		// Parts rendering
		let partsHtml = '';
		if (ticket.parts && Array.isArray(ticket.parts) && ticket.parts.length > 0) {
			partsHtml = `<p><b>Parts:</b> ` + ticket.parts.map(p => `${p.name || p.part_name || 'Part'} (ID: ${p.id}${p.quantity ? ', Qty: ' + p.quantity : ''})`).join(', ') + `</p>`;
		} else if (ticket.inventory && Array.isArray(ticket.inventory) && ticket.inventory.length > 0) {
			partsHtml = `<p><b>Parts:</b> ` + ticket.inventory.map(p => `${p.name || p.part_name || 'Part'} (ID: ${p.id}${p.quantity ? ', Qty: ' + p.quantity : ''})`).join(', ') + `</p>`;
		}
		resultDiv.style.display = '';
		resultDiv.innerHTML = `
			<div class="data-card">
				<h3>Ticket #${ticket.id}</h3>
				<p><b>Vehicle:</b> ${vehicleInfo}</p>
				${ticket.vehicle_vin ? `<p><b>VIN:</b> ${ticket.vehicle_vin}</p>` : ''}
				<p><b>Description:</b> ${ticket.description}</p>
				<p><b>Status:</b> ${ticket.status || 'Open'}</p>
				<p><b>Customer:</b> ${customerName}</p>
				<p><b>Mechanic(s):</b> ${mechanicsList}</p>
				${partsHtml}
				${ticket.estimated_cost ? `<p><b>Estimated Cost:</b> $${ticket.estimated_cost.toFixed(2)}</p>` : ''}
				${ticket.actual_cost ? `<p><b>Actual Cost:</b> $${ticket.actual_cost.toFixed(2)}</p>` : ''}
			</div>
		`;
	} catch (error) {
		resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
	}
}

async function updateServiceTicket() {
	const resultDiv = document.getElementById('update-ticket-result');
	if (!authToken) {
		resultDiv.innerHTML = '<div class="error">Please login first!</div>';
		return;
	}
	const ticketId = document.getElementById('updateTicketId').value;
	const description = document.getElementById('updateTicketDescription').value;
	const actualCost = document.getElementById('updateTicketActualCost').value;
	const status = document.getElementById('updateTicketStatus').value;
	const vehicleYear = document.getElementById('updateTicketVehicleYear').value;
	const vehicleMake = document.getElementById('updateTicketVehicleMake').value;
	const vehicleModel = document.getElementById('updateTicketVehicleModel').value;
	const vehicleVin = document.getElementById('updateTicketVehicleVin').value;
	const estimatedCost = document.getElementById('updateTicketEstimatedCost').value;
    
	if (!ticketId) {
		resultDiv.innerHTML = '<div class="error">Please enter a ticket ID!</div>';
		return;
	}
    
	const updateData = {};
	if (description) updateData.description = description;
	if (actualCost) updateData.actual_cost = parseFloat(actualCost);
	if (status) updateData.status = status;
	if (vehicleYear) updateData.vehicle_year = parseInt(vehicleYear);
	if (vehicleMake) updateData.vehicle_make = vehicleMake;
	if (vehicleModel) updateData.vehicle_model = vehicleModel;
	if (vehicleVin) updateData.vehicle_vin = vehicleVin;
	if (estimatedCost) updateData.estimated_cost = parseFloat(estimatedCost);
    
	if (Object.keys(updateData).length === 0) {
		resultDiv.innerHTML = '<div class="error">Please enter at least one field to update!</div>';
		return;
	}
    
	try {
		const response = await apiFetch(`/service-tickets/${ticketId}`, { method: 'PUT', json: updateData });
        
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
        
		resultDiv.innerHTML = `<div class="success">✅ Service ticket updated!</div>`;
        
		// Clear form
		document.getElementById('updateTicketId').value = '';
		document.getElementById('updateTicketDescription').value = '';
		document.getElementById('updateTicketActualCost').value = '';
		document.getElementById('updateTicketStatus').value = '';
		document.getElementById('updateTicketVehicleYear').value = '';
		document.getElementById('updateTicketVehicleMake').value = '';
		document.getElementById('updateTicketVehicleModel').value = '';
		document.getElementById('updateTicketVehicleVin').value = '';
		document.getElementById('updateTicketEstimatedCost').value = '';
	} catch (error) {
		resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
	}
}

async function deleteServiceTicket() {
	const resultDiv = document.getElementById('delete-ticket-result');
	if (!authToken) {
		resultDiv.innerHTML = '<div class="error">Please login first!</div>';
		return;
	}
	const ticketId = document.getElementById('deleteTicketId').value;
    
	if (!ticketId) {
		resultDiv.innerHTML = '<div class="error">Please enter a ticket ID!</div>';
		return;
	}
    
	if (!confirm(`Are you sure you want to delete service ticket ${ticketId}?`)) {
		return;
	}
    
	try {
		const response = await apiFetch(`/service-tickets/${ticketId}`, { method: 'DELETE' });
        
		const data = await response.json();
        
		if (!response.ok) {
			throw new Error(data.error || `HTTP error! status: ${response.status}`);
		}
        
		resultDiv.innerHTML = `<div class="success">✅ Service ticket deleted!</div>`;
		document.getElementById('deleteTicketId').value = '';
        
		// Refresh ticket list
		setTimeout(() => refreshTickets(), 500);
	} catch (error) {
		resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
	}
}

async function assignMechanicToTicket() {
	const resultDiv = document.getElementById('assign-mechanic-result');
	if (!authToken) {
		resultDiv.innerHTML = '<div class="error">Please login first!</div>';
		return;
	}
	const ticketId = document.getElementById('assignTicketId').value;
	const mechanicId = document.getElementById('assignMechanicId').value;
    
	if (!ticketId || !mechanicId) {
		resultDiv.innerHTML = '<div class="error">Please enter both ticket ID and mechanic ID!</div>';
		return;
	}
    
	try {
		const response = await apiFetch(`/service-tickets/${ticketId}/assign-mechanic/${mechanicId}`, { method: 'PUT' });
        
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
        
		resultDiv.innerHTML = `<div class="success">✅ Mechanic assigned to ticket!</div>`;
        
		// Clear form
		document.getElementById('assignTicketId').value = '';
		document.getElementById('assignMechanicId').value = '';
	} catch (error) {
		resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
	}
}

async function removeMechanicFromTicket() {
	const resultDiv = document.getElementById('remove-mechanic-result');
	if (!authToken) {
		resultDiv.innerHTML = '<div class="error">Please login first!</div>';
		return;
	}
	const ticketId = document.getElementById('removeMechanicTicketId').value;
	const mechanicId = document.getElementById('removeMechanicId').value;
    
	if (!ticketId || !mechanicId) {
		resultDiv.innerHTML = '<div class="error">Please enter both ticket ID and mechanic ID!</div>';
		return;
	}
    
	try {
		const response = await apiFetch(`/service-tickets/${ticketId}/remove-mechanic/${mechanicId}`, { method: 'PUT' });
        
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
        
		resultDiv.innerHTML = `<div class="success">✅ Mechanic removed from ticket!</div>`;
        
		// Clear form
		document.getElementById('removeMechanicTicketId').value = '';
		document.getElementById('removeMechanicId').value = '';
	} catch (error) {
		resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
	}
}

async function getTicketsByCustomer() {
	const resultDiv = document.getElementById('tickets-by-customer-result');
	const customerId = document.getElementById('ticketsByCustomerId').value;
    
	if (!customerId) {
		resultDiv.innerHTML = '<div class="error">Please enter a customer ID!</div>';
		return;
	}
    
	resultDiv.innerHTML = '<div class="loading">Loading customer tickets...</div>';
    
	try {
		const response = await apiFetch(`/service-tickets/customer/${customerId}`);
        
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
        
		const data = await response.json();
        
		if (data.length === 0) {
			resultDiv.innerHTML = '<p>No tickets found for this customer.</p>';
			return;
		}
        
		let html = '';
		data.forEach(ticket => {
			const vehicleInfo = ticket.vehicle_year || ticket.vehicle_make || ticket.vehicle_model
				? `${ticket.vehicle_year || ''} ${ticket.vehicle_make || ''} ${ticket.vehicle_model || ''}`.trim()
				: 'Not specified';
            
			html += `
				<div class="data-card">
					<h3>Ticket #${ticket.id}</h3>
					<p><b>Vehicle:</b> ${vehicleInfo}</p>
					<p><b>Description:</b> ${ticket.description}</p>
					<p><b>Status:</b> ${ticket.status || 'Open'}</p>
					${ticket.estimated_cost ? `<p><b>Estimated Cost:</b> $${ticket.estimated_cost.toFixed(2)}</p>` : ''}
				</div>
			`;
		});
        
		resultDiv.style.display = '';
		resultDiv.innerHTML = html;
	} catch (error) {
		resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
	}
}

async function getTicketsByMechanic() {
	const resultDiv = document.getElementById('tickets-by-mechanic-result');
	const mechanicId = document.getElementById('ticketsByMechanicId').value;
    
	if (!mechanicId) {
		resultDiv.innerHTML = '<div class="error">Please enter a mechanic ID!</div>';
		return;
	}
    
	resultDiv.innerHTML = '<div class="loading">Loading mechanic tickets...</div>';
    
	try {
		const response = await apiFetch(`/service-tickets/mechanic/${mechanicId}`);
        
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
        
		const data = await response.json();
        
		if (data.length === 0) {
			resultDiv.innerHTML = '<p>No tickets found for this mechanic.</p>';
			return;
		}
        
		let html = '';
		data.forEach(ticket => {
			const vehicleInfo = ticket.vehicle_year || ticket.vehicle_make || ticket.vehicle_model
				? `${ticket.vehicle_year || ''} ${ticket.vehicle_make || ''} ${ticket.vehicle_model || ''}`.trim()
				: 'Not specified';
            
			const customerName = ticket.customer 
				? `${ticket.customer.first_name} ${ticket.customer.last_name}`
				: `Customer ID: ${ticket.customer_id}`;
            
			html += `
				<div class="data-card">
					<h3>Ticket #${ticket.id}</h3>
					<p><b>Customer:</b> ${customerName}</p>
					<p><b>Vehicle:</b> ${vehicleInfo}</p>
					<p><b>Description:</b> ${ticket.description}</p>
					<p><b>Status:</b> ${ticket.status || 'Open'}</p>
					${ticket.estimated_cost ? `<p><b>Estimated Cost:</b> $${ticket.estimated_cost.toFixed(2)}</p>` : ''}
				</div>
			`;
		});
        
		resultDiv.style.display = '';
		resultDiv.innerHTML = html;
	} catch (error) {
		resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
	}
}

// Initialize
updateAuthStatus();
