// proposals-manager.js - Complete proposals management frontend

class ProposalsManager {
  constructor() {
    this.proposals = [];
    this.filteredProposals = [];
    this.currentProposal = null;
    this.apiClient = new APIClient();
    this.init();
  }

  async init() {
    console.log('🔧 Initializing ProposalsManager...');
    try {
      this.bindEvents();
      await this.loadProposals();
      console.log('✅ ProposalsManager initialized');
    } catch (error) {
      console.error('❌ Error initializing ProposalsManager:', error);
      UIComponents.showToast('Failed to initialize proposals', 'error');
    }
  }

  bindEvents() {
    // Bind button events
    const addProposalBtn = document.getElementById('addProposalBtn');
    if (addProposalBtn) {
      addProposalBtn.addEventListener('click', () => this.showAddProposalModal());
    }

    // Bind filter and search events
    const proposalSearch = document.getElementById('proposalSearch');
    if (proposalSearch) {
      proposalSearch.addEventListener('input', (e) => this.handleSearchInput(e.target.value));
    }

    const statusFilter = document.getElementById('proposalStatusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => this.applyFilters());
    }

    const categoryFilter = document.getElementById('proposalCategoryFilter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', () => this.applyFilters());
    }

    const priorityFilter = document.getElementById('proposalPriorityFilter');
    if (priorityFilter) {
      priorityFilter.addEventListener('change', () => this.applyFilters());
    }

    // Export button
    const exportBtn = document.getElementById('exportProposalsBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportProposals());
    }

