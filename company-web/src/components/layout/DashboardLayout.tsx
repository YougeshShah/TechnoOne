import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/DashboardOutlined";
import BusinessIcon from "@mui/icons-material/BusinessOutlined";
import GavelIcon from "@mui/icons-material/GavelOutlined";
import AssessmentIcon from "@mui/icons-material/AssessmentOutlined";
import MicIcon from "@mui/icons-material/MicOutlined";
import NotificationsIcon from "@mui/icons-material/NotificationsOutlined";
import HistoryIcon from "@mui/icons-material/HistoryOutlined";
import SupportAgentIcon from "@mui/icons-material/SupportAgentOutlined";
import MenuBookIcon from "@mui/icons-material/MenuBookOutlined";
import BadgeIcon from "@mui/icons-material/BadgeOutlined";
import PaymentIcon from "@mui/icons-material/PaymentsOutlined";
import DescriptionIcon from "@mui/icons-material/DescriptionOutlined";
import LogoutIcon from "@mui/icons-material/LogoutOutlined";
import LanguageIcon from "@mui/icons-material/LanguageOutlined";
import SchoolIcon from "@mui/icons-material/SchoolOutlined";
import QuizIcon from "@mui/icons-material/QuizOutlined";
import StyleIcon from "@mui/icons-material/StyleOutlined";
import AssignmentIcon from "@mui/icons-material/AssignmentOutlined";
import VideocamIcon from "@mui/icons-material/VideocamOutlined";
import EditNoteIcon from "@mui/icons-material/EditNoteOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesomeOutlined";
import PhotoCameraIcon from "@mui/icons-material/PhotoCameraOutlined";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLongOutlined";
import LockResetIcon from "@mui/icons-material/LockResetOutlined";
import CardMembershipIcon from "@mui/icons-material/CardMembershipOutlined";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Avatar, Box, Button, Collapse, Drawer, IconButton, Toolbar, Typography, useMediaQuery, useTheme } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import styles from "./DashboardLayout.module.css";
import { useAuthStore } from "../../store/authStore";
import { useLogout } from "../../hooks/useAuth";
import { useTranslation } from "../../i18n/LanguageContext";
import { TranslationKey } from "../../i18n/translations";
import { getAvatarUrl } from "../../api/profile.api";
// AI ChatWidget is kept in the codebase (src/components/ChatWidget.tsx) but
// no longer rendered here -- Company staff use the Support Ticket inbox
// (Institution/Law Firm <-> Company) instead of a chat widget.

interface NavItem {
  to: string;
  labelKey: TranslationKey;
  icon: JSX.Element;
  permission: string | null;
}

interface NavGroup {
  key: string;
  labelKey: TranslationKey;
  items: NavItem[];
}

// Grouped so the sidebar reads as a handful of sections rather than one
// long undifferentiated list — each group collapses independently and
// remembers open/closed per session.
const NAV_GROUPS: NavGroup[] = [
  {
    key: "organizations",
    labelKey: "navGroupOrganizations",
    items: [
      { to: "/law-firms", labelKey: "lawFirms", icon: <BusinessIcon fontSize="small" />, permission: "lawfirm.approve" },
      { to: "/company-staff", labelKey: "companyStaff", icon: <BadgeIcon fontSize="small" />, permission: "user.manage" },
      { to: "/roles", labelKey: "rolesAndPermissions", icon: <BadgeIcon fontSize="small" />, permission: "user.manage" },
    ],
  },
  {
    key: "legal",
    labelKey: "navGroupLegal",
    items: [
      { to: "/courts", labelKey: "courts", icon: <GavelIcon fontSize="small" />, permission: "court.manage" },
      { to: "/library", labelKey: "legalLibrary", icon: <MenuBookIcon fontSize="small" />, permission: "library.manage" },
      { to: "/precedents", labelKey: "precedentSearch", icon: <GavelIcon fontSize="small" />, permission: "library.manage" },
      { to: "/document-templates", labelKey: "documentTemplates", icon: <DescriptionIcon fontSize="small" />, permission: null },
    ],
  },
  {
    key: "learning",
    labelKey: "navGroupLearning",
    items: [
      { to: "/courses-admin", labelKey: "coursesAdmin", icon: <SchoolIcon fontSize="small" />, permission: "library.manage" },
      { to: "/mcq-admin", labelKey: "mcqAdmin", icon: <QuizIcon fontSize="small" />, permission: "library.manage" },
      { to: "/flashcard-admin", labelKey: "flashcardAdmin", icon: <StyleIcon fontSize="small" />, permission: "library.manage" },
      { to: "/speaking-admin", labelKey: "speakingPrompts", icon: <MicIcon fontSize="small" />, permission: "library.manage" },
      { to: "/usage-limits", labelKey: "usageLimits", icon: <AssessmentIcon fontSize="small" />, permission: "library.manage" },
      { to: "/mock-test-admin", labelKey: "mockTestAdmin", icon: <AssignmentIcon fontSize="small" />, permission: "library.manage" },
      { to: "/live-class-admin", labelKey: "liveClassAdmin", icon: <VideocamIcon fontSize="small" />, permission: "library.manage" },
      { to: "/writing-grading", labelKey: "writingGrading", icon: <EditNoteIcon fontSize="small" />, permission: "library.manage" },
    ],
  },
  {
    key: "tools",
    labelKey: "navGroupTools",
    items: [
      { to: "/content-generator", labelKey: "contentGenerator", icon: <AutoAwesomeIcon fontSize="small" />, permission: "library.manage" },
      { to: "/photo-editor", labelKey: "photoEditor", icon: <PhotoCameraIcon fontSize="small" />, permission: null },
    ],
  },
  {
    key: "billing",
    labelKey: "navGroupBilling",
    items: [
      { to: "/grant-subscription", labelKey: "grantSubscription", icon: <CardMembershipIcon fontSize="small" />, permission: "library.manage" },
      { to: "/transactions", labelKey: "transactions", icon: <ReceiptLongIcon fontSize="small" />, permission: "library.manage" },
      { to: "/subscriptions", labelKey: "subscriptions", icon: <PaymentIcon fontSize="small" />, permission: null },
      { to: "/firm-vouchers", labelKey: "firmVouchers", icon: <PaymentIcon fontSize="small" />, permission: null },
      { to: "/company-settings", labelKey: "companyPaymentQr", icon: <PaymentIcon fontSize="small" />, permission: null },
    ],
  },
  {
    key: "system",
    labelKey: "navGroupSystem",
    items: [
      { to: "/notifications", labelKey: "notifications", icon: <NotificationsIcon fontSize="small" />, permission: "notification.broadcast" },
      { to: "/audit-logs", labelKey: "auditLogs", icon: <HistoryIcon fontSize="small" />, permission: "auditlog.view" },
      { to: "/support-tickets", labelKey: "supportTickets", icon: <SupportAgentIcon fontSize="small" />, permission: null },
      { to: "/user-admin", labelKey: "userAdmin", icon: <LockResetIcon fontSize="small" />, permission: "user.manage" },
    ],
  },
];

