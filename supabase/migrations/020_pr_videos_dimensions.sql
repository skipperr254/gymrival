-- ─── PR Videos: capture native dimensions ─────────────────────────────────────
--
-- Stores the width and height of the source video so the feed can size each
-- card to the video's actual aspect ratio. Without this the feed has to
-- assume a single ratio for every video, which either crops tall phone-shot
-- videos or wastes vertical space on landscape clips.
--
-- Both columns are nullable so legacy rows (uploaded before this migration)
-- continue to work — the feed falls back to a 4:5 default for those.

ALTER TABLE public.pr_videos
  ADD COLUMN IF NOT EXISTS video_width  SMALLINT,
  ADD COLUMN IF NOT EXISTS video_height SMALLINT;
