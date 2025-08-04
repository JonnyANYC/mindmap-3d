#!/bin/bash

# Replace YOUR_USERNAME with your actual GitHub username
GITHUB_USERNAME="YOUR_USERNAME"

echo "Setting up GitHub remote and pushing..."
git remote add origin https://github.com/${GITHUB_USERNAME}/mindmap-3d.git
git branch -M main
git push -u origin main

echo "Repository pushed successfully!"
echo "Your repository will be available at: https://github.com/${GITHUB_USERNAME}/mindmap-3d"