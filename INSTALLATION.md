# AWS Key Expiry ZSH Plugin Installation & Usage

A ZSH plugin that displays AWS credential expiry information in your terminal prompt.

## Features

- Detects AWS credential expiry from multiple sources:
  - STS temporary credentials (session tokens)
  - EC2 instance metadata
  - ECS task metadata  
  - AWS SSO cached tokens
- Configurable warning thresholds
- Cached checks for performance
- Multiple prompt integration options

## Installation

### Option 1: Oh My Zsh

1. Clone this repository to your Oh My Zsh custom plugins directory:
```bash
git clone https://github.com/your-username/aws-key-expiry.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/aws-key-expiry
```

2. Add the plugin to your `~/.zshrc`:
```bash
plugins=(... aws-key-expiry)
```

3. Reload your shell:
```bash
source ~/.zshrc
```

### Option 2: Manual Installation

1. Clone this repository:
```bash
git clone https://github.com/your-username/aws-key-expiry.git ~/aws-key-expiry
```

2. Source the plugin in your `~/.zshrc`:
```bash
source ~/aws-key-expiry/aws-key-expiry.plugin.zsh
```

3. Reload your shell:
```bash
source ~/.zshrc
```

## Configuration

Add these variables to your `~/.zshrc` before loading the plugin to customize behavior:

```bash
# Warn when keys expire within N days (default: 7)
export AWS_KEY_EXPIRY_WARNING_DAYS=3

# Warning format (default: "⚠️  AWS keys expire %s")
export AWS_KEY_EXPIRY_FORMAT="🔑 AWS expires %s"

# Expired format (default: "❌ AWS keys expired %s")
export AWS_KEY_EXPIRY_EXPIRED_FORMAT="🚨 AWS expired %s"

# Check interval in seconds (default: 300 = 5 minutes)
export AWS_KEY_EXPIRY_CHECK_INTERVAL=600
```

## Usage

### Manual Check
```bash
aws-key-expiry
```

This command will:
- Force a fresh check of all credential sources
- Display current expiry status
- Show helpful information if no expiry data is found

### Prompt Integration

#### Option 1: Add to existing prompt
Add to your prompt function in `~/.zshrc`:

```bash
# For custom prompts
PROMPT='$(aws_key_expiry_status)${PROMPT}'

# Or for right prompt
RPROMPT='$(aws_key_expiry_status)${RPROMPT}'
```

#### Option 2: Oh My Zsh theme integration
Edit your theme file and add `$(aws_key_expiry_status)` where you want the warning to appear.

#### Option 3: Powerlevel10k integration
Add to your `~/.p10k.zsh`:

```bash
typeset -g POWERLEVEL9K_RIGHT_PROMPT_ELEMENTS=(
  # ... other elements ...
  aws_key_expiry
  # ... other elements ...
)

function prompt_aws_key_expiry() {
  local expiry_status=$(aws_key_expiry_status)
  if [[ -n "$expiry_status" ]]; then
    p10k segment -b red -f yellow -t "$expiry_status"
  fi
}
```

## How It Works

The plugin checks for AWS credential expiry information from these sources in order:

1. **STS Session Tokens** - Checks `AWS_SESSION_TOKEN` environment variable
2. **EC2 Instance Metadata** - Queries instance metadata service at `169.254.169.254`
3. **ECS Task Metadata** - Checks ECS task metadata if `AWS_CONTAINER_CREDENTIALS_RELATIVE_URI` is set
4. **AWS SSO Cache** - Reads cached SSO tokens from `~/.aws/sso/cache/`

## Output Examples

- `⚠️  AWS keys expire in 2d` - Keys expire in 2 days
- `⚠️  AWS keys expire in 4h` - Keys expire in 4 hours  
- `❌ AWS keys expired 1d ago` - Keys expired 1 day ago

## Performance

- Results are cached for 5 minutes by default (configurable)
- Metadata service calls have 1-2 second timeouts
- Minimal performance impact on prompt rendering

## Troubleshooting

### No expiry information shown
This usually means you're using long-term AWS access keys, which don't expire. The plugin only shows warnings for temporary credentials.

### Slow prompt
Increase `AWS_KEY_EXPIRY_CHECK_INTERVAL` to cache results longer, or check your network connectivity to AWS metadata services.

### Wrong timezone
The plugin uses your system timezone. Ensure your system clock and timezone are set correctly.

## Dependencies

Optional dependencies for enhanced functionality:
- `jq` - For parsing AWS SSO cache files
- `curl` or `wget` - For metadata service queries
- `aws` CLI - For additional credential information