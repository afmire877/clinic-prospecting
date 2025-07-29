# BJJ Clipper

A command-line tool for Brazilian Jiu-Jitsu practitioners to extract and organize video clips from large instructional videos.

## Phase 1: Basic Clipping (Current Implementation)

This is the initial implementation focusing on core clipping functionality with FFmpeg integration.

### Features

- ✅ Extract video clips with precise timestamps
- ✅ Multiple timestamp formats (MM:SS, H:MM:SS, seconds)
- ✅ Quality options (original, 720p, 480p)
- ✅ Format support (mp4, webm)
- ✅ Progress indicators during extraction
- ✅ Automatic output directory creation
- ✅ Descriptive filename generation with tags
- ✅ Comprehensive error handling

### Prerequisites

- **FFmpeg**: Must be installed and available in your PATH
  - macOS: `brew install ffmpeg`
  - Ubuntu/Debian: `sudo apt install ffmpeg`
  - Windows: Download from https://ffmpeg.org/

### Installation

```bash
npm install
npm run build
```

### Usage

#### Basic clip extraction:
```bash
bjj clip instructional.mp4 --start 15:23 --end 17:23 --name "kimura-from-guard"
```

#### With tags and quality options:
```bash
bjj clip video.mp4 -s 5:30 -e 8:15 -n "guard-retention" -t "guard,defense" -q 720p
```

#### All options:
```bash
bjj clip large-video.mp4 \
  --start 1:30:45 \
  --end 1:35:20 \
  --name "back-take-sequence" \
  --tags "back,transition,submission" \
  --quality 720p \
  --format webm
```

### Timestamp Formats

- `15:23` (MM:SS)
- `1:15:23` (H:MM:SS)
- `923.5` (seconds with decimals)
- `923.5s` (seconds with unit)

### Quality Options

- `original` - Copy streams (fastest, preserves original quality)
- `720p` - Re-encode to 720p (good balance of size/quality)
- `480p` - Re-encode to 480p (smallest file size)

### Output

Clips are automatically saved to `~/bjj-clips/` with descriptive filenames:
```
~/bjj-clips/
├── 00-15-23_kimura-from-guard_[guard,submission].mp4
├── 00-05-30_guard-retention_[guard,defense].mp4
└── 01-30-45_back-take-sequence_[back,transition].mp4
```

### Help

```bash
bjj help        # Detailed help information
bjj clip --help # Command-specific help
```

## Development

```bash
npm install
npm run dev clip video.mp4 -s 1:00 -e 2:00 -n "test-clip"
```

## Future Phases

- **Phase 2**: Directory organization and video library management
- **Phase 3**: Search and discovery commands
- **Phase 4**: Configuration system and advanced options
- **Phase 5**: Enhanced error handling and edge cases