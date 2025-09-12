// broadcasts-manager.js - Complete broadcasts management frontend

class BroadcastsManager {
  constructor() {
    this.broadcasts = [];
    this.filteredBroadcasts = [];
    this.currentBroadcast = null;
    this.apiClient = new APIClient();
    this.init();
  }

  async init() {
    console.log('📡 Initializing BroadcastsManager...');
    try {
      this.bindEvents();
      await this.loadBroadcasts();
      console.log('✅ BroadcastsManager initialized');
    } catch (error) {
      console.error('❌ Error initializing BroadcastsManager:', error);
      UIComponents.showToast('Failed to initialize broadcasts', 'error');
    }
  }

  bindEvents() {
    // Bind button events
    const addBroadcastBtn = document.getElementById('addBroadcastBtn');
    if (addBroadcastBtn) {
      addBroadcastBtn.addEventListener('click', () => this.showCreateBroadcastModal());
    }

    // Bind filter and search events
    const broadcastSearch = document.getElementById('broadcastSearch');
    if (broadcastSearch) {
      broadcastSearch.addEventListener('input', (e) => this.handleSearchInput(e.target.value));
    }

    const statusFilter = document.getElementById('broadcastStatusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => this.applyFilters());
    }

    const typeFilter = document.getElementById('broadcastTypeFilter');
    if (typeFilter) {
      typeFilter.addEventListener('change', () => this.applyFilters());
    }

    const audienceFilter = document.getElementById('broadcastAudienceFilter');
    if (audienceFilter) {
      audienceFilter.addEventListener('change', () => this.applyFilters());
    }

    // Quick compose button
    const quickComposeBtn = document.getElementById('quickComposeBtn');
    if (quickComposeBtn) {
      quickComposeBtn.addEventListener('click', () => this.showQuickComposeModal());
    }

    // Export button
    const exportBtn = document.getElementById('exportBroadcastsBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportBroadcasts());
    }
  }

  async loadBroadcasts() {
    try {
      UIComponents.showLoading('Loading broadcasts...');
      
      const response = await this.apiClient.get('/broadcasts');
      
      if (response.success) {
        this.broadcasts = response.data.broadcasts || [];
        this.filteredBroadcasts = [...this.broadcasts];
        this.renderBroadcasts();
        this.updateBroadcastStats();
      } else {
        throw new Error(response.message || 'Failed to load broadcasts');
      }
    } catch (error) {
      console.error('Error loading broadcasts:', error);
      UIComponents.showToast('Failed to load broadcasts', 'error');
    } finally {
      UIComponents.hideLoading();
    }
  }