    // Bulk actions
    const bulkActionBtn = document.getElementById('bulkProposalActionBtn');
    if (bulkActionBtn) {
      bulkActionBtn.addEventListener('click', () => this.handleBulkAction());
    }
  }

  async loadProposals() {
    try {
      UIComponents.showLoading('Loading proposals...');
      
      const response = await this.apiClient.get('/proposals');
      
      if (response.success) {
        this.proposals = response.data.proposals || [];
        this.filteredProposals = [...this.proposals];
        this.renderProposals();
        this.updateProposalStats();
      } else {
        throw new Error(response.message || 'Failed to load proposals');
      }
    } catch (error) {
      console.error('Error loading proposals:', error);
      UIComponents.showToast('Failed to load proposals', 'error');
    } finally {
      UIComponents.hideLoading();
    }
  }

  renderProposals() {
    const container = document.getElementById('proposalsContainer');
    if (!container) return;

    if (this.filteredProposals.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <h3>No Proposals Found</h3>
          <p>No proposals match your current filters.</p>
          <button class="btn btn-primary" onclick="window.proposalsManager.showAddProposalModal()">
            Add First Proposal
          </button>
        </div>
      `;
      return;
    }

    const proposalsHTML = this.filteredProposals.map(proposal => this.renderProposalCard(proposal)).join('');
    container.innerHTML = proposalsHTML;

    // Add event listeners to proposal cards
    this.bindProposalCardEvents();
  }

  renderProposalCard(proposal) {
    const statusClass = this.getStatusClass(proposal.status);
    const priorityIcon = this.getPriorityIcon(proposal.priority);
    const submittedDate = DateUtils.formatDate(proposal.submittedAt);
    const timeAgo = DateUtils.getTimeAgo(proposal.submittedAt);

    return `
      <div class="proposal-card" data-proposal-id="${proposal._id}">
        <div class="proposal-header">
          <div class="proposal-meta">
            <h3 class="proposal-title">${StringUtils.escapeHtml(proposal.title)}</h3>
            <div class="proposal-badges">
              <span class="status-badge ${statusClass}">${proposal.status}</span>
              <span class="priority-badge priority-${proposal.priority}">${priorityIcon} ${proposal.priority}</span>
              <span class="category-badge">${proposal.category}</span>
            </div>
          </div>
          <div class="proposal-actions">
            <div class="dropdown">
              <button class="btn btn-sm btn-light dropdown-toggle" data-bs-toggle="dropdown">
                Actions
              </button>
              <ul class="dropdown-menu">
                <li><a class="dropdown-item" href="#" onclick="window.proposalsManager.viewProposal('${proposal._id}')">View Details</a></li>
                <li><a class="dropdown-item" href="#" onclick="window.proposalsManager.editProposal('${proposal._id}')">Edit</a></li>
                ${this.canApproveProposal() ? `
                  <li><hr class="dropdown-divider"></li>
                  <li><a class="dropdown-item" href="#" onclick="window.proposalsManager.approveProposal('${proposal._id}')">Approve</a></li>
                  <li><a class="dropdown-item" href="#" onclick="window.proposalsManager.rejectProposal('${proposal._id}')">Reject</a></li>
                ` : ''}
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item text-danger" href="#" onclick="window.proposalsManager.deleteProposal('${proposal._id}')">Delete</a></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div class="proposal-body">
          <p class="proposal-description">${StringUtils.truncate(proposal.description, 150)}</p>
          
          <div class="proposal-details">
            <div class="detail-item">
              <i class="icon-user"></i>
              <span>Submitted by: ${proposal.submittedBy?.firstName} ${proposal.submittedBy?.lastName}</span>
            </div>
            <div class="detail-item">
              <i class="icon-calendar"></i>
              <span>Submitted: ${submittedDate} (${timeAgo})</span>
            </div>
            ${proposal.targetDate ? `
              <div class="detail-item">
                <i class="icon-target"></i>
                <span>Target: ${DateUtils.formatDate(proposal.targetDate)}</span>
              </div>
            ` : ''}
            ${proposal.estimatedBudget ? `
              <div class="detail-item">
                <i class="icon-dollar"></i>
                <span>Budget: $${NumberUtils.formatCurrency(proposal.estimatedBudget)}</span>
              </div>
            ` : ''}
          </div>
        </div>
        
        <div class="proposal-footer">
          <div class="proposal-progress">
            ${this.renderApprovalWorkflow(proposal)}
          </div>
        </div>
      </div>
    `;
  }

  renderApprovalWorkflow(proposal) {
    const workflow = proposal.approvalWorkflow || [];
    const currentStep = workflow.findIndex(step => !step.approved && !step.rejected);
    
    if (workflow.length === 0) {
      return '<span class="text-muted">No approval workflow</span>';
    }

    const workflowHTML = workflow.map((step, index) => {
      let stepClass = 'workflow-step';
      let stepIcon = 'pending';
      
      if (step.approved) {
        stepClass += ' approved';
        stepIcon = 'check';
      } else if (step.rejected) {
        stepClass += ' rejected';
        stepIcon = 'x';
      } else if (index === currentStep) {
        stepClass += ' current';
        stepIcon = 'clock';
      }

      return `
        <div class="${stepClass}">
          <div class="step-icon">${stepIcon}</div>
          <div class="step-info">
            <div class="step-role">${step.role}</div>
            ${step.approvedBy ? `<div class="step-approver">${step.approvedBy.firstName} ${step.approvedBy.lastName}</div>` : ''}
            ${step.approvedAt ? `<div class="step-date">${DateUtils.formatDateTime(step.approvedAt)}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="approval-workflow">
        <div class="workflow-header">
          <span>Approval Progress</span>
          <span class="workflow-progress">${workflow.filter(s => s.approved).length}/${workflow.length}</span>
        </div>
        <div class="workflow-steps">
          ${workflowHTML}
        </div>
      </div>
    `;
  }

  bindProposalCardEvents() {
    // Add click handlers for proposal cards
    document.querySelectorAll('.proposal-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.proposal-actions') && !e.target.closest('.dropdown-menu')) {
          const proposalId = card.dataset.proposalId;
          this.viewProposal(proposalId);
        }
      });
    });
  }

  handleSearchInput(searchTerm) {
    this.searchTerm = searchTerm.toLowerCase();
    this.applyFilters();
  }

  applyFilters() {
    let filtered = [...this.proposals];

    // Apply search filter
    if (this.searchTerm) {
      filtered = filtered.filter(proposal => 
        proposal.title.toLowerCase().includes(this.searchTerm) ||
        proposal.description.toLowerCase().includes(this.searchTerm) ||
        proposal.category.toLowerCase().includes(this.searchTerm) ||
        `${proposal.submittedBy?.firstName} ${proposal.submittedBy?.lastName}`.toLowerCase().includes(this.searchTerm)
      );
    }

    // Apply status filter
    const statusFilter = document.getElementById('proposalStatusFilter')?.value;
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(proposal => proposal.status === statusFilter);
    }

    // Apply category filter
    const categoryFilter = document.getElementById('proposalCategoryFilter')?.value;
    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter(proposal => proposal.category === categoryFilter);
    }

    // Apply priority filter
    const priorityFilter = document.getElementById('proposalPriorityFilter')?.value;
    if (priorityFilter && priorityFilter !== 'all') {
      filtered = filtered.filter(proposal => proposal.priority === priorityFilter);
    }

    this.filteredProposals = filtered;
    this.renderProposals();
    this.updateProposalStats();
  }

  showAddProposalModal() {
    const modalHTML = `
      <div class="modal fade" id="proposalModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Add New Proposal</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="proposalForm">
                <div class="row">
                  <div class="col-md-8">
                    <div class="mb-3">
                      <label for="proposalTitle" class="form-label">Title *</label>
                      <input type="text" class="form-control" id="proposalTitle" required>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="mb-3">
                      <label for="proposalPriority" class="form-label">Priority *</label>
                      <select class="form-select" id="proposalPriority" required>
                        <option value="low">Low</option>
                        <option value="medium" selected>Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div class="row">
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label for="proposalCategory" class="form-label">Category *</label>
                      <select class="form-select" id="proposalCategory" required>
                        <option value="">Select Category</option>
                        <option value="event">Event</option>
                        <option value="training">Training</option>
                        <option value="equipment">Equipment</option>
                        <option value="process">Process Improvement</option>
                        <option value="partnership">Partnership</option>
                        <option value="fundraising">Fundraising</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label for="proposalTargetDate" class="form-label">Target Date</label>
                      <input type="date" class="form-control" id="proposalTargetDate">
                    </div>
                  </div>
                </div>

                <div class="mb-3">
                  <label for="proposalDescription" class="form-label">Description *</label>
                  <textarea class="form-control" id="proposalDescription" rows="4" required 
                    placeholder="Describe your proposal in detail..."></textarea>
                </div>

                <div class="mb-3">
                  <label for="proposalObjectives" class="form-label">Objectives</label>
                  <textarea class="form-control" id="proposalObjectives" rows="3" 
                    placeholder="What are the main objectives of this proposal?"></textarea>
                </div>

                <div class="row">
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label for="proposalBudget" class="form-label">Estimated Budget</label>
                      <div class="input-group">
                        <span class="input-group-text">$</span>
                        <input type="number" class="form-control" id="proposalBudget" min="0" step="0.01">
                      </div>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label for="proposalImpact" class="form-label">Expected Impact</label>
                      <select class="form-select" id="proposalImpact">
                        <option value="">Select Impact Level</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="very-high">Very High</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div class="mb-3">
                  <label for="proposalAttachments" class="form-label">Attachments</label>
                  <input type="file" class="form-control" id="proposalAttachments" multiple 
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png">
                  <div class="form-text">You can attach documents, images, or other relevant files.</div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" onclick="window.proposalsManager.saveProposal()">
                Submit Proposal
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal
    const existingModal = document.getElementById('proposalModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('proposalModal'));
    modal.show();
  }

  async saveProposal() {
    try {
      const formData = new FormData();
      
      // Get form values
      const title = document.getElementById('proposalTitle').value;
      const priority = document.getElementById('proposalPriority').value;
      const category = document.getElementById('proposalCategory').value;
      const targetDate = document.getElementById('proposalTargetDate').value;
      const description = document.getElementById('proposalDescription').value;
      const objectives = document.getElementById('proposalObjectives').value;
      const budget = document.getElementById('proposalBudget').value;
      const impact = document.getElementById('proposalImpact').value;
      const attachments = document.getElementById('proposalAttachments').files;

      // Validate required fields
      if (!title || !category || !description) {
        UIComponents.showToast('Please fill in all required fields', 'warning');
        return;
      }

      // Prepare proposal data
      const proposalData = {
        title,
        priority,
        category,
        description,
        objectives,
        estimatedBudget: budget ? parseFloat(budget) : undefined,
        expectedImpact: impact,
        targetDate: targetDate || undefined
      };

      formData.append('proposal', JSON.stringify(proposalData));

      // Add attachments
      for (let i = 0; i < attachments.length; i++) {
        formData.append('attachments', attachments[i]);
      }

      UIComponents.showLoading('Submitting proposal...');

      const response = await this.apiClient.post('/proposals', formData);

      if (response.success) {
        UIComponents.showToast('Proposal submitted successfully!', 'success');
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('proposalModal'));
        modal.hide();
        
        // Reload proposals
        await this.loadProposals();
      } else {
        throw new Error(response.message || 'Failed to submit proposal');
      }
    } catch (error) {
      console.error('Error saving proposal:', error);
      UIComponents.showToast('Failed to submit proposal', 'error');
    } finally {
      UIComponents.hideLoading();
    }
  }

  async viewProposal(proposalId) {
    try {
      const proposal = this.proposals.find(p => p._id === proposalId);
      if (!proposal) return;

      // Load full proposal details
      const response = await this.apiClient.get(`/proposals/${proposalId}`);
      const fullProposal = response.success ? response.data.proposal : proposal;

      this.showProposalDetailsModal(fullProposal);
    } catch (error) {
      console.error('Error viewing proposal:', error);
      UIComponents.showToast('Failed to load proposal details', 'error');
    }
  }

  showProposalDetailsModal(proposal) {
    const statusClass = this.getStatusClass(proposal.status);
    const priorityIcon = this.getPriorityIcon(proposal.priority);

    const modalHTML = `
      <div class="modal fade" id="proposalDetailsModal" tabindex="-1">
        <div class="modal-dialog modal-xl">
          <div class="modal-content">
            <div class="modal-header">
              <div>
                <h5 class="modal-title">${StringUtils.escapeHtml(proposal.title)}</h5>
                <div class="proposal-badges mt-2">
                  <span class="status-badge ${statusClass}">${proposal.status}</span>
                  <span class="priority-badge priority-${proposal.priority}">${priorityIcon} ${proposal.priority}</span>
                  <span class="category-badge">${proposal.category}</span>
                </div>
              </div>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="row">
                <div class="col-lg-8">
                  <div class="proposal-content">
                    <h6>Description</h6>
                    <p>${StringUtils.escapeHtml(proposal.description)}</p>
                    
                    ${proposal.objectives ? `
                      <h6>Objectives</h6>
                      <p>${StringUtils.escapeHtml(proposal.objectives)}</p>
                    ` : ''}
                    
                    ${proposal.attachments && proposal.attachments.length > 0 ? `
                      <h6>Attachments</h6>
                      <div class="attachments-list">
                        ${proposal.attachments.map(att => `
                          <a href="${att.url}" target="_blank" class="attachment-link">
                            <i class="icon-paperclip"></i> ${att.filename}
                          </a>
                        `).join('')}
                      </div>
                    ` : ''}
                  </div>
                </div>
                <div class="col-lg-4">
                  <div class="proposal-sidebar">
                    <h6>Details</h6>
                    <div class="detail-group">
                      <div class="detail-item">
                        <strong>Submitted by:</strong>
                        <span>${proposal.submittedBy?.firstName} ${proposal.submittedBy?.lastName}</span>
                      </div>
                      <div class="detail-item">
                        <strong>Submitted:</strong>
                        <span>${DateUtils.formatDateTime(proposal.submittedAt)}</span>
                      </div>
                      ${proposal.targetDate ? `
                        <div class="detail-item">
                          <strong>Target Date:</strong>
                          <span>${DateUtils.formatDate(proposal.targetDate)}</span>
                        </div>
                      ` : ''}
                      ${proposal.estimatedBudget ? `
                        <div class="detail-item">
                          <strong>Budget:</strong>
                          <span>$${NumberUtils.formatCurrency(proposal.estimatedBudget)}</span>
                        </div>
                      ` : ''}
                      ${proposal.expectedImpact ? `
                        <div class="detail-item">
                          <strong>Expected Impact:</strong>
                          <span class="text-capitalize">${proposal.expectedImpact}</span>
                        </div>
                      ` : ''}
                    </div>
                    
                    ${this.renderApprovalWorkflow(proposal)}
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
              ${this.canEditProposal(proposal) ? `
                <button type="button" class="btn btn-primary" onclick="window.proposalsManager.editProposal('${proposal._id}')">
                  Edit Proposal
                </button>
              ` : ''}
              ${this.canApproveProposal() && proposal.status === 'pending' ? `
                <button type="button" class="btn btn-success" onclick="window.proposalsManager.approveProposal('${proposal._id}')">
                  Approve
                </button>
                <button type="button" class="btn btn-danger" onclick="window.proposalsManager.rejectProposal('${proposal._id}')">
                  Reject
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal
    const existingModal = document.getElementById('proposalDetailsModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('proposalDetailsModal'));
    modal.show();
  }

  async approveProposal(proposalId) {
    try {
      const response = await this.apiClient.put(`/proposals/${proposalId}/approve`);
      
      if (response.success) {
        UIComponents.showToast('Proposal approved successfully', 'success');
        await this.loadProposals();
        
        // Close any open modals
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
          const instance = bootstrap.Modal.getInstance(modal);
          if (instance) instance.hide();
        });
      } else {
        throw new Error(response.message || 'Failed to approve proposal');
      }
    } catch (error) {
      console.error('Error approving proposal:', error);
      UIComponents.showToast('Failed to approve proposal', 'error');
    }
  }

  async rejectProposal(proposalId) {
    try {
      const reason = prompt('Please provide a reason for rejection:');
      if (!reason) return;

      const response = await this.apiClient.put(`/proposals/${proposalId}/reject`, { reason });
      
      if (response.success) {
        UIComponents.showToast('Proposal rejected', 'success');
        await this.loadProposals();
        
        // Close any open modals
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
          const instance = bootstrap.Modal.getInstance(modal);
          if (instance) instance.hide();
        });
      } else {
        throw new Error(response.message || 'Failed to reject proposal');
      }
    } catch (error) {
      console.error('Error rejecting proposal:', error);
      UIComponents.showToast('Failed to reject proposal', 'error');
    }
  }

  async deleteProposal(proposalId) {
    if (!confirm('Are you sure you want to delete this proposal? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await this.apiClient.delete(`/proposals/${proposalId}`);
      
      if (response.success) {
        UIComponents.showToast('Proposal deleted successfully', 'success');
        await this.loadProposals();
      } else {
        throw new Error(response.message || 'Failed to delete proposal');
      }
    } catch (error) {
      console.error('Error deleting proposal:', error);
      UIComponents.showToast('Failed to delete proposal', 'error');
    }
  }

  async exportProposals() {
    try {
      UIComponents.showLoading('Exporting proposals...');
      
      const response = await this.apiClient.get('/proposals/export');
      
      if (response.success) {
        // Download the CSV file
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `proposals_${DateUtils.formatDate(new Date(), 'YYYY-MM-DD')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        UIComponents.showToast('Proposals exported successfully', 'success');
      } else {
        throw new Error(response.message || 'Failed to export proposals');
      }
    } catch (error) {
      console.error('Error exporting proposals:', error);
      UIComponents.showToast('Failed to export proposals', 'error');
    } finally {
      UIComponents.hideLoading();
    }
  }

  updateProposalStats() {
    const statsContainer = document.getElementById('proposalsStats');
    if (!statsContainer) return;

    const total = this.proposals.length;
    const pending = this.proposals.filter(p => p.status === 'pending').length;
    const approved = this.proposals.filter(p => p.status === 'approved').length;
    const rejected = this.proposals.filter(p => p.status === 'rejected').length;
    const inReview = this.proposals.filter(p => p.status === 'in_review').length;

    statsContainer.innerHTML = `
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">${total}</div>
          <div class="stat-label">Total Proposals</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${pending}</div>
          <div class="stat-label">Pending</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${inReview}</div>
          <div class="stat-label">In Review</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${approved}</div>
          <div class="stat-label">Approved</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${rejected}</div>
          <div class="stat-label">Rejected</div>
        </div>
      </div>
    `;
  }

  // Utility methods
  getStatusClass(status) {
    const statusClasses = {
      pending: 'status-pending',
      in_review: 'status-in-review',
      approved: 'status-approved',
      rejected: 'status-rejected',
      implemented: 'status-implemented'
    };
    return statusClasses[status] || 'status-pending';
  }

  getPriorityIcon(priority) {
    const icons = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      urgent: '🔴'
    };
    return icons[priority] || '🟡';
  }

  canEditProposal(proposal) {
    const user = window.authManager?.getCurrentUser();
    if (!user) return false;
    
    return user.role === 'admin' || 
           user.role === 'leader' || 
           proposal.submittedBy._id === user._id;
  }

  canApproveProposal() {
    const user = window.authManager?.getCurrentUser();
    if (!user) return false;
    
    return user.role === 'admin' || user.role === 'leader';
  }

  // Public methods for external access
  refresh() {
    return this.loadProposals();
  }

  getProposals() {
    return this.proposals;
  }

  getFilteredProposals() {
    return this.filteredProposals;
  }
}
