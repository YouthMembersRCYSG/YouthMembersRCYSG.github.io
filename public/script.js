// Set the API base URL based on the protocol
const API_BASE = window.location.protocol === 'file:' ? 'http://127.0.0.1:4000' : '';

// Toast notification functions
function showToast(message, type = 'info') {
    const toastContainer = getOrCreateToastContainer();
    const toastId = 'toast-' + Date.now();
    
    const toastColors = {
        'success': 'text-bg-success',
        'error': 'text-bg-danger',
        'warning': 'text-bg-warning',
        'info': 'text-bg-info'
    };
    
    const toastHtml = `
        <div class="toast ${toastColors[type]}" id="${toastId}" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-body d-flex justify-content-between align-items-center">
                <span>${message}</span>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    
    toastContainer.innerHTML += toastHtml;
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { autohide: type !== 'info' || message.includes('Updating'), delay: 3000 });
    toast.show();
    
    return toastId;
}

function hideToast(toastId) {
    const toastElement = document.getElementById(toastId);
    if (toastElement) {
        const toast = bootstrap.Toast.getInstance(toastElement);
        if (toast) toast.hide();
    }
}

function getOrCreateToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '1055';
        document.body.appendChild(container);
    }
    return container;
}

let volunteerFormCount = 1;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    calculateHours(0); // Calculate hours for the first form
});

// Setup event listeners
function setupEventListeners() {
    // Auto-search functionality for volunteer forms
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('volunteer-search')) {
            handleVolunteerSearch(e);
        }
        
        // Auto-calculate hours when time changes
        if (e.target.classList.contains('start-time') || e.target.classList.contains('end-time')) {
            const formItem = e.target.closest('.volunteer-form-item');
            const index = formItem.getAttribute('data-index');
            calculateHours(index);
        }
    });

    // Update default times when changed
    document.getElementById('defaultDate').addEventListener('change', updateDefaultDate);
    document.getElementById('defaultStartTime').addEventListener('change', updateDefaultTimes);
    document.getElementById('defaultEndTime').addEventListener('change', updateDefaultTimes);
}

// Handle volunteer search with debouncing
let searchTimeouts = {};
function handleVolunteerSearch(e) {
    const index = e.target.getAttribute('data-index');
    const query = e.target.value.trim();
    const searchResults = document.querySelector(`.search-results[data-index="${index}"]`);
    
    clearTimeout(searchTimeouts[index]);
    
    if (query.length < 2) {
        searchResults.style.display = 'none';
        return;
    }
    
    searchTimeouts[index] = setTimeout(() => searchVolunteers(query, index), 300);
}

// Search volunteers function
async function searchVolunteers(query, index) {
    try {
        const response = await fetch(`${API_BASE}/api/volunteers/search?q=${encodeURIComponent(query)}`);
        const volunteers = await response.json();
        
        displaySearchResults(volunteers, index);
    } catch (error) {
        console.error('Search error:', error);
    }
}

// Display search results
function displaySearchResults(volunteers, index) {
    const searchResults = document.querySelector(`.search-results[data-index="${index}"]`);
    
    if (volunteers.length === 0) {
        searchResults.style.display = 'none';
        return;
    }
    
    const resultsHtml = volunteers.map(volunteer => `
        <div class="search-result-item" onclick="fillVolunteerForm(${index}, '${volunteer._id}')">
            <strong>${volunteer.name}</strong><br>
            <small>${volunteer.email} | ${volunteer.mobileNo}</small>
        </div>
    `).join('');
    
    searchResults.innerHTML = resultsHtml;
    searchResults.style.display = 'block';
}

// Fill form with selected volunteer data
async function fillVolunteerForm(index, volunteerId) {
    try {
        const response = await fetch(`${API_BASE}/api/volunteers/${volunteerId}`);
        const volunteer = await response.json();
        
        const formItem = document.querySelector(`.volunteer-form-item[data-index="${index}"]`);
        formItem.querySelector('input[name="name"]').value = volunteer.name;
        formItem.querySelector('input[name="email"]').value = volunteer.email;
        formItem.querySelector('input[name="mobileNo"]').value = volunteer.mobileNo;
        formItem.querySelector('select[name="role"]').value = volunteer.role;
        
        // Hide search results
        const searchResults = document.querySelector(`.search-results[data-index="${index}"]`);
        const searchInput = document.querySelector(`.volunteer-search[data-index="${index}"]`);
        searchResults.style.display = 'none';
        searchInput.value = '';
    } catch (error) {
        console.error('Error loading volunteer:', error);
    }
}

// Add new volunteer form
function addVolunteerForm() {
    const container = document.getElementById('volunteerFormsContainer');
    const defaultDate = document.getElementById('defaultDate').value;
    const defaultStartTime = document.getElementById('defaultStartTime').value;
    const defaultEndTime = document.getElementById('defaultEndTime').value;
    
    const formHtml = `
        <div class="volunteer-form-item border rounded p-3 mb-3" data-index="${volunteerFormCount}">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="mb-0">Volunteer #${volunteerFormCount + 1}</h6>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeVolunteerForm(${volunteerFormCount})">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>

            <!-- Search for existing volunteer -->
            <div class="row mb-3">
                <div class="col-md-8">
                    <label class="form-label">Search Existing Volunteer (Auto-fill)</label>
                    <input type="text" class="form-control volunteer-search" 
                           placeholder="Search by name, email, or mobile number..." data-index="${volunteerFormCount}">
                    <div class="search-results" data-index="${volunteerFormCount}"></div>
                </div>
                <div class="col-md-4 d-flex align-items-end">
                    <button type="button" class="btn btn-secondary w-100" onclick="clearVolunteerForm(${volunteerFormCount})">
                        <i class="fas fa-broom me-2"></i>Clear
                    </button>
                </div>
            </div>

            <!-- Volunteer Information -->
            <div class="row mb-3">
                <div class="col-md-6">
                    <label class="form-label">Full Name *</label>
                    <input type="text" class="form-control" name="name" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Email *</label>
                    <input type="email" class="form-control" name="email" required>
                </div>
            </div>

            <div class="row mb-3">
                <div class="col-md-6">
                    <label class="form-label">Mobile Number *</label>
                    <input type="tel" class="form-control" name="mobileNo" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Role *</label>
                    <select class="form-select" name="role" required>
                        <option value="">Select Role</option>
                        <option value="Registration">Registration</option>
                        <option value="Usher">Usher</option>
                        <option value="Technical Support">Technical Support</option>
                        <option value="Photography">Photography</option>
                        <option value="Logistics">Logistics</option>
                        <option value="Crowd Control">Crowd Control</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
            </div>

            <!-- Individual Date and Timing -->
            <div class="row mb-3">
                <div class="col-md-4">
                    <label class="form-label">Date *</label>
                    <input type="date" class="form-control volunteer-date" name="date" required value="${defaultDate}">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Start Time *</label>
                    <input type="time" class="form-control start-time" name="startTime" required value="${defaultStartTime}">
                </div>
                <div class="col-md-4">
                    <label class="form-label">End Time *</label>
                    <input type="time" class="form-control end-time" name="endTime" required value="${defaultEndTime}">
                </div>
            </div>
            
            <div class="row mb-3">
                <div class="col-md-4">
                    <label class="form-label">Hours Volunteered</label>
                    <input type="number" class="form-control hours-display" name="hoursVolunteered" step="0.5" min="0" readonly>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', formHtml);
    volunteerFormCount++;
    
    // Calculate hours for the new form
    calculateHours(volunteerFormCount - 1);
    
    // Show remove button for first form if there are now multiple forms
    if (volunteerFormCount > 1) {
        const firstRemoveBtn = document.querySelector('.volunteer-form-item[data-index="0"] .btn-outline-danger');
        firstRemoveBtn.style.display = 'block';
    }
}

// Remove volunteer form
function removeVolunteerForm(index) {
    const formItem = document.querySelector(`.volunteer-form-item[data-index="${index}"]`);
    formItem.remove();
    
    // Update volunteer numbers
    updateVolunteerNumbers();
    
    // Hide remove button for first form if only one remains
    const remainingForms = document.querySelectorAll('.volunteer-form-item');
    if (remainingForms.length === 1) {
        const firstRemoveBtn = remainingForms[0].querySelector('.btn-outline-danger');
        firstRemoveBtn.style.display = 'none';
    }
}

