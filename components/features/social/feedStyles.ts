import { StyleSheet } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';

/**
 * Styles for the Feed tab: the feed card shell, media/PR-stat visuals, footer
 * actions and empty state. Shared by FeedCard, FeedSkeleton, PRStatVisual and
 * FeedContent. Extracted verbatim (pre-existing StyleSheet tech debt).
 */
export const feedStyles = StyleSheet.create({
  // ── Card shell ──
  card: {
    borderRadius: 20,
    marginBottom: 14,
    overflow: 'hidden',
    backgroundColor: '#1c1c1c',
    borderWidth: 1.5,
    borderColor: '#242424',
  },

  // ── Header row ──
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  authorName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: '#fff',
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: '#555',
  },
  levelPill: {
    backgroundColor: '#232323',
    borderWidth: 1,
    borderColor: '#2e2e2e',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  levelPillText: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: '#606060',
    letterSpacing: 1,
  },

  // ── Media area — no hardcoded aspectRatio; it is applied inline per-card ──
  mediaArea: {
    backgroundColor: '#000',
    overflow: 'hidden',
  },

  // Uploading indicator (shown inside mediaArea)
  uploadingBadge: {
    position: 'absolute',
    top: 10,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.60)',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  uploadingBadgeText: {
    fontFamily: Fonts.display,
    fontSize: 9,
    color: '#666',
    letterSpacing: 1.5,
  },

  // PR overlay gradient at the bottom of video posts
  prOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 44,
  },
  prExercise: {
    fontFamily: Fonts.display,
    fontSize: 10,
    color: '#bbb',
    letterSpacing: 2.5,
    marginBottom: 2,
  },
  prValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  prValue: {
    fontFamily: Fonts.display,
    fontSize: 32,
    color: '#fff',
    letterSpacing: 2,
    lineHeight: 34,
  },
  prUnit: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: '#aaa',
  },

  // ── PR stat visual (no video) ──
  statVisual: {
    flex: 1,
    overflow: 'hidden',
  },
  statAccentStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  statContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statExercise: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: '#666',
    letterSpacing: 3,
    marginBottom: 6,
  },
  statValueWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  statValueText: {
    fontFamily: Fonts.display,
    fontSize: 54,
    color: '#fff',
    letterSpacing: 2,
    lineHeight: 56,
  },
  statUnitText: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: '#666',
    letterSpacing: 2,
    marginBottom: 6,
  },
  newPrTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(230,48,48,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(230,48,48,0.30)',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  newPrTagText: {
    fontFamily: Fonts.display,
    fontSize: 10,
    color: Colors.accent,
    letterSpacing: 2,
  },

  // ── Footer row ──
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  likesDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  likesCount: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: '#fff',
  },
  likesLabel: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: '#505050',
    letterSpacing: 1,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#2a2a2a',
    backgroundColor: '#242424',
  },
  likeBtnActive: {
    borderColor: 'rgba(230,48,48,0.50)',
    backgroundColor: 'rgba(230,48,48,0.08)',
  },
  likeBtnText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: '#707070',
    letterSpacing: 1,
  },
  likeBtnTextActive: {
    color: Colors.accent,
  },
  yourPrLabel: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: '#404040',
    letterSpacing: 1,
  },

  // ── Misc ──
  footerNote: {
    textAlign: 'center',
    paddingVertical: 24,
    fontFamily: Fonts.display,
    fontSize: 10,
    color: '#383838',
    letterSpacing: 2,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
    letterSpacing: 2,
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
  },
});
