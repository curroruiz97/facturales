import { AdminDashboardService } from "../features/admin/services/AdminDashboardService";
import { AdminUserService } from "../features/admin/services/AdminUserService";
import { AdminFinanceService } from "../features/admin/services/AdminFinanceService";
import { AdminApiUsageService } from "../features/admin/services/AdminApiUsageService";
import { AdminLogsService } from "../features/admin/services/AdminLogsService";
import { AdminEmailService } from "../features/admin/services/AdminEmailService";
import { AdminSystemService } from "../features/admin/services/AdminSystemService";
import { AdminFeatureFlagsService } from "../features/admin/services/AdminFeatureFlagsService";
import { AdminConfigService } from "../features/admin/services/AdminConfigService";

export const AdminService = {
  isAdmin: AdminDashboardService.isAdmin,
  getAdminRole: AdminDashboardService.getAdminRole,
  getOverview: AdminDashboardService.getOverview,
  getDashboardMetrics: AdminDashboardService.getDashboardMetrics,
  getUsers: AdminUserService.getUsers,
  getUserDetail: AdminUserService.getUserDetail,
  updateSubscription: AdminUserService.updateSubscription,
  suspendUser: AdminUserService.suspendUser,
  unsuspendUser: AdminUserService.unsuspendUser,
  deleteUser: AdminUserService.deleteUser,
  grantAdmin: AdminUserService.grantAdmin,
  revokeAdmin: AdminUserService.revokeAdmin,
  getRevenueAnalytics: AdminFinanceService.getRevenueAnalytics,
  getApiUsage: AdminApiUsageService.getApiUsage,
  getSystemLogs: AdminLogsService.getSystemLogs,
  getAuditLogs: AdminLogsService.getAuditLogs,
  getEmailAnalytics: AdminEmailService.getEmailAnalytics,
  getSystemHealth: AdminSystemService.getSystemHealth,
  getFeatureFlags: AdminFeatureFlagsService.getFeatureFlags,
  upsertFeatureFlag: AdminFeatureFlagsService.upsertFeatureFlag,
  deleteFeatureFlag: AdminFeatureFlagsService.deleteFeatureFlag,
  getConfig: AdminConfigService.getConfig,
  updateConfig: AdminConfigService.updateConfig,
};
