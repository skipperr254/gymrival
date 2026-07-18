import { StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

/**
 * Styles for the Profile screen and its DetailRow / SettingsRow sub-components.
 * Extracted verbatim from the original screen (pre-existing StyleSheet tech debt).
 */
export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.base,
  },
  content: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 10,
    paddingBottom: 100,
    gap: 14,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  appTitle: {
    fontFamily: Fonts.display,
    fontSize: 26,
    color: Colors.primary,
    letterSpacing: 4,
    lineHeight: 28,
  },
  pageLabel: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs - 1,
    color: '#606060',
    letterSpacing: 2,
    marginTop: 2,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.accent,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.base,
  },
  bellBadgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 9,
    color: '#fff',
  },

  // Profile card
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3a1a1a',
    padding: 20,
    paddingTop: 24,
    gap: 0,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 18,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1a0000',
  },
  profileMeta: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontFamily: Fonts.display,
    fontSize: FontSizes['2xl'],
    color: Colors.primary,
    letterSpacing: 2,
  },
  profileUsername: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#909090',
    marginBottom: 4,
  },
  profileBio: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.secondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },

  // Motto
  mottoBox: {
    backgroundColor: 'rgba(230, 48, 48, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(230, 48, 48, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  mottoLabel: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: Colors.accent,
    letterSpacing: 2,
    marginBottom: 6,
  },
  mottoText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.primary,
    fontStyle: 'italic',
    lineHeight: 22,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 4,
  },
  statValue: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.primary,
    letterSpacing: 1,
    lineHeight: 24,
  },
  statLabel: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: '#606060',
    letterSpacing: 1,
    fontWeight: '700',
  },

  // Upgrade / Pro
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: Radius.button,
    height: 52,
  },
  upgradeText: {
    fontFamily: Fonts.display,
    fontSize: 15,
    color: Colors.primary,
    letterSpacing: 3,
  },
  proActiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: Radius.button,
    height: 52,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  proActiveText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.base,
    color: Colors.success,
    letterSpacing: 1.5,
  },

  // Sections
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: 15,
    color: Colors.primary,
    letterSpacing: 3,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.elevated,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  editBtnText: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: Colors.secondary,
    letterSpacing: 1,
  },

  // Detail rows (My Details)
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.elevated,
  },
  detailIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontFamily: Fonts.display,
    fontSize: 10,
    color: '#505050',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  detailValue: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },

  // PR rows
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  prIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(230, 48, 48, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  prContent: {
    flex: 1,
  },
  prTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  prName: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: Colors.secondary,
  },
  prValueGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  prNum: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.accent,
    letterSpacing: 1,
  },
  prUnit: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: '#606060',
  },
  prBarTrack: {
    height: 3,
    backgroundColor: Colors.elevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  prBarFill: {
    height: 3,
    borderRadius: 3,
  },

  // Settings rows
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  settingsIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsContent: {
    flex: 1,
    gap: 1,
  },
  settingsLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: Colors.primary,
  },
  settingsSub: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: '#606060',
    marginTop: 1,
  },

  // Log out
  logOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: '#3a1a1a',
    marginBottom: 10,
  },
  logOutText: {
    fontFamily: Fonts.display,
    fontSize: 14,
    color: Colors.accent,
    letterSpacing: 3,
  },
});