// Update volunteer numbers after removal
function updateVolunteerNumbers() {
    const forms = document.querySelectorAll('.volunteer-form-item');
    forms.forEach((form, index) => {
        const header = form.querySelector('h6');
        header.textContent = `Volunteer #${index + 1}`;
    });
}

// Clear individual volunteer form
function clearVolunteerForm(index) {
    const formItem = document.querySelector(`.volunteer-form-item[data-index="${index}"]`);
    const inputs = formItem.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]');
    const selects = formItem.querySelectorAll('select');
    
    inputs.forEach(input => input.value = '');
    selects.forEach(select => select.selectedIndex = 0);
    
    // Reset to default times
    const defaultStartTime = document.getElementById('defaultStartTime').value;
    const defaultEndTime = document.getElementById('defaultEndTime').value;
    formItem.querySelector('.start-time').value = defaultStartTime;
    formItem.querySelector('.end-time').value = defaultEndTime;
    
    // Recalculate hours
    calculateHours(index);
    
    // Hide search results
    const searchResults = formItem.querySelector('.search-results');
    const searchInput = formItem.querySelector('.volunteer-search');
    searchResults.style.display = 'none';
    searchInput.value = '';
}

// Calculate hours volunteered
function calculateHours(index) {
    const formItem = document.querySelector(`.volunteer-form-item[data-index="${index}"]`);
    if (!formItem) return;
    
    const startTime = formItem.querySelector('.start-time').value;
    const endTime = formItem.querySelector('.end-time').value;
    const hoursDisplay = formItem.querySelector('.hours-display');
    
    if (startTime && endTime) {
        const start = new Date(`2000-01-01 ${startTime}`);
        const end = new Date(`2000-01-01 ${endTime}`);
        
        if (end > start) {
            const diffMs = end - start;
            const diffHours = diffMs / (1000 * 60 * 60);
            hoursDisplay.value = diffHours.toFixed(1);
        } else {
            hoursDisplay.value = '0';
        }
    } else {
        hoursDisplay.value = '';
    }
}

// Update default times for all forms
function updateDefaultTimes() {
    const defaultStartTime = document.getElementById('defaultStartTime').value;
    const defaultEndTime = document.getElementById('defaultEndTime').value;
    
    // Update all forms - apply to all forms unless they've been manually customized
    const forms = document.querySelectorAll('.volunteer-form-item');
    forms.forEach((form, index) => {
        const startTimeInput = form.querySelector('.start-time');
        const endTimeInput = form.querySelector('.end-time');
        
        // Check if the current values are the previous default or empty
        const currentStartTime = startTimeInput.value;
        const currentEndTime = endTimeInput.value;
        
        // Update if empty or if it matches a common default time pattern
        if (!currentStartTime || currentStartTime === '09:00' || currentStartTime === document.getElementById('defaultStartTime').getAttribute('data-previous-value')) {
            startTimeInput.value = defaultStartTime;
        }
        if (!currentEndTime || currentEndTime === '17:00' || currentEndTime === document.getElementById('defaultEndTime').getAttribute('data-previous-value')) {
            endTimeInput.value = defaultEndTime;
        }
        
        calculateHours(index);
    });
    
    // Store current values as previous for next change
    document.getElementById('defaultStartTime').setAttribute('data-previous-value', defaultStartTime);
    document.getElementById('defaultEndTime').setAttribute('data-previous-value', defaultEndTime);
}

// Update default date for all forms
function updateDefaultDate() {
    const defaultDate = document.getElementById('defaultDate').value;
    
    // Update all forms - apply to all forms unless they've been manually customized
    const forms = document.querySelectorAll('.volunteer-form-item');
    forms.forEach((form) => {
        const dateInput = form.querySelector('.volunteer-date');
        
        // Check if the current value is empty or matches previous default
        const currentDate = dateInput.value;
        
        // Update if empty or if it matches the previous default date
        if (!currentDate || currentDate === document.getElementById('defaultDate').getAttribute('data-previous-value')) {
            dateInput.value = defaultDate;
        }
    });
    
    // Store current value as previous for next change
    document.getElementById('defaultDate').setAttribute('data-previous-value', defaultDate);
}

