#!/usr/bin/env python3
"""
Memory monitoring utility for Railway deployment
Helps prevent memory crashes by monitoring and limiting resource usage
"""

import os
import psutil
import gc
import sys

def get_memory_usage():
    """Get current memory usage in MB"""
    process = psutil.Process(os.getpid())
    memory_info = process.memory_info()
    return memory_info.rss / 1024 / 1024  # Convert to MB

def cleanup_memory():
    """Force garbage collection to free memory"""
    gc.collect()
    
def check_memory_limit(max_memory_mb=400):
    """
    Check if memory usage exceeds limit and cleanup if needed
    Railway free tier has ~512MB limit, so we use 400MB as safe threshold
    """
    current_memory = get_memory_usage()
    
    if current_memory > max_memory_mb:
        print(f"⚠️ Memory usage high: {current_memory:.1f}MB (limit: {max_memory_mb}MB)")
        print("🧹 Running memory cleanup...")
        cleanup_memory()
        
        # Check again after cleanup
        new_memory = get_memory_usage()
        print(f"✅ Memory after cleanup: {new_memory:.1f}MB")
        
        if new_memory > max_memory_mb:
            print(f"❌ Memory still high after cleanup. Consider reducing workload.")
            return False
    
    return True

def set_memory_limits():
    """Set memory limits for the process"""
    try:
        # Try to set memory limit if on Unix-like system
        import resource
        # Set memory limit to 450MB (in bytes)
        resource.setrlimit(resource.RLIMIT_AS, (450 * 1024 * 1024, 450 * 1024 * 1024))
        print("✅ Memory limit set to 450MB")
    except (ImportError, OSError):
        print("⚠️ Could not set memory limit (not supported on this system)")

if __name__ == "__main__":
    print(f"💾 Current memory usage: {get_memory_usage():.1f}MB")
    set_memory_limits()
    check_memory_limit() 