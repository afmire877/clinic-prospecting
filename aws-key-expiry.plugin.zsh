#!/usr/bin/env zsh

# AWS Key Expiry ZSH Plugin
# Shows AWS credential expiry information in your prompt

# Configuration variables
: ${AWS_KEY_EXPIRY_WARNING_DAYS:=7}  # Warn when keys expire within N days
: ${AWS_KEY_EXPIRY_FORMAT:="⚠️  AWS keys expire %s"}  # Warning format
: ${AWS_KEY_EXPIRY_EXPIRED_FORMAT:="❌ AWS keys expired %s"}  # Expired format
: ${AWS_KEY_EXPIRY_CHECK_INTERVAL:=300}  # Check every 5 minutes (in seconds)

# Cache variables
typeset -g _AWS_KEY_EXPIRY_CACHE=""
typeset -g _AWS_KEY_EXPIRY_LAST_CHECK=0

# Function to get AWS credential expiry information
function _aws_key_expiry_get_info() {
    local current_time=$(date +%s)
    
    # Use cached result if recent
    if [[ $current_time -lt $((_AWS_KEY_EXPIRY_LAST_CHECK + AWS_KEY_EXPIRY_CHECK_INTERVAL)) ]]; then
        echo "$_AWS_KEY_EXPIRY_CACHE"
        return
    fi
    
    local expiry_info=""
    local expiry_timestamp=""
    
    # Check for STS token expiry (most common case)
    if [[ -n "$AWS_SESSION_TOKEN" ]]; then
        # Try to get token info using AWS CLI
        if command -v aws >/dev/null 2>&1; then
            local token_info
            token_info=$(aws sts get-caller-identity --output json 2>/dev/null)
            if [[ $? -eq 0 ]]; then
                # For STS tokens, we need to decode the token to get expiry
                # This is a simplified approach - in practice, you'd need to decode the JWT-like structure
                expiry_info=$(_aws_key_expiry_check_sts_token)
            fi
        fi
    fi
    
    # Check EC2 instance metadata for temporary credentials
    if [[ -z "$expiry_info" ]] && _aws_key_expiry_is_ec2_instance; then
        expiry_info=$(_aws_key_expiry_check_ec2_metadata)
    fi
    
    # Check ECS task metadata for temporary credentials
    if [[ -z "$expiry_info" ]] && [[ -n "$AWS_CONTAINER_CREDENTIALS_RELATIVE_URI" ]]; then
        expiry_info=$(_aws_key_expiry_check_ecs_metadata)
    fi
    
    # Check AWS SSO cache
    if [[ -z "$expiry_info" ]]; then
        expiry_info=$(_aws_key_expiry_check_sso_cache)
    fi
    
    # Update cache
    _AWS_KEY_EXPIRY_CACHE="$expiry_info"
    _AWS_KEY_EXPIRY_LAST_CHECK=$current_time
    
    echo "$expiry_info"
}

# Check if running on EC2 instance
function _aws_key_expiry_is_ec2_instance() {
    # Quick check for EC2 metadata service
    if command -v curl >/dev/null 2>&1; then
        curl -s -m 1 http://169.254.169.254/latest/meta-data/ >/dev/null 2>&1
        return $?
    elif command -v wget >/dev/null 2>&1; then
        wget -q -T 1 -O /dev/null http://169.254.169.254/latest/meta-data/ >/dev/null 2>&1
        return $?
    fi
    return 1
}