// Submit all volunteers
async function submitAllVolunteers() {
    // Validate common fields
    const commonFields = {
        district: document.getElementById('commonDistrict').value,
        eventName: document.getElementById('commonEventName').value,
        eventId: document.getElementById('commonEventId').value,
        eventFormat: document.getElementById('commonEventFormat').value
    };
    
    // Check if all common fields are filled
    for (const [key, value] of Object.entries(commonFields)) {
        if (!value.trim()) {
            alert(`Please fill in the ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
            return;
        }
    }
    
    // Collect all volunteer data
    const forms = document.querySelectorAll('.volunteer-form-item');
    const volunteers = [];
    
    for (let i = 0; i < forms.length; i++) {
        const form = forms[i];
        
        const volunteerData = {
            ...commonFields,
            name: form.querySelector('input[name="name"]').value,
            email: form.querySelector('input[name="email"]').value,
            mobileNo: form.querySelector('input[name="mobileNo"]').value,
            role: form.querySelector('select[name="role"]').value,
            date: form.querySelector('input[name="date"]').value,
            startTime: form.querySelector('input[name="startTime"]').value,
            endTime: form.querySelector('input[name="endTime"]').value,
            hoursVolunteered: parseFloat(form.querySelector('input[name="hoursVolunteered"]').value) || 0,
            attendance: 'registered',
            remarks: '',
            volunteerShirtTaken: false
        };
        
        // Validate required fields
        const requiredFields = ['name', 'email', 'mobileNo', 'role', 'date', 'startTime', 'endTime'];
        const missingFields = requiredFields.filter(field => !volunteerData[field]);
        
        if (missingFields.length > 0) {
            alert(`Volunteer #${i + 1}: Please fill in ${missingFields.join(', ')}`);
            return;
        }
        
        volunteers.push(volunteerData);
    }
    
    if (volunteers.length === 0) {
        alert('Please add at least one volunteer');
        return;
    }
    
    // Submit each volunteer
    let successCount = 0;
    let errors = [];
    
    for (let i = 0; i < volunteers.length; i++) {
        try {
            const response = await fetch(`${API_BASE}/api/volunteers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(volunteers[i])
            });

            const result = await response.json();
            
            if (response.ok) {
                successCount++;
            } else {
                errors.push(`Volunteer #${i + 1} (${volunteers[i].name}): ${result.error}`);
            }
        } catch (error) {
            errors.push(`Volunteer #${i + 1} (${volunteers[i].name}): ${error.message}`);
        }
    }
    
    // Show results
    if (successCount === volunteers.length) {
        alert(`All ${successCount} volunteers registered successfully!`);
        clearAllForms();
    } else if (successCount > 0) {
        alert(`${successCount} volunteers registered successfully.\n\nErrors:\n${errors.join('\n')}`);
    } else {
        alert(`Failed to register volunteers:\n${errors.join('\n')}`);
    }
}

// Clear all forms
function clearAllForms() {
    // Clear common fields
    document.getElementById('commonDistrict').selectedIndex = 0;
    document.getElementById('commonEventName').value = '';
    document.getElementById('commonEventId').value = '';
    document.getElementById('commonEventFormat').selectedIndex = 0;
    document.getElementById('commonDate').value = '';
    
    // Reset to single volunteer form
    const container = document.getElementById('volunteerFormsContainer');
    container.innerHTML = `
        <div class="volunteer-form-item border rounded p-3 mb-3" data-index="0">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="mb-0">Volunteer #1</h6>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeVolunteerForm(0)" style="display: none;">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>

            <!-- Search for existing volunteer -->
            <div class="row mb-3">
                <div class="col-md-8">
                    <label class="form-label">Search Existing Volunteer (Auto-fill)</label>
                    <input type="text" class="form-control volunteer-search" 
                           placeholder="Search by name, email, or mobile number..." data-index="0">
                    <div class="search-results" data-index="0"></div>
                </div>
                <div class="col-md-4 d-flex align-items-end">
                    <button type="button" class="btn btn-secondary w-100" onclick="clearVolunteerForm(0)">
                        <i class="fas fa-broom me-2"></i>Clear
                    </button>
                </div>
            </div>

            <!-- Volunteer Information -->
            <div class="row mb-3">
                <div class="col-md-6">
                    <label class="form-label">Full Name *</label>
                    <input type="text" class="form-control" name="name" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Email *</label>
                    <input type="email" class="form-control" name="email" required>
                </div>
            </div>

            <div class="row mb-3">
                <div class="col-md-6">
                    <label class="form-label">Mobile Number *</label>
                    <input type="tel" class="form-control" name="mobileNo" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Role *</label>
                    <select class="form-select" name="role" required>
                        <option value="">Select Role</option>
                        <option value="Registration">Registration</option>
                        <option value="Usher">Usher</option>
                        <option value="Technical Support">Technical Support</option>
                        <option value="Photography">Photography</option>
                        <option value="Logistics">Logistics</option>
                        <option value="Crowd Control">Crowd Control</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
            </div>

            <!-- Individual Timing -->
            <div class="row mb-3">
                <div class="col-md-4">
                    <label class="form-label">Start Time *</label>
                    <input type="time" class="form-control start-time" name="startTime" required value="09:00">
                </div>
                <div class="col-md-4">
                    <label class="form-label">End Time *</label>
                    <input type="time" class="form-control end-time" name="endTime" required value="17:00">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Hours Volunteered</label>
                    <input type="number" class="form-control hours-display" name="hoursVolunteered" step="0.5" min="0" readonly>
                </div>
            </div>
        </div>
    `;
    
    volunteerFormCount = 1;
    calculateHours(0);
}

// Attendance Tab Functions
async function loadAttendanceByEventId() {
    const eventId = document.getElementById('attendanceEventId').value.trim();
    
    if (!eventId) {
        alert('Please enter an Event ID');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/volunteers/event/${encodeURIComponent(eventId)}`);
        const volunteers = await response.json();
        
        if (volunteers.length === 0) {
            alert('No volunteers found for this event');
            document.getElementById('attendanceTableContainer').style.display = 'none';
            document.getElementById('eventInfo').style.display = 'none';
            return;
        }
        
        // Display event info
        const eventInfo = document.getElementById('eventInfo');
        const eventDetails = document.getElementById('eventDetails');
        eventDetails.innerHTML = `
            <strong>Event:</strong> ${volunteers[0].eventName} (${volunteers[0].eventId})<br>
            <strong>Date:</strong> ${new Date(volunteers[0].date).toLocaleDateString()}<br>
            <strong>Format:</strong> ${volunteers[0].eventFormat}<br>
            <strong>District:</strong> ${volunteers[0].district}<br>
            <strong>Total Volunteers:</strong> ${volunteers.length}
        `;
        eventInfo.style.display = 'block';
        
        // Display volunteers table
        displayAttendanceTable(volunteers);
        
    } catch (error) {
        console.error('Error loading attendance:', error);
        alert('Error loading attendance data: ' + error.message);
    }
}

function displayAttendanceList(volunteers) {
    const container = document.getElementById('attendanceList');
    
    if (volunteers.length === 0) {
        container.innerHTML = '<p class="text-muted">No volunteers found for this event.</p>';
        return;
    }
    
    const listHtml = volunteers.map(volunteer => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-2">
                        <h6 class="mb-1">${volunteer.name}</h6>
                        <small class="text-muted">${volunteer.role}</small>
                        <br>
                        <small class="text-muted">${volunteer.email}<br>${volunteer.mobileNo}</small>
                    </div>
                    <div class="col-md-2">
                        <label class="form-label">Start Time</label>
                        <input type="time" class="form-control form-control-sm" 
                               value="${volunteer.startTime || ''}"
                               onchange="updateTiming('${volunteer._id}', 'startTime', this.value)">
                        <label class="form-label mt-2">End Time</label>
                        <input type="time" class="form-control form-control-sm" 
                               value="${volunteer.endTime || ''}"
                               onchange="updateTiming('${volunteer._id}', 'endTime', this.value)">
                        <div class="mt-1">
                            <small class="text-muted">Hours: <span id="hours-${volunteer._id}">${volunteer.hoursVolunteered || 0}</span></small>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <label class="form-label">Attendance</label>
                        <select class="form-select form-select-sm" onchange="updateAttendance('${volunteer._id}', this.value)">
                            <option value="registered" ${volunteer.attendance === 'registered' ? 'selected' : ''}>Registered</option>
                            <option value="attended" ${volunteer.attendance === 'attended' ? 'selected' : ''}>Attended</option>
                            <option value="no show" ${volunteer.attendance === 'no show' ? 'selected' : ''}>No Show</option>
                        </select>
                    </div>
                    <div class="col-md-2">
                        <label class="form-label">Shirt Collected</label>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" ${volunteer.volunteerShirtTaken ? 'checked' : ''}
                                   onchange="updateShirtStatus('${volunteer._id}', this.checked)">
                        </div>
                        <label class="form-label mt-2">Remarks</label>
                        <select class="form-select form-select-sm" onchange="updateRemarks('${volunteer._id}', this.value)">
                            <option value="" ${volunteer.remarks === '' ? 'selected' : ''}>None</option>
                            <option value="Warning" ${volunteer.remarks === 'Warning' ? 'selected' : ''}>Warning</option>
                            <option value="Blacklist" ${volunteer.remarks === 'Blacklist' ? 'selected' : ''}>Blacklist</option>
                        </select>
                    </div>
                    <div class="col-md-2">
                        <div class="d-grid gap-2">
                            <button type="button" class="btn btn-sm btn-outline-primary" 
                                    onclick="viewVolunteerDetails('${volunteer._id}')">
                                <i class="fas fa-eye"></i> Details
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-danger" 
                                    onclick="deleteVolunteer('${volunteer._id}', '${volunteer.name}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = listHtml;
}

async function updateAttendance(volunteerId, attendance) {
    try {
        const response = await fetch(`${API_BASE}/api/volunteers/${volunteerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ attendance })
        });

        if (!response.ok) {
            const error = await response.json();
            alert('Error updating attendance: ' + error.error);
        }
    } catch (error) {
        console.error('Error updating attendance:', error);
        alert('Error updating attendance');
    }
}

async function updateShirtStatus(volunteerId, shirtTaken) {
    try {
        const response = await fetch(`${API_BASE}/api/volunteers/${volunteerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ volunteerShirtTaken: shirtTaken })
        });

        if (!response.ok) {
            const error = await response.json();
            alert('Error updating shirt status: ' + error.error);
        }
    } catch (error) {
        console.error('Error updating shirt status:', error);
        alert('Error updating shirt status');
    }
}

async function updateRemarks(volunteerId, remarks) {
    try {
        const response = await fetch(`${API_BASE}/api/volunteers/${volunteerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ remarks })
        });

        if (!response.ok) {
            const error = await response.json();
            alert('Error updating remarks: ' + error.error);
        }
    } catch (error) {
        console.error('Error updating remarks:', error);
        alert('Error updating remarks');
    }
}

