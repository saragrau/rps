#!/bin/bash

TOKEN="odzgBUW0RpsUzZuX6Dh73IqMpNYK5Ry-"
BASE_URL="https://assignments.reaktor.com"
cursor="/history"
page=1

# Start with empty file
echo "[]" > history_all.json

while true; do
  echo "Fetching page $page..."

  response=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL$cursor")

  # Extract next cursor and data
  cursor=$(echo "$response" | jq -r '.cursor // empty')
  data=$(echo "$response" | jq '.data')

  # Append data to file
  jq --argjson new "$data" '. += $new' history_all.json > tmp.json && mv tmp.json history_all.json

  echo "Page $page: $(echo $data | jq length) items added"
  page=$((page + 1))

  # Stop if no cursor
  if [ -z "$cursor" ]; then
    echo "Done! Total pages: $((page - 1))"
    break
  fi
done

echo "Total items: $(jq length history_all.json)"
echo "Saved to history_all.json"