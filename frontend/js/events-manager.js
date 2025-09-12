// events-manager.js
// Complete event management functionality

class EventsManager {
  constructor() {
    this.events = [];
    this.currentEvent = null;
    this.view = 'list'; // 'list', 'calendar'
    this.filters = {
      status: 'all',
      category: 'all',
      timeframe: 'upcoming'
    };
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadEvents();
  }

  bindEvents() {
    // View toggles
    const listViewBtn = document.getElementById('listViewBtn');
    const calendarViewBtn = document.getElementById('calendarViewBtn');
    
    if (listViewBtn) {
      listViewBtn.addEventListener('click', () => this.switchView('list'));
    }
    if (calendarViewBtn) {
      calendarViewBtn.addEventListener('click', () => this.switchView('calendar'));
    }

    // Filter controls
    const statusFilter = document.getElementById('eventStatusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.filters.status = e.target.value;
        this.filterAndDisplayEvents();
      });
    }

    const categoryFilter = document.getElementById('eventCategoryFilter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        this.filters.category = e.target.value;
        this.filterAndDisplayEvents();
      });
    }

    // Add event button
    const addBtn = document.getElementById('addEventBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.showAddEventModal());
    }
  }

  async loadEvents() {
    try {
      UIComponents.showLoading('Loading events...');
      const response = await window.eventsAPI.getAll();
      
      if (response.success) {
        this.events = response.data;
        this.displayEvents();
      } else {
        UIComponents.showToast(response.error || 'Failed to load events', 'error');
      }
    } catch (error) {
      console.error('Error loading events:', error);
      UIComponents.showToast('Failed to load events', 'error');
    } finally {
      UIComponents.hideLoading();
    }
  }

  switchView(view) {
    this.view = view;
    
    // Update active button
    document.querySelectorAll('.view-toggle').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${view}ViewBtn`)?.classList.add('active');
    
    this.displayEvents();
  }

  filterAndDisplayEvents() {
    let filtered = [...this.events];

    // Apply status filter
    if (this.filters.status !== 'all') {
      filtered = filtered.filter(event => event.status === this.filters.status);
    }

    // Apply category filter
    if (this.filters.category !== 'all') {
      filtered = filtered.filter(event => event.category === this.filters.category);
    }

    // Apply timeframe filter
    const now = new Date();
    if (this.filters.timeframe === 'upcoming') {
      filtered = filtered.filter(event => new Date(event.startDate) >= now);
    } else if (this.filters.timeframe === 'past') {
      filtered = filtered.filter(event => new Date(event.endDate) < now);
    } else if (this.filters.timeframe === 'today') {
      const today = DateUtils.startOfDay(now);
      const tomorrow = DateUtils.addDays(today, 1);
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.startDate);
        return eventDate >= today && eventDate < tomorrow;
      });
    }

    this.displayEvents(filtered);
  }

  displayEvents(eventsToShow = this.events) {
    const container = document.getElementById('eventsContainer');
    if (!container) return;

    if (this.view === 'calendar') {
      this.displayCalendarView(eventsToShow);
    } else {
      this.displayListView(eventsToShow);
    }
  }

  displayListView(events) {
    const container = document.getElementById('eventsContainer');
    
    if (events.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No events found</h3>
          <p>Try adjusting your filters or create a new event.</p>
          <button class="btn btn-primary" onclick="window.eventsManager.showAddEventModal()">
            Create First Event
          </button>
        </div>
      `;
      return;
    }

    const eventsHtml = events.map(event => this.createEventCard(event)).join('');
    container.innerHTML = `<div class="events-grid">${eventsHtml}</div>`;
  }

  createEventCard(event) {
    const statusClass = this.getStatusClass(event.status);
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    const registeredCount = event.totalRegistered || 0;
    const maxVolunteers = event.maxVolunteers;

    return `
      <div class="event-card" data-id="${event._id}">
        <div class="event-header">
          <div class="event-date">
            <span class="day">${DateUtils.formatDate(startDate, 'DD')}</span>
            <span class="month">${DateUtils.formatDate(startDate, 'MMM')}</span>
          </div>
          <div class="event-info">
            <h3>${event.title}</h3>
            <p class="event-location">${event.location?.name || 'Location TBD'}</p>
            <p class="event-time">
              ${DateUtils.formatDate(startDate, 'MMM DD, HH:mm')} - 
              ${DateUtils.formatDate(endDate, 'HH:mm')}
            </p>
            <span class="status-badge ${statusClass}">${event.status}</span>
          </div>
          <div class="event-actions">
            <button class="btn btn-sm btn-outline" onclick="window.eventsManager.viewEvent('${event._id}')">
              View
            </button>
            <button class="btn btn-sm btn-outline" onclick="window.eventsManager.editEvent('${event._id}')">
              Edit
            </button>
            <div class="dropdown">
              <button class="btn btn-sm btn-outline dropdown-toggle">More</button>
              <div class="dropdown-menu">
                <a href="#" onclick="window.eventsManager.manageAttendance('${event._id}')">Attendance</a>
                <a href="#" onclick="window.eventsManager.exportEventData('${event._id}')">Export Data</a>
                <a href="#" onclick="window.eventsManager.duplicateEvent('${event._id}')">Duplicate</a>
                ${event.status === 'published' ? 
                  `<a href="#" onclick="window.eventsManager.cancelEvent('${event._id}')">Cancel</a>` :
                  event.status === 'draft' ?
                  `<a href="#" onclick="window.eventsManager.publishEvent('${event._id}')">Publish</a>` : ''
                }
              </div>
            </div>
          </div>
        </div>
        <div class="event-description">
          <p>${event.description?.substring(0, 150)}${event.description?.length > 150 ? '...' : ''}</p>
        </div>
        <div class="event-stats">
          <div class="stat">
            <span class="stat-value">${registeredCount}</span>
            <span class="stat-label">Registered</span>
          </div>
          ${maxVolunteers ? `
            <div class="stat">
              <span class="stat-value">${maxVolunteers}</span>
              <span class="stat-label">Max</span>
            </div>
          ` : ''}
          <div class="stat">
            <span class="stat-value">${event.totalAttendees || 0}</span>
            <span class="stat-label">Attended</span>
          </div>
          <div class="stat">
            <span class="stat-value">${Math.round(event.totalHours || 0)}</span>
            <span class="stat-label">Hours</span>
          </div>
        </div>
        ${event.category ? `
          <div class="event-category">
            <span class="category-tag category-${event.category}">${event.category.replace('_', ' ')}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  displayCalendarView(events) {
    const container = document.getElementById('eventsContainer');
    container.innerHTML = `
      <div class="calendar-view">
        <div class="calendar-header">
          <button class="btn btn-outline" id="prevMonth">&lt;</button>
          <h3 id="currentMonth"></h3>
          <button class="btn btn-outline" id="nextMonth">&gt;</button>
        </div>
        <div class="calendar-grid" id="calendarGrid">
          <!-- Calendar will be generated here -->
        </div>
      </div>
    `;
    
    this.renderCalendar(events);
  }

  renderCalendar(events) {
    // Simple calendar implementation
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    document.getElementById('currentMonth').textContent = 
      DateUtils.formatDate(new Date(currentYear, currentMonth), 'MMMM YYYY');
    
    // This would need a more sophisticated calendar implementation
    // For now, showing a simplified version
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = `
      <div class="calendar-placeholder">
        <p>Calendar view coming soon</p>
        <button class="btn btn-primary" onclick="window.eventsManager.switchView('list')">
          Switch to List View
        </button>
      </div>
    `;
  }

  getStatusClass(status) {
    const statusClasses = {
      draft: 'status-draft',
      published: 'status-published',
      in_progress: 'status-progress',
      completed: 'status-completed',
      cancelled: 'status-cancelled'
    };
    return statusClasses[status] || '';
  }

  async viewEvent(id) {
    try {
      const response = await window.eventsAPI.getById(id);
      if (response.success) {
        this.showEventModal(response.data, 'view');
      }
    } catch (error) {
      console.error('Error viewing event:', error);
      UIComponents.showToast('Failed to load event details', 'error');
    }
  }

  async editEvent(id) {
    try {
      const response = await window.eventsAPI.getById(id);
      if (response.success) {
        this.showEventModal(response.data, 'edit');
      }
    } catch (error) {
      console.error('Error loading event for edit:', error);
      UIComponents.showToast('Failed to load event details', 'error');
    }
  }

  showAddEventModal() {
    this.showEventModal(null, 'add');
  }

  showEventModal(event, mode) {
    const isEditing = mode === 'edit';
    const isAdding = mode === 'add';
    const isViewing = mode === 'view';

    const modalHtml = `
      <div class="modal-header">
        <h2>${isAdding ? 'Create New Event' : isEditing ? 'Edit Event' : 'Event Details'}</h2>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        ${this.createEventForm(event, mode)}
      </div>
      <div class="modal-footer">
        ${isViewing ? `
          <button class="btn btn-outline" onclick="UIComponents.closeModal()">Close</button>
          <button class="btn btn-primary" onclick="window.eventsManager.editEvent('${event._id}')">Edit</button>
        ` : `
          <button class="btn btn-outline" onclick="UIComponents.closeModal()">Cancel</button>
          ${isEditing ? `
            <button class="btn btn-outline" onclick="window.eventsManager.saveEventDraft('${event._id}')">Save Draft</button>
          ` : ''}
          <button class="btn btn-primary" onclick="window.eventsManager.saveEvent('${mode}', '${event?._id || ''}')">
            ${isAdding ? 'Create Event' : 'Save Changes'}
          </button>
        `}
      </div>
    `;

    UIComponents.showModal(modalHtml, 'large');
  }

  createEventForm(event, mode) {
    const isViewing = mode === 'view';
    const disabled = isViewing ? 'disabled' : '';

    return `
      <form id="eventForm" class="event-form">
        <div class="form-grid">
          <div class="form-group span-2">
            <label for="title">Event Title *</label>
            <input type="text" id="title" name="title" value="${event?.title || ''}" ${disabled} required>
          </div>
          <div class="form-group span-2">
            <label for="description">Description *</label>
            <textarea id="description" name="description" rows="3" ${disabled} required>${event?.description || ''}</textarea>
          </div>
          
          <div class="form-group">
            <label for="startDate">Start Date & Time *</label>
            <input type="datetime-local" id="startDate" name="startDate" 
                   value="${event?.startDate ? DateUtils.formatForInput(new Date(event.startDate)) : ''}" ${disabled} required>
          </div>
          <div class="form-group">
            <label for="endDate">End Date & Time *</label>
            <input type="datetime-local" id="endDate" name="endDate" 
                   value="${event?.endDate ? DateUtils.formatForInput(new Date(event.endDate)) : ''}" ${disabled} required>
          </div>
          
          <div class="form-group">
            <label for="category">Category *</label>
            <select id="category" name="category" ${disabled} required>
              <option value="">Select Category</option>
              <option value="community_service" ${event?.category === 'community_service' ? 'selected' : ''}>Community Service</option>
              <option value="fundraising" ${event?.category === 'fundraising' ? 'selected' : ''}>Fundraising</option>
              <option value="education" ${event?.category === 'education' ? 'selected' : ''}>Education</option>
              <option value="environment" ${event?.category === 'environment' ? 'selected' : ''}>Environment</option>
              <option value="healthcare" ${event?.category === 'healthcare' ? 'selected' : ''}>Healthcare</option>
              <option value="disaster_relief" ${event?.category === 'disaster_relief' ? 'selected' : ''}>Disaster Relief</option>
              <option value="other" ${event?.category === 'other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
          <div class="form-group">
            <label for="status">Status</label>
            <select id="status" name="status" ${disabled}>
              <option value="draft" ${event?.status === 'draft' ? 'selected' : ''}>Draft</option>
              <option value="published" ${event?.status === 'published' ? 'selected' : ''}>Published</option>
              <option value="in_progress" ${event?.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
              <option value="completed" ${event?.status === 'completed' ? 'selected' : ''}>Completed</option>
              <option value="cancelled" ${event?.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </div>
        </div>

        <div class="form-section">
          <h3>Location</h3>
          <div class="form-grid">
            <div class="form-group">
              <label for="locationName">Venue Name *</label>
              <input type="text" id="locationName" name="locationName" 
                     value="${event?.location?.name || ''}" ${disabled} required>
            </div>
            <div class="form-group">
              <label for="locationAddress">Address</label>
              <input type="text" id="locationAddress" name="locationAddress" 
                     value="${event?.location?.address?.street || ''}" ${disabled}>
            </div>
            <div class="form-group">
              <label for="locationCity">City</label>
              <input type="text" id="locationCity" name="locationCity" 
                     value="${event?.location?.address?.city || ''}" ${disabled}>
            </div>
            <div class="form-group">
              <label for="locationState">State</label>
              <input type="text" id="locationState" name="locationState" 
                     value="${event?.location?.address?.state || ''}" ${disabled}>
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3>Volunteer Requirements</h3>
          <div class="form-grid">
            <div class="form-group">
              <label for="maxVolunteers">Maximum Volunteers</label>
              <input type="number" id="maxVolunteers" name="maxVolunteers" min="1" 
                     value="${event?.maxVolunteers || ''}" ${disabled}>
            </div>
            <div class="form-group">
              <label for="minVolunteers">Minimum Volunteers</label>
              <input type="number" id="minVolunteers" name="minVolunteers" min="1" 
                     value="${event?.minVolunteers || ''}" ${disabled}>
            </div>
            <div class="form-group">
              <label for="registrationDeadline">Registration Deadline</label>
              <input type="datetime-local" id="registrationDeadline" name="registrationDeadline" 
                     value="${event?.registrationDeadline ? DateUtils.formatForInput(new Date(event.registrationDeadline)) : ''}" ${disabled}>
            </div>
            <div class="form-group">
              <label for="allowWalkIns">Allow Walk-ins</label>
              <select id="allowWalkIns" name="allowWalkIns" ${disabled}>
                <option value="true" ${event?.allowWalkIns !== false ? 'selected' : ''}>Yes</option>
                <option value="false" ${event?.allowWalkIns === false ? 'selected' : ''}>No</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="requiredSkills">Required Skills (comma-separated)</label>
            <textarea id="requiredSkills" name="requiredSkills" rows="2" ${disabled}>${event?.requiredSkills?.join(', ') || ''}</textarea>
          </div>
        </div>

        <div class="form-section">
          <h3>Additional Information</h3>
          <div class="form-group">
            <label for="tags">Tags (comma-separated)</label>
            <input type="text" id="tags" name="tags" value="${event?.tags?.join(', ') || ''}" ${disabled}>
          </div>
          <div class="form-group">
            <label for="contactPerson">Contact Person</label>
            <input type="text" id="contactPerson" name="contactPerson" 
                   value="${event?.contactPerson?.name || ''}" ${disabled}>
          </div>
          <div class="form-group">
            <label for="contactEmail">Contact Email</label>
            <input type="email" id="contactEmail" name="contactEmail" 
                   value="${event?.contactPerson?.email || ''}" ${disabled}>
          </div>
          <div class="form-group">
            <label for="contactPhone">Contact Phone</label>
            <input type="tel" id="contactPhone" name="contactPhone" 
                   value="${event?.contactPerson?.phone || ''}" ${disabled}>
          </div>
        </div>
      </form>
    `;
  }

  async saveEvent(mode, id) {
    try {
      const form = document.getElementById('eventForm');
      const formData = new FormData(form);
      
      const eventData = {
        title: formData.get('title'),
        description: formData.get('description'),
        startDate: new Date(formData.get('startDate')),
        endDate: new Date(formData.get('endDate')),
        category: formData.get('category'),
        status: formData.get('status') || 'draft',
        location: {
          name: formData.get('locationName'),
          address: {
            street: formData.get('locationAddress'),
            city: formData.get('locationCity'),
            state: formData.get('locationState')
          }
        },
        maxVolunteers: formData.get('maxVolunteers') ? parseInt(formData.get('maxVolunteers')) : null,
        minVolunteers: formData.get('minVolunteers') ? parseInt(formData.get('minVolunteers')) : null,
        registrationDeadline: formData.get('registrationDeadline') ? new Date(formData.get('registrationDeadline')) : null,
        allowWalkIns: formData.get('allowWalkIns') === 'true',
        requiredSkills: formData.get('requiredSkills').split(',').map(s => s.trim()).filter(s => s),
        tags: formData.get('tags').split(',').map(s => s.trim()).filter(s => s),
        contactPerson: {
          name: formData.get('contactPerson'),
          email: formData.get('contactEmail'),
          phone: formData.get('contactPhone')
        }
      };

      UIComponents.showLoading(mode === 'add' ? 'Creating event...' : 'Saving changes...');

      let response;
      if (mode === 'add') {
        response = await window.eventsAPI.create(eventData);
      } else {
        response = await window.eventsAPI.update(id, eventData);
      }

      if (response.success) {
        UIComponents.showToast(
          mode === 'add' ? 'Event created successfully' : 'Event updated successfully',
          'success'
        );
        UIComponents.closeModal();
        await this.loadEvents();
      } else {
        UIComponents.showToast(response.error || 'Failed to save event', 'error');
      }
    } catch (error) {
      console.error('Error saving event:', error);
      UIComponents.showToast('Failed to save event', 'error');
    } finally {
      UIComponents.hideLoading();
    }
  }

  async manageAttendance(eventId) {
    // Navigate to attendance management
    window.location.hash = `#events/${eventId}/attendance`;
  }

  async exportEventData(eventId) {
    try {
      UIComponents.showLoading('Exporting event data...');
      const response = await window.eventsAPI.exportData(eventId);
      
      if (response.success) {
        // Trigger download
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `event-${eventId}-${DateUtils.formatDate(new Date(), 'YYYY-MM-DD')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        UIComponents.showToast('Event data exported successfully', 'success');
      }
    } catch (error) {
      UIComponents.showToast('Failed to export event data', 'error');
    } finally {
      UIComponents.hideLoading();
    }
  }

  async publishEvent(eventId) {
    if (!confirm('Are you sure you want to publish this event? It will be visible to volunteers.')) return;
    
    try {
      const response = await window.eventsAPI.updateStatus(eventId, 'published');
      if (response.success) {
        UIComponents.showToast('Event published successfully', 'success');
        await this.loadEvents();
      }
    } catch (error) {
      UIComponents.showToast('Failed to publish event', 'error');
    }
  }

  async cancelEvent(eventId) {
    if (!confirm('Are you sure you want to cancel this event? This action cannot be undone.')) return;
    
    try {
      const response = await window.eventsAPI.updateStatus(eventId, 'cancelled');
      if (response.success) {
        UIComponents.showToast('Event cancelled', 'success');
        await this.loadEvents();
      }
    } catch (error) {
      UIComponents.showToast('Failed to cancel event', 'error');
    }
  }

  async duplicateEvent(eventId) {
    try {
      const response = await window.eventsAPI.duplicate(eventId);
      if (response.success) {
        UIComponents.showToast('Event duplicated successfully', 'success');
        await this.loadEvents();
      }
    } catch (error) {
      UIComponents.showToast('Failed to duplicate event', 'error');
    }
  }
}

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
  window.EventsManager = EventsManager;
}
