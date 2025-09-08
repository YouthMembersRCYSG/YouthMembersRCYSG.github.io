// Volunteer Management System JavaScript

// If the page is opened via file:// (not served), use localhost:4000 as API base so
// fetch('/api/...') still reaches the running server. When served over HTTP(S),
// leave API_BASE empty to use relative paths (same origin).
const API_BASE = (window.location.protocol === 'file:') ? 'http://localhost:4000' : '';

let searchTimeout;
let isEditing = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadVolunteers();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Form submission
    document.getElementById('volunteerForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('pdfForm').addEventListener('submit', handlePDFGeneration);
    
    // Search functionality
    document.getElementById('volunteerSearch').addEventListener('input', handleSearch);
    
    // Tab switching
    document.querySelectorAll('#mainTabs button').forEach(tab => {
        tab.addEventListener('shown.bs.tab', function(e) {
            if (e.target.id === 'list-tab') {
                loadVolunteers();
            }
        });
    });
    
    // Mobile number and email change for auto-search
    document.getElementById('mobileNo').addEventListener('input', handleAutoSearch);
    document.getElementById('email').addEventListener('input', handleAutoSearch);
    document.getElementById('name').addEventListener('input', handleAutoSearch);
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    try {
        const formData = getFormData();
        const volunteerId = document.getElementById('volunteerId').value;
        
        showLoading(true);
        
        let response;
        if (volunteerId && isEditing) {
            // Update existing volunteer
            response = await fetch(`${API_BASE}/api/volunteers/${volunteerId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
        } else {
            // Create new volunteer
            response = await fetch(`${API_BASE}/api/volunteers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
        }
        
        if (response.ok) {
            const result = await response.json();
            showSuccess(isEditing ? 'Volunteer updated successfully!' : 'Volunteer added successfully!');
            clearForm();
            loadVolunteers();
        } else {
            const error = await response.json();
            showError(error.error || 'An error occurred');
        }
    } catch (error) {
        showError(error.message || 'Network error occurred');
    } finally {
        showLoading(false);
    }
}

// Get form data with validation
function getFormData() {
    const data = {
        district: document.getElementById('district').value,
        eventName: document.getElementById('eventName').value,
        eventId: document.getElementById('eventId').value,
        eventFormat: document.getElementById('eventFormat').value,
        details: document.getElementById('details').value,
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        mobileNo: document.getElementById('mobileNo').value,
        role: document.getElementById('role').value,
        date: document.getElementById('date').value,
        startTime: document.getElementById('startTime').value,
        endTime: document.getElementById('endTime').value,
        vms: document.getElementById('vms').value === 'true',
        attendance: document.getElementById('attendance').value,
        remarks: document.getElementById('remarks').value,
        volunteerShirtTaken: document.getElementById('volunteerShirtTaken').value === 'true',
        shirtSize: document.getElementById('shirtSize').value
    };
    
    // Client-side validation
    if (!data.startTime || !data.endTime) {
        throw new Error('Start time and end time are required');
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        throw new Error('Please enter a valid email address');
    }
    
    // Validate mobile number (basic check)
    if (data.mobileNo.length < 8) {
        throw new Error('Please enter a valid mobile number');
    }
    
    return data;
}

// Handle search
function handleSearch(e) {
    const query = e.target.value.trim();
    
    clearTimeout(searchTimeout);
    
    if (query.length < 2) {
        clearSearchResults();
        return;
    }
    
    searchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/volunteers/search?query=${encodeURIComponent(query)}`);
            if (response.ok) {
                const volunteers = await response.json();
                displaySearchResults(volunteers);
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }, 300);
}

// Handle auto-search when typing in name, email, or mobile
function handleAutoSearch(e) {
    const query = e.target.value.trim();
    
    if (query.length < 3) return;
    
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/volunteers/search?query=${encodeURIComponent(query)}`);
            if (response.ok) {
                const volunteers = await response.json();
                if (volunteers.length > 0 && !isEditing) {
                    displayQuickSearchResults(volunteers, e.target.id);
                }
            }
        } catch (error) {
            console.error('Auto-search error:', error);
        }
    }, 500);
}

