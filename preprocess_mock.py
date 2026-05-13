#!/usr/bin/env python3
"""Mock preprocess script for testing.

Usage: python preprocess_mock.py <input_file> <output_file> [api_base] [api_key] [model_name]
"""
import sys
import time
import os

input_file = sys.argv[1] if len(sys.argv) > 1 else "/tmp/test_input.txt"
output_file = sys.argv[2] if len(sys.argv) > 2 else "/tmp/test_output.md"
api_base = sys.argv[3] if len(sys.argv) > 3 else "https://api.openai.com/v1"
api_key = sys.argv[4] if len(sys.argv) > 4 else "sk-xxx"
model_name = sys.argv[5] if len(sys.argv) > 5 else "gpt-4o"

print(f"Input: {input_file}")
print(f"Output: {output_file}")
print(f"API Base: {api_base}")
print(f"API Key: {api_key[:8]}..." if api_key else "API Key: (empty)")
print(f"Model: {model_name}")

file_size = os.path.getsize(input_file)
print(f"File size: {file_size} bytes")

# Simulate multi-step processing
steps = 5
for i in range(steps):
    time.sleep(2)
    progress = (i + 1) / steps
    print(f"PROGRESS:{progress}:Step {i + 1}/{steps} - processing...")
    sys.stdout.flush()

# Write mock markdown output
with open(output_file, "w", encoding="utf-8") as f:
    f.write(f"# Preprocessed Document\n\n")
    f.write(f"Source: `{os.path.basename(input_file)}`\n\n")
    f.write(f"This is mock preprocessed content.\n\n")
    f.write(f"## Section 1\n\nSome extracted text from the document.\n\n")
    f.write(f"## Section 2\n\nMore content here.\n")

print("Done!")