export function DashboardLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { t, language, setLanguage } = useTranslation();
  const location = useLocation();

  const canSee = (permission: string | null) =>
    permission === null || user?.permissions === null || user?.permissions === undefined || user.permissions.includes(permission);

  const visibleGroups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => canSee(i.permission)) })).filter(
    (g) => g.items.length > 0
  );

  // A group starts open if the current page lives inside it, so navigating
  // via a link (not just clicking the group header) never hides where you are.
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV_GROUPS.forEach((g) => {
      // On mobile, open every group by default -- a hamburger menu should
      // show all options at once so nothing is hidden behind an extra tap;
      // on desktop, only the group containing the current page auto-opens.
      initial[g.key] = isMobile || g.items.some((i) => location.pathname.startsWith(i.to));
    });
    return initial;
  });

  const toggleGroup = (key: string) => setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  const SidebarInner = (
    <>
        <div className={styles.logoArea}>
          <Typography variant="h6" sx={{ color: "#fff", fontWeight: 800 }}>
            TechnoOne
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
            Company Control Center
          </Typography>
        </div>

        <nav>
          <NavLink to="/dashboard" onClick={() => isMobile && setMobileOpen(false)} className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}>
            <DashboardIcon fontSize="small" />
            {t("dashboard")}
          </NavLink>

          {visibleGroups.map((group) => (
            <Box key={group.key} sx={{ mt: 0.5 }}>
              <Box
                onClick={() => toggleGroup(group.key)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 2,
                  py: 1,
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.55)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  "&:hover": { color: "rgba(255,255,255,0.85)" },
                }}
              >
                <span>{t(group.labelKey)}</span>
                {openGroups[group.key] ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
              </Box>
              <Collapse in={openGroups[group.key]} timeout={150}>
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
                  >
                    {item.icon}
                    {t(item.labelKey)}
                  </NavLink>
                ))}
              </Collapse>
            </Box>
          ))}
        </nav>
     </>
  );

  return (
    <div>
      {isMobile ? (
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} PaperProps={{ className: styles.sidebar, sx: { position: "static", height: "100%", bgcolor: "#12233a" } }}>
          {SidebarInner}
        </Drawer>
      ) : (
        <aside className={styles.sidebar}>{SidebarInner}</aside>
      )}

      <div className={styles.mainContent} style={isMobile ? { marginLeft: 0 } : undefined}>
        <Toolbar sx={{ bgcolor: "#fff", borderBottom: "1px solid #e5e7eb", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
          <Box>
            {isMobile && (
              <IconButton onClick={() => setMobileOpen(true)}>
                <MenuIcon />
              </IconButton>
            )}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 2 } }}>
          <Button
            size="small"
            startIcon={<LanguageIcon fontSize="small" />}
            onClick={() => setLanguage(language === "en" ? "ne" : "en")}
            sx={{ display: { xs: "none", sm: "inline-flex" } }}
          >
            {language === "en" ? "नेपाली" : "English"}
          </Button>
          <Box sx={{ textAlign: "right", display: { xs: "none", sm: "block" } }}>
            <Typography variant="body2" fontWeight={600}>
              {user?.fullName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.email}
            </Typography>
          </Box>
          <NavLink to="/profile" style={{ textDecoration: "none" }}>
            <Avatar src={getAvatarUrl(user?.avatarUrl)} sx={{ bgcolor: "primary.main", cursor: "pointer" }}>
              {user?.fullName?.charAt(0) ?? "U"}
            </Avatar>
          </NavLink>
          <IconButton onClick={logout} title={t("logout")}>
            <LogoutIcon />
          </IconButton>
          </Box>
        </Toolbar>

        <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, overflowX: "auto" }}>
          <Outlet />
        </Box>
      </div>
    </div>
  );
}
