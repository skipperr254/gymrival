import { StyleSheet } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';

/**
 * Styles for the chat screen and its MessageList. Extracted verbatim from the
 * original screen (pre-existing StyleSheet tech debt).
 */
export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#242424',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: '#242424',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: '#fff',
  },
  headerStatus: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: '#505050',
    marginTop: 1,
  },
  headerStatusOnline: {
    color: Colors.success,
  },
  messageArea: {
    flex: 1,
  },
  messageContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: '#484848',
    textAlign: 'center',
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
    marginTop: -60,
  },
  errorTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
    letterSpacing: 2,
    color: '#fff',
  },
  errorSub: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
  },
  historyEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  historyEndText: {
    fontFamily: Fonts.display,
    fontSize: 9,
    color: '#333',
    letterSpacing: 2,
  },
  dateDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
    marginTop: 6,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1e1e1e',
  },
  dividerText: {
    fontFamily: Fonts.display,
    fontSize: 9,
    color: '#404040',
    letterSpacing: 1.5,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  bubbleGroup: {
    maxWidth: '72%',
    gap: 2,
  },
  bubbleGroupMe: {
    alignItems: 'flex-end',
  },
  bubbleGroupOther: {
    alignItems: 'flex-start',
  },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  bubbleMe: {
    backgroundColor: Colors.accent,
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#242424',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  bubbleSending: {
    opacity: 0.6,
  },
  bubbleText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.secondary,
    lineHeight: 21,
  },
  bubbleTextMe: {
    color: '#fff',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  metaRowMe: {
    justifyContent: 'flex-end',
  },
  bubbleTime: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: '#404040',
  },
  readStatus: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: '#404040',
  },
  quickScroll: {
    flexGrow: 0,
    paddingBottom: 8,
  },
  quickContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 7,
  },
  quickBtn: {
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: '#1c1c1c',
  },
  quickBtnText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: '#888',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    // paddingBottom applied dynamically via useSafeAreaInsets
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#1c1c1c',
    borderWidth: 1.5,
    borderColor: '#2a2a2a',
    borderRadius: 22,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 14,
    color: '#fff',
    paddingVertical: 9,
    maxHeight: 120,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginBottom: 2,
  },
  sendBtnActive: {
    backgroundColor: Colors.accent,
  },
  sendBtnInactive: {
    backgroundColor: '#242424',
  },
});
