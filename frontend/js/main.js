// main.js - Enhanced main application controller

class App {
  constructor() {
    this.currentSection = 'home';
    this.user = null;
    this.managers = {};
    this.isInitialized = false;
    this.init();
  }

  async init() {
    console.log('🚀 Initializing Volunteer Management System...');
    
    try {
      // Initialize core managers
      this.authManager = new AuthManager();
      this.apiClient = new APIClient();
      
      // Setup routing
      this.setupRouting();
      
      // Setup global error handling
      this.setupErrorHandling();
      
      // Initialize managers
      await this.initializeManagers();
      
      // Check authentication status
      await this.checkAuthStatus();
      
      // Load initial section
      this.handleRoute();
      
      // Load quick stats for home page
      // main.js - Enhanced main application controller

      class App {
        constructor() {
          this.currentSection = 'home';
          this.user = null;
          this.managers = {};
          this.isInitialized = false;
          this.init();
        }

        async init() {
          console.log('🚀 Initializing Volunteer Management System...');

          try {
            // Initialize core managers
            this.authManager = new AuthManager();
            this.apiClient = new APIClient();

            // Setup routing
            this.setupRouting();

            // Setup global error handling
            this.setupErrorHandling();

            // Initialize managers
            await this.initializeManagers();

            // Check authentication status
            await this.checkAuthStatus();

            // Load initial section
            this.handleRoute();

            // Load quick stats for home page
            this.loadQuickStats();

            this.isInitialized = true;
            console.log('✅ Application initialized successfully');

          } catch (error) {
            console.error('❌ Application initialization failed:', error);
            UIComponents.showToast('Application failed to initialize', 'error');
          }
        }

        async initializeManagers() {
          try {
            // Initialize section managers
            this.managers.volunteers = new VolunteersManager();
            this.managers.events = new EventsManager();
            this.managers.proposals = new ProposalsManager();
            this.managers.broadcasts = new BroadcastsManager();

            // Initialize dashboard
            this.managers.dashboard = new Dashboard();

            // Expose managers globally for easy access
            window.volunteersManager = this.managers.volunteers;
            window.eventsManager = this.managers.events;
            window.proposalsManager = this.managers.proposals;
            window.broadcastsManager = this.managers.broadcasts;
            window.dashboardManager = this.managers.dashboard;
            window.authManager = this.authManager;

            console.log('✅ All managers initialized');
          } catch (error) {
            console.error('❌ Failed to initialize managers:', error);
            throw error;
          }
        }

        setupRouting() {
          // Handle hash changes for SPA navigation
          window.addEventListener('hashchange', () => this.handleRoute());

          // Handle navigation clicks
          document.addEventListener('click', (e) => {
            if (e.target.matches('.nav-link')) {
              e.preventDefault();
              const href = e.target.getAttribute('href');
              if (href && href.startsWith('#')) {
                window.location.hash = href;
              }
            }
          });
        }

        setupErrorHandling() {
          // Global error handler
          window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            UIComponents.showToast('An unexpected error occurred', 'error');
          });

          // Handle unhandled promise rejections
          window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            UIComponents.showToast('An unexpected error occurred', 'error');
          });
        }

        async checkAuthStatus() {
          try {
            const token = StorageUtils.getItem('auth_token');
            if (token) {
              // Verify token is still valid
              const response = await this.apiClient.get('/auth/profile');
              if (response.success) {
                this.user = response.data.user;
                this.authManager.updateAuthState(this.user, token);
                this.updateUIForAuthState(true);
              } else {
                // Token is invalid, clear it
                this.authManager.logout(false);
              }
            }
          } catch (error) {
            console.error('Error checking auth status:', error);
            this.authManager.logout(false);
          }
        }

        updateUIForAuthState(isAuthenticated) {
          const authButtons = document.getElementById('authButtons');
          const userMenu = document.getElementById('userMenu');
          const userName = document.getElementById('userName');
          const userRole = document.getElementById('userRole');

          if (isAuthenticated && this.user) {
            authButtons.style.display = 'none';
            userMenu.style.display = 'flex';
            userName.textContent = this.user.fullName || `${this.user.firstName} ${this.user.lastName}`;
            userRole.textContent = this.user.role.replace('_', ' ').toUpperCase();

            // Show/hide sections based on role
            this.updateNavigationForRole();
          } else {
            authButtons.style.display = 'flex';
            userMenu.style.display = 'none';
          }
        }

        updateNavigationForRole() {
          const navLinks = document.querySelectorAll('.nav-link');
          const userRole = this.user?.role;

          navLinks.forEach(link => {
            const section = link.getAttribute('href')?.substring(1);
            const shouldShow = this.canAccessSection(section, userRole);
            link.style.display = shouldShow ? 'inline-block' : 'none';
          });
        }

        canAccessSection(section, role) {
          const rolePermissions = {
            volunteer: ['home', 'dashboard', 'events', 'proposals'],
            privileged_creator: ['home', 'dashboard', 'volunteers', 'events', 'proposals', 'broadcasts'],
            leader: ['home', 'dashboard', 'volunteers', 'events', 'proposals', 'broadcasts', 'reporting'],
            admin: ['home', 'dashboard', 'volunteers', 'events', 'proposals', 'broadcasts', 'reporting']
          };

          return rolePermissions[role]?.includes(section) || section === 'home';
        }

        handleRoute() {
          const hash = window.location.hash.substring(1) || 'home';
          const [section, ...params] = hash.split('/');

          // Check if user can access this section
          if (this.user && !this.canAccessSection(section, this.user.role)) {
            UIComponents.showToast('You do not have permission to access this section', 'warning');
            window.location.hash = '#home';
            return;
          }

          this.showSection(section, params);
        }

        showSection(sectionName, params = []) {
          // Hide all sections
          document.querySelectorAll('main section').forEach(section => {
            section.style.display = 'none';
          });

          // Update navigation active state
          document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
          });

          const targetLink = document.querySelector(`[href="#${sectionName}"]`);
          if (targetLink) {
            targetLink.classList.add('active');
          }

          // Show target section
          const targetSection = document.getElementById(`${sectionName}Section`);
          if (targetSection) {
            targetSection.style.display = 'block';
            this.currentSection = sectionName;

            // Initialize section if needed
            this.initializeSection(sectionName, params);
          } else {
            // Fallback to home
            document.getElementById('homeSection').style.display = 'block';
            this.currentSection = 'home';
          }

          // Update page title
          document.title = `VMS - ${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}`;
        }

        async initializeSection(sectionName, params) {
          switch (sectionName) {
            case 'dashboard':
              if (this.managers.dashboard && this.user) {
                await this.managers.dashboard.loadDashboard();
              }
              break;

            case 'volunteers':
              if (this.managers.volunteers && this.user) {
                // Volunteers manager auto-loads on init
              }
              break;

            case 'events':
              if (this.managers.events && this.user) {
                // Events manager auto-loads on init
                if (params.length > 0) {
                  // Handle sub-routes like #events/123/attendance
                  this.handleEventSubRoute(params);
                }
              }
              break;

            case 'proposals':
              if (this.managers.proposals && this.user) {
                // Proposals manager auto-loads on init
              }
              break;

            case 'broadcasts':
              if (this.managers.broadcasts && this.user) {
                // Broadcasts manager auto-loads on init
              }
              break;

            case 'reporting':
              // Will implement when reporting manager is created
              break;

            case 'home':
              this.loadQuickStats();
              break;
          }
        }

        handleEventSubRoute(params) {
          const [eventId, subSection] = params;

          switch (subSection) {
            case 'attendance':
              // Show attendance management for specific event
              this.showAttendanceManagement(eventId);
              break;
          }
        }

        async loadQuickStats() {
          try {
            if (!this.user) return;

            const statsElements = {
              totalVolunteers: document.getElementById('totalVolunteers'),
              upcomingEvents: document.getElementById('upcomingEvents'),
              totalHours: document.getElementById('totalHours')
            };

            // Load stats from reporting API
            const response = await this.apiClient.get('/reporting/quick-stats');

            if (response.success) {
              const stats = response.data;
              if (statsElements.totalVolunteers) {
                statsElements.totalVolunteers.textContent = stats.totalVolunteers || 0;
              }
              if (statsElements.upcomingEvents) {
                statsElements.upcomingEvents.textContent = stats.upcomingEvents || 0;
              }
              if (statsElements.totalHours) {
                statsElements.totalHours.textContent = NumberUtils.formatNumber(stats.totalHours) || 0;
              }
            }
          } catch (error) {
            console.error('Error loading quick stats:', error);
            // Don't show error toast for stats - it's not critical
          }
        }

        // Method to handle login success
        onLoginSuccess(user, token) {
          this.user = user;
          this.updateUIForAuthState(true);

          // Redirect to dashboard after login
          if (window.location.hash === '#home' || !window.location.hash) {
            window.location.hash = '#dashboard';
          }

          UIComponents.showToast(`Welcome back, ${user.firstName}!`, 'success');
        }

        // Method to handle logout
        onLogout() {
          this.user = null;
          this.updateUIForAuthState(false);

          // Redirect to home
          window.location.hash = '#home';

          UIComponents.showToast('Logged out successfully', 'success');
        }

        // Method to refresh current section
        refresh() {
          if (this.currentSection && this.managers[this.currentSection]) {
            if (typeof this.managers[this.currentSection].refresh === 'function') {
              this.managers[this.currentSection].refresh();
            } else if (typeof this.managers[this.currentSection].loadData === 'function') {
              this.managers[this.currentSection].loadData();
            }
          }
        }

        // Utility method to show attendance management
        showAttendanceManagement(eventId) {
          // This would show a specialized attendance management interface
          UIComponents.showToast('Attendance management coming soon', 'info');
        }
      }

      // Initialize the application when DOM is ready
      document.addEventListener('DOMContentLoaded', () => {
        window.app = new App();
      });

      // Export for use in other modules
      if (typeof module !== 'undefined' && module.exports) {
        module.exports = { App };
      }
        