# Check EC2 instance metadata for credential expiry
function _aws_key_expiry_check_ec2_metadata() {
    local role_name
    local expiry
    
    if command -v curl >/dev/null 2>&1; then
        role_name=$(curl -s -m 2 http://169.254.169.254/latest/meta-data/iam/security-credentials/ 2>/dev/null)
        if [[ -n "$role_name" ]]; then
            expiry=$(curl -s -m 2 "http://169.254.169.254/latest/meta-data/iam/security-credentials/$role_name" 2>/dev/null | grep -o '"Expiration"[[:space:]]*:[[:space:]]*"[^"]*"' | cut -d'"' -f4)
        fi
    fi
    
    if [[ -n "$expiry" ]]; then
        _aws_key_expiry_format_warning "$expiry"
    fi
}

# Check ECS task metadata for credential expiry
function _aws_key_expiry_check_ecs_metadata() {
    local expiry
    local metadata_url="http://169.254.170.2$AWS_CONTAINER_CREDENTIALS_RELATIVE_URI"
    
    if command -v curl >/dev/null 2>&1; then
        expiry=$(curl -s -m 2 "$metadata_url" 2>/dev/null | grep -o '"Expiration"[[:space:]]*:[[:space:]]*"[^"]*"' | cut -d'"' -f4)
    fi
    
    if [[ -n "$expiry" ]]; then
        _aws_key_expiry_format_warning "$expiry"
    fi
}

# Check STS token (simplified - real implementation would need JWT decoding)
function _aws_key_expiry_check_sts_token() {
    # This is a placeholder - real STS token decoding would require base64 decode and JSON parsing
    # For now, we'll try to use AWS CLI to get session token info if available
    if command -v aws >/dev/null 2>&1; then
        local account_info
        account_info=$(aws sts get-caller-identity --output json 2>/dev/null)
        if [[ $? -eq 0 ]]; then
            # Try to get session token info - this is limited without direct token decoding
            echo "STS session active (expiry not determinable without token decoding)"
        fi
    fi
}

# Check AWS SSO cache for token expiry
function _aws_key_expiry_check_sso_cache() {
    local sso_cache_dir="$HOME/.aws/sso/cache"
    local latest_cache_file
    local expiry
    
    if [[ -d "$sso_cache_dir" ]]; then
        # Find the most recent cache file
        latest_cache_file=$(find "$sso_cache_dir" -name "*.json" -type f -exec stat -c "%Y %n" {} \; 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)
        
        if [[ -n "$latest_cache_file" && -f "$latest_cache_file" ]]; then
            # Extract expiry from SSO cache file
            if command -v jq >/dev/null 2>&1; then
                expiry=$(jq -r '.expiresAt // empty' "$latest_cache_file" 2>/dev/null)
            else
                # Fallback without jq
                expiry=$(grep -o '"expiresAt"[[:space:]]*:[[:space:]]*"[^"]*"' "$latest_cache_file" 2>/dev/null | cut -d'"' -f4)
            fi
            
            if [[ -n "$expiry" ]]; then
                _aws_key_expiry_format_warning "$expiry"
            fi
        fi
    fi
}

# Format expiry warning based on time remaining
function _aws_key_expiry_format_warning() {
    local expiry_time="$1"
    local current_time=$(date +%s)
    local expiry_timestamp
    
    # Convert ISO 8601 date to timestamp
    if command -v date >/dev/null 2>&1; then
        # Try different date formats
        expiry_timestamp=$(date -d "$expiry_time" +%s 2>/dev/null) || \
        expiry_timestamp=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$expiry_time" +%s 2>/dev/null) || \
        expiry_timestamp=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${expiry_time%Z}" +%s 2>/dev/null)
    fi
    
    if [[ -n "$expiry_timestamp" && "$expiry_timestamp" -gt 0 ]]; then
        local time_diff=$((expiry_timestamp - current_time))
        local days_remaining=$((time_diff / 86400))
        local hours_remaining=$(((time_diff % 86400) / 3600))
        
        if [[ $time_diff -lt 0 ]]; then
            # Keys have expired
            local days_expired=$((-days_remaining))
            printf "$AWS_KEY_EXPIRY_EXPIRED_FORMAT" "${days_expired}d ago"
        elif [[ $days_remaining -le $AWS_KEY_EXPIRY_WARNING_DAYS ]]; then
            # Keys expire soon
            if [[ $days_remaining -eq 0 ]]; then
                printf "$AWS_KEY_EXPIRY_FORMAT" "in ${hours_remaining}h"
            else
                printf "$AWS_KEY_EXPIRY_FORMAT" "in ${days_remaining}d"
            fi
        fi
    fi
}

# Main function to get AWS key expiry status for prompt
function aws_key_expiry_status() {
    local expiry_info
    expiry_info=$(_aws_key_expiry_get_info)
    
    if [[ -n "$expiry_info" ]]; then
        echo " $expiry_info"
    fi
}

# Function to manually check AWS key expiry
function aws-key-expiry() {
    echo "Checking AWS credential expiry..."
    
    # Clear cache to force fresh check
    _AWS_KEY_EXPIRY_CACHE=""
    _AWS_KEY_EXPIRY_LAST_CHECK=0
    
    local expiry_info
    expiry_info=$(_aws_key_expiry_get_info)
    
    if [[ -n "$expiry_info" ]]; then
        echo "$expiry_info"
    else
        echo "No AWS credential expiry information found."
        echo ""
        echo "This could mean:"
        echo "- Using long-term AWS access keys (no expiry)"
        echo "- No AWS credentials configured"
        echo "- Unable to determine expiry information"
        echo ""
        echo "Credential sources checked:"
        echo "- Environment variables (AWS_SESSION_TOKEN)"
        echo "- EC2 instance metadata"
        echo "- ECS task metadata"
        echo "- AWS SSO cache (~/.aws/sso/cache/)"
    fi
}

# Auto-load in prompt (example integration)
# Uncomment and customize based on your prompt setup
# function aws_key_expiry_prompt() {
#     local expiry_status
#     expiry_status=$(aws_key_expiry_status)
#     if [[ -n "$expiry_status" ]]; then
#         echo "$expiry_status"
#     fi
# }