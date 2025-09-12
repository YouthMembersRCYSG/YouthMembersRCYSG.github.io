// volunteers-manager.js
// Complete volunteer management functionality

class VolunteersManager {
  constructor() {
    this.volunteers = [];
    this.currentVolunteer = null;
    this.filters = {
      status: 'all',
      role: 'all',
      search: ''
    };
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadVolunteers();
  }

  bindEvents() {
    // Search functionality
    const searchInput = document.getElementById('volunteerSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value;
        this.filterAndDisplayVolunteers();
      });
    }

    // Filter controls
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.filters.status = e.target.value;
        this.filterAndDisplayVolunteers();
      });
    }

    // Add volunteer button
    const addBtn = document.getElementById('addVolunteerBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.showAddVolunteerModal());
    }

    // Export button
    const exportBtn = document.getElementById('exportVolunteersBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportVolunteers());
    }
  }

  async loadVolunteers() {
    try {
      UIComponents.showLoading('Loading volunteers...');
      const response = await window.volunteerAPI.getAll();
      
      if (response.success) {
        this.volunteers = response.data;
        this.displayVolunteers();
      } else {
        UIComponents.showToast(response.error || 'Failed to load volunteers', 'error');
      }
    } catch (error) {
      console.error('Error loading volunteers:', error);
      UIComponents.showToast('Failed to load volunteers', 'error');
    } finally {
      UIComponents.hideLoading();
    }
  }

  filterAndDisplayVolunteers() {
    let filtered = [...this.volunteers];

    // Apply search filter
    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(volunteer => 
        volunteer.user.firstName.toLowerCase().includes(search) ||
        volunteer.user.lastName.toLowerCase().includes(search) ||
        volunteer.user.email.toLowerCase().includes(search) ||
        volunteer.user.phone.includes(search)
      );
    }

    // Apply status filter
    if (this.filters.status !== 'all') {
      filtered = filtered.filter(volunteer => volunteer.status === this.filters.status);
    }

    this.displayVolunteers(filtered);
  }

  displayVolunteers(volunteersToShow = this.volunteers) {
    const container = document.getElementById('volunteersContainer');
    if (!container) return;

    if (volunteersToShow.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No volunteers found</h3>
          <p>Try adjusting your filters or add new volunteers.</p>
          <button class="btn btn-primary" onclick="window.volunteersManager.showAddVolunteerModal()">
            Add First Volunteer
          </button>
        </div>
      `;
      return;
    }

    const volunteersHtml = volunteersToShow.map(volunteer => this.createVolunteerCard(volunteer)).join('');
    container.innerHTML = volunteersHtml;
  }

  createVolunteerCard(volunteer) {
    const statusClass = this.getStatusClass(volunteer.status);
    const totalHours = volunteer.totalHours || 0;
    const totalEvents = volunteer.totalEvents || 0;

    return `
      <div class="volunteer-card" data-id="${volunteer._id}">
        <div class="volunteer-header">
          <div class="volunteer-avatar">
            ${volunteer.user.profilePicture ? 
              `<img src="${volunteer.user.profilePicture}" alt="${volunteer.user.fullName}">` :
              `<div class="avatar-placeholder">${volunteer.user.firstName[0]}${volunteer.user.lastName[0]}</div>`
            }
          </div>
          <div class="volunteer-info">
            <h3>${volunteer.user.fullName}</h3>
            <p class="volunteer-email">${volunteer.user.email}</p>
            <p class="volunteer-phone">${volunteer.user.phone}</p>
            <span class="status-badge ${statusClass}">${volunteer.status}</span>
          </div>
          <div class="volunteer-actions">
            <button class="btn btn-sm btn-outline" onclick="window.volunteersManager.viewVolunteer('${volunteer._id}')">
              View
            </button>
            <button class="btn btn-sm btn-outline" onclick="window.volunteersManager.editVolunteer('${volunteer._id}')">
              Edit
            </button>
            <div class="dropdown">
              <button class="btn btn-sm btn-outline dropdown-toggle">More</button>
              <div class="dropdown-menu">
                <a href="#" onclick="window.volunteersManager.sendMessage('${volunteer._id}')">Send Message</a>
                <a href="#" onclick="window.volunteersManager.viewHistory('${volunteer._id}')">View History</a>
                ${volunteer.status === 'active' ? 
                  `<a href="#" onclick="window.volunteersManager.suspendVolunteer('${volunteer._id}')">Suspend</a>` :
                  `<a href="#" onclick="window.volunteersManager.activateVolunteer('${volunteer._id}')">Activate</a>`
                }
              </div>
            </div>
          </div>
        </div>
        <div class="volunteer-stats">
          <div class="stat">
            <span class="stat-value">${totalHours}</span>
            <span class="stat-label">Hours</span>
          </div>
          <div class="stat">
            <span class="stat-value">${totalEvents}</span>
            <span class="stat-label">Events</span>
          </div>
          <div class="stat">
            <span class="stat-value">${volunteer.certifications?.length || 0}</span>
            <span class="stat-label">Certifications</span>
          </div>
        </div>
        ${volunteer.skills && volunteer.skills.length > 0 ? `
          <div class="volunteer-skills">
            ${volunteer.skills.slice(0, 3).map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
            ${volunteer.skills.length > 3 ? `<span class="skill-more">+${volunteer.skills.length - 3} more</span>` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }

  getStatusClass(status) {
    const statusClasses = {
      active: 'status-active',
      inactive: 'status-inactive',
      suspended: 'status-suspended'
    };
    return statusClasses[status] || '';
  }

  async viewVolunteer(id) {
    try {
      const volunteer = this.volunteers.find(v => v._id === id);
      if (!volunteer) return;

      // Load detailed volunteer data
      const response = await window.volunteerAPI.getById(id);
      if (response.success) {
        this.showVolunteerModal(response.data, 'view');
      }
    } catch (error) {
      console.error('Error viewing volunteer:', error);
      UIComponents.showToast('Failed to load volunteer details', 'error');
    }
  }

  async editVolunteer(id) {
    try {
      const response = await window.volunteerAPI.getById(id);
      if (response.success) {
        this.showVolunteerModal(response.data, 'edit');
      }
    } catch (error) {
      console.error('Error loading volunteer for edit:', error);
      UIComponents.showToast('Failed to load volunteer details', 'error');
    }
  }

  showAddVolunteerModal() {
    this.showVolunteerModal(null, 'add');
  }

  showVolunteerModal(volunteer, mode) {
    const isEditing = mode === 'edit';
    const isAdding = mode === 'add';
    const isViewing = mode === 'view';

    const modalHtml = `
      <div class="modal-header">
        <h2>${isAdding ? 'Add New Volunteer' : isEditing ? 'Edit Volunteer' : 'Volunteer Details'}</h2>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        ${this.createVolunteerForm(volunteer, mode)}
      </div>
      <div class="modal-footer">
        ${isViewing ? `
          <button class="btn btn-outline" onclick="UIComponents.closeModal()">Close</button>
          <button class="btn btn-primary" onclick="window.volunteersManager.editVolunteer('${volunteer._id}')">Edit</button>
        ` : `
          <button class="btn btn-outline" onclick="UIComponents.closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="window.volunteersManager.saveVolunteer('${mode}', '${volunteer?._id || ''}')">
            ${isAdding ? 'Create Volunteer' : 'Save Changes'}
          </button>
        `}
      </div>
    `;

    UIComponents.showModal(modalHtml);
  }

  createVolunteerForm(volunteer, mode) {
    const isViewing = mode === 'view';
    const disabled = isViewing ? 'disabled' : '';
    const user = volunteer?.user || {};

    return `
      <form id="volunteerForm" class="volunteer-form">
        <div class="form-grid">
          <div class="form-group">
            <label for="firstName">First Name *</label>
            <input type="text" id="firstName" name="firstName" value="${user.firstName || ''}" ${disabled} required>
          </div>
          <div class="form-group">
            <label for="lastName">Last Name *</label>
            <input type="text" id="lastName" name="lastName" value="${user.lastName || ''}" ${disabled} required>
          </div>
          <div class="form-group">
            <label for="email">Email *</label>
            <input type="email" id="email" name="email" value="${user.email || ''}" ${disabled} required>
          </div>
          <div class="form-group">
            <label for="phone">Phone *</label>
            <input type="tel" id="phone" name="phone" value="${user.phone || ''}" ${disabled} required>
          </div>
          <div class="form-group">
            <label for="role">Role</label>
            <select id="role" name="role" ${disabled}>
              <option value="volunteer" ${user.role === 'volunteer' ? 'selected' : ''}>Volunteer</option>
              <option value="privileged_creator" ${user.role === 'privileged_creator' ? 'selected' : ''}>Privileged Creator</option>
              <option value="leader" ${user.role === 'leader' ? 'selected' : ''}>Leader</option>
              <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
          </div>
          <div class="form-group">
            <label for="status">Status</label>
            <select id="status" name="status" ${disabled}>
              <option value="active" ${volunteer?.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="inactive" ${volunteer?.status === 'inactive' ? 'selected' : ''}>Inactive</option>
              <option value="suspended" ${volunteer?.status === 'suspended' ? 'selected' : ''}>Suspended</option>
            </select>
          </div>
        </div>

        <div class="form-section">
          <h3>Emergency Contact</h3>
          <div class="form-grid">
            <div class="form-group">
              <label for="emergencyName">Name</label>
              <input type="text" id="emergencyName" name="emergencyName" 
                     value="${volunteer?.emergencyContact?.name || ''}" ${disabled}>
            </div>
            <div class="form-group">
              <label for="emergencyPhone">Phone</label>
              <input type="tel" id="emergencyPhone" name="emergencyPhone" 
                     value="${volunteer?.emergencyContact?.phone || ''}" ${disabled}>
            </div>
            <div class="form-group">
              <label for="emergencyRelation">Relationship</label>
              <input type="text" id="emergencyRelation" name="emergencyRelation" 
                     value="${volunteer?.emergencyContact?.relationship || ''}" ${disabled}>
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3>Skills & Interests</h3>
          <div class="form-group">
            <label for="skills">Skills (comma-separated)</label>
            <textarea id="skills" name="skills" rows="2" ${disabled}>${volunteer?.skills?.join(', ') || ''}</textarea>
          </div>
          <div class="form-group">
            <label for="interests">Interests (comma-separated)</label>
            <textarea id="interests" name="interests" rows="2" ${disabled}>${volunteer?.interests?.join(', ') || ''}</textarea>
          </div>
        </div>

        ${mode === 'add' ? `
          <div class="form-section">
            <h3>Account Setup</h3>
            <div class="form-group">
              <label for="password">Initial Password *</label>
              <input type="password" id="password" name="password" required>
              <small>Volunteer will be asked to change this on first login</small>
            </div>
          </div>
        ` : ''}
      </form>
    `;
  }

  async saveVolunteer(mode, id) {
    try {
      const form = document.getElementById('volunteerForm');
      const formData = new FormData(form);
      
      const volunteerData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        role: formData.get('role'),
        status: formData.get('status'),
        emergencyContact: {
          name: formData.get('emergencyName'),
          phone: formData.get('emergencyPhone'),
          relationship: formData.get('emergencyRelation')
        },
        skills: formData.get('skills').split(',').map(s => s.trim()).filter(s => s),
        interests: formData.get('interests').split(',').map(s => s.trim()).filter(s => s)
      };

      if (mode === 'add') {
        volunteerData.password = formData.get('password');
      }

      UIComponents.showLoading(mode === 'add' ? 'Creating volunteer...' : 'Saving changes...');

      let response;
      if (mode === 'add') {
        response = await window.volunteerAPI.create(volunteerData);
      } else {
        response = await window.volunteerAPI.update(id, volunteerData);
      }

      if (response.success) {
        UIComponents.showToast(
          mode === 'add' ? 'Volunteer created successfully' : 'Volunteer updated successfully',
          'success'
        );
        UIComponents.closeModal();
        await this.loadVolunteers();
      } else {
        UIComponents.showToast(response.error || 'Failed to save volunteer', 'error');
      }
    } catch (error) {
      console.error('Error saving volunteer:', error);
      UIComponents.showToast('Failed to save volunteer', 'error');
    } finally {
      UIComponents.hideLoading();
    }
  }

  async exportVolunteers() {
    try {
      UIComponents.showLoading('Exporting volunteers...');
      const response = await window.volunteerAPI.export();
      
      if (response.success) {
        // Create and trigger download
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `volunteers-${DateUtils.formatDate(new Date(), 'YYYY-MM-DD')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        UIComponents.showToast('Volunteers exported successfully', 'success');
      } else {
        UIComponents.showToast(response.error || 'Failed to export volunteers', 'error');
      }
    } catch (error) {
      console.error('Error exporting volunteers:', error);
      UIComponents.showToast('Failed to export volunteers', 'error');
    } finally {
      UIComponents.hideLoading();
    }
  }

  async suspendVolunteer(id) {
    if (!confirm('Are you sure you want to suspend this volunteer?')) return;
    
    try {
      const response = await window.volunteerAPI.updateStatus(id, 'suspended');
      if (response.success) {
        UIComponents.showToast('Volunteer suspended', 'success');
        await this.loadVolunteers();
      }
    } catch (error) {
      UIComponents.showToast('Failed to suspend volunteer', 'error');
    }
  }

  async activateVolunteer(id) {
    try {
      const response = await window.volunteerAPI.updateStatus(id, 'active');
      if (response.success) {
        UIComponents.showToast('Volunteer activated', 'success');
        await this.loadVolunteers();
      }
    } catch (error) {
      UIComponents.showToast('Failed to activate volunteer', 'error');
    }
  }

  sendMessage(id) {
    // Navigate to messaging or open message modal
    UIComponents.showToast('Messaging feature coming soon', 'info');
  }

  viewHistory(id) {
    // Show volunteer event history
    UIComponents.showToast('History view coming soon', 'info');
  }
}

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
  window.VolunteersManager = VolunteersManager;
}