async function updateTiming(volunteerId, field, value) {
    try {
        const updateData = {};
        updateData[field] = value;
        
        const response = await fetch(`${API_BASE}/api/volunteers/${volunteerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
        });

        if (response.ok) {
            const updatedVolunteer = await response.json();
            // Update the hours display
            const hoursElement = document.getElementById(`hours-${volunteerId}`);
            if (hoursElement) {
                hoursElement.textContent = updatedVolunteer.hoursVolunteered || 0;
            }
        } else {
            const error = await response.json();
            alert('Error updating timing: ' + error.error);
        }
    } catch (error) {
        console.error('Error updating timing:', error);
        alert('Error updating timing');
    }
}

async function viewVolunteerDetails(volunteerId) {
    try {
        const response = await fetch(`${API_BASE}/api/volunteers/${volunteerId}`);
        const volunteer = await response.json();
        
        // Create a modal or detailed view
        const detailsHtml = `
            <div class="modal fade" id="volunteerDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Volunteer Details - ${volunteer.name}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>Personal Information</h6>
                                    <p><strong>Name:</strong> ${volunteer.name}</p>
                                    <p><strong>Email:</strong> ${volunteer.email}</p>
                                    <p><strong>Mobile:</strong> ${volunteer.mobileNo}</p>
                                    <p><strong>Role:</strong> ${volunteer.role}</p>
                                </div>
                                <div class="col-md-6">
                                    <h6>Event Information</h6>
                                    <p><strong>Event:</strong> ${volunteer.eventName}</p>
                                    <p><strong>Event ID:</strong> ${volunteer.eventId}</p>
                                    <p><strong>Format:</strong> ${volunteer.eventFormat}</p>
                                    <p><strong>District:</strong> ${volunteer.district}</p>
                                    <p><strong>Date:</strong> ${new Date(volunteer.date).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div class="row mt-3">
                                <div class="col-md-6">
                                    <h6>Timing & Hours</h6>
                                    <p><strong>Start Time:</strong> ${volunteer.startTime}</p>
                                    <p><strong>End Time:</strong> ${volunteer.endTime}</p>
                                    <p><strong>Hours Volunteered:</strong> ${volunteer.hoursVolunteered}</p>
                                </div>
                                <div class="col-md-6">
                                    <h6>Status</h6>
                                    <p><strong>Attendance:</strong> ${volunteer.attendance}</p>
                                    <p><strong>Shirt Taken:</strong> ${volunteer.volunteerShirtTaken ? 'Yes' : 'No'}</p>
                                    <p><strong>Remarks:</strong> ${volunteer.remarks || 'None'}</p>
                                    <p><strong>Serial Number:</strong> ${volunteer.serialNumber}</p>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if present
        const existingModal = document.getElementById('volunteerDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', detailsHtml);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('volunteerDetailsModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error loading volunteer details:', error);
        alert('Error loading volunteer details');
    }
}

async function deleteVolunteer(volunteerId, volunteerName) {
    if (!confirm(`Are you sure you want to delete ${volunteerName}? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/volunteers/${volunteerId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Volunteer deleted successfully');
            // Reload the attendance list
            const eventId = document.getElementById('attendanceEventId').value.trim();
            if (eventId) {
                loadAttendanceByEventId();
            }
        } else {
            const error = await response.json();
            alert('Error deleting volunteer: ' + error.error);
        }
    } catch (error) {
        console.error('Error deleting volunteer:', error);
        alert('Error deleting volunteer');
    }
}

// Mastersheet Tab Functions
async function generatePDF() {
    const eventId = document.getElementById('pdfEventId').value.trim();
    
    if (!eventId) {
        alert('Please enter an Event ID');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/volunteers/generate-pdf?eventId=${encodeURIComponent(eventId)}`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `volunteer-attendance-${eventId}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            alert('PDF generated and downloaded successfully!');
        } else {
            const error = await response.json();
            alert('Error generating PDF: ' + error.error);
        }
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF');
    }
}

// Load volunteers for attendance taking
async function loadEventVolunteers() {
    const eventId = document.getElementById('attendanceEventId').value.trim();
    
    if (!eventId) {
        alert('Please enter an Event ID');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/volunteers?eventId=${encodeURIComponent(eventId)}`);
        const volunteers = await response.json();
        
        if (volunteers.length === 0) {
            alert('No volunteers found for this event');
            return;
        }
        
        displayEventInfo(volunteers[0]);
        displayAttendanceTable(volunteers);
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Display event information
function displayEventInfo(volunteer) {
    const eventInfo = document.getElementById('eventInfo');
    const eventDetails = document.getElementById('eventDetails');
    
    eventDetails.innerHTML = `
        <strong>Event:</strong> ${volunteer.eventName} (${volunteer.eventId})<br>
        <strong>Date:</strong> ${new Date(volunteer.date).toLocaleDateString()}<br>
        <strong>Format:</strong> ${volunteer.eventFormat}
    `;
    
    eventInfo.style.display = 'block';
}

// Display attendance table
function displayAttendanceTable(volunteers) {
    const tableBody = document.getElementById('attendanceTableBody');
    const tableContainer = document.getElementById('attendanceTableContainer');
    
    const tableHtml = volunteers.map(volunteer => `
        <tr>
            <td>${volunteer.serialNumber}</td>
            <td>${volunteer.name}</td>
            <td>${volunteer.role}</td>
            <td>
                <input type="time" class="form-control form-control-sm" value="${volunteer.startTime}" 
                       onchange="updateAttendance('${volunteer._id}', 'startTime', this.value)"> - 
                <input type="time" class="form-control form-control-sm" value="${volunteer.endTime}" 
                       onchange="updateAttendance('${volunteer._id}', 'endTime', this.value)">
            </td>
            <td>
                <select class="form-select form-select-sm" onchange="updateAttendance('${volunteer._id}', 'attendance', this.value)">
                    <option value="registered" ${volunteer.attendance === 'registered' ? 'selected' : ''}>Registered</option>
                    <option value="attended" ${volunteer.attendance === 'attended' ? 'selected' : ''}>Attended</option>
                    <option value="no show" ${volunteer.attendance === 'no show' ? 'selected' : ''}>No Show</option>
                </select>
            </td>
            <td>
                <select class="form-select form-select-sm" onchange="updateAttendance('${volunteer._id}', 'volunteerShirtTaken', this.value === 'true')">
                    <option value="false" ${!volunteer.volunteerShirtTaken ? 'selected' : ''}>No</option>
                    <option value="true" ${volunteer.volunteerShirtTaken ? 'selected' : ''}>Yes</option>
                </select>
            </td>
            <td>
                <select class="form-select form-select-sm" onchange="updateAttendance('${volunteer._id}', 'shirtSize', this.value)" ${!volunteer.volunteerShirtTaken ? 'disabled' : ''}>
                    <option value="">-</option>
                    <option value="XS" ${volunteer.shirtSize === 'XS' ? 'selected' : ''}>XS</option>
                    <option value="S" ${volunteer.shirtSize === 'S' ? 'selected' : ''}>S</option>
                    <option value="M" ${volunteer.shirtSize === 'M' ? 'selected' : ''}>M</option>
                    <option value="L" ${volunteer.shirtSize === 'L' ? 'selected' : ''}>L</option>
                    <option value="XL" ${volunteer.shirtSize === 'XL' ? 'selected' : ''}>XL</option>
                    <option value="XXL" ${volunteer.shirtSize === 'XXL' ? 'selected' : ''}>XXL</option>
                </select>
            </td>
            <td>
                <select class="form-select form-select-sm" onchange="updateAttendance('${volunteer._id}', 'remarks', this.value)">
                    <option value="" ${volunteer.remarks === '' ? 'selected' : ''}>None</option>
                    <option value="Warning" ${volunteer.remarks === 'Warning' ? 'selected' : ''}>Warning</option>
                    <option value="Blacklist" ${volunteer.remarks === 'Blacklist' ? 'selected' : ''}>Blacklist</option>
                </select>
            </td>
            <td>
                <button class="btn btn-sm btn-success" onclick="updateAttendance('${volunteer._id}', 'attendance', 'attended')">
                    <i class="fas fa-check"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    tableBody.innerHTML = tableHtml;
    tableContainer.style.display = 'block';
}

// Update attendance information
async function updateAttendance(volunteerId, field, value) {
    try {
        // Show loading indicator
        const loadingToast = showToast('Updating...', 'info');
        
        const response = await fetch(`${API_BASE}/api/volunteers/${volunteerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ [field]: value })
        });
        
        if (response.ok) {
            // Hide loading and show success
            hideToast(loadingToast);
            showToast(`${field === 'attendance' ? 'Attendance' : field} updated successfully!`, 'success');
            
            // Reload the table to reflect changes
            loadAttendanceByEventId();
        } else {
            hideToast(loadingToast);
            const error = await response.json();
            showToast('Error: ' + error.error, 'error');
        }
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

// Generate PDF
async function generatePDF() {
    const eventId = document.getElementById('pdfEventId').value.trim();
    const mastersheetType = document.querySelector('input[name="mastersheetType"]:checked').id;
    
    if (!eventId) {
        alert('Please enter an Event ID');
        return;
    }
    
    try {
        // First, get volunteers to get event info
        const volunteersResponse = await fetch(`${API_BASE}/api/volunteers?eventId=${encodeURIComponent(eventId)}`);
        const volunteers = await volunteersResponse.json();
        
        if (volunteers.length === 0) {
            alert('No volunteers found for this event');
            return;
        }
        
        const type = mastersheetType === 'summaryType' ? 'summary' : 'full';
        const eventData = {
            eventId: eventId,
            eventName: volunteers[0].eventName,
            date: volunteers[0].date,
            type: type
        };
        
        // Show preview info
        const pdfInfo = document.getElementById('pdfInfo');
        const pdfPreview = document.getElementById('pdfPreview');
        
        pdfInfo.innerHTML = `
            <strong>Event:</strong> ${eventData.eventName} (${eventData.eventId})<br>
            <strong>Date:</strong> ${new Date(eventData.date).toLocaleDateString()}<br>
            <strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)} Mastersheet<br>
            <strong>Volunteers:</strong> ${volunteers.length}
        `;
        pdfPreview.style.display = 'block';
        
        // Generate PDF
        const response = await fetch(`${API_BASE}/api/generate-pdf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventData)
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `volunteer-mastersheet-${type}-${eventId}_${new Date(eventData.date).toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            alert(`${type.charAt(0).toUpperCase() + type.slice(1)} mastersheet PDF generated and downloaded successfully!`);
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Load Summary Mastersheet
async function loadSummaryMastersheet() {
    const eventId = document.getElementById('summaryEventId').value.trim();
    
    try {
        let url = `${API_BASE}/api/volunteers`;
        if (eventId) {
            url += `/event/${encodeURIComponent(eventId)}`;
        }
        
        const response = await fetch(url);
        const volunteers = await response.json();
        
        if (volunteers.length === 0) {
            alert(eventId ? 'No volunteers found for this event' : 'No volunteers found in the system');
            document.getElementById('summaryContainer').style.display = 'none';
            return;
        }
        
        // Display event info
        const eventInfo = document.getElementById('summaryEventInfo');
        if (eventId) {
            eventInfo.innerHTML = `
                <strong>Event:</strong> ${volunteers[0].eventName} (${volunteers[0].eventId})<br>
                <strong>Date:</strong> ${new Date(volunteers[0].date).toLocaleDateString()}<br>
                <strong>Total Volunteers:</strong> ${volunteers.length}
            `;
        } else {
            // Group volunteers by event for summary
            const eventGroups = volunteers.reduce((acc, volunteer) => {
                const key = volunteer.eventId;
                if (!acc[key]) {
                    acc[key] = {
                        eventName: volunteer.eventName,
                        eventId: volunteer.eventId,
                        date: volunteer.date,
                        count: 0
                    };
                }
                acc[key].count++;
                return acc;
            }, {});
            
            const eventsList = Object.values(eventGroups);
            eventInfo.innerHTML = `
                <strong>All Events Summary</strong><br>
                <strong>Total Events:</strong> ${eventsList.length}<br>
                <strong>Total Volunteers:</strong> ${volunteers.length}<br>
                <strong>Events:</strong> ${eventsList.map(e => `${e.eventName} (${e.count} volunteers)`).join(', ')}
            `;
        }
        
        // Group volunteers by person and calculate total attended hours
        const volunteerMap = new Map();
        
        volunteers.forEach(volunteer => {
            const key = `${volunteer.name}-${volunteer.email}`;
            if (!volunteerMap.has(key)) {
                volunteerMap.set(key, {
                    name: volunteer.name,
                    email: volunteer.email,
                    totalHours: 0
                });
            }
            
            // Only add hours if attendance is 'attended'
            if (volunteer.attendance === 'attended') {
                volunteerMap.get(key).totalHours += parseFloat(volunteer.hoursVolunteered) || 0;
            }
        });
        
        // Convert map to array and display
        const uniqueVolunteers = Array.from(volunteerMap.values());
        const tableBody = document.getElementById('summaryTableBody');
        tableBody.innerHTML = uniqueVolunteers.map(volunteer => `
            <tr>
                <td>${volunteer.name}</td>
                <td>${volunteer.email}</td>
                <td class="text-center">${volunteer.totalHours.toFixed(1)}</td>
            </tr>
        `).join('');
        
        document.getElementById('summaryContainer').style.display = 'block';
    } catch (error) {
        alert('Error loading summary: ' + error.message);
    }
}

// Load Main Mastersheet
async function loadMainMastersheet() {
    const eventId = document.getElementById('mainEventId').value.trim();
    
    try {
        let url = `${API_BASE}/api/volunteers`;
        if (eventId) {
            url += `/event/${encodeURIComponent(eventId)}`;
        }
        
        const response = await fetch(url);
        const volunteers = await response.json();
        
        if (volunteers.length === 0) {
            alert(eventId ? 'No volunteers found for this event' : 'No volunteers found in the system');
            document.getElementById('mainContainer').style.display = 'none';
            return;
        }
        
        // Display event info
        const eventInfo = document.getElementById('mainEventInfo');
        if (eventId) {
            eventInfo.innerHTML = `
                <strong>Event:</strong> ${volunteers[0].eventName} (${volunteers[0].eventId})<br>
                <strong>Date:</strong> ${new Date(volunteers[0].date).toLocaleDateString()}<br>
                <strong>Format:</strong> ${volunteers[0].eventFormat}<br>
                <strong>District:</strong> ${volunteers[0].district}<br>
                <strong>Total Volunteers:</strong> ${volunteers.length}
            `;
        } else {
            // Group volunteers by event for summary
            const eventGroups = volunteers.reduce((acc, volunteer) => {
                const key = volunteer.eventId;
                if (!acc[key]) {
                    acc[key] = {
                        eventName: volunteer.eventName,
                        eventId: volunteer.eventId,
                        date: volunteer.date,
                        eventFormat: volunteer.eventFormat,
                        district: volunteer.district,
                        count: 0
                    };
                }
                acc[key].count++;
                return acc;
            }, {});
            
            const eventsList = Object.values(eventGroups);
            eventInfo.innerHTML = `
                <strong>All Events Complete Details</strong><br>
                <strong>Total Events:</strong> ${eventsList.length}<br>
                <strong>Total Volunteers:</strong> ${volunteers.length}<br>
                <strong>Events:</strong> ${eventsList.map(e => `${e.eventName} (${e.count} volunteers)`).join(', ')}<br>
                <small class="text-muted">Showing all volunteers across all events</small>
            `;
        }
        
        // Display volunteers table (include all volunteers)
        const tableBody = document.getElementById('mainTableBody');
        tableBody.innerHTML = volunteers.map(volunteer => `
            <tr>
                <td>${volunteer.serialNumber}</td>
                <td><span class="badge bg-primary">${volunteer.eventId}</span></td>
                <td>${volunteer.name}</td>
                <td>${volunteer.email}</td>
                <td>${volunteer.mobileNo}</td>
                <td>${volunteer.role}</td>
                <td>${volunteer.startTime}</td>
                <td>${volunteer.endTime}</td>
                <td class="text-center">${volunteer.hoursVolunteered || '0'}</td>
                <td>
                    <span class="badge ${volunteer.attendance === 'attended' ? 'bg-success' : 
                                      volunteer.attendance === 'absent' ? 'bg-danger' : 'bg-warning'}">
                        ${volunteer.attendance || 'Pending'}
                    </span>
                </td>
                <td class="text-center">
                    <span class="badge ${volunteer.volunteerShirtTaken ? 'bg-success' : 'bg-secondary'}">
                        ${volunteer.volunteerShirtTaken ? 'Yes' : 'No'}
                    </span>
                </td>
                <td class="text-center">${volunteer.shirtSize || '-'}</td>
                <td>${volunteer.remarks || '-'}</td>
            </tr>
        `).join('');
        
        document.getElementById('mainContainer').style.display = 'block';
    } catch (error) {
        alert('Error loading main mastersheet: ' + error.message);
    }
}

// Download Summary PDF
async function downloadSummaryPDF() {
    const eventId = document.getElementById('summaryEventId').value.trim();
    
    if (!eventId) {
        alert('PDF generation requires a specific Event ID. Please enter an Event ID to generate a PDF.');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/volunteers/event/${eventId}`);
        const volunteers = await response.json();
        
        if (volunteers.length === 0) {
            alert('No volunteers found for this event');
            return;
        }
        
        const eventData = {
            eventId: eventId,
            eventName: volunteers[0].eventName,
            date: volunteers[0].date,
            type: 'summary'
        };
        
        // Generate PDF
        const pdfResponse = await fetch(`${API_BASE}/api/generate-pdf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventData)
        });
        
        if (pdfResponse.ok) {
            const blob = await pdfResponse.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `volunteer-summary-${eventId}_${new Date(eventData.date).toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            alert('Summary PDF downloaded successfully!');
        } else {
            const error = await pdfResponse.json();
            alert('Error generating PDF: ' + error.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Download Main PDF
async function downloadMainPDF() {
    const eventId = document.getElementById('mainEventId').value.trim();
    
    if (!eventId) {
        alert('PDF generation requires a specific Event ID. Please enter an Event ID to generate a PDF.');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/volunteers/event/${eventId}`);
        const volunteers = await response.json();
        
        if (volunteers.length === 0) {
            alert('No volunteers found for this event');
            return;
        }
        
        const eventData = {
            eventId: eventId,
            eventName: volunteers[0].eventName,
            date: volunteers[0].date,
            type: 'full'
        };
        
        // Generate PDF
        const pdfResponse = await fetch(`${API_BASE}/api/generate-pdf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventData)
        });
        
        if (pdfResponse.ok) {
            const blob = await pdfResponse.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `volunteer-full-details-${eventId}_${new Date(eventData.date).toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            alert('Full details PDF downloaded successfully!');
        } else {
            const error = await pdfResponse.json();
            alert('Error generating PDF: ' + error.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Simple PDF Generation (First Version)
async function generatePDFSimple() {
    const eventId = document.getElementById('pdfEventId').value.trim();
    
    if (!eventId) {
        alert('Please enter an Event ID');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/volunteers/event/${eventId}`);
        const volunteers = await response.json();
        
        if (volunteers.length === 0) {
            alert('No volunteers found for this event');
            return;
        }
        
        const eventData = {
            eventId: eventId,
            eventName: volunteers[0].eventName,
            date: volunteers[0].date,
            type: 'full' // Default to full details for simple generation
        };
        
        // Generate PDF
        const pdfResponse = await fetch(`${API_BASE}/api/generate-pdf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventData)
        });
        
        if (pdfResponse.ok) {
            const blob = await pdfResponse.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `volunteer-mastersheet-${eventId}_${new Date(eventData.date).toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            alert('PDF generated and downloaded successfully!');
        } else {
            const error = await pdfResponse.json();
            alert('Error generating PDF: ' + error.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Individual Report Functions
async function searchIndividualReport() {
    const name = document.getElementById('individualName').value.trim();
    const phone = document.getElementById('individualPhone').value.trim();
    const email = document.getElementById('individualEmail').value.trim();
    
    if (!name || !phone || !email) {
        alert('Please fill in all fields: Name, Phone Number, and Email');
        return;
    }
    
    try {
        // Search for volunteers with matching name, phone, and email
        const allResponse = await fetch(`${API_BASE}/api/volunteers`);
        const allVolunteers = await allResponse.json();
        
        const matchingVolunteers = allVolunteers.filter(volunteer => 
            volunteer.name.toLowerCase() === name.toLowerCase() &&
            volunteer.mobileNo === phone &&
            volunteer.email.toLowerCase() === email.toLowerCase()
        );
        
        displayIndividualReport(matchingVolunteers, name);
        
    } catch (error) {
        alert('Error searching for volunteer: ' + error.message);
    }
}

function displayIndividualReport(volunteers, name) {
    if (volunteers.length === 0) {
        alert('No matching volunteer found. Please check the name, phone number, and email address.');
        document.getElementById('individualReportContainer').style.display = 'none';
        return;
    }
    
    // Calculate total hours only for attended events (not no-show)
    const attendedEvents = volunteers.filter(volunteer => volunteer.attendance === 'attended');
    
    // Calculate total hours
    const totalHours = attendedEvents.reduce((sum, volunteer) => {
        return sum + (parseFloat(volunteer.hoursVolunteered) || 0);
    }, 0);
    
    // Display volunteer info
    const individualInfo = document.getElementById('individualInfo');
    individualInfo.innerHTML = `
        <strong>Name:</strong> ${name}<br>
        <strong>Email:</strong> ${volunteers[0].email}<br>
        <strong>Phone:</strong> ${volunteers[0].mobileNo}<br>
        <strong>Total Events Registered:</strong> ${volunteers.length}<br>
        <strong>Events Attended:</strong> ${attendedEvents.length}<br>
        <strong>Total Hours Volunteered:</strong> ${totalHours.toFixed(1)} hours
    `;
    
    // Display events table (show all events, not just attended)
    const tableBody = document.getElementById('individualReportTableBody');
    tableBody.innerHTML = volunteers.map(volunteer => `
        <tr>
            <td><span class="badge bg-primary">${volunteer.eventId}</span></td>
            <td>${volunteer.eventName}</td>
            <td>${new Date(volunteer.date).toLocaleDateString()}</td>
            <td>${volunteer.role}</td>
            <td class="text-center">${volunteer.hoursVolunteered || '0'}</td>
            <td>
                <span class="badge ${volunteer.attendance === 'attended' ? 'bg-success' : 
                                  volunteer.attendance === 'no show' ? 'bg-danger' : 'bg-warning'}">
                    ${volunteer.attendance || 'Pending'}
                </span>
            </td>
            <td>${volunteer.startTime}</td>
            <td>${volunteer.endTime}</td>
        </tr>
    `).join('');
    
    document.getElementById('individualReportContainer').style.display = 'block';
}

async function downloadIndividualReport() {
    const name = document.getElementById('individualName').value.trim();
    const phone = document.getElementById('individualPhone').value.trim();
    const email = document.getElementById('individualEmail').value.trim();
    
    if (!name || !phone || !email) {
        showToast('Please search for a volunteer first', 'warning');
        return;
    }
    
    try {
        showToast('Generating PDF report...', 'info');
        
        const response = await fetch(`${API_BASE}/api/generate-individual-pdf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, phone })
        });
        
        if (response.ok) {
            // Create a blob from the PDF response
            const blob = await response.blob();
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Individual_Report_${name.replace(/\s+/g, '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            showToast('PDF report downloaded successfully!', 'success');
        } else {
            const error = await response.json();
            showToast('Error: ' + error.error, 'error');
        }
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

// Search for available volunteers
async function searchAvailableVolunteers() {
    const searchTerm = document.getElementById('searchVolunteers').value.trim();
    
    if (!searchTerm) {
        showToast('Please enter a search term', 'warning');
        return;
    }
    
    if (searchTerm.length < 2) {
        showToast('Please enter at least 2 characters', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/volunteers`);
        if (!response.ok) {
            throw new Error('Failed to fetch volunteers');
        }
        
        const allVolunteers = await response.json();
        
        // Filter unique volunteers based on search term
        const uniqueVolunteers = new Map();
        
        allVolunteers.forEach(volunteer => {
            const key = `${volunteer.name}-${volunteer.email}-${volunteer.mobileNo}`;
            if (!uniqueVolunteers.has(key)) {
                const searchText = `${volunteer.name} ${volunteer.email} ${volunteer.mobileNo}`.toLowerCase();
                if (searchText.includes(searchTerm.toLowerCase())) {
                    uniqueVolunteers.set(key, {
                        name: volunteer.name,
                        email: volunteer.email,
                        mobileNo: volunteer.mobileNo
                    });
                }
            }
        });
        
        const results = Array.from(uniqueVolunteers.values());
        displaySearchResults(results);
        
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

// Display search results
function displaySearchResults(results) {
    const resultsContainer = document.getElementById('searchResults');
    const resultsBody = document.getElementById('searchResultsBody');
    
    if (results.length === 0) {
        resultsBody.innerHTML = '<tr><td colspan="4" class="text-center">No volunteers found</td></tr>';
    } else {
        resultsBody.innerHTML = results.map(volunteer => `
            <tr>
                <td>${volunteer.name}</td>
                <td>${volunteer.email}</td>
                <td>${volunteer.mobileNo}</td>
                <td>
                    <button type="button" class="btn btn-sm btn-success" onclick="prefillVolunteerForm('${volunteer.name}', '${volunteer.email}', '${volunteer.mobileNo}')">
                        <i class="fas fa-plus me-1"></i>Add to Form
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    resultsContainer.style.display = 'block';
}

// Clear search results
function clearVolunteerSearch() {
    document.getElementById('searchVolunteers').value = '';
    document.getElementById('searchResults').style.display = 'none';
}

// Prefill volunteer form with selected volunteer data
function prefillVolunteerForm(name, email, phone) {
    // Find the first empty volunteer form or add a new one
    const forms = document.querySelectorAll('.volunteer-form-item');
    let targetForm = null;
    
    // Look for an empty form (check inputs inside each form)
    for (let form of forms) {
        const nameInput = form.querySelector('[name="name"]');
        if (nameInput && !nameInput.value.trim()) {
            targetForm = form;
            break;
        }
    }
    
    // If no empty form found, add a new one
    if (!targetForm) {
        addVolunteerForm();
        const newIndex = volunteerFormCount - 1;
        targetForm = document.querySelector(`[data-index="${newIndex}"]`);
    }
    
    // Fill the form (use name-based selectors inside the target form)
    const nameInput = targetForm.querySelector('[name="name"]');
    const emailInput = targetForm.querySelector('[name="email"]');
    const mobileInput = targetForm.querySelector('[name="mobileNo"]');

    if (nameInput) nameInput.value = name;
    if (emailInput) emailInput.value = email;
    if (mobileInput) mobileInput.value = phone;
    
    // Calculate hours for this form (attempt to derive index if present)
    const idx = targetForm.getAttribute('data-index');
    if (idx !== null) calculateHours(parseInt(idx));
    
    showToast(`Added ${name} to registration form`, 'success');
}

// Toggle all sheets selection
function toggleAllSheets() {
    const selectAllCheckbox = document.getElementById('selectAllSheets');
    const sheetCheckboxes = document.querySelectorAll('#sheetCheckboxes input[type="checkbox"]');
    
    sheetCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
}

// Preview selected sheets
function previewSelectedSheets() {
    const selectedSheets = getSelectedSheets();
    
    if (selectedSheets.length === 0) {
        showToast('Please select at least one sheet', 'warning');
        return;
    }
    
    // Combine data from all selected sheets
    let allVolunteers = [];
    selectedSheets.forEach(sheetName => {
        try {
            const worksheet = currentWorkbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                header: 1,
                defval: '',
                blankrows: false
            });
            
            // Find header row
            let headerRowIndex = -1;
            for (let i = 0; i < Math.min(10, jsonData.length); i++) {
                const row = jsonData[i];
                if (row.some(cell => 
                    typeof cell === 'string' && 
                    (cell.toLowerCase().includes('name') || cell.toLowerCase().includes('email'))
                )) {
                    headerRowIndex = i;
                    break;
                }
            }
            
            if (headerRowIndex !== -1) {
                const headers = jsonData[headerRowIndex];
                const dataRows = jsonData.slice(headerRowIndex + 1);
                
                const sheetVolunteers = dataRows.map(row => {
                    const obj = { _sheet: sheetName }; // Add sheet source
                    headers.forEach((header, index) => {
                        if (header && typeof header === 'string') {
                            obj[header.trim()] = row[index] || '';
                        }
                    });
                    return obj;
                }).filter(row => {
                    return Object.values(row).some(value => value && value.toString().trim() && value !== sheetName);
                });
                
                allVolunteers = allVolunteers.concat(sheetVolunteers);
            }
        } catch (error) {
            console.error(`Error processing sheet ${sheetName}:`, error);
        }
    });
    
    if (allVolunteers.length === 0) {
        showToast('No volunteer data found in selected sheets', 'warning');
        return;
    }
    
    selectedSheetData = allVolunteers;
    displayFilePreview(allVolunteers, `${selectedSheets.length} selected sheets`);
    
    showToast(`Combined ${allVolunteers.length} volunteers from ${selectedSheets.length} sheets`, 'success');
}

// Get selected sheet names
function getSelectedSheets() {
    const sheetCheckboxes = document.querySelectorAll('#sheetCheckboxes input[type="checkbox"]:checked');
    return Array.from(sheetCheckboxes).map(checkbox => checkbox.value);
}

// Global variables for file processing
let uploadedFileData = null;
let currentWorkbook = null;
let selectedSheetData = null;

// Handle file upload
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (fileExtension === 'csv') {
        processCsvFile(file);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        processExcelFile(file);
    } else {
        showToast('Please upload a valid CSV or Excel file', 'error');
    }
}

// Process CSV file
function processCsvFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csv = e.target.result;
            const parsed = Papa.parse(csv, { 
                header: true, 
                skipEmptyLines: true,
                transformHeader: function(header) {
                    return header.trim();
                }
            });
            
            if (parsed.errors.length > 0) {
                showToast('Error parsing CSV: ' + parsed.errors[0].message, 'error');
                return;
            }
            
            selectedSheetData = parsed.data;
            displayFilePreview(selectedSheetData, file.name);
            extractEventInfoFromFilename(file.name);
            
        } catch (error) {
            showToast('Error reading CSV file: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
}

// Process Excel file
function processExcelFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            
            // Try to read without password first
            try {
                currentWorkbook = XLSX.read(data, { type: 'array' });
                displaySheetSelector();
            } catch (error) {
                // File might be password protected
                if (error.message.includes('password') || error.message.includes('encrypted')) {
                    showPasswordPrompt();
                } else {
                    showToast('Error reading Excel file: ' + error.message, 'error');
                }
            }
            
        } catch (error) {
            showToast('Error processing Excel file: ' + error.message, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

// Show password prompt for protected Excel files
function showPasswordPrompt() {
    document.getElementById('filePreview').style.display = 'block';
    document.getElementById('passwordPrompt').style.display = 'block';
    document.getElementById('excelPassword').style.display = 'block';
    document.getElementById('processFileBtn').style.display = 'block';
    showToast('This Excel file is password protected. Please enter the password.', 'warning');
}

// Process file with password
function processUploadedFile() {
    const password = document.getElementById('excelPassword').value;
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    
    if (!file || !password) {
        showToast('Please select a file and enter password', 'warning');
        return;
    }
    
    // Instead of attempting client-side XLSX decryption (which may fail for Office-encrypted files),
    // upload the file + password to the server endpoint which will use msoffcrypto-tool to decrypt.
    const formData = new FormData();
    formData.append('file', file);
    formData.append('password', password);

    showToast('Uploading file to server for decryption...', 'info');

    fetch(`${API_BASE}/api/unlock-and-parse`, {
        method: 'POST',
        body: formData
    }).then(async resp => {
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({ error: 'Unknown server error' }));
            showToast('Server error: ' + (err.error || 'Failed to decrypt file'), 'error');
            return;
        }

        const body = await resp.json();
        if (!body || !body.sheets || body.sheets.length === 0) {
            showToast('No sheets returned from server', 'warning');
            return;
        }

        // If multiple sheets, populate selector; otherwise process first sheet
        currentWorkbook = { SheetNames: body.sheets.map(s => s.name), Sheets: {} };
        body.sheets.forEach(s => {
            // Convert rows array of objects into a temporary sheet-like structure for existing logic
            const ws = XLSX.utils.json_to_sheet(s.rows);
            currentWorkbook.Sheets[s.name] = ws;
        });

        document.getElementById('passwordPrompt').style.display = 'none';
        document.getElementById('excelPassword').style.display = 'none';
        document.getElementById('processFileBtn').style.display = 'none';

        displaySheetSelector();
        showToast('File decrypted and loaded from server', 'success');
    }).catch(err => {
        showToast('Upload/Server error: ' + err.message, 'error');
    });
}

// Display sheet selector for Excel files
function displaySheetSelector() {
    const sheetNames = currentWorkbook.SheetNames;
    
    if (sheetNames.length === 1) {
        // Only one sheet, process it directly
        processSelectedSheet(sheetNames[0]);
    } else {
        // Multiple sheets, show checkbox selector
        const sheetCheckboxes = document.getElementById('sheetCheckboxes');
        const sheetSelector = document.getElementById('sheetSelector');
        
        sheetCheckboxes.innerHTML = '';
        sheetNames.forEach(name => {
            // Try to parse date from sheet name
            const eventInfo = parseEventInfoFromSheetName(name);
            const displayName = eventInfo ? `${name} (${eventInfo.eventName})` : name;
            
            const checkboxHtml = `
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" value="${name}" id="sheet_${name.replace(/[^a-zA-Z0-9]/g, '_')}">
                    <label class="form-check-label" for="sheet_${name.replace(/[^a-zA-Z0-9]/g, '_')}">
                        ${displayName}
                    </label>
                </div>
            `;
            sheetCheckboxes.innerHTML += checkboxHtml;
        });
        
        sheetSelector.style.display = 'block';
        document.getElementById('filePreview').style.display = 'block';
        
        // Auto-select all event sheets
        const eventSheets = sheetNames.filter(name => parseEventInfoFromSheetName(name));
        if (eventSheets.length > 0) {
            eventSheets.forEach(sheetName => {
                const checkbox = document.querySelector(`#sheetCheckboxes input[value="${sheetName}"]`);
                if (checkbox) checkbox.checked = true;
            });
            
            // Update "Select All" checkbox state
            const allCheckboxes = document.querySelectorAll('#sheetCheckboxes input[type="checkbox"]');
            const checkedCheckboxes = document.querySelectorAll('#sheetCheckboxes input[type="checkbox"]:checked');
            document.getElementById('selectAllSheets').checked = allCheckboxes.length === checkedCheckboxes.length;
            
            // Auto-preview if we have event sheets selected
            previewSelectedSheets();
        }
    }
}

// Process selected sheet
function processSelectedSheet(sheetName) {
    if (!sheetName) {
        const selectedSheet = document.getElementById('sheetSelect').value;
        if (!selectedSheet) {
            showToast('Please select a sheet', 'warning');
            return;
        }
        sheetName = selectedSheet;
    }
    
    try {
        const worksheet = currentWorkbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: '',
            blankrows: false
        });
        
        // Find header row (look for "Name" or "Email")
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
            const row = jsonData[i];
            if (row.some(cell => 
                typeof cell === 'string' && 
                (cell.toLowerCase().includes('name') || cell.toLowerCase().includes('email'))
            )) {
                headerRowIndex = i;
                break;
            }
        }
        
        if (headerRowIndex === -1) {
            showToast('Could not find header row with Name/Email columns', 'error');
            return;
        }
        
        // Convert to objects
        const headers = jsonData[headerRowIndex];
        const dataRows = jsonData.slice(headerRowIndex + 1);
        
        selectedSheetData = dataRows.map(row => {
            const obj = {};
            headers.forEach((header, index) => {
                if (header && typeof header === 'string') {
                    obj[header.trim()] = row[index] || '';
                }
            });
            return obj;
        }).filter(row => {
            // Filter out empty rows
            return Object.values(row).some(value => value && value.toString().trim());
        });
        
        displayFilePreview(selectedSheetData, sheetName);
        extractEventInfoFromSheetName(sheetName);
        
    } catch (error) {
        showToast('Error processing sheet: ' + error.message, 'error');
    }
}

// Display file preview
function displayFilePreview(data, filename) {
    if (!data || data.length === 0) {
        showToast('No data found in file', 'warning');
        return;
    }
    
    const previewTable = document.getElementById('previewTable');
    const previewHeaders = document.getElementById('previewHeaders');
    const previewBody = document.getElementById('previewBody');
    
    // Get headers
    const headers = Object.keys(data[0]);
    previewHeaders.innerHTML = headers.map(header => `<th>${header}</th>`).join('');
    
    // Show first 5 rows
    const previewRows = data.slice(0, 5);
    previewBody.innerHTML = previewRows.map(row => {
        return '<tr>' + headers.map(header => `<td>${row[header] || ''}</td>`).join('') + '</tr>';
    }).join('');
    
    document.getElementById('filePreview').style.display = 'block';
    
    showToast(`File loaded: ${data.length} volunteers found`, 'success');
}

// Parse event info from sheet name (format: DD-MMM-YYYY-Day-StartTime-EndTime)
function parseEventInfoFromSheetName(sheetName) {
    try {
        // Pattern: 18-Oct-2024-Fri-1200pm-0730pm or similar
        const datePattern = /(\d{1,2})-([A-Za-z]{3})-(\d{4})-([A-Za-z]{3})-(\d{4}[ap]m)-(\d{4}[ap]m)/;
        const match = sheetName.match(datePattern);
        
        if (match) {
            const [, day, month, year, dayOfWeek, startTime, endTime] = match;
            
            // Convert to standard date format
            const monthNames = {
                'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
                'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
                'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
            };
            
            const formattedDate = `${year}-${monthNames[month]}-${day.padStart(2, '0')}`;
            
            // Convert times (e.g., 1200pm to 12:00, 0730pm to 19:30)
            const convertTime = (timeStr) => {
                const isPM = timeStr.toLowerCase().includes('pm');
                const timeNum = timeStr.replace(/[ap]m/i, '');
                const hours = Math.floor(parseInt(timeNum) / 100);
                const minutes = parseInt(timeNum) % 100;
                
                let finalHours = hours;
                if (isPM && hours !== 12) finalHours += 12;
                if (!isPM && hours === 12) finalHours = 0;
                
                return `${finalHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            };
            
            return {
                eventName: sheetName.split('-')[0] || 'Event',
                date: formattedDate,
                startTime: convertTime(startTime),
                endTime: convertTime(endTime)
            };
        }
    } catch (error) {
        console.log('Could not parse event info from sheet name:', error);
    }
    
    return null;
}

// Extract event info from filename
function extractEventInfoFromFilename(filename) {
    const eventInfo = parseEventInfoFromSheetName(filename);
    if (eventInfo) {
        // Auto-fill event information
        document.getElementById('commonEventName').value = eventInfo.eventName;
        document.getElementById('defaultDate').value = eventInfo.date;
        document.getElementById('defaultStartTime').value = eventInfo.startTime;
        document.getElementById('defaultEndTime').value = eventInfo.endTime;
        
        showToast('Event information auto-filled from filename', 'info');
    }
}

// Import volunteers from file
function importVolunteersFromFile() {
    if (!selectedSheetData || selectedSheetData.length === 0) {
        showToast('No data to import', 'warning');
        return;
    }
    
    // Clear existing forms first
    clearAllVolunteerForms();
    
    // Map common column variations
    const getColumnValue = (row, possibleNames) => {
        for (const name of possibleNames) {
            const key = Object.keys(row).find(k => 
                k.toLowerCase().trim() === name.toLowerCase()
            );
            if (key && row[key]) {
                return row[key].toString().trim();
            }
        }
        return '';
    };
    
    let imported = 0;
    selectedSheetData.forEach((row, index) => {
        const name = getColumnValue(row, ['Name', 'Full Name', 'Volunteer Name']);
        const email = getColumnValue(row, ['Email', 'Email Address', 'E-mail']);
        const mobile = getColumnValue(row, ['Mobile Number', 'Mobile', 'Phone', 'Contact']);
        const role = getColumnValue(row, ['Role', 'Position', 'Job']);
        
        // Extract event info from sheet name if available
        let eventDate = '';
        let eventName = '';
        if (row._sheet) {
            const eventInfo = parseEventInfoFromSheetName(row._sheet);
            if (eventInfo) {
                eventDate = eventInfo.date;
                eventName = eventInfo.eventName;
                
                // Auto-fill common event info if first volunteer
                if (index === 0) {
                    document.getElementById('commonEventName').value = eventName || row._sheet;
                    document.getElementById('defaultDate').value = eventDate;
                }
            }
        }
        
        if (name && (email || mobile)) {
            // Add volunteer form
            if (index > 0) addVolunteerForm();
            
            // Fill the form
            const formIndex = index;
            const form = document.querySelector(`[data-index="${formIndex}"]`);
            
            if (form) {
                const nameInput = form.querySelector('[name="name"]');
                const emailInput = form.querySelector('[name="email"]');
                const mobileInput = form.querySelector('[name="mobileNo"]');
                const roleInput = form.querySelector('[name="role"]');
                const dateInput = form.querySelector('[name="date"]');
                
                if (nameInput) nameInput.value = name;
                if (emailInput) emailInput.value = email;
                if (mobileInput) mobileInput.value = mobile;
                if (dateInput && eventDate) dateInput.value = eventDate;
                
                if (roleInput && role) {
                    // Try to match role with dropdown options
                    const options = Array.from(roleInput.options);
                    const matchingOption = options.find(opt => 
                        opt.text.toLowerCase().includes(role.toLowerCase()) ||
                        role.toLowerCase().includes(opt.text.toLowerCase())
                    );
                    if (matchingOption) {
                        roleInput.value = matchingOption.value;
                    } else {
                        roleInput.value = 'Other';
                    }
                }
                
                imported++;
            }
        }
    });
    
    showToast(`Successfully imported ${imported} volunteers`, 'success');
    clearFileUpload();
}

// Clear all volunteer forms
function clearAllVolunteerForms() {
    const forms = document.querySelectorAll('.volunteer-form-item');
    forms.forEach((form, index) => {
        if (index === 0) {
            // Clear first form
            clearVolunteerForm(0);
        } else {
            // Remove additional forms
            form.remove();
        }
    });
    volunteerFormCount = 1;
}

// Clear file upload
function clearFileUpload() {
    document.getElementById('csvFile').value = '';
    document.getElementById('filePreview').style.display = 'none';
    document.getElementById('sheetSelector').style.display = 'none';
    document.getElementById('passwordPrompt').style.display = 'none';
    document.getElementById('excelPassword').style.display = 'none';
    document.getElementById('processFileBtn').style.display = 'none';
    document.getElementById('excelPassword').value = '';
    
    uploadedFileData = null;
    currentWorkbook = null;
    selectedSheetData = null;
}

// Add event listener for sheet selection
document.addEventListener('DOMContentLoaded', function() {
    const sheetSelect = document.getElementById('sheetSelect');
    if (sheetSelect) {
        sheetSelect.addEventListener('change', function() {
            if (this.value) {
                processSelectedSheet(this.value);
            }
        });
    }
});
