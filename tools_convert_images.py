import os
from PIL import Image

def convert_png_to_webp(directory):
    print(f"Scanning {directory}...")
    files = [f for f in os.listdir(directory) if f.endswith('.png')]
    if not files:
        print("No PNG files found.")
        return

    print(f"Found {len(files)} PNG files. Converting...")
    
    for filename in files:
        filepath = os.path.join(directory, filename)
        img = Image.open(filepath)
        
        # Construct new filename
        new_filename = os.path.splitext(filename)[0] + '.webp'
        new_filepath = os.path.join(directory, new_filename)
        
        # Save as WebP
        # Lossless for graphics/logos is usually best, or high quality lossy.
        # Since these are logos, let's try lossless=True first.
        img.save(new_filepath, 'WEBP', lossless=True)
        print(f"Converted {filename} -> {new_filename}")

if __name__ == "__main__":
    convert_png_to_webp(os.path.join(os.getcwd(), "logo"))
