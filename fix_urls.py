#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix hardcoded localhost URLs in HTML files with proper UTF-8 encoding
"""

import os
from pathlib import Path

def fix_html_file(filepath):
    """Replace localhost:3000 with empty string in HTML file"""
    print(f"Processing: {filepath}")
    
    # Read with UTF-8 encoding
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace localhost URLs
    original_content = content
    content = content.replace('http://localhost:3000', '')
    
    # Write back with UTF-8 encoding
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8', newline='\r\n') as f:
            f.write(content)
        print(f"  ✓ Updated: {filepath}")
        return True
    else:
        print(f"  - No changes needed: {filepath}")
        return False

def main():
    public_dir = Path('public')
    html_files = [
        'login.html',
        'dashboard.html',
        'admin.html',
        'live-dashboard.html',
        'monitoring-logs.html'
    ]
    
    updated_count = 0
    for filename in html_files:
        filepath = public_dir / filename
        if filepath.exists():
            if fix_html_file(filepath):
                updated_count += 1
        else:
            print(f"  ⚠ File not found: {filepath}")
    
    print(f"\n✅ Complete! Updated {updated_count} files")

if __name__ == '__main__':
    main()