  renderBroadcasts() {
    const container = document.getElementById('broadcastsContainer');
    if (!container) return;

    if (this.filteredBroadcasts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📡</div>
          <h3>No Broadcasts Found</h3>
          <p>No broadcasts match your current filters.</p>
          <button class="btn btn-primary" onclick="window.broadcastsManager.showCreateBroadcastModal()">
            Create First Broadcast
          </button>
        </div>
      `;
      return;
    }

    const broadcastsHTML = this.filteredBroadcasts.map(broadcast => this.renderBroadcastCard(broadcast)).join('');
    container.innerHTML = broadcastsHTML;

    // Add event listeners to broadcast cards
    this.bindBroadcastCardEvents();
  }

  renderBroadcastCard(broadcast) {
    const statusClass = this.getStatusClass(broadcast.status);
    const typeIcon = this.getTypeIcon(broadcast.type);
    const createdDate = DateUtils.formatDateTime(broadcast.createdAt);
    const sentDate = broadcast.sentAt ? DateUtils.formatDateTime(broadcast.sentAt) : null;

    return `
      <div class="broadcast-card" data-broadcast-id="${broadcast._id}">
        <div class="broadcast-header">
          <div class="broadcast-meta">
            <h3 class="broadcast-title">${StringUtils.escapeHtml(broadcast.title)}</h3>
            <div class="broadcast-badges">
              <span class="status-badge ${statusClass}">${broadcast.status}</span>
              <span class="type-badge type-${broadcast.type}">${typeIcon} ${broadcast.type.toUpperCase()}</span>
              <span class="audience-badge">${broadcast.audienceType}</span>
            </div>
          </div>
          <div class="broadcast-actions">
            <div class="dropdown">
              <button class="btn btn-sm btn-light dropdown-toggle" data-bs-toggle="dropdown">
                Actions
              </button>
              <ul class="dropdown-menu">
                <li><a class="dropdown-item" href="#" onclick="window.broadcastsManager.viewBroadcast('${broadcast._id}')">View Details</a></li>
                ${broadcast.status === 'draft' ? `
                  <li><a class="dropdown-item" href="#" onclick="window.broadcastsManager.editBroadcast('${broadcast._id}')">Edit</a></li>
                  <li><a class="dropdown-item" href="#" onclick="window.broadcastsManager.sendBroadcast('${broadcast._id}')">Send Now</a></li>
                  <li><a class="dropdown-item" href="#" onclick="window.broadcastsManager.scheduleBroadcast('${broadcast._id}')">Schedule</a></li>
                ` : ''}
                ${broadcast.status === 'scheduled' ? `
                  <li><a class="dropdown-item" href="#" onclick="window.broadcastsManager.cancelScheduled('${broadcast._id}')">Cancel Schedule</a></li>
                ` : ''}
                <li><a class="dropdown-item" href="#" onclick="window.broadcastsManager.duplicateBroadcast('${broadcast._id}')">Duplicate</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item text-danger" href="#" onclick="window.broadcastsManager.deleteBroadcast('${broadcast._id}')">Delete</a></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div class="broadcast-body">
          <p class="broadcast-message">${StringUtils.truncate(StringUtils.stripHtml(broadcast.message), 150)}</p>
          
          <div class="broadcast-details">
            <div class="detail-item">
              <i class="icon-user"></i>
              <span>Created by: ${broadcast.createdBy?.firstName} ${broadcast.createdBy?.lastName}</span>
            </div>
            <div class="detail-item">
              <i class="icon-calendar"></i>
              <span>Created: ${createdDate}</span>
            </div>
            ${sentDate ? `
              <div class="detail-item">
                <i class="icon-send"></i>
                <span>Sent: ${sentDate}</span>
              </div>
            ` : ''}
            ${broadcast.scheduledAt ? `
              <div class="detail-item">
                <i class="icon-clock"></i>
                <span>Scheduled: ${DateUtils.formatDateTime(broadcast.scheduledAt)}</span>
              </div>
            ` : ''}
          </div>
        </div>
        
        <div class="broadcast-footer">
          <div class="broadcast-metrics">
            ${this.renderBroadcastMetrics(broadcast)}
          </div>
        </div>
      </div>
    `;
  }

  renderBroadcastMetrics(broadcast) {
    if (broadcast.status === 'draft') {
      return `
        <div class="metrics-item">
          <span class="metric-label">Target Recipients:</span>
          <span class="metric-value">${broadcast.targetRecipients || 0}</span>
        </div>
      `;
    }

    const deliveryRate = broadcast.deliveryStats?.sent > 0 
      ? (broadcast.deliveryStats.delivered / broadcast.deliveryStats.sent * 100).toFixed(1)
      : 0;

    const openRate = broadcast.deliveryStats?.delivered > 0 
      ? (broadcast.deliveryStats.opened / broadcast.deliveryStats.delivered * 100).toFixed(1)
      : 0;

    return `
      <div class="metrics-grid">
        <div class="metrics-item">
          <span class="metric-label">Sent:</span>
          <span class="metric-value">${broadcast.deliveryStats?.sent || 0}</span>
        </div>
        <div class="metrics-item">
          <span class="metric-label">Delivered:</span>
          <span class="metric-value">${broadcast.deliveryStats?.delivered || 0} (${deliveryRate}%)</span>
        </div>
        <div class="metrics-item">
          <span class="metric-label">Opened:</span>
          <span class="metric-value">${broadcast.deliveryStats?.opened || 0} (${openRate}%)</span>
        </div>
        ${broadcast.deliveryStats?.failed > 0 ? `
          <div class="metrics-item">
            <span class="metric-label">Failed:</span>
            <span class="metric-value text-danger">${broadcast.deliveryStats.failed}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  bindBroadcastCardEvents() {
    // Add click handlers for broadcast cards
    document.querySelectorAll('.broadcast-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.broadcast-actions') && !e.target.closest('.dropdown-menu')) {
          const broadcastId = card.dataset.broadcastId;
          this.viewBroadcast(broadcastId);
        }
      });
    });
  }

  handleSearchInput(searchTerm) {
    this.searchTerm = searchTerm.toLowerCase();
    this.applyFilters();
  }

  applyFilters() {
    let filtered = [...this.broadcasts];

    // Apply search filter
    if (this.searchTerm) {
      filtered = filtered.filter(broadcast => 
        broadcast.title.toLowerCase().includes(this.searchTerm) ||
        broadcast.message.toLowerCase().includes(this.searchTerm) ||
        broadcast.audienceType.toLowerCase().includes(this.searchTerm) ||
        `${broadcast.createdBy?.firstName} ${broadcast.createdBy?.lastName}`.toLowerCase().includes(this.searchTerm)
      );
    }

    // Apply status filter
    const statusFilter = document.getElementById('broadcastStatusFilter')?.value;
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(broadcast => broadcast.status === statusFilter);
    }

    // Apply type filter
    const typeFilter = document.getElementById('broadcastTypeFilter')?.value;
    if (typeFilter && typeFilter !== 'all') {
      filtered = filtered.filter(broadcast => broadcast.type === typeFilter);
    }

    // Apply audience filter
    const audienceFilter = document.getElementById('broadcastAudienceFilter')?.value;
    if (audienceFilter && audienceFilter !== 'all') {
      filtered = filtered.filter(broadcast => broadcast.audienceType === audienceFilter);
    }

    this.filteredBroadcasts = filtered;
    this.renderBroadcasts();
    this.updateBroadcastStats();
  }

  showCreateBroadcastModal() {
    const modalHTML = `
      <div class="modal fade" id="broadcastModal" tabindex="-1">
        <div class="modal-dialog modal-xl">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Create New Broadcast</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="broadcastForm">
                <div class="row">
                  <div class="col-md-8">
                    <div class="mb-3">
                      <label for="broadcastTitle" class="form-label">Title *</label>
                      <input type="text" class="form-control" id="broadcastTitle" required>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="mb-3">
                      <label for="broadcastType" class="form-label">Type *</label>
                      <select class="form-select" id="broadcastType" required>
                        <option value="email">Email</option>
                        <option value="sms">SMS</option>
                        <option value="push">Push Notification</option>
                        <option value="announcement">Announcement</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div class="row">
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label for="audienceType" class="form-label">Audience *</label>
                      <select class="form-select" id="audienceType" required onchange="window.broadcastsManager.handleAudienceChange()">
                        <option value="">Select Audience</option>
                        <option value="all_volunteers">All Volunteers</option>
                        <option value="active_volunteers">Active Volunteers</option>
                        <option value="leaders">Leaders</option>
                        <option value="event_participants">Event Participants</option>
                        <option value="custom">Custom Selection</option>
                      </select>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label for="broadcastPriority" class="form-label">Priority</label>
                      <select class="form-select" id="broadcastPriority">
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div id="customAudienceSection" style="display: none;">
                  <div class="mb-3">
                    <label class="form-label">Select Recipients</label>
                    <div class="border rounded p-3" style="max-height: 200px; overflow-y: auto;">
                      <div id="recipientsList">
                        <!-- Will be populated dynamically -->
                      </div>
                    </div>
                  </div>
                </div>

                <div class="mb-3">
                  <label for="broadcastMessage" class="form-label">Message *</label>
                  <div id="messageEditor" style="height: 200px;"></div>
                  <textarea class="form-control d-none" id="broadcastMessage" required></textarea>
                </div>

                <div class="row">
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label for="scheduledAt" class="form-label">Schedule (Optional)</label>
                      <input type="datetime-local" class="form-control" id="scheduledAt">
                      <div class="form-text">Leave empty to send immediately</div>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label for="broadcastTags" class="form-label">Tags</label>
                      <input type="text" class="form-control" id="broadcastTags" 
                        placeholder="Enter tags separated by commas">
                    </div>
                  </div>
                </div>

                <div class="row">
                  <div class="col-md-12">
                    <div class="form-check">
                      <input class="form-check-input" type="checkbox" id="trackOpens">
                      <label class="form-check-label" for="trackOpens">
                        Track message opens (for email and push notifications)
                      </label>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-outline-primary" onclick="window.broadcastsManager.saveDraft()">
                Save Draft
              </button>
              <button type="button" class="btn btn-primary" onclick="window.broadcastsManager.sendBroadcastNow()">
                Send Now
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal
    const existingModal = document.getElementById('broadcastModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Initialize rich text editor (if Quill is available)
    this.initializeMessageEditor();

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('broadcastModal'));
    modal.show();
  }

  initializeMessageEditor() {
    // Check if Quill is available
    if (typeof Quill !== 'undefined') {
      this.messageEditor = new Quill('#messageEditor', {
        theme: 'snow',
        modules: {
          toolbar: [
            ['bold', 'italic', 'underline'],
            ['link'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['clean']
          ]
        }
      });
    } else {
      // Fallback to textarea
      document.getElementById('messageEditor').style.display = 'none';
      document.getElementById('broadcastMessage').classList.remove('d-none');
    }
  }

  handleAudienceChange() {
    const audienceType = document.getElementById('audienceType').value;
    const customSection = document.getElementById('customAudienceSection');
    
    if (audienceType === 'custom') {
      customSection.style.display = 'block';
      this.loadRecipientsList();
    } else {
      customSection.style.display = 'none';
    }
  }

  async loadRecipientsList() {
    try {
      const response = await this.apiClient.get('/volunteers');
      
      if (response.success) {
        const volunteers = response.data.volunteers || [];
        const recipientsList = document.getElementById('recipientsList');
        
        recipientsList.innerHTML = volunteers.map(volunteer => `
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="recipient_${volunteer._id}" value="${volunteer._id}">
            <label class="form-check-label" for="recipient_${volunteer._id}">
              ${volunteer.firstName} ${volunteer.lastName} (${volunteer.email})
            </label>
          </div>
        `).join('');
      }
    } catch (error) {
      console.error('Error loading recipients:', error);
    }
  }

  async saveDraft() {
    await this.saveBroadcast('draft');
  }

  async sendBroadcastNow() {
    await this.saveBroadcast('sending');
  }

  async saveBroadcast(status) {
    try {
      // Get form values
      const title = document.getElementById('broadcastTitle').value;
      const type = document.getElementById('broadcastType').value;
      const audienceType = document.getElementById('audienceType').value;
      const priority = document.getElementById('broadcastPriority').value;
      const scheduledAt = document.getElementById('scheduledAt').value;
      const tags = document.getElementById('broadcastTags').value;
      const trackOpens = document.getElementById('trackOpens').checked;

      // Get message content
      let message;
      if (this.messageEditor) {
        message = this.messageEditor.root.innerHTML;
      } else {
        message = document.getElementById('broadcastMessage').value;
      }

      // Get custom recipients if applicable
      let customRecipients = [];
      if (audienceType === 'custom') {
        const checkedBoxes = document.querySelectorAll('#recipientsList input[type="checkbox"]:checked');
        customRecipients = Array.from(checkedBoxes).map(cb => cb.value);
      }

      // Validate required fields
      if (!title || !type || !audienceType || !message) {
        UIComponents.showToast('Please fill in all required fields', 'warning');
        return;
      }

      if (audienceType === 'custom' && customRecipients.length === 0) {
        UIComponents.showToast('Please select at least one recipient', 'warning');
        return;
      }

      // Prepare broadcast data
      const broadcastData = {
        title,
        type,
        audienceType,
        message,
        priority,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        trackOpens,
        customRecipients: customRecipients.length > 0 ? customRecipients : undefined,
        scheduledAt: scheduledAt || undefined,
        status
      };

      UIComponents.showLoading(status === 'draft' ? 'Saving draft...' : 'Sending broadcast...');

      const response = await this.apiClient.post('/broadcasts', broadcastData);

      if (response.success) {
        const action = status === 'draft' ? 'saved as draft' : 'sent';
        UIComponents.showToast(`Broadcast ${action} successfully!`, 'success');
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('broadcastModal'));
        modal.hide();
        
        // Reload broadcasts
        await this.loadBroadcasts();
      } else {
        throw new Error(response.message || 'Failed to save broadcast');
      }
    } catch (error) {
      console.error('Error saving broadcast:', error);
      UIComponents.showToast('Failed to save broadcast', 'error');
    } finally {
      UIComponents.hideLoading();
    }
  }

  async viewBroadcast(broadcastId) {
    try {
      const broadcast = this.broadcasts.find(b => b._id === broadcastId);
      if (!broadcast) return;

      // Load full broadcast details
      const response = await this.apiClient.get(`/broadcasts/${broadcastId}`);
      const fullBroadcast = response.success ? response.data.broadcast : broadcast;

      this.showBroadcastDetailsModal(fullBroadcast);
    } catch (error) {
      console.error('Error viewing broadcast:', error);
      UIComponents.showToast('Failed to load broadcast details', 'error');
    }
  }

  showBroadcastDetailsModal(broadcast) {
    const statusClass = this.getStatusClass(broadcast.status);
    const typeIcon = this.getTypeIcon(broadcast.type);

    const modalHTML = `
      <div class="modal fade" id="broadcastDetailsModal" tabindex="-1">
        <div class="modal-dialog modal-xl">
          <div class="modal-content">
            <div class="modal-header">
              <div>
                <h5 class="modal-title">${StringUtils.escapeHtml(broadcast.title)}</h5>
                <div class="broadcast-badges mt-2">
                  <span class="status-badge ${statusClass}">${broadcast.status}</span>
                  <span class="type-badge type-${broadcast.type}">${typeIcon} ${broadcast.type.toUpperCase()}</span>
                  <span class="audience-badge">${broadcast.audienceType}</span>
                </div>
              </div>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="row">
                <div class="col-lg-8">
                  <div class="broadcast-content">
                    <h6>Message</h6>
                    <div class="message-content border rounded p-3">
                      ${broadcast.message}
                    </div>
                    
                    ${broadcast.deliveryStats ? `
                      <h6 class="mt-4">Delivery Statistics</h6>
                      <div class="delivery-stats">
                        ${this.renderDetailedMetrics(broadcast)}
                      </div>
                    ` : ''}
                  </div>
                </div>
                <div class="col-lg-4">
                  <div class="broadcast-sidebar">
                    <h6>Details</h6>
                    <div class="detail-group">
                      <div class="detail-item">
                        <strong>Created by:</strong>
                        <span>${broadcast.createdBy?.firstName} ${broadcast.createdBy?.lastName}</span>
                      </div>
                      <div class="detail-item">
                        <strong>Created:</strong>
                        <span>${DateUtils.formatDateTime(broadcast.createdAt)}</span>
                      </div>
                      ${broadcast.sentAt ? `
                        <div class="detail-item">
                          <strong>Sent:</strong>
                          <span>${DateUtils.formatDateTime(broadcast.sentAt)}</span>
                        </div>
                      ` : ''}
                      ${broadcast.scheduledAt ? `
                        <div class="detail-item">
                          <strong>Scheduled:</strong>
                          <span>${DateUtils.formatDateTime(broadcast.scheduledAt)}</span>
                        </div>
                      ` : ''}
                      <div class="detail-item">
                        <strong>Priority:</strong>
                        <span class="text-capitalize">${broadcast.priority}</span>
                      </div>
                      ${broadcast.tags && broadcast.tags.length > 0 ? `
                        <div class="detail-item">
                          <strong>Tags:</strong>
                          <div class="tags">
                            ${broadcast.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                          </div>
                        </div>
                      ` : ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
              ${broadcast.status === 'draft' ? `
                <button type="button" class="btn btn-primary" onclick="window.broadcastsManager.editBroadcast('${broadcast._id}')">
                  Edit
                </button>
                <button type="button" class="btn btn-success" onclick="window.broadcastsManager.sendBroadcast('${broadcast._id}')">
                  Send Now
                </button>
              ` : ''}
              <button type="button" class="btn btn-outline-primary" onclick="window.broadcastsManager.duplicateBroadcast('${broadcast._id}')">
                Duplicate
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal
    const existingModal = document.getElementById('broadcastDetailsModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('broadcastDetailsModal'));
    modal.show();
  }

  renderDetailedMetrics(broadcast) {
    const stats = broadcast.deliveryStats;
    if (!stats) return '<p>No delivery statistics available</p>';

    const deliveryRate = stats.sent > 0 ? (stats.delivered / stats.sent * 100).toFixed(1) : 0;
    const openRate = stats.delivered > 0 ? (stats.opened / stats.delivered * 100).toFixed(1) : 0;
    const failureRate = stats.sent > 0 ? (stats.failed / stats.sent * 100).toFixed(1) : 0;

    return `
      <div class="metrics-detailed">
        <div class="metric-row">
          <span class="metric-label">Total Sent:</span>
          <span class="metric-value">${stats.sent}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Delivered:</span>
          <span class="metric-value">${stats.delivered} (${deliveryRate}%)</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Opened:</span>
          <span class="metric-value">${stats.opened} (${openRate}%)</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Failed:</span>
          <span class="metric-value text-danger">${stats.failed} (${failureRate}%)</span>
        </div>
        ${stats.bounced ? `
          <div class="metric-row">
            <span class="metric-label">Bounced:</span>
            <span class="metric-value text-warning">${stats.bounced}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  async sendBroadcast(broadcastId) {
    if (!confirm('Are you sure you want to send this broadcast now?')) {
      return;
    }

    try {
      UIComponents.showLoading('Sending broadcast...');
      
      const response = await this.apiClient.put(`/broadcasts/${broadcastId}/send`);
      
      if (response.success) {
        UIComponents.showToast('Broadcast sent successfully!', 'success');
        await this.loadBroadcasts();
        
        // Close any open modals
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
          const instance = bootstrap.Modal.getInstance(modal);
          if (instance) instance.hide();
        });
      } else {
        throw new Error(response.message || 'Failed to send broadcast');
      }
    } catch (error) {
      console.error('Error sending broadcast:', error);
      UIComponents.showToast('Failed to send broadcast', 'error');
    } finally {
      UIComponents.hideLoading();
    }
  }

  async deleteBroadcast(broadcastId) {
    if (!confirm('Are you sure you want to delete this broadcast? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await this.apiClient.delete(`/broadcasts/${broadcastId}`);
      
      if (response.success) {
        UIComponents.showToast('Broadcast deleted successfully', 'success');
        await this.loadBroadcasts();
      } else {
        throw new Error(response.message || 'Failed to delete broadcast');
      }
    } catch (error) {
      console.error('Error deleting broadcast:', error);
      UIComponents.showToast('Failed to delete broadcast', 'error');
    }
  }

  async duplicateBroadcast(broadcastId) {
    try {
      const response = await this.apiClient.post(`/broadcasts/${broadcastId}/duplicate`);
      
      if (response.success) {
        UIComponents.showToast('Broadcast duplicated successfully', 'success');
        await this.loadBroadcasts();
      } else {
        throw new Error(response.message || 'Failed to duplicate broadcast');
      }
    } catch (error) {
      console.error('Error duplicating broadcast:', error);
      UIComponents.showToast('Failed to duplicate broadcast', 'error');
    }
  }

  showQuickComposeModal() {
    const modalHTML = `
      <div class="modal fade" id="quickComposeModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Quick Compose</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="quickComposeForm">
                <div class="mb-3">
                  <label for="quickTitle" class="form-label">Title *</label>
                  <input type="text" class="form-control" id="quickTitle" required>
                </div>
                <div class="mb-3">
                  <label for="quickMessage" class="form-label">Message *</label>
                  <textarea class="form-control" id="quickMessage" rows="4" required></textarea>
                </div>
                <div class="mb-3">
                  <label for="quickAudience" class="form-label">Send to *</label>
                  <select class="form-select" id="quickAudience" required>
                    <option value="">Select audience</option>
                    <option value="all_volunteers">All Volunteers</option>
                    <option value="active_volunteers">Active Volunteers</option>
                    <option value="leaders">Leaders</option>
                  </select>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" onclick="window.broadcastsManager.sendQuickMessage()">
                Send Now
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal
    const existingModal = document.getElementById('quickComposeModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('quickComposeModal'));
    modal.show();
  }

  async sendQuickMessage() {
    try {
      const title = document.getElementById('quickTitle').value;
      const message = document.getElementById('quickMessage').value;
      const audience = document.getElementById('quickAudience').value;

      if (!title || !message || !audience) {
        UIComponents.showToast('Please fill in all fields', 'warning');
        return;
      }

      const broadcastData = {
        title,
        message,
        type: 'email',
        audienceType: audience,
        priority: 'normal',
        status: 'sending'
      };

      UIComponents.showLoading('Sending message...');

      const response = await this.apiClient.post('/broadcasts', broadcastData);

      if (response.success) {
        UIComponents.showToast('Message sent successfully!', 'success');
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('quickComposeModal'));
        modal.hide();
        
        // Reload broadcasts
        await this.loadBroadcasts();
      } else {
        throw new Error(response.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending quick message:', error);
      UIComponents.showToast('Failed to send message', 'error');
    } finally {
      UIComponents.hideLoading();
    }
  }

  async exportBroadcasts() {
    try {
      UIComponents.showLoading('Exporting broadcasts...');
      
      const response = await this.apiClient.get('/broadcasts/export');
      
      if (response.success) {
        // Download the CSV file
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `broadcasts_${DateUtils.formatDate(new Date(), 'YYYY-MM-DD')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        UIComponents.showToast('Broadcasts exported successfully', 'success');
      } else {
        throw new Error(response.message || 'Failed to export broadcasts');
      }
    } catch (error) {
      console.error('Error exporting broadcasts:', error);
      UIComponents.showToast('Failed to export broadcasts', 'error');
    } finally {
      UIComponents.hideLoading();
    }
  }

  updateBroadcastStats() {
    const statsContainer = document.getElementById('broadcastsStats');
    if (!statsContainer) return;

    const total = this.broadcasts.length;
    const drafts = this.broadcasts.filter(b => b.status === 'draft').length;
    const sent = this.broadcasts.filter(b => b.status === 'sent').length;
    const scheduled = this.broadcasts.filter(b => b.status === 'scheduled').length;
    const failed = this.broadcasts.filter(b => b.status === 'failed').length;

    statsContainer.innerHTML = `
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">${total}</div>
          <div class="stat-label">Total Broadcasts</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${sent}</div>
          <div class="stat-label">Sent</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${scheduled}</div>
          <div class="stat-label">Scheduled</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${drafts}</div>
          <div class="stat-label">Drafts</div>
        </div>
        ${failed > 0 ? `
          <div class="stat-item">
            <div class="stat-value text-danger">${failed}</div>
            <div class="stat-label">Failed</div>
          </div>
        ` : ''}
      </div>
    `;
  }

  // Utility methods
  getStatusClass(status) {
    const statusClasses = {
      draft: 'status-draft',
      scheduled: 'status-scheduled',
      sending: 'status-sending',
      sent: 'status-sent',
      failed: 'status-failed'
    };
    return statusClasses[status] || 'status-draft';
  }

  getTypeIcon(type) {
    const icons = {
      email: '📧',
      sms: '📱',
      push: '🔔',
      announcement: '📢'
    };
    return icons[type] || '📧';
  }

  // Public methods for external access
  refresh() {
    return this.loadBroadcasts();
  }

  getBroadcasts() {
    return this.broadcasts;
  }

  getFilteredBroadcasts() {
    return this.filteredBroadcasts;
  }
}
