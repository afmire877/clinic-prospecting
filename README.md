# ppt2mp4

CLI tool to convert PowerPoint presentations (.pptx, .ppt, .odp) to MP4 video.

## Installation

```bash
npm install
npm run build
npm link  # optional: makes ppt2mp4 available globally
```

### System Dependencies

At least one slide renderer is required:

- **LibreOffice** (recommended, best quality): `sudo apt install libreoffice`
- **Python fallback**: `pip install python-pptx Pillow`

Video encoding requires:

- **FFmpeg**: `sudo apt install ffmpeg`

## Usage

```bash
# Basic conversion (5s per slide, 1080p)
ppt2mp4 convert slides.pptx

# Custom duration and resolution
ppt2mp4 convert deck.pptx -d 8 -r 720p

# Specify output path and add background audio
ppt2mp4 convert talk.pptx -o output.mp4 --audio music.mp3

# Fade transition with custom FPS
ppt2mp4 convert slides.pptx -t fade --fps 24
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <file>` | Output MP4 file path | `<input-name>.mp4` |
| `-d, --duration <seconds>` | Duration per slide | `5` |
| `-r, --resolution <res>` | `1080p`, `720p`, or `480p` | `1080p` |
| `-t, --transition <type>` | `none` or `fade` | `none` |
| `--audio <file>` | Background audio file | none |
| `--fps <number>` | Frames per second | `30` |

## Supported Input Formats

- `.pptx` — PowerPoint (modern)
- `.ppt` — PowerPoint (legacy)
- `.odp` — LibreOffice Impress

## How It Works

1. Slides are rendered to PNG images (via LibreOffice or Python fallback)
2. Images are combined into an MP4 video using FFmpeg with H.264 encoding
3. Optional background audio is mixed in
4. Temporary files are cleaned up automatically