// Display search results
function displaySearchResults(volunteers) {
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = '';
    
    if (volunteers.length === 0) {
        resultsContainer.innerHTML = '<div class="search-result-item">No volunteers found</div>';
        return;
    }
    
    volunteers.forEach(volunteer => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        resultItem.innerHTML = `
            <div class="search-result-name">${volunteer.name}</div>
            <div class="search-result-details">
                ${volunteer.email} | ${volunteer.mobileNo} | ${volunteer.eventName}
            </div>
        `;
        resultItem.addEventListener('click', () => fillFormWithVolunteer(volunteer));
        resultsContainer.appendChild(resultItem);
    });
}

// Display quick search results (smaller popup)
function displayQuickSearchResults(volunteers, fieldId) {
    // Only show if there's an exact or close match and not already editing
    if (isEditing) return;
    
    const currentName = document.getElementById('name').value.toLowerCase();
    const currentEmail = document.getElementById('email').value.toLowerCase();
    const currentMobile = document.getElementById('mobileNo').value;
    
    const match = volunteers.find(v => {
        switch(fieldId) {
            case 'name':
                return v.name.toLowerCase().includes(currentName) && currentName.length > 2;
            case 'email':
                return v.email.toLowerCase().includes(currentEmail) && currentEmail.length > 3;
            case 'mobileNo':
                return v.mobileNo.includes(currentMobile) && currentMobile.length > 3;
            default:
                return v.name.toLowerCase().includes(currentName) ||
                       v.email.toLowerCase().includes(currentEmail) ||
                       v.mobileNo.includes(currentMobile);
        }
    });
    
    if (match) {
        const confirm = window.confirm(`Found existing volunteer: ${match.name} (${match.email}). Click OK to auto-fill the form.`);
        if (confirm) {
            fillFormWithVolunteer(match);
        }
    }
}

// Fill form with volunteer data
function fillFormWithVolunteer(volunteer) {
    isEditing = true;
    document.getElementById('volunteerId').value = volunteer._id;
    document.getElementById('district').value = volunteer.district;
    document.getElementById('eventName').value = volunteer.eventName;
    document.getElementById('eventId').value = volunteer.eventId;
    document.getElementById('eventFormat').value = volunteer.eventFormat;
    document.getElementById('details').value = volunteer.details || '';
    document.getElementById('name').value = volunteer.name;
    document.getElementById('email').value = volunteer.email;
    document.getElementById('mobileNo').value = volunteer.mobileNo;
    document.getElementById('role').value = volunteer.role;
    document.getElementById('date').value = volunteer.date.split('T')[0];
    document.getElementById('startTime').value = volunteer.startTime;
    document.getElementById('endTime').value = volunteer.endTime;
    document.getElementById('vms').value = volunteer.vms.toString();
    document.getElementById('attendance').value = volunteer.attendance;
    document.getElementById('remarks').value = volunteer.remarks || '';
    document.getElementById('volunteerShirtTaken').value = volunteer.volunteerShirtTaken.toString();
    document.getElementById('shirtSize').value = volunteer.shirtSize || '';
    
    toggleShirtSize();
    clearSearchResults();
    
    document.getElementById('form-title').textContent = 'Update Volunteer';
    
    // Switch to form tab if not already there
    const formTab = new bootstrap.Tab(document.getElementById('form-tab'));
    formTab.show();
}

// Clear search results
function clearSearchResults() {
    document.getElementById('searchResults').innerHTML = '';
}

// Clear form
function clearForm() {
    document.getElementById('volunteerForm').reset();
    document.getElementById('volunteerId').value = '';
    document.getElementById('volunteerSearch').value = '';
    document.getElementById('shirtSizeRow').style.display = 'none';
    document.getElementById('form-title').textContent = 'Add New Volunteer';
    isEditing = false;
    clearSearchResults();
}

