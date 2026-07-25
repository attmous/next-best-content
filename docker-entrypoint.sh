#!/bin/sh
set -eu

load_runtime_secret() {
  variable_name="$1"
  secret_path="$2"

  if [ ! -e "$secret_path" ]; then
    return
  fi

  if [ ! -f "$secret_path" ] || [ ! -r "$secret_path" ]; then
    echo "Runtime secret is not a readable file: $secret_path" >&2
    exit 1
  fi

  secret_value="$(cat "$secret_path")"
  if [ -z "$secret_value" ]; then
    echo "Runtime secret file is empty: $secret_path" >&2
    exit 1
  fi

  export "$variable_name=$secret_value"
  unset secret_value
}

load_runtime_secret LLM_API_KEY /run/secrets/llm_api_key
load_runtime_secret YOUTUBE_API_KEY /run/secrets/youtube_api_key

exec "$@"
