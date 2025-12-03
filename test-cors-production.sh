#!/bin/bash

# Test CORS configuration for the backend
echo "Testing CORS configuration..."
echo

# Test 1: Preflight request from production frontend
echo "1. Testing OPTIONS preflight request from https://www.sochai.store:"
curl -X OPTIONS \
  -H "Origin: https://www.sochai.store" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v \
  https://backend-soch-production.up.railway.app/api/auth/login

echo -e "\n\n"

# Test 2: Actual POST request from production frontend  
echo "2. Testing actual POST request from https://www.sochai.store:"
curl -X POST \
  -H "Origin: https://www.sochai.store" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpassword"}' \
  -v \
  https://backend-soch-production.up.railway.app/api/auth/login

echo -e "\n\n"

# Test 3: Test the CORS test endpoint
echo "3. Testing CORS test endpoint:"
curl -X GET \
  -H "Origin: https://www.sochai.store" \
  -v \
  https://backend-soch-production.up.railway.app/api/cors-test

echo -e "\n\nDone!"