// Toggle shirt size field
function toggleShirtSize() {
    const shirtTaken = document.getElementById('volunteerShirtTaken').value === 'true';
    const shirtSizeRow = document.getElementById('shirtSizeRow');
    shirtSizeRow.style.display = shirtTaken ? 'block' : 'none';
    
    if (!shirtTaken) {
        document.getElementById('shirtSize').value = '';
    }
}

// Load volunteers list
async function loadVolunteers() {
    try {
    const response = await fetch(`${API_BASE}/api/volunteers`);
        if (response.ok) {
            const volunteers = await response.json();
            displayVolunteers(volunteers);
        } else {
            showError('Failed to load volunteers');
        }
    } catch (error) {
        showError('Network error: ' + error.message);
    }
}

// Display volunteers in table
function displayVolunteers(volunteers) {
    const tbody = document.getElementById('volunteerTableBody');
    tbody.innerHTML = '';
    
    if (volunteers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No volunteers found</td></tr>';
        return;
    }
    
    volunteers.forEach(volunteer => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${volunteer.serialNumber}</td>
            <td>${volunteer.name}</td>
            <td>${volunteer.eventName}</td>
            <td>${new Date(volunteer.date).toLocaleDateString()}</td>
            <td>${volunteer.role}</td>
            <td>${volunteer.mobileNo}</td>
            <td>${volunteer.email}</td>
            <td>
                <span class="badge ${getAttendanceBadgeClass(volunteer.attendance)}">
                    ${volunteer.attendance}
                </span>
                ${volunteer.remarks ? `<br><span class="badge ${getRemarksBadgeClass(volunteer.remarks)}">${volunteer.remarks}</span>` : ''}
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editVolunteer('${volunteer._id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteVolunteer('${volunteer._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Get badge class for attendance
function getAttendanceBadgeClass(attendance) {
    return attendance === 'attended' ? 'status-attended' : 'status-no-show';
}

// Get badge class for remarks
function getRemarksBadgeClass(remarks) {
    switch (remarks) {
        case 'Warning': return 'status-warning';
        case 'Blacklist': return 'status-blacklist';
        default: return 'bg-secondary';
    }
}

// Edit volunteer
async function editVolunteer(id) {
    try {
    const response = await fetch(`${API_BASE}/api/volunteers`);
        if (response.ok) {
            const volunteers = await response.json();
            const volunteer = volunteers.find(v => v._id === id);
            if (volunteer) {
                fillFormWithVolunteer(volunteer);
            }
        }
    } catch (error) {
        showError('Failed to load volunteer data');
    }
}

// Delete volunteer
async function deleteVolunteer(id) {
    if (!confirm('Are you sure you want to delete this volunteer?')) {
        return;
    }
    
    try {
    const response = await fetch(`${API_BASE}/api/volunteers/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showSuccess('Volunteer deleted successfully');
            loadVolunteers();
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to delete volunteer');
        }
    } catch (error) {
        showError('Network error: ' + error.message);
    }
}

// Handle PDF generation
async function handlePDFGeneration(e) {
    e.preventDefault();
    
    const eventId = document.getElementById('pdfEventId').value;
    const eventName = document.getElementById('pdfEventName').value;
    const date = document.getElementById('pdfDate').value;
    
    try {
        showLoading(true);
        
    const response = await fetch(`${API_BASE}/api/generate-pdf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ eventId, eventName, date })
        });
        
        if (response.ok) {
            // Download the PDF
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `attendance_${eventId}_${date}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showSuccess('PDF generated and downloaded successfully!');
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to generate PDF');
        }
    } catch (error) {
        showError('Network error: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Utility functions
function showLoading(show) {
    const modal = new bootstrap.Modal(document.getElementById('loadingModal'));
    if (show) {
        modal.show();
    } else {
        modal.hide();
    }
}

function showSuccess(message) {
    showAlert(message, 'success');
}

function showError(message) {
    showAlert(message, 'danger');
}

function showAlert(message, type) {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.container');
    container.insertBefore(alert, container.firstChild);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}
