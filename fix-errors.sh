#!/bin/bash

# Fix error handling in all TypeScript files
find services/api/src -name "*.ts" -exec sed -i '' 's/error\.message/error instanceof Error ? error.message : "Unknown error"/g' {} \;

echo "Fixed error handling in all TypeScript files"
