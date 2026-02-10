import type {
  AddressableObject,
  AudioSelectionSet,
  AudioSwitchingSet,
  FrameRate,
  PartiallyResolvedAudioTrack,
  PartiallyResolvedTextTrack,
  PartiallyResolvedVideoTrack,
  Presentation,
  SelectionSet,
  TextSelectionSet,
  TextSwitchingSet,
  VideoSelectionSet,
  VideoSwitchingSet,
} from '../types';
import { generateId } from '../utils/generate-id';
import { matchTag, parseCodecs } from './parse-attributes';
import { resolveUrl } from './resolve-url';

/**
 * Parse HLS multivariant playlist into a Presentation.
 *
 * Returns Presentation with partially resolved tracks (no segment information).
 * Tracks contain metadata from multivariant playlist (bandwidth, resolution, codecs)
 * but segment information is added when media playlists are fetched.
 *
 * @param text - Raw playlist text content
 * @param unresolved - Unresolved presentation (contains URL for base URL resolution)
 * @returns Presentation with partially resolved tracks (duration is undefined)
 */
export function parseMultivariantPlaylist(text: string, unresolved: AddressableObject): Presentation {
  const baseUrl = unresolved.url;
  const lines = text.split(/\r?\n/);

  // Intermediate parsing structures
  interface StreamInfo {
    uri: string;
    bandwidth: number;
    resolution?: { width: number; height: number } | undefined;
    codecs?: string | undefined;
    frameRate?: FrameRate | undefined;
    audioGroupId?: string | undefined;
  }

  interface AudioRenditionInfo {
    groupId: string;
    name: string;
    language?: string | undefined;
    uri?: string | undefined;
    default?: boolean | undefined;
    autoselect?: boolean | undefined;
  }

  interface SubtitleRenditionInfo {
    groupId: string;
    name: string;
    language?: string | undefined;
    uri: string;
    default?: boolean | undefined;
    autoselect?: boolean | undefined;
    forced?: boolean | undefined;
  }

  const streams: StreamInfo[] = [];
  const audioRenditions: AudioRenditionInfo[] = [];
  const subtitleRenditions: SubtitleRenditionInfo[] = [];

  // State for STREAM-INF parsing (URI follows on next line)
  let pendingStreamInfo: Omit<StreamInfo, 'uri'> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || (trimmed.startsWith('#') && !trimmed.startsWith('#EXT'))) {
      continue;
    }

    // Skip tags not used in Presentation model
    if (
      trimmed === '#EXTM3U' ||
      trimmed.startsWith('#EXT-X-VERSION:') ||
      trimmed.startsWith('#EXT-X-INDEPENDENT-SEGMENTS')
    ) {
      continue;
    }

    // #EXT-X-MEDIA:TYPE=AUDIO/SUBTITLES
    const mediaAttrs = matchTag(trimmed, 'EXT-X-MEDIA');
    if (mediaAttrs) {
      const type = mediaAttrs.get('TYPE');
      const groupId = mediaAttrs.get('GROUP-ID');
      const name = mediaAttrs.get('NAME');

      if (type === 'AUDIO' && groupId && name) {
        const uri = mediaAttrs.get('URI');
        audioRenditions.push({
          groupId,
          name,
          language: mediaAttrs.get('LANGUAGE'),
          uri: uri ? resolveUrl(uri, baseUrl) : undefined,
          default: mediaAttrs.getBool('DEFAULT'),
          autoselect: mediaAttrs.getBool('AUTOSELECT'),
        });
      }

      if (type === 'SUBTITLES' && groupId && name) {
        const uri = mediaAttrs.get('URI');
        // URI is required for subtitle tracks
        if (uri) {
          subtitleRenditions.push({
            groupId,
            name,
            language: mediaAttrs.get('LANGUAGE'),
            uri: resolveUrl(uri, baseUrl),
            default: mediaAttrs.getBool('DEFAULT'),
            autoselect: mediaAttrs.getBool('AUTOSELECT'),
            forced: mediaAttrs.getBool('FORCED'),
          });
        }
      }
      continue;
    }

    // #EXT-X-STREAM-INF:BANDWIDTH=...
    const streamInfAttrs = matchTag(trimmed, 'EXT-X-STREAM-INF');
    if (streamInfAttrs) {
      pendingStreamInfo = {
        bandwidth: streamInfAttrs.getInt('BANDWIDTH', 0)!,
        resolution: streamInfAttrs.getResolution('RESOLUTION'),
        codecs: streamInfAttrs.get('CODECS'),
        frameRate: streamInfAttrs.getFrameRate('FRAME-RATE'),
        audioGroupId: streamInfAttrs.get('AUDIO'),
      };
      continue;
    }

    // URI line following STREAM-INF
    if (!trimmed.startsWith('#') && pendingStreamInfo) {
      streams.push({
        ...pendingStreamInfo,
        uri: resolveUrl(trimmed, baseUrl),
      });
      pendingStreamInfo = null;
    }
  }

  // Build PartiallyResolvedVideoTracks from streams
  const videoTracks: PartiallyResolvedVideoTrack[] = streams.map((stream) => {
    const codecs = stream.codecs ? parseCodecs(stream.codecs) : undefined;

    const track: PartiallyResolvedVideoTrack = {
      type: 'video' as const,
      id: generateId(),
      url: stream.uri,
      bandwidth: stream.bandwidth,
      // Type-specific defaults (CMAF video)
      mimeType: 'video/mp4',
      codecs: [],
    };

    if (stream.resolution?.width !== undefined) {
      track.width = stream.resolution.width;
    }
    if (stream.resolution?.height !== undefined) {
      track.height = stream.resolution.height;
    }
    if (codecs?.video) {
      track.codecs = [codecs.video];
    }
    if (stream.frameRate) {
      track.frameRate = stream.frameRate;
    }
    if (stream.audioGroupId) {
      track.audioGroupId = stream.audioGroupId;
    }

    return track;
  });

  // Build PartiallyResolvedAudioTracks from audio renditions
  // Extract audio codecs from referencing streams
  const audioTracks: PartiallyResolvedAudioTrack[] = audioRenditions.map((rendition) => {
    let audioCodecs: string[] | undefined;
    for (const stream of streams) {
      if (stream.audioGroupId === rendition.groupId && stream.codecs) {
        const codecs = parseCodecs(stream.codecs);
        if (codecs.audio) {
          audioCodecs = [codecs.audio];
          break;
        }
      }
    }

    const track: PartiallyResolvedAudioTrack = {
      type: 'audio' as const,
      id: generateId(),
      url: rendition.uri ?? '',
      groupId: rendition.groupId,
      name: rendition.name,
      // Type-specific defaults (CMAF audio)
      mimeType: 'audio/mp4',
      bandwidth: 0, // Not available in multivariant for demuxed audio
      sampleRate: 48000, // CMAF default
      channels: 2, // Stereo default
      codecs: [],
    };

    if (rendition.language) {
      track.language = rendition.language;
    }
    if (audioCodecs) {
      track.codecs = audioCodecs;
    }
    if (rendition.default) {
      track.default = rendition.default;
    }
    if (rendition.autoselect) {
      track.autoselect = rendition.autoselect;
    }

    return track;
  });

  // Build PartiallyResolvedTextTracks from subtitle renditions
  const textTracks: PartiallyResolvedTextTrack[] = subtitleRenditions.map((rendition) => {
    const track: PartiallyResolvedTextTrack = {
      type: 'text' as const,
      id: generateId(),
      url: rendition.uri,
      groupId: rendition.groupId,
      label: rendition.name,
      kind: 'subtitles' as const,
      // Type-specific defaults (VTT)
      mimeType: 'text/vtt',
      bandwidth: 0, // Text tracks don't consume bandwidth
    };

    if (rendition.language) {
      track.language = rendition.language;
    }
    if (rendition.default) {
      track.default = rendition.default;
    }
    if (rendition.forced) {
      track.forced = rendition.forced;
    }

    return track;
  });

  // Build selection sets
  const selectionSets: SelectionSet[] = [];

  if (videoTracks.length > 0) {
    const videoSwitchingSet: VideoSwitchingSet = {
      id: generateId(),
      type: 'video',
      tracks: videoTracks,
    };

    const videoSelectionSet: VideoSelectionSet = {
      id: generateId(),
      type: 'video',
      switchingSets: [videoSwitchingSet],
    };

    selectionSets.push(videoSelectionSet);
  }

  if (audioTracks.length > 0) {
    const audioSwitchingSet: AudioSwitchingSet = {
      id: generateId(),
      type: 'audio',
      tracks: audioTracks,
    };

    const audioSelectionSet: AudioSelectionSet = {
      id: generateId(),
      type: 'audio',
      switchingSets: [audioSwitchingSet],
    };

    selectionSets.push(audioSelectionSet);
  }

  if (textTracks.length > 0) {
    const textSwitchingSet: TextSwitchingSet = {
      id: generateId(),
      type: 'text',
      tracks: textTracks,
    };

    const textSelectionSet: TextSelectionSet = {
      id: generateId(),
      type: 'text',
      switchingSets: [textSwitchingSet],
    };

    selectionSets.push(textSelectionSet);
  }

  // Build presentation (duration is undefined until tracks are resolved)
  return {
    id: generateId(),
    url: unresolved.url,
    startTime: 0,
    // duration: undefined, // Won't be known until after at least one media playlist is fetched + parsed
    selectionSets,
  };
}
