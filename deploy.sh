#!/bin/bash
# Run this on Hostinger after each git pull
# Usage: bash deploy.sh

set -e

export PATH=/opt/alt/alt-nodejs22/root/bin:$PATH

BASE=~/domains/orange-gaur-256734.hostingersite.com/nodejs

echo ">>> Pulling latest code..."
cd $BASE
git pull

echo ">>> Installing server dependencies..."
cd $BASE/server
npm install

echo ">>> Running migrations..."
node models/migrate.js

echo ">>> Restarting app..."
touch $BASE/tmp/restart.txt

echo ">>> Done! Site will be live in ~20 seconds."